from app.services.backtester.strategy_base import StrategyBase
from app.services.backtester.indicators import add_ma

class MACrossoverStrategy(StrategyBase):
    def __init__(self, fast: int, slow: int):
        self.fast = fast
        self.slow = slow

    def prepare(self, df):
        return add_ma(df, self.fast, self.slow)

    def generate_signals(self, df):
        df["signal"] = 0
        # If fast > slow, signal = 1 (Long)
        df.loc[df["ma_fast"] > df["ma_slow"], "signal"] = 1
        # If fast < slow, signal = -1 (Short or Exit)
        df.loc[df["ma_fast"] < df["ma_slow"], "signal"] = -1
        return df
