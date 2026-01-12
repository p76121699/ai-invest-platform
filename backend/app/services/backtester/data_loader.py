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
    # auto_adjust=False provides 'Adj Close' column usually, or we can calculate it.
    # Actually, yfinance default gives Open/High/Low/Close/Adj Close/Volume
    df_all = yf.download(ticker, start=fetch_start, end=end, progress=False, auto_adjust=False, threads=False) # threads=False for stability in worker
    
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
    # We will use 'Adj Close' for technical analysis (SMA, RSI) to account for splits/dividends
    # We use 'Close' (Raw) for display prices if available
    
    df = pd.DataFrame(index=df_all.index)
    
    if "Adj Close" in df_all.columns:
        df["close"] = df_all["Adj Close"] # Use Adjusted for logic
        df["raw_close"] = df_all["Close"] # Use Raw for display
    else:
        # Fallback if specific column mismatch
        df["close"] = df_all["Close"]
        df["raw_close"] = df_all["Close"]
        
    df["open"] = df_all["Open"] # This is usually raw open, but accurate enough
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

