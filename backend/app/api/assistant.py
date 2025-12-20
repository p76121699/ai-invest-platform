
from fastapi import APIRouter, Body, Depends
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
import httpx
import json
import re
import asyncio
from datetime import datetime
from app.database import get_db
from app import models
from app.services.finance import get_stock_data, calculate_indicators

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    model: str = "llama3.2" # Default

class ChatResponse(BaseModel):
    response: str

OLLAMA_URL = "http://localhost:11434/api/generate"

async def extract_context(message: str, db: AsyncSession):
    context_str = "Context:\n"
    
    # 1. Ticker Extraction (Match $AAPL or just AAPL if uppercase and 2-5 chars, but strict $ is safer to avoid confusion with text)
    # User said: "請幫我比較 $AAPL$ 和 $MSFT$..."
    tickers = re.findall(r'\$?([A-Z]{2,5})', message.upper())
    # Clean duplicates
    tickers = list(set(tickers))
    
    if tickers:
        context_str += "Stock Data:\n"
        for t in tickers:
             try:
                 df = await get_stock_data(t, period="6mo")
                 if not df.empty:
                     df = calculate_indicators(df)
                     latest = df.iloc[-1]
                     context_str += f"- {t}: Price {latest['Close']:.2f}, RSI {latest['RSI']:.2f}, MA20 {latest['SMA_20']:.2f}\n"
             except:
                 pass
    
    # 2. News (Always fetch top 3 market news for general sentiment)
    # Using simple query
    result = await db.execute(select(models.News).order_by(models.News.published_at.desc()).limit(3))
    news_items = result.scalars().all()
    if news_items:
        context_str += "Recent News:\n"
        for n in news_items:
            context_str += f"- [{n.source}] {n.title} (Sentiment: {n.sentiment})\n"
            
    return context_str

@router.post("/chat")
async def chat_with_assistant(request: ChatRequest = Body(...), db: AsyncSession = Depends(get_db)):
    
    # 1. Build Context
    try:
        context = await extract_context(request.message, db)
    except Exception as e:
        context = f"Error fetching context: {e}"

    system_prompt = f"""You are "AI Market Analyst", a professional yet approachable financial guide.

GOALS:
1.  **Helpful & Human**: You can engage in casual conversation, but always try to pivot back to financial insights.
2.  **No Sales Pressure**: Do not market "AI Invest" aggressively. You are a neutral tool.
3.  **Data-First**: When asked about stocks/news, prioritize the provided Context.
4.  **Format**: Use Markdown.
5.  **Language**: Always answer in the same language as the User's question. If the user asks in Traditional Chinese, answer in Traditional Chinese.

CONTEXT:
{context}
"""

    prompt = f"User Question: {request.message}"
    
    payload = {
        "model": request.model,
        "prompt": f"{system_prompt}\n{prompt}",
        "stream": True
    }
    
    async def event_generator():
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream("POST", OLLAMA_URL, json=payload) as response:
                    if response.status_code != 200:
                         yield json.dumps({"response": "Error: Ollama service is unavailable."})
                         return

                    async for line in response.aiter_lines():
                        if line:
                            try:
                                data = json.loads(line)
                                if "response" in data:
                                    # Send simplistic JSON stream or just raw text?
                                    # Standard event stream usually sends "data: ..."
                                    # But for simplicity let's just send the text chunk
                                    yield data["response"]
                            except:
                                pass
        except Exception as e:
            # Fallback Mock
            yield "Ollama is currently offline. (Switched to Mock Mode)\n\n"
            yield "Based on my analysis of the available data (Mock):\n"
            yield "- **AAPL**: Strong buy signal based on RSI divergence.\n"
            yield "- **Market**: Overall bullish trend observed."

    return StreamingResponse(event_generator(), media_type="text/plain")
