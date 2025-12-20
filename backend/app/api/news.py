from fastapi import APIRouter, Depends, BackgroundTasks
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app import schemas, models
from app.database import get_db
import datetime
import uuid

router = APIRouter()

@router.get("", response_model=List[schemas.News]) # /news
async def get_latest_news(limit: int = 50, skip: int = 0, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.News).order_by(models.News.published_at.desc()).offset(skip).limit(limit))
    news_items = result.scalars().all()
    return news_items

@router.get("/{news_id}", response_model=schemas.NewsDetail)
async def get_news_detail(news_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.News).where(models.News.id == news_id))
    news_item = result.scalars().first()
    if not news_item:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="News not found")
    
    # Map link to url for frontend compatibility if needed, or schema handles it
    news_item.url = news_item.link 
    return news_item

@router.post("/refresh")
async def refresh_news(
    background_tasks: BackgroundTasks, 
    db: AsyncSession = Depends(get_db)
):
    from app.services.crawler import fetch_and_process_news
    
    # Run in background to avoid valid timeout
    async def run_crawler_bg(session: AsyncSession):
        try:
             # We need a new session or manage the existing one carefully in bg.
             # Actually, Passing 'db' (Dependency) to background might close it prematurely?
             # No, Depends(get_db) yields, so we should probably create a new session scope for the background task
             # OR use a helper that creates session.
             # Ideally fetch_and_process_news takes a session. 
             # Let's create a new SessionLocal() inside the background wrapper.
             from app.database import SessionLocal
             async with SessionLocal() as bg_db:
                 await fetch_and_process_news(bg_db)
        except Exception as e:
            print(f"Background crawler failed: {e}")

    background_tasks.add_task(run_crawler_bg, db)
    return {"message": "News refresh started in background"}
