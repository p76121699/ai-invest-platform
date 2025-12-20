class StrategyBase:
    def prepare(self, df):
        """Add technical indicators"""
        return df

    def generate_signals(self, df):
        """Generate buy/sell signals"""
        raise NotImplementedError
