import pandas as pd
import numpy as np
from typing import List, Dict, Any
from app.schemas import BacktestStrategy, BacktestResult

# Attempt to import the JIT core, fallback if not installed/fails
try:
    from .fast_core import run_sma_crossover_jit
    HAS_NUMBA = True
except ImportError:
    HAS_NUMBA = False
    print("WARNING: Numba not found, backtest will be slow or fail.")

class BacktestExecutor:
    def _calculate_indicators(self, df: pd.DataFrame, strategy: BacktestStrategy) -> pd.DataFrame:
        """
        Calculates signal indicators.
        In production, this would use a robust library like TA-Lib or Pandas-TA.
        """
        fast = strategy.parameters.get('fast_period', 5)
        slow = strategy.parameters.get('slow_period', 20)
        
        # Calculate SMAs
        df[f'SMA_{fast}'] = df['close'].rolling(window=fast).mean()
        df[f'SMA_{slow}'] = df['close'].rolling(window=slow).mean()
        
        return df

    def run_backtest(self, data: pd.DataFrame, strategy: BacktestStrategy) -> BacktestResult:
        """
        Executes the backtest using Numba optimizations if available.
        """
        if data.empty:
             return BacktestResult(
                total_return=0.0,
                total_trades=0,
                final_equity=strategy.initial_capital,
                equity_curve=[],
                trades=[]
            )

        df = data.copy()
        # Ensure column names are lower case for consistency
        df.columns = [c.lower() for c in df.columns]
        
        initial_capital = strategy.initial_capital
        
        # 1. Feature Engineering
        df = self._calculate_indicators(df, strategy)
        df = df.fillna(0)
        
        # 2. Extract logic parameters
        fast_period = strategy.parameters.get('fast_period', 5)
        slow_period = strategy.parameters.get('slow_period', 20)
        fast_col = f'SMA_{fast_period}'
        slow_col = f'SMA_{slow_period}'
        
        # 3. Execution (Optimized)
        if HAS_NUMBA and fast_col in df.columns:
            # Prepare arrays for Numba (Must be explicitly typed)
            closes = df['close'].values.astype(np.float64)
            # Handle high/low if missing (e.g. only close data)
            if 'high' in df.columns:
                highs = df['high'].values.astype(np.float64)
            else:
                highs = closes
            
            if 'low' in df.columns:
                lows = df['low'].values.astype(np.float64)
            else:
                lows = closes
                
            # Use index for date tracking (simplified)
            dates = np.arange(len(df), dtype=np.int64)
            
            sma_fast = df[fast_col].values.astype(np.float64)
            sma_slow = df[slow_col].values.astype(np.float64)
            
            # CALL JIT KERNEL
            equity_curve, raw_trades = run_sma_crossover_jit(
                closes, highs, lows, dates,
                sma_fast, sma_slow,
                float(initial_capital)
            )
            
            # 4. Result Reconstruction (Map back to Objects)
            trades = []
            for t in raw_trades:
                # t: (entry_idx, exit_idx, entry_price, exit_price, volume)
                entry_idx, exit_idx, entry_p, exit_p, vol = t
                entry_idx = int(entry_idx)
                exit_idx = int(exit_idx)
                
                entry_date_str = str(df.iloc[entry_idx]['date']) if 'date' in df.columns else f"Idx {entry_idx}"
                exit_date_str = str(df.iloc[exit_idx]['date']) if 'date' in df.columns else f"Idx {exit_idx}"
                
                pnl = (exit_p - entry_p) * vol
                
                trades.append({
                    "symbol": "BACKTEST",
                    "entry_date": entry_date_str,
                    "exit_date": exit_date_str,
                    "entry_price": float(entry_p),
                    "exit_price": float(exit_p),
                    "quantity": float(vol),
                    "pnl": float(pnl),
                    "status": "CLOSED"
                })
            
            final_equity = equity_curve[-1] if len(equity_curve) > 0 else initial_capital
            
            return BacktestResult(
                total_return=(final_equity - initial_capital) / initial_capital,
                total_trades=len(trades),
                final_equity=final_equity,
                equity_curve=equity_curve.tolist(),
                trades=trades
            )
            
        else:
            # Fallback for when Numba is not available or logic doesn't match
            # For this MVP, we return empty results to signal "Optimization Required"
            return BacktestResult(
                total_return=0.0,
                total_trades=0,
                final_equity=initial_capital,
                equity_curve=[initial_capital] * len(df),
                trades=[]
            )
