import pandas as pd
import numpy as np
from typing import List, Dict, Any
from app.schemas import BacktestStrategy, BacktestResult

class BacktestExecutor:
    def _calculate_indicators(self, df: pd.DataFrame, strategy: BacktestStrategy) -> pd.DataFrame:
        """
        Calculates signal indicators.
        """
        fast = strategy.parameters.get('fast_period', 5)
        slow = strategy.parameters.get('slow_period', 20)
        
        # Calculate SMAs
        df[f'SMA_{fast}'] = df['close'].rolling(window=fast).mean()
        df[f'SMA_{slow}'] = df['close'].rolling(window=slow).mean()
        
        # Calculate RSI if needed
        if 'period' in strategy.parameters: # RSI Strategy
             period = strategy.parameters.get('period', 14)
             delta = df['close'].diff()
             gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
             loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
             rs = gain / loss
             df['RSI'] = 100 - (100 / (rs + 1e-9)) # Add epsilon to avoid divide by zero

        return df

    def run_backtest(self, data: pd.DataFrame, strategy: BacktestStrategy) -> BacktestResult:
        """
        Executes the backtest using Vectorized Pandas (Memory Efficient).
        """
        if data.empty:
             return self._empty_result(strategy.initial_capital)

        df = data.copy()
        # Ensure column names are lower case
        df.columns = [c.lower() for c in df.columns]
        
        initial_capital = strategy.initial_capital
        
        # 1. Feature Engineering
        df = self._calculate_indicators(df, strategy)
        df = df.fillna(0)
        
        # 2. Generate Signals
        # We need to reconstruct the strategy logic here or use the shared Strategy class
        # For simplicity/robustness, let's implement the signal logic inline or use the Strategy class if imported.
        # But since we are inside Executor, let's just do the crossover logic directly or dynamic.
        
        # Check standard MA Strategy
        fast_period = strategy.parameters.get('fast_period', 5)
        slow_period = strategy.parameters.get('slow_period', 20)
        fast_col = f'SMA_{fast_period}'
        slow_col = f'SMA_{slow_period}'
        
        df['signal'] = 0
        if fast_col in df.columns and slow_col in df.columns:
            # Golden Cross (Fast > Slow)
            df.loc[df[fast_col] > df[slow_col], 'signal'] = 1
            # Death Cross (Fast < Slow)
            df.loc[df[fast_col] < df[slow_col], 'signal'] = -1
        
        # 3. Vectorized Backtest Simulation
        # Shift signal by 1 because we trade AT THE OPEN of the NEXT bar based on TODAY's close signal
        # OR we trade at Close? Usually Close.
        # Let's assume we trade at the Close of the signal candle (Simplified)
        
        # Position: 1 (Long), 0 (Cash), -1 (Short - Not supported yet)
        # We only take Long positions for MVP
        
        # Logic:
        # If signal changes from -1/0 to 1 -> Buy
        # If signal changes from 1 to -1 -> Sell
        
        # Cleanup signals to be regime-based (fill forward) creates a continuous position mask
        # But our signal is just -1 or 1.
        
        # Create a 'position' column
        # signal=1 -> want to be long. signal=-1 -> want to be flat.
        df['target_position'] = 0
        df.loc[df['signal'] == 1, 'target_position'] = 1
        df.loc[df['signal'] == -1, 'target_position'] = 0
        
        # Forward fill the target position (hold status)
        # However, the simple crossover produces continuous 1s while fast > slow
        # So 'target_position' is already effectively held.
        
        # Calculate Returns
        # Strategy Return = Position(t-1) * pct_change(t)
        df['pct_change'] = df['close'].pct_change().fillna(0)
        
        # Real-world: We enter on the NEXT open? Or same Close?
        # Vectorized standard: Trade at Close.
        # So we own the asset during the *next* period.
        df['position'] = df['target_position'].shift(1).fillna(0)
        
        # Equity Curve Calculation
        # This is a simplification (Compound returns)
        df['strategy_return'] = df['position'] * df['pct_change']
        
        # Commission Simulation (Simplified)
        # Detect trades: where position changes
        trades_count = df['position'].diff().abs().sum() / 2 # Buy + Sell = 2 changes. approx.
        
        # Calculate Equity
        # Cumulative product of (1 + return) * capital
        df['equity'] = initial_capital * (1 + df['strategy_return']).cumprod()
        
        df['equity'] = initial_capital * (1 + df['strategy_return']).cumprod()
        
        # Sanitize DataFrame (NaN/Inf -> 0 or ffill)
        df = df.replace([np.inf, -np.inf], np.nan).fillna(0) # Simple 0 fill for MVP safety

        equity_curve = df['equity'].values
        
        # 4. Extract Trades (Detailed)
        trades = []
        in_trade = False
        entry_price = 0.0
        entry_date = ""
        entry_idx = 0
        qty = 0.0
        
        # Iterating for trade extraction is fast enough for <5000 rows
        for i in range(1, len(df)):
            pos = df['position'].iloc[i]
            prev_pos = df['position'].iloc[i-1]
            price = df['close'].iloc[i]
            date_str = str(df.index[i]).split()[0]
            
            # Buy Trigger
            if pos == 1 and prev_pos == 0:
                in_trade = True
                entry_price = price
                entry_date = date_str
                entry_idx = i
                # SimulateQty
                # qty = current_equity / price
                
            # Sell Trigger
            elif pos == 0 and prev_pos == 1:
                if in_trade:
                    exit_price = price
                    pnl = (exit_price - entry_price) / entry_price * initial_capital # approx relative impact
                    
                    trades.append({
                        "symbol": "BACKTEST",
                        "entry_date": entry_date,
                        "exit_date": date_str,
                        "entry_price": float(entry_price),
                        "exit_price": float(exit_price),
                        "quantity": 100.0, # Mock
                        "pnl": float(exit_price - entry_price), # Per share pnl mock
                        "status": "CLOSED"
                    })
                    in_trade = False

        # 5. Stats
        total_return = (equity_curve[-1] - initial_capital) / initial_capital
        
        # Max Drawdown
        running_max = np.maximum.accumulate(equity_curve)
        drawdown = (equity_curve - running_max) / running_max
        max_drawdown = float(drawdown.min())

        # Sharpe
        returns = pd.Series(equity_curve).pct_change().dropna()
        if len(returns) > 1 and returns.std() > 0:
             sharpe_ratio = (returns.mean() / returns.std()) * np.sqrt(252)
        else:
             sharpe_ratio = 0.0

        return BacktestResult(
            total_return=0.0 if np.isnan(total_return) else float(total_return),
            total_trades=len(trades),
            final_equity=float(equity_curve[-1]) if len(equity_curve) > 0 else 0.0,
            max_drawdown=0.0 if np.isnan(max_drawdown) else float(max_drawdown),
            sharpe_ratio=0.0 if np.isnan(sharpe_ratio) else float(sharpe_ratio),
            equity_curve=equity_curve.tolist(),
            trades=trades
        )

    def _empty_result(self, capital):
        return BacktestResult(
                total_return=0.0,
                total_trades=0,
                final_equity=capital,
                max_drawdown=0.0,
                sharpe_ratio=0.0,
                equity_curve=[],
                trades=[]
            )

# Standalone Glue Function for API
from app.services.backtester.data_loader import load_price_history_cached

def run_backtest(ticker: str, start: str, end: str, strategy: BacktestStrategy):
    # 1. Load Data
    df, real_start = load_price_history_cached(ticker, start, end)
    
    # 2. Execute
    executor = BacktestExecutor()
    result = executor.run_backtest(df, strategy)
    
    return result.dict()
