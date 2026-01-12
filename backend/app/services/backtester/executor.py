import pandas as pd
import numpy as np
from typing import List, Dict, Any
from app.schemas import BacktestStrategy, BacktestResult

class BacktestExecutor:
    def _calculate_indicators(self, df: pd.DataFrame, strategy: BacktestStrategy) -> pd.DataFrame:
        """
        Calculates signal indicators using Pandas (Fast).
        """
        fast = strategy.parameters.get('fast_period', 10)
        slow = strategy.parameters.get('slow_period', 30)
        
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

        # Sanitize entire DataFrame immediately after indicators
        # Replace Inf/NaN with 0 to prevent downstream logic errors
        df = df.replace([np.inf, -np.inf], np.nan).fillna(0)
        return df

    def run_backtest(self, data: pd.DataFrame, strategy: BacktestStrategy) -> BacktestResult:
        """
        Executes the backtest using a robust Python Loop (Iterative).
        Slower than vectorization but strictly safe against NaN/Serialization crashes.
        """
        if data.empty:
             return self._empty_result(strategy.initial_capital)

        df = data.copy()
        # Ensure column names are lower case
        df.columns = [c.lower() for c in df.columns]
        
        # 1. Feature Engineering
        df = self._calculate_indicators(df, strategy)
        
        # 2. Iterative Simulation
        initial_capital = strategy.initial_capital
        cash = initial_capital
        position = 0.0 # qty
        equity_curve = []
        trades = []
        
        # Strategy Params
        is_ma = 'fast_period' in strategy.parameters
        fast_period = strategy.parameters.get('fast_period', 10)
        slow_period = strategy.parameters.get('slow_period', 30)
        
        is_rsi = 'period' in strategy.parameters
        rsi_period = strategy.parameters.get('period', 14)
        rsi_lower = strategy.parameters.get('lower', 30)
        rsi_upper = strategy.parameters.get('upper', 70)
        
        # Column accessors
        close_col = df['close'].values
        dates = df.index
        
        # Pre-fetch indicator arrays for speed
        if is_ma:
             sma_fast = df[f'SMA_{fast_period}'].values
             sma_slow = df[f'SMA_{slow_period}'].values
        else:
             rsi_vals = df['RSI'].values
        
        entry_price = 0.0
        entry_date = ""

        # Loop
        for i in range(1, len(df)):
            price = float(close_col[i])
            date_str = str(dates[i]).split()[0]
            
            # Logic Signal
            signal = 0 # 0=Hold/Neutral, 1=Buy, -1=Sell
            
            if is_ma:
                # MA Crossover Logic
                # Check previous values to Confirm Crossover
                curr_fast = sma_fast[i]
                curr_slow = sma_slow[i]
                prev_fast = sma_fast[i-1]
                prev_slow = sma_slow[i-1]
                
                # Check validity (non-zero)
                if curr_fast > 0 and curr_slow > 0 and prev_fast > 0:
                    if prev_fast <= prev_slow and curr_fast > curr_slow:
                        signal = 1 # Golden Cross
                    elif prev_fast >= prev_slow and curr_fast < curr_slow:
                        signal = -1 # Death Cross
            elif is_rsi:
                # RSI Reversal Logic
                curr_rsi = rsi_vals[i]
                if curr_rsi > 0:
                     if curr_rsi < rsi_lower:
                         signal = 1 # Oversold -> Buy
                     elif curr_rsi > rsi_upper:
                         signal = -1 # Overbought -> Sell
            
            # Execution Execution
            # Buy
            if signal == 1 and position == 0:
                # All-in
                qty = cash / price
                position = qty
                cash = 0.0
                entry_price = price
                entry_date = date_str
            
            # Sell
            elif signal == -1 and position > 0:
                # Sell All
                exit_price = price
                cash = position * exit_price
                
                # Record Trade
                pnl = (exit_price - entry_price) * position
                trades.append({
                    "symbol": "BACKTEST",
                    "entry_date": entry_date,
                    "exit_date": date_str,
                    "entry_price": float(entry_price),
                    "exit_price": float(exit_price),
                    "quantity": float(position),
                    "pnl": float(pnl),
                    "status": "CLOSED"
                })
                
                position = 0.0
                entry_price = 0.0

            # Daily Equity Update
            current_equity = cash + (position * price)
            
            # Safety: Ensure no NaN/Inf in equity
            if np.isnan(current_equity) or np.isinf(current_equity):
                current_equity = equity_curve[-1] if equity_curve else initial_capital
            
            equity_curve.append(float(current_equity))

        # 3. Stats Calculation (Safe Python Math)
        final_equity = equity_curve[-1] if equity_curve else initial_capital
        total_return = (final_equity - initial_capital) / initial_capital
        
        # Max Drawdown
        max_dd = 0.0
        peak = initial_capital
        for eq in equity_curve:
            if eq > peak:
                peak = eq
            dd = (peak - eq) / peak if peak > 0 else 0
            if dd > max_dd:
                max_dd = dd
                
        # Sharpe (Simplified Annualized)
        sharpe = 0.0
        if len(equity_curve) > 20:
            returns = pd.Series(equity_curve).pct_change().dropna()
            std = returns.std()
            if std > 1e-9:
                sharpe = (returns.mean() / std) * np.sqrt(252)

        return BacktestResult(
            total_return=float(total_return),
            total_trades=len(trades),
            final_equity=float(final_equity),
            max_drawdown=float(max_dd),
            sharpe_ratio=float(sharpe),
            equity_curve=equity_curve,
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
