
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

async def get_ai_assistant_response(user_input: str, db: AsyncSession):
    if not settings.GOOGLE_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API Key not configured")
    
    # 1. Fetch Latest News for Context
    context_str = f"Today's Date: {datetime.now().strftime('%Y-%m-%d')}\n\nLatest Market News:\n"
    try:
        result = await db.execute(select(models.News).order_by(models.News.published_at.desc()).limit(5))
        news_items = result.scalars().all()
        for n in news_items:
            date_str = n.published_at.strftime('%Y-%m-%d') if n.published_at else "N/A"
            context_str += f"- [{date_str}] {n.title} (Sentiment: {n.sentiment})\n"
    except Exception as db_err:
        print(f"Context Fetch Error: {db_err}")
        context_str += "(News database unavailable)\n"

    try:
        # Try preferred model: gemini-3-flash-preview (User's choice)
        model = genai.GenerativeModel('gemini-3-flash-preview')
        
        # Enhanced Prompt with Context
        system_instruction = f"""
You are an advanced AI Investment Assistant.
Context:
{context_str}

User Question: {user_input}

Please answer the user's question based on the provided latest market news and date. 
If the news is relevant to the question, verify the facts against the provided date.
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
