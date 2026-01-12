from app.services.backtester.strategy_base import StrategyBase
class RSIReversalStrategy(StrategyBase):
    def __init__(self, period: int = 14, lower: int = 30, upper: int = 70):
        self.period = period
        self.lower = lower
        self.upper = upper

    def prepare(self, df):
        # RSI calculation using pure Pandas (No external lib dependency)
        delta = df["close"].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=self.period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=self.period).mean()
        
        rs = gain / loss
        df["rsi"] = 100 - (100 / (1 + rs))
        df["rsi"] = df["rsi"].fillna(50) # Default neutral
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
