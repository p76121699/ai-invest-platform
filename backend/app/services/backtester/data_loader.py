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
    
    # 1. Fetch Adjusted Data (For Indicators & PnL)
    df_adj = yf.download(ticker, start=fetch_start, end=end, progress=False, auto_adjust=True)
    
    # 2. Fetch Raw Data (For Display)
    df_raw = yf.download(ticker, start=fetch_start, end=end, progress=False, auto_adjust=False)
    
    # Handle MultiIndex
    if isinstance(df_adj.columns, pd.MultiIndex):
        df_adj.columns = df_adj.columns.get_level_values(0)
    if isinstance(df_raw.columns, pd.MultiIndex):
        df_raw.columns = df_raw.columns.get_level_values(0)

    # Standardize Names
    df = df_adj.rename(columns={
        "Open": "open",
        "High": "high",
        "Low": "low",
        "Close": "close",
        "Volume": "volume"
    })
    
    # Merge Raw Open/Close
    # Align indexes just in case
    df["raw_open"] = df_raw["Open"]
    df["raw_close"] = df_raw["Close"]
    
    # Ensure close is numeric
    df["close"] = pd.to_numeric(df["close"], errors='coerce')
    df = df.dropna()
    
    return df, start
