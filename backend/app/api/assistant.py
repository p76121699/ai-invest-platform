
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
        # Try preferred model: gemini-1.5-flash
        model = genai.GenerativeModel('gemini-1.5-flash-latest')
        prompt = f"你是一位專業的投資助理，請針對以下問題提供建議：{user_input}"
        response = await asyncio.to_thread(model.generate_content, prompt)
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
                response = await asyncio.to_thread(fallback_model.generate_content, prompt)
                return {"response": response.text + "\n\n(Fallback: used gemini-pro)"}
            except Exception as e2:
                print(f"Gemini Fallback Error: {e2}")
                # Log available models for debugging
                try:
                    for m in genai.list_models():
                        if 'generateContent' in m.supported_generation_methods:
                            print(f"Available Model: {m.name}")
                except:
                    pass
                    
        return {"response": "AI 暫時無法回應，請檢查後端日誌以獲取更多資訊。"}
        
import asyncio

@router.post("/chat")
async def chat_with_ai(message: schemas.ChatMessage):
    return await get_ai_assistant_response(message.content)
