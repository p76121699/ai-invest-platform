import asyncio
from app.core.celery_app import celery_app
from app.services.crawler import fetch_and_process_news
from app.database import AsyncSessionLocal

@celery_app.task
def run_crawler():
    """
    Celery task to run the async crawler.
    Since Celery is synchronous, we use asyncio.run() to execute the async crawler function.
    """
    async def _runner():
        async with AsyncSessionLocal() as db:
            print("Worker: Starting News Crawl...")
            stats = await fetch_and_process_news(db)
            print(f"Worker: Crawl Finished. Stats: {stats}")
            return stats

    return asyncio.run(_runner())
