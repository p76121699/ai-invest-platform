from fastapi import APIRouter, HTTPException, Query, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.services.finance import get_stock_data, calculate_indicators, get_multiple_quotes
from app import schemas, models
from app.api import deps
from app.database import get_db
from typing import List, Optional
from datetime import datetime, timedelta
import pandas as pd

router = APIRouter()

@router.get("/quotes", response_model=List[schemas.StockQuote])
async def get_quotes(tickers: str = Query(..., description="Comma separated tickers, e.g. AAPL,MSFT")):
    ticker_list = [t.strip() for t in tickers.split(',')]
    quotes = await get_multiple_quotes(ticker_list)
    return quotes

@router.get("/quote", response_model=schemas.StockQuote)
async def get_quote(ticker: str):
    # Backward compatibility / single fetch
    quotes = await get_multiple_quotes([ticker])
    if not quotes:
        raise HTTPException(status_code=404, detail="Ticker not found")
    return quotes[0]

@router.get("/indicators", response_model=schemas.StockIndicator)
async def get_indicators(ticker: str):
    # This remains similar but needs async fetching
    df = await get_stock_data(ticker, period="6mo")
    
    if df.empty:
        raise HTTPException(status_code=404, detail="Data not found for ticker")
        
    df = calculate_indicators(df)
    latest = df.iloc[-1]
    
    return {
        "rsi": round(latest['RSI'], 2),
        "macd": round(latest['MACD'], 2),
        "sma20": round(latest['SMA_20'], 2),
        "sma50": round(latest['SMA_50'], 2)
    }

@router.get("/history", response_model=schemas.StockHistory)
async def get_history(ticker: str, period: str = "1y"):
    # Calculate Dates based on period
    end_dt = datetime.now()
    start_dt = end_dt
    
    # Simple period parser
    if period == "1y":
        start_dt = end_dt - timedelta(days=365)
    elif period == "2y":
        start_dt = end_dt - timedelta(days=365*2)
    elif period == "6mo":
        start_dt = end_dt - timedelta(days=180)
    elif period == "3mo":
        start_dt = end_dt - timedelta(days=90)
    elif period == "1mo":
        start_dt = end_dt - timedelta(days=30)
    else:
        # Fallback for unknown periods or just use yfinance default (but no warm-up)
        df = await get_stock_data(ticker, period=period)
        if df.empty:
            raise HTTPException(status_code=404, detail="Data not found")
        df = calculate_indicators(df)
        # Convert index to column
        df.reset_index(inplace=True)
        # ... (rest of serialization)
        # Let's handle the serialization once below
        return format_history_response(ticker, df)

    # 2. Add Buffer (90 days)
    buffer_dt = start_dt - timedelta(days=90)
    fetch_start = buffer_dt.strftime("%Y-%m-%d")
    fetch_end = end_dt.strftime("%Y-%m-%d")
    
    # 3. Fetch Data
    df = await get_stock_data(ticker, start=fetch_start, end=fetch_end)
    
    if df.empty:
         raise HTTPException(status_code=404, detail="Data not found")
         
    # 4. Calculate indicators (on buffered data)
    df = calculate_indicators(df)

    # 5. Slice back to requested period
    # Ensure index is datetime
    if not isinstance(df.index, pd.DatetimeIndex):
         df.index = pd.to_datetime(df.index)
    
    # Slice
    if df.index.tz is not None:
        df.index = df.index.tz_localize(None)
    
    df = df[df.index >= start_dt]
    
    # 6. Format Response
    df.reset_index(inplace=True)
    return format_history_response(ticker, df)

def format_history_response(ticker, df):
    
    history_points = []
    for _, row in df.iterrows():
        history_points.append({
            "Date": row['Date'].strftime("%Y-%m-%d"),
            "Open": row['Open'],
            "High": row['High'],
            "Low": row['Low'],
            "Close": row['Close'],
            "Volume": int(row['Volume']),
            "ma20": row.get('SMA_20'),
            "ma50": row.get('SMA_50'),
            "rsi": row.get('RSI'),
            "macd": row.get('MACD')
        })
        
    return {"ticker": ticker, "history": history_points}

# --- Watchlist API ---

@router.get("/watchlist", response_model=List[str])
async def get_watchlist(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    # Fetch user's watchlist
    # Because of lazy loading relationship, we might need select options or direct query
    result = await db.execute(select(models.Watchlist).where(models.Watchlist.user_id == current_user.id))
    items = result.scalars().all()
    return [item.ticker for item in items]

@router.post("/watchlist", response_model=List[str])
async def add_to_watchlist(
    item: schemas.WatchlistItem,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    # Check if exists
    result = await db.execute(
        select(models.Watchlist).where(
            models.Watchlist.user_id == current_user.id,
            models.Watchlist.ticker == item.ticker
        )
    )
    if result.scalars().first():
        # Already exists, just return list
        pass
    else:
        new_item = models.Watchlist(user_id=current_user.id, ticker=item.ticker)
        db.add(new_item)
        await db.commit()
    
    # Return updated list
    return await get_watchlist(db, current_user)

@router.delete("/watchlist/{ticker}", response_model=List[str])
async def remove_from_watchlist(
    ticker: str,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    result = await db.execute(
        select(models.Watchlist).where(
            models.Watchlist.user_id == current_user.id,
            models.Watchlist.ticker == ticker
        )
    )
    item = result.scalars().first()
    if item:
        await db.delete(item)
        await db.commit()
        
    return await get_watchlist(db, current_user)
