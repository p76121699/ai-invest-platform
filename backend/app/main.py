from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, news, backtest, assistant, stocks
from app.core.config import settings
from app.services.crawler import fetch_and_process_news
from app.database import SessionLocal
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from contextlib import asynccontextmanager

scheduler = AsyncIOScheduler()

async def scheduled_news_crawl():
    print("Running scheduled news crawl...")
    async with SessionLocal() as db:
        await fetch_and_process_news(db)
    print("Scheduled crawl finished.")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create Tables (Simple migration alternative for MVP)
    from app.database import engine, Base
    from sqlalchemy import text
    async with engine.begin() as conn:
        # Require pg_trgm extension for GIN index on News title (PostgreSQL only)
        if engine.dialect.name == "postgresql":
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm;"))
        await conn.run_sync(Base.metadata.create_all)
    
    # Startup
    scheduler.add_job(scheduled_news_crawl, 'interval', minutes=60)
    scheduler.start()
    print("Scheduler started (News crawl every 60 mins).")
    yield
    # Shutdown
    scheduler.shutdown()

app = FastAPI(title="AI Invest API", version="0.1.0", lifespan=lifespan)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost",
        "http://127.0.0.1:3000",
        "https://ai-invest-platform.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(news.router, prefix=f"{settings.API_V1_STR}/news", tags=["news"])
app.include_router(backtest.router, prefix=f"{settings.API_V1_STR}/backtest", tags=["backtest"])
app.include_router(assistant.router, prefix=f"{settings.API_V1_STR}/assistant", tags=["assistant"])
app.include_router(stocks.router, prefix=f"{settings.API_V1_STR}/stocks", tags=["stocks"])
from app.api import dashboard
app.include_router(dashboard.router, prefix=f"{settings.API_V1_STR}/dashboard", tags=["dashboard"])
from app.api import portfolio
app.include_router(portfolio.router, prefix=f"{settings.API_V1_STR}/portfolio", tags=["portfolio"])

@app.get("/")
def read_root():
    return {"message": "AI Invest API is running"}

@app.api_route("/health", methods=["GET", "HEAD"])
async def health_check():
    return {"status": "alive"}
