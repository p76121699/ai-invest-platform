
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
        model = genai.GenerativeModel('gemini-2.5-flash-lite')
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
        # Disable retries to avoid long waits on Rate Limit (429)
        from google.api_core import retry
        intent_resp = await asyncio.to_thread(
            model.generate_content, 
            intent_prompt,
            request_options={'retry': retry.Retry(predicate=lambda x: False)}
        )
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
             # 1. Try Strict Keyword Match
             # e.g. "Apple" -> "%Apple%"
             query = query.filter(models.News.title.ilike(f"%{search_term}%"))
             
             # Check if we get results with this strict filter
             # This is a bit complex in one query object. 
             # Simpler approach: Just use the filter. 
             # If the user quoted a LONG sentence "沙崙資安大樓火警...", ILIKE might fail if DB has "沙崙資安大樓火警" (partial).
             # So we should probably use substantial overlap or just truncate the search term if it's very long.
             if len(search_term) > 20: 
                 # Heuristic: If search term is a long sentence, take the first 10 chars as key
                 # This assumes the important part is at the start (common in headlines)
                 short_term = search_term[:10]
                 query = select(models.News).order_by(models.News.published_at.desc()).filter(models.News.title.ilike(f"%{short_term}%"))
             
             query = query.limit(5)
        elif ticker:
             clean_ticker = ticker.replace(".TW", "")
             query = query.filter(models.News.title.ilike(f"%{clean_ticker}%"))
             query = query.limit(5)
        else:
             query = query.limit(10)
            
        result = await db.execute(query)
        news_items = result.scalars().all()
        print(f"[DEBUG] Search '{search_term or ticker}' -> Found {len(news_items)} items")

        enable_google_search = False
        
        # Fallback logic: If specific search yielded nothing, show General News BUT enable Google Search
        if not news_items and (search_term or ticker):
             enable_google_search = True
             context_str += f"(No specific news found in local DB for '{search_term or ticker}', enabling Google Search...)\n"
             result = await db.execute(select(models.News).order_by(models.News.published_at.desc()).limit(3))
             news_items = result.scalars().all()
        
        elif not news_items:
             # Just general news if no search term
             result = await db.execute(select(models.News).order_by(models.News.published_at.desc()).limit(5))
             news_items = result.scalars().all()

        for n in news_items:
            date_str = n.published_at.strftime('%Y-%m-%d') if n.published_at else "N/A"
            
            # Prepare content/summary
            # PRIORITY CHANGE: Try to get full content from content_html first, as RSS summary is often too short.
            content_body = ""
            if n.content_html:
                content_body = re.sub(r'<[^>]+>', '', n.content_html).strip()
            
            # Fallback to summary if content extraction failed or is too short
            if not content_body or len(content_body) < 50:
                content_body = n.summary or ""

            # Truncate to avoid context overflow 
            # Increased limit to 1000 chars to ensure details (like "four pillars") are included
            if content_body and len(content_body) > 1000:
                content_body = content_body[:1000] + "..."
            elif not content_body:
                content_body = "(No content available)"

            print(f"[DEBUG] Adding News to Context: {n.title} (Len: {len(content_body)})")
            context_str += f"- [{date_str}] Title: {n.title}\n  Sentiment: {n.sentiment}\n  Summary: {content_body}\n\n"
            
    except Exception as db_err:
        print(f"Context Fetch Error: {db_err}")
    
    # DEBUG: Print full context to see what LLM sees
    print(f"--- [DEBUG] FINAL CONTEXT ---\n{context_str}\n-----------------------------")

    # --- Step 4: Generate Final Response ---
    try:
        # Revert to stable model that supports tools
        model = genai.GenerativeModel('gemini-2.5-flash-lite')
        
        system_instruction = f"""
# ROLE & TASK
You are an expert financial analyst AI for the 'AI Invest Platform'.
Your goal is to answer the user's question using the provided context.

# STRICT CONSTRAINTS
1. **LANGUAGE**: You MUST answer in {user_lang}. Do NOT use English if the user asked in Chinese.
2. **DATA**: Priority 1: Use provided Real-time Market Data and Local News. Priority 2: If local data is insufficient, use Google Search to find relevant latest information.
3. **HONESTY**: If you don't have the data (and Google Search fails), say "I couldn't retrieve the data" in {user_lang}.

# CONTEXT
{context_str}

# USER QUESTION
{user_input}
"""
        # Configure Tools dynamically
        tools = []
        if enable_google_search:
            tools = 'google_search_retrieval'
            print(f"[DEBUG] Enabling Gemini Grounding (Google Search) for query: {search_term or ticker}")

        response = await asyncio.to_thread(
            model.generate_content, 
            system_instruction,
            tools=tools if enable_google_search else None,
            request_options={'retry': retry.Retry(predicate=lambda x: False)}
        )
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
