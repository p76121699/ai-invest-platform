import pandas as pd

def add_ma(df: pd.DataFrame, fast: int, slow: int):
    # Use standard pandas rolling for SMA to avoid dependency hell
    df[f"ma_fast"] = df["close"].rolling(window=fast).mean()
    df[f"ma_slow"] = df["close"].rolling(window=slow).mean()
    return df
