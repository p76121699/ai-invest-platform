
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
    
    # --- 1. Intelligent Intent Extraction ---
    # Goal: Extract 'ticker' (for stock data) and 'search_term' (for news)
    ticker = None
    search_term = None
    
    # A. Check for quoted text (Specific News Search)
    # e.g. 請告訴我 "AI agents ready" 的重點
    quote_match = re.search(r'["\'](.*?)["\']', user_input)
    if quote_match:
        search_term = quote_match.group(1)
    
    # B. Extract potential tickers using Regex (Alphanumeric only)
    # This handles "apple股價" -> "apple"
    tokens = re.findall(r'[a-zA-Z0-9]+', user_input)
    
    # Filter tokens to find likely tickers
    # Common words to ignore when guessing tickers from text
    ignore_list = {"THE", "AND", "FOR", "WHO", "WHAT", "WHY", "HOW", "ARE", "YOU", "CAN", "NOT", "YES", "AI", "RAG", "LLM", "API", "STOCK", "PRICE", "NEWS", "LATEST"}
    
    for token in tokens:
        candidate = token.upper()
        # 1. Check if it's a known pattern
        if candidate.startswith("$"):
            ticker = candidate[1:]
            break
        # 2. Check if it looks like a TW stock (4 digits)
        if re.match(r'^\d{4}$', candidate):
            ticker = f"{candidate}.TW"
            break
        # 3. Check for standard US Tickers (exclude common words)
        if len(candidate) >= 2 and len(candidate) <= 5 and candidate not in ignore_list and not candidate.isdigit():
             # Assume it's a ticker (e.g. APPLE -> AAPL mapping would be better, but direct use is okay for now)
             # For "apple", yfinance often resolves valid names or we accept "APPLE" as ticker? 
             # yfinance needs AAPL for Apple. But "TSLA" works. 
             # "apple" -> yfinance might fail if it expects symbols. 
             # Improving heuristic: Prefer obviously ticker-like words.
             # If user types "apple", we try to use it.
             ticker = candidate
             break

    # --- 2. Fetch Stock Data (Real-time) ---
    stock_info = ""
    if ticker:
        try:
            # Fetch 1mo data to calculate basic indicators
            df = await finance.get_stock_data(ticker, period="1mo")
            
            # If failed, try appending .TW (if 4 digits) or just give up
            if df.empty and ticker.isdigit() and len(ticker) == 4 and not ticker.endswith(".TW"):
                 df = await finance.get_stock_data(f"{ticker}.TW", period="1mo")
            
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
                 # Don't pollute context with error messages, just strictly don't show data
                 pass
        except Exception as e:
            print(f"Stock Fetch Error: {e}")

    # --- 3. Fetch Relevant News ---
    context_str += "Recent Market News:\n"
    try:
        query = select(models.News).order_by(models.News.published_at.desc())
        
        # Priority 1: Quoted Search Term
        if search_term:
            query = query.filter(models.News.title.ilike(f"%{search_term}%"))
            query = query.limit(3)
        # Priority 2: Ticker Related
        elif ticker:
            # Remove .TW for search string (e.g. 2330.TW -> 2330)
            clean_ticker = ticker.replace(".TW", "")
            query = query.filter(models.News.title.ilike(f"%{clean_ticker}%"))
            query = query.limit(5)
        else:
            query = query.limit(10) # Get top 10 general
            
        result = await db.execute(query)
        news_items = result.scalars().all()
        
        # Fallback logic: If specific search yielded nothing, show General News
        if not news_items and (search_term or ticker):
             context_str += f"(No specific news found for '{search_term or ticker}', showing latest general headlines)\n"
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
