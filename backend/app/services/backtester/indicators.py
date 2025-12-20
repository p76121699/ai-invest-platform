import pandas_ta as ta
import pandas as pd

def add_ma(df: pd.DataFrame, fast: int, slow: int):
    # pandas_ta requires DataFrame with 'close' column (lowercase implies custom strategy often, but library looks for Close usually)
    # But we passed "close" column.
    # df.ta.sma uses the 'close' column automatically if properly configured or valid args.
    # We can use ta.sma(series, length)
    
    df[f"ma_fast"] = ta.sma(df["close"], length=fast)
    df[f"ma_slow"] = ta.sma(df["close"], length=slow)
    return df
