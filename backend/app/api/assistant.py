
from fastapi import APIRouter, HTTPException
from app import schemas
from app.core.config import settings
import google.generativeai as genai
import os

router = APIRouter()

# Configure Gemini
if settings.GOOGLE_API_KEY:
    genai.configure(api_key=settings.GOOGLE_API_KEY)

from datetime import datetime
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from app import models
from app.database import get_db
from fastapi import Depends


import re
from app.services import finance

async def get_ai_assistant_response(user_input: str, db: AsyncSession):
    if not settings.GOOGLE_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API Key not configured")
    
    context_str = f"Today's Date: {datetime.now().strftime('%Y-%m-%d')}\n\n"
    
    # --- 1. Detect Ticker (Basic Regex for US ($TSLA or TSLA) and TW (2330)) ---
    # Look for patterns like $NVDA, NVDA, 2330, 0050
    # We exclude common words to avoid false positives (like "AI", "NEWS")
    ticker = None
    
    # Try explicit $TICKER first
    match = re.search(r'\$([A-Za-z]+)', user_input)
    if match:
        ticker = match.group(1).upper()
    else:
        # Try finding 4-digit codes (TW stocks)
        match_tw = re.search(r'\b\d{4}\b', user_input)
        if match_tw:
            ticker = match_tw.group(0) + ".TW"
        else:
            # Fallback: Check for common known tickers in valid uppercase
            # Heuristic: Uppercase word, 2-5 chars, not in ignore list
            ignore_list = ["THE", "AND", "FOR", "WHO", "WHAT", "WHY", "HOW", "ARE", "YOU", "CAN", "NOT", "YES", "AI", "RAG", "LLM", "API"]
            words = [w.strip(".,?!") for w in user_input.split()]
            for w in words:
                if w.isupper() and 2 <= len(w) <= 5 and w not in ignore_list and w.isalpha():
                    # Check if it *looks* like a ticker (very rough)
                    # Ideally we would check against a DB of symbols, but for now we assume it is if user highlighted it
                    ticker = w
                    break
    
    # --- 2. Fetch Stock Data (Real-time) ---
    stock_info = ""
    if ticker:
        try:
            # Fetch 1mo data to calculate basic indicators
            df = await finance.get_stock_data(ticker, period="1mo")
            if not df.empty:
                current_price = df['Close'].iloc[-1]
                prev_price = df['Close'].iloc[-2] if len(df) > 1 else current_price
                change = ((current_price - prev_price) / prev_price) * 100
                
                # Calculate RSI on the fly
                df_indic = finance.calculate_indicators(df)
                rsi = df_indic['RSI'].iloc[-1] if 'RSI' in df_indic else "N/A"
                macd = df_indic['MACD'].iloc[-1] if 'MACD' in df_indic else "N/A"
                
                stock_info = f"""
[Real-time Market Data for {ticker}]
- Price: {current_price:.2f}
- Change: {change:.2f}%
- RSI (14): {rsi:.2f}
- MACD: {macd:.2f}
"""
                context_str += stock_info
            else:
                 context_str += f"[System] Could not fetch data for ticker: {ticker} (might be invalid or network issue)\n"
        except Exception as e:
            print(f"Stock Fetch Error: {e}")

    # --- 3. Fetch Relevant News (Keyword Search vs Latest) ---
    context_str += "Recent Market News:\n"
    try:
        query = select(models.News).order_by(models.News.published_at.desc())
        
        # If we identified a ticker, filter news by it (simple LIKE query)
        if ticker:
            # Remove .TW for search string (e.g. 2330.TW -> 2330)
            search_term = ticker.replace(".TW", "")
            query = query.filter(models.News.title.ilike(f"%{search_term}%"))
            query = query.limit(5) # Get top 5 specific
        else:
            query = query.limit(10) # Get top 10 general
            
        result = await db.execute(query)
        news_items = result.scalars().all()
        
        if not news_items and ticker:
             # Fallback: If no specific news found, get general latest news
             context_str += f"(No specific news found for {ticker}, showing latest general headlines)\n"
             result = await db.execute(select(models.News).order_by(models.News.published_at.desc()).limit(5))
             news_items = result.scalars().all()

        for n in news_items:
            date_str = n.published_at.strftime('%Y-%m-%d') if n.published_at else "N/A"
            context_str += f"- [{date_str}] {n.title} (Sentiment: {n.sentiment})\n"
            
    except Exception as db_err:
        print(f"Context Fetch Error: {db_err}")
        context_str += "(News database unavailable)\n"

    try:
        # Try preferred model: gemini-2.0-flash-lite-001
        model = genai.GenerativeModel('gemini-2.0-flash-lite-001')
        
        # Enhanced Prompt with Structured Engineering
        system_instruction = f"""
# ROLE & TASK
You are an expert financial analyst AI for the 'AI Invest Platform'. Your task is to provide accurate, data-backed investment insights based STRICTLY on the provided context. You must analyze market data and news to answer user queries professionally.

# CONTEXT
The following is the ONLY real-time data and news you have access to. Do not hallucinate external information not present here.
{context_str}

# INSTRUCTIONS
1. Analyze the User Question to understand the intent (e.g., price check, sentiment analysis, summary).
2. "Chain of Thought": 
   - First, scan the "Real-time Market Data" for relevant price indicators (RSI, MACD, etc.).
   - Second, read the "Recent Market News" for sentiment drivers.
   - Third, synthesize these two sources to form an answer.
3. Answer the question using the data found.
4. If the provided context is insufficient, state clearly what is missing rather than making up facts.

# CONSTRAINTS & FORMAT
- Language: STRICTLY output in the SAME language as the User Question (e.g., Traditional Chinese for Chinese input, English for English input).
- Tone: Professional, objective, and concise. No conversational filler.
- Formatting: Use Markdown (bullet points, bold text for numbers/tickers).
- Safety: Do not provide financial advice (e.g., "You must buy now"). Instead, say "indicators suggest a bullish trend" or "market sentiment is positive".

# USER QUESTION
{user_input}
"""
        response = await asyncio.to_thread(model.generate_content, system_instruction)
        return {"response": response.text}
        
    except Exception as e:
        error_str = str(e)
        print(f"Gemini Primary Error: {error_str}")
        
        # Check Rate Limit
        if "429" in error_str:
             return {"response": "AI 助理目前休息中（達到免費額度上限），請一分鐘後再試！"}
        
        # Fallback for 404 (Model Not Found) -> Try gemini-pro
        if "404" in error_str or "not found" in error_str.lower():
            try:
                print("Attempting fallback to 'gemini-pro'...")
                fallback_model = genai.GenerativeModel('gemini-pro')
                response = await asyncio.to_thread(fallback_model.generate_content, system_instruction)
                return {"response": response.text + "\n\n(Fallback: used gemini-pro)"}
            except Exception as e2:
                print(f"Gemini Fallback Error: {e2}")
    
        return {"response": "AI 暫時無法回應，請檢查後端日誌以獲取更多資訊。"}
        
import asyncio

@router.post("/chat")
async def chat_with_ai(message: schemas.ChatMessage, db: AsyncSession = Depends(get_db)):
    return await get_ai_assistant_response(message.content, db)
