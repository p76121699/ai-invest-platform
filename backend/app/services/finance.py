import yfinance as yf
import pandas as pd
import numpy as np
import asyncio
from datetime import datetime, timedelta

# Simple Memory Cache: {ticker_period: (timestamp, df)}
STOCK_CACHE = {}
CACHE_TTL = 60 # seconds

def fetch_yfinance_sync(ticker: str, period: str = "1y", interval: str = "1d", start: str = None, end: str = None):
    # Cache Check (Include start/end in key)
    key = f"{ticker}_{period}_{interval}_{start}_{end}"
    now = datetime.now()
    if key in STOCK_CACHE:
        ts, data = STOCK_CACHE[key]
        if (now - ts).total_seconds() < CACHE_TTL:
            return data
            
    try:
        # 1. Try to use curl_cffi for browser impersonation (Strong Anti-Bot)
        session = None
        try:
            from curl_cffi import requests as cffi_requests
            session = cffi_requests.Session(impersonate="chrome")
        except ImportError:
            pass

        # 2. Initialize Ticker with the session (if available)
        stock = yf.Ticker(ticker, session=session)
        
        # Assuming run_backtest and get_stock_data use consistent arguments
        if start and end:
            df = stock.history(start=start, end=end, interval=interval)
        else:
             df = stock.history(period=period, interval=interval)
        
        # Retry with .TW if empty and looks like a TW code (4 digits)
        if df.empty and ticker.isdigit() and len(ticker) == 4:
            retry_ticker = f"{ticker}.TW"
            print(f"Retrying with {retry_ticker}")
            stock = yf.Ticker(retry_ticker, session=session)
            if start and end:
                df = stock.history(start=start, end=end, interval=interval)
            else:
                df = stock.history(period=period, interval=interval)
            
            # Update key to avoid re-fetching wrong one
            if not df.empty:
                STOCK_CACHE[f"{retry_ticker}_{period}_{interval}_{start}_{end}"] = (now, df)
        
        if not df.empty:
            STOCK_CACHE[key] = (now, df)
        return df
    except Exception as e:
        print(f"YFinance error for {ticker}: {e}")
        return pd.DataFrame()

async def get_stock_data(ticker: str, period="1y", interval="1d", start=None, end=None):
    """
    Async wrapper for fetching stock data with caching.
    """
    df = await asyncio.to_thread(fetch_yfinance_sync, ticker, period, interval, start, end)
    return df

async def get_multiple_quotes(tickers: list[str]):
    """
    Fetch multiple tickers in parallel.
    """
    tasks = [get_stock_data(t.strip().upper(), period="1mo") for t in tickers if t.strip()]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    quotes = []
    # Map results back to tickers
    clean_tickers = [t.strip().upper() for t in tickers if t.strip()]
    
    for i, res in enumerate(results):
        ticker = clean_tickers[i]
        
        # Handle Exception or Empty
        if isinstance(res, Exception) or res.empty:
            quotes.append({
                "ticker": ticker,
                "price": 0.0,
                "change_percent": 0.0,
                "volume": 0,
                "sparkline": [],
                "error": "Invalid Ticker or No Data"
            })
            continue
            
        # Process Valid Data
        df = res
        try:
            latest = df.iloc[-1]
            prev = df.iloc[-2] if len(df) > 1 else latest
            
            change_pct = ((latest['Close'] - prev['Close']) / prev['Close']) * 100
            
            quotes.append({
                "ticker": ticker,
                "price": round(latest['Close'], 2),
                "change_percent": round(change_pct, 2),
                "volume": int(latest['Volume']),
                "sparkline": df['Close'].tolist(),
                "error": None
            })
        except Exception as e:
             quotes.append({
                "ticker": ticker,
                "price": 0.0,
                "change_percent": 0.0,
                "volume": 0,
                "sparkline": [],
                "error": f"Data Error: {str(e)}"
            })
            
    return quotes

def calculate_indicators(df: pd.DataFrame):
    # SMA
    df['SMA_20'] = df['Close'].rolling(window=20).mean()
    df['SMA_50'] = df['Close'].rolling(window=50).mean()
    
    # RSI
    delta = df['Close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / loss
    df['RSI'] = 100 - (100 / (1 + rs))
    
    # MACD
    exp1 = df['Close'].ewm(span=12, adjust=False).mean()
    exp2 = df['Close'].ewm(span=26, adjust=False).mean()
    df['MACD'] = exp1 - exp2
    df['Signal_Line'] = df['MACD'].ewm(span=9, adjust=False).mean()
    
    # Bollinger Bands
    df['BB_Middle'] = df['Close'].rolling(window=20).mean()
    df['BB_Upper'] = df['BB_Middle'] + (df['Close'].rolling(window=20).std() * 2)
    df['BB_Lower'] = df['BB_Middle'] - (df['Close'].rolling(window=20).std() * 2)
    
    return df.fillna(0) # Simple handling for NaN at start

def run_backtest_strategy(ticker: str, strategy: str, params: dict):
    df = get_stock_data(ticker, period="2y") # Fetch enough data
    df = calculate_indicators(df)
    
    signals = []
    position = 0 # 0: flat, 1: long
    entry_price = 0
    trades = []
    equity = [10000.0] # Start with 10k
    
    # Very simple vector or loop backtest
    for i in range(1, len(df)):
        price = df['Close'].iloc[i]
        date = df.index[i].strftime("%Y-%m-%d")
        
        action = None
        
        # Strategies
        if strategy == "sma_crossover":
            # Golden Cross
            if df['SMA_20'].iloc[i] > df['SMA_50'].iloc[i] and df['SMA_20'].iloc[i-1] <= df['SMA_50'].iloc[i-1]:
                if position == 0:
                    action = "buy"
            # Death Cross
            elif df['SMA_20'].iloc[i] < df['SMA_50'].iloc[i] and df['SMA_20'].iloc[i-1] >= df['SMA_50'].iloc[i-1]:
                if position == 1:
                    action = "sell"
                    
        elif strategy == "rsi_reversal":
            if df['RSI'].iloc[i] < 30 and position == 0:
                action = "buy"
            elif df['RSI'].iloc[i] > 70 and position == 1:
                action = "sell"
                
        # Execute
        if action == "buy":
            position = 1
            entry_price = price
            trades.append({"date": date, "action": "buy", "price": round(price, 2)})
        elif action == "sell":
            profit = (price - entry_price) / entry_price
            equity_val = equity[-1] * (1 + profit)
            equity.append(equity_val)
            position = 0
            trades.append({"date": date, "action": "sell", "price": round(price, 2)})
        else:
            if position == 1:
                 # Mark to market equity update roughly
                 change = (price - df['Close'].iloc[i-1]) / df['Close'].iloc[i-1]
                 equity.append(equity[-1] * (1 + change))
            else:
                 equity.append(equity[-1])
                 
    # Metrics
    final_equity = equity[-1]
    total_return = (final_equity - 10000) / 10000
    
    # Calculate Max Drawdown
    equity_series = pd.Series(equity)
    cummax = equity_series.cummax()
    drawdown = (equity_series - cummax) / cummax
    max_dd = drawdown.min()
    
    return {
        "final_equity": final_equity,
        "total_return": total_return,
        "max_drawdown": max_dd,
        "trades": trades,
        "equity_curve": [{"day": i, "equity": val} for i, val in enumerate(equity)]
    }
