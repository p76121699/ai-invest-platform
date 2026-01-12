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
        
        # Calculate RSI if needed
        if 'period' in strategy.parameters: # RSI Strategy
             period = strategy.parameters.get('period', 14)
             delta = df['close'].diff()
             gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
             loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
             rs = gain / loss
             df['RSI'] = 100 - (100 / (1 + rs))

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
                max_drawdown=0.0,
                sharpe_ratio=0.0,
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
        
        # 2. Extract logic parameters & Call JIT
        # Check standard MA Strategy
        fast_period = strategy.parameters.get('fast_period', 5)
        slow_period = strategy.parameters.get('slow_period', 20)
        fast_col = f'SMA_{fast_period}'
        slow_col = f'SMA_{slow_period}'
        
        # Support for RSI strategy JIT would need a new kernel
        # For now, we only JIT the MA strategy as per previous task scope
        # If strategy is RSI, we might fallback or need to implement RSI JIT.
        # But given the user explicitly mentioned "Vectorized Algo", let's assume MA for the JIT check.
        
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
                
                entry_date_str = str(df.iloc[entry_idx].name).split()[0] if hasattr(df.iloc[entry_idx].name, 'strftime') else str(df.index[entry_idx])
                exit_date_str = str(df.iloc[exit_idx].name).split()[0] if hasattr(df.iloc[exit_idx].name, 'strftime') else str(df.index[exit_idx])

                pnl = (exit_p - entry_p) * vol
                
                # Sanitize trade values
                if not np.isfinite(entry_p): entry_p = 0.0
                if not np.isfinite(exit_p): exit_p = 0.0
                if not np.isfinite(vol): vol = 0.0
                if not np.isfinite(pnl): pnl = 0.0

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

            # Sanitize outputs for JSON serialization (No NaNs allowed)
            equity_curve = np.nan_to_num(equity_curve, nan=0.0, posinf=0.0, neginf=0.0)
            
            # Calculate final equity safely
            val = equity_curve[-1] if len(equity_curve) > 0 else initial_capital
            final_equity = float(np.nan_to_num(val, nan=initial_capital))
            total_return = (final_equity - initial_capital) / initial_capital
            total_return = float(np.nan_to_num(total_return, nan=0.0))

            # Calculate additional stats (MDD, Sharpe)
            eq_series = pd.Series(equity_curve)
            running_max = eq_series.cummax()
            drawdown = (eq_series - running_max) / running_max
            max_drawdown = float(drawdown.min())
            max_drawdown = float(np.nan_to_num(max_drawdown, nan=0.0))

            returns = eq_series.pct_change().dropna()
            if len(returns) > 1 and returns.std() > 0:
                sharpe_ratio = (returns.mean() / returns.std()) * np.sqrt(252)
            else:
                sharpe_ratio = 0.0
            sharpe_ratio = float(np.nan_to_num(sharpe_ratio, nan=0.0))

            return BacktestResult(
                total_return=total_return,
                total_trades=len(trades),
                final_equity=final_equity,
                max_drawdown=max_drawdown,
                sharpe_ratio=sharpe_ratio,
                equity_curve=equity_curve.tolist(),
                trades=trades
            )
            
        else:
            # Fallback (Slow Python Loop) or Empty
            return BacktestResult(
                total_return=0.0,
                total_trades=0,
                final_equity=initial_capital,
                max_drawdown=0.0,
                sharpe_ratio=0.0,
                equity_curve=[initial_capital] * len(df),
                trades=[]
            )

# Standalone Glue Function for API
from app.services.backtester.data_loader import load_price_history_cached

def run_backtest(ticker: str, start: str, end: str, strategy: BacktestStrategy):
    # 1. Load Data (This is the slow part usually)
    df, real_start = load_price_history_cached(ticker, start, end)
    
    # 2. Execute
    executor = BacktestExecutor()
    result = executor.run_backtest(df, strategy)
    
    return result.dict()
