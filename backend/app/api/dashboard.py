from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from app import models
from app.database import get_db
from app.services import finance
import datetime

router = APIRouter()

@router.get("/stats")
async def get_dashboard_stats(db: AsyncSession = Depends(get_db)):
    """
    Get aggregated statistics for the main dashboard:
    1. Market Sentiment (from News)
    2. Top Movers (from Predefined Stock List)
    3. Volatility Index (^VIX)
    """
    
    # 1. Market Sentiment
    # Calculate average sentiment of last 50 news items
    sentiment_val = 0.0
    sentiment_label = "Neutral"
    article_count = 0
    
    try:
        # Fetch last 50 news
        result = await db.execute(
            select(models.News.sentiment)
            .order_by(models.News.published_at.desc())
            .limit(50)
        )
        sentiments = result.scalars().all()
        
        # Filter out None values
        valid_sentiments = [s for s in sentiments if s is not None]
        article_count = len(valid_sentiments)
        
        if article_count > 0:
            avg_sentiment = sum(valid_sentiments) / article_count
            sentiment_val = avg_sentiment
            
            if avg_sentiment > 0.15:
                sentiment_label = "Bullish"
            elif avg_sentiment < -0.15:
                sentiment_label = "Bearish"
            else:
                sentiment_label = "Neutral"
    except Exception as e:
        print(f"Sentiment Calc Error: {e}")

    # 2. Top Movers
    # Predefined list of market leaders to scan
    tickers = ["NVDA", "TSLA", "AAPL", "AMD", "MSFT", "AMZN", "GOOGL", "META", "2330.TW"]
    top_movers = []
    
    try:
        quotes = await finance.get_multiple_quotes(tickers)
        # Filter out errors
        valid_quotes = [q for q in quotes if not q.get("error")]
        
        # Sort by absolute change percent to find biggest movers (up or down)
        sorted_quotes = sorted(valid_quotes, key=lambda x: abs(x['change_percent']), reverse=True)
        top_movers = sorted_quotes[:2] # Top 2
        
    except Exception as e:
        print(f"Top Movers Error: {e}")

    # 3. Volatility Index (VIX)
    vix_val = "N/A"
    vix_label = "Unknown"
    
    try:
        df_vix = await finance.get_stock_data("^VIX", period="5d")
        if not df_vix.empty:
            last_close = df_vix['Close'].iloc[-1]
            vix_val = f"{last_close:.1f}"
            
            if last_close < 15:
                vix_label = "Low Volatility"
            elif last_close < 25:
                vix_label = "Normal Volatility"
            else:
                vix_label = "High Volatility"
    except Exception as e:
        print(f"VIX Error: {e}")

    return {
        "sentiment": {
            "value": sentiment_label,
            "score": round(sentiment_val, 2),
            "article_count": article_count
        },
        "top_movers": top_movers,
        "volatility": {
            "value": vix_val,
            "label": vix_label
        }
    }
