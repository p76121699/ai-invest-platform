from datetime import datetime, timedelta
import yfinance as yf
import pandas as pd

def load_price_history(ticker: str, start: str, end: str) -> pd.DataFrame:
    # Auto-append .TW if it's numeric (Taiwan Stock)
    if ticker.isdigit() and not ticker.endswith(".TW"):
        ticker = f"{ticker}.TW"

    # Add 60 days buffer to start date for Warm-up
    try:
        start_dt = datetime.strptime(start, "%Y-%m-%d")
        buffer_dt = start_dt - timedelta(days=90) # 90 days to be safe for EMA/SMA50
        fetch_start = buffer_dt.strftime("%Y-%m-%d")
    except:
        fetch_start = start # Fallback
        
    print(f"Downloading {ticker} from {fetch_start} (Buffer) to {end}")
    
    # Optimized: Single download call to save memory and time
    # Fix for Render: Set a unique cache location for this process to avoid SQLite lock
    import os
    import tempfile
    try:
        cache_dir = os.path.join(tempfile.gettempdir(), f"yf_cache_{os.getpid()}")
        if not os.path.exists(cache_dir):
            os.makedirs(cache_dir, exist_ok=True)
        yf.set_tz_cache_location(cache_dir)
    except Exception as e:
        print(f"Failed to set YF cache location: {e}")

    # auto_adjust=False provides 'Adj Close' column usually
    try:
         # Standard download without custom session (which breaks curl_cffi)
         df_all = yf.download(ticker, start=fetch_start, end=end, progress=False, auto_adjust=False, threads=False)
    except Exception as e:
        print(f"YFinance download failed: {e}")
        return pd.DataFrame(), start
    
    # Check if empty
    if df_all.empty:
         return pd.DataFrame(), start

    # Flatten MultiIndex if present
    if isinstance(df_all.columns, pd.MultiIndex):
        try:
             # Try to drop Ticker level
             df_all.columns = df_all.columns.droplevel(1) 
        except:
             df_all.columns = df_all.columns.get_level_values(0)

    # Standardize
    df = pd.DataFrame(index=df_all.index)
    
    if "Adj Close" in df_all.columns:
        df["close"] = df_all["Adj Close"]
        df["raw_close"] = df_all["Close"]
    else:
        df["close"] = df_all["Close"]
        df["raw_close"] = df_all["Close"]
        
    df["open"] = df_all["Open"] 
    df["raw_open"] = df_all["Open"]
    df["high"] = df_all["High"]
    df["low"] = df_all["Low"]
    df["volume"] = df_all["Volume"]

    df["close"] = pd.to_numeric(df["close"], errors='coerce')
    df = df.dropna()
    
    return df, start

# Simple Cache to prevent redownloading same data in same session
from functools import lru_cache
@lru_cache(maxsize=32)
def load_price_history_cached(ticker: str, start: str, end: str):
    return load_price_history(ticker, start, end)

# Monkey patch or redirect for now, keeping original function clean
# But better to just edit the original function header.

