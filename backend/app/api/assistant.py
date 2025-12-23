
from fastapi import APIRouter, HTTPException
from app import schemas
from app.core.config import settings
import google.generativeai as genai
import os

router = APIRouter()

# Configure Gemini
if settings.GOOGLE_API_KEY:
    genai.configure(api_key=settings.GOOGLE_API_KEY)

async def get_ai_assistant_response(user_input: str):
    if not settings.GOOGLE_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API Key not configured")
    
    try:
        # User requested gemini-1.5-flash
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Role Prompt
        prompt = f"你是一位專業的投資助理，請針對以下問題提供建議：{user_input}"
        
        # Async generation isn't strictly presented in the snippet, but run_in_executor is safer for sync calls
        # However, google-generativeai 'generate_content' is sync.
        # For a simple implementation as requested, we can call it directly or wrapping in to_thread is better practice.
        # But per user snippet: response = model.generate_content(prompt)
        # We will follow the logic structure provided.
        
        response = model.generate_content(prompt)
        return {"response": response.text}
        
    except Exception as e:
        # Check Rate Limit
        if "429" in str(e):
             return {"response": "AI 助理目前休息中（達到免費額度上限），請一分鐘後再試！"}
        print(f"Gemini Error: {e}")
        return {"response": "AI 暫時無法回應，請檢查網路連線。"}

@router.post("/chat")
async def chat_with_ai(message: schemas.ChatMessage):
    return await get_ai_assistant_response(message.content)
