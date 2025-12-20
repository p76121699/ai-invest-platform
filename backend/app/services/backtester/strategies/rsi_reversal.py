from app.services.backtester.strategy_base import StrategyBase
import pandas_ta as ta

class RSIReversalStrategy(StrategyBase):
    def __init__(self, period: int = 14, lower: int = 30, upper: int = 70):
        self.period = period
        self.lower = lower
        self.upper = upper

    def prepare(self, df):
        # RSI calculation
        df["rsi"] = ta.rsi(df["close"], length=self.period)
        return df

    def generate_signals(self, df):
        df["signal"] = 0
        
        # Logic: 
        # Buy when RSI crosses ABOVE lower threshold (Reversal from oversold)
        # Sell when RSI crosses BELOW upper threshold (Reversal from overbought)
        # For simplicity in vectorization without loop state:
        # We'll use simple Condition: RSI < lower (Oversold zone) -> Buy? No, usually you buy on exit.
        # Let's simple "State" logic:
        # RSI < lower -> Signal 1 (Hold Long)? No, signal usually means "Action".
        
        # Let's stick to simple Oversold/Overbought zone for MVP:
        # RSI < 30 => Buy Signal = 1
        # RSI > 70 => Sell Signal = -1
        
        df.loc[df["rsi"] < self.lower, "signal"] = 1
        df.loc[df["rsi"] > self.upper, "signal"] = -1
        
        return df
