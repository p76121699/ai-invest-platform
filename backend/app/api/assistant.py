
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

    # --- Step 1: Intent Analysis (The "Smart" Agent) ---
    # We use the LLM to extract Ticker and Language instead of fragile Regex
    intent_data = {"ticker": None, "search_term": None, "language": "Traditional Chinese"}
    
    try:
        model = genai.GenerativeModel('gemini-2.0-flash-lite-001')
        intent_prompt = f"""
        Analyze the following user query and extract key information in JSON format.
        
        Query: "{user_input}"
        
        Requirements:
        1. "ticker": Extract the stock ticker symbol if a company is mentioned. 
           - Convert company names to symbols (e.g., "Apple" -> "AAPL", "輝達" -> "NVDA", "台積電" -> "2330.TW", "鴻海" -> "2317.TW").
           - If it's a Taiwan stock, append ".TW".
           - If no company/stock is mentioned, return null.
        2. "search_term": Extract the main subject for news search.
        3. "language": Detect the language of the query (e.g., "Traditional Chinese", "English").
        
        Output format: JSON only.
        {{
            "ticker": "AAPL",
            "search_term": "Apple",
            "language": "English"
        }}
        """
        # Generate Intent
        intent_resp = await asyncio.to_thread(model.generate_content, intent_prompt)
        text = intent_resp.text.strip()
        # Simple cleanup to ensure JSON parsing
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]
            
        import json
        intent_data = json.loads(text)
        print(f"DEBUG: Intent Detected -> {intent_data}")
        
    except Exception as e:
        print(f"Intent Analysis Failed: {e}")
        # Fallback to defaults if LLM analysis fails
        pass

    ticker = intent_data.get("ticker")
    search_term = intent_data.get("search_term")
    user_lang = intent_data.get("language", "Traditional Chinese")
    
    # --- Step 2: Fetch Real-time Data ---
    context_str = f"Today's Date: {datetime.now().strftime('%Y-%m-%d')}\n\n"
    
    stock_info = ""
    if ticker:
        try:
            # Fetch 1mo data to calculate basic indicators
            df = await finance.get_stock_data(ticker, period="1mo")
            if not df.empty:
                current_price = df['Close'].iloc[-1]
                prev_price = df['Close'].iloc[-2] if len(df) > 1 else current_price
                change = ((current_price - prev_price) / prev_price) * 100
                
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
                 pass
        except Exception as e:
            print(f"Stock Fetch Error: {e}")

    # --- Step 3: Fetch News ---
    context_str += "Recent Market News:\n"
    try:
        query = select(models.News).order_by(models.News.published_at.desc())
        
        if search_term and str(search_term).lower() != "null":
             # Use the LLM-extracted search term
             query = query.filter(models.News.title.ilike(f"%{search_term}%"))
             query = query.limit(5)
        elif ticker:
             clean_ticker = ticker.replace(".TW", "")
             query = query.filter(models.News.title.ilike(f"%{clean_ticker}%"))
             query = query.limit(5)
        else:
             query = query.limit(10)
            
        result = await db.execute(query)
        news_items = result.scalars().all()
        
        if not news_items and (search_term or ticker):
             context_str += f"(No specific news found for '{search_term or ticker}', showing latest general headlines)\n"
             result = await db.execute(select(models.News).order_by(models.News.published_at.desc()).limit(5))
             news_items = result.scalars().all()

        for n in news_items:
            date_str = n.published_at.strftime('%Y-%m-%d') if n.published_at else "N/A"
            context_str += f"- [{date_str}] {n.title} (Sentiment: {n.sentiment})\n"
            
    except Exception as db_err:
        print(f"Context Fetch Error: {db_err}")

    # --- Step 4: Generate Final Response ---
    try:
        model = genai.GenerativeModel('gemini-2.0-flash-lite-001')
        
        system_instruction = f"""
# ROLE & TASK
You are an expert financial analyst AI for the 'AI Invest Platform'.
Your goal is to answer the user's question using the provided context.

# STRICT CONSTRAINTS
1. **LANGUAGE**: You MUST answer in {user_lang}. Do NOT use English if the user asked in Chinese.
2. **DATA**: Use the provided Real-time Market Data and News.
3. **HONESTY**: If you don't have the data (e.g. stock price is missing), say "I couldn't retrieve the real-time data for [Company]" in {user_lang}, do not make up numbers.

# CONTEXT
{context_str}

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
