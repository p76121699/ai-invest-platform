import numpy as np
from numba import jit

@jit(nopython=True, cache=True)
def run_sma_crossover_jit(
    closes: np.ndarray,
    highs: np.ndarray,
    lows: np.ndarray,
    dates: np.ndarray,     # Int64 timestamps
    sma_fast: np.ndarray,
    sma_slow: np.ndarray,
    initial_capital: float,
    commission_rate: float = 0.001
):
    """
    Numba-optimized core loop for SMA Crossover strategy.
    
    Returns:
        equity_curve (np.array): Daily portfolio value
        trades (np.array): Matrix of trades [entry_idx, exit_idx, entry_price, exit_price, pnl]
    """
    n = len(closes)
    
    # State
    position = 0.0      # Current position size (number of shares)
    cash = initial_capital
    entry_price = 0.0
    entry_idx = 0
    
    # Outputs
    equity_curve = np.zeros(n, dtype=np.float64)
    trades_list = []  # Numba supports lists if append is simple
    # Hack: We can't easily return a dynamic list of objects in nopython mode sometimes,
    # but append to a list of tuples or simply a fixed size array if we knew count.
    # List of lists (matrix) is okay in recent numba.
    
    # We will store trades as a flattened list and reshape later or just return list of tuples
    # Format: (entry_index, exit_index, type, entry_price, exit_price, profit)
    # Type: 1 (Long), -1 (Short)
    
    trade_log = []

    for i in range(1, n):
        # 0. Update Equity
        current_price = closes[i]
        
        # Calculate current portfolio value
        # If position > 0, value = cash + position * price
        equity_curve[i] = cash + (position * current_price)
        
        if np.isnan(sma_fast[i]) or np.isnan(sma_slow[i]):
            continue
            
        # 1. Signal Logic (Golden Cross / Death Cross)
        # Check previous candle to confirm cross
        prev_fast = sma_fast[i-1]
        prev_slow = sma_slow[i-1]
        curr_fast = sma_fast[i]
        curr_slow = sma_slow[i]
        
        if np.isnan(prev_fast) or np.isnan(prev_slow):
            continue

        is_buy_signal = (prev_fast <= prev_slow) and (curr_fast > curr_slow)
        is_sell_signal = (prev_fast >= prev_slow) and (curr_fast < curr_slow)
        
        # 2. Execution Logic
        # Close Long
        if position > 0 and is_sell_signal:
            exit_price = current_price
            # Commission
            cost = exit_price * position * commission_rate
            proceeds = (exit_price * position) - cost
            
            cash += proceeds
            
            # Record Trade
            pnl = proceeds - (entry_price * position) # Rough PnL (excluding entry comm? simplified)
            # Actually cash tracks true equity, so PnL implicit.
            # Let's record raw trade
            # entry_idx, exit_idx, entry_price, exit_price, volume
            trade_log.append((entry_idx, i, entry_price, exit_price, position))
            
            position = 0.0
            
        # Open Long (if flat)
        # Simplified: Only Long for now, or Long-Short? Let's assume Long-Only for MVP
        if position == 0 and is_buy_signal:
            # All in
            # Calculate max shares
            affordable = cash / (current_price * (1 + commission_rate))
            if affordable > 0:
                position = affordable
                entry_price = current_price
                entry_idx = i
                
                cost = position * current_price * commission_rate
                cash -= (position * current_price + cost)

    return equity_curve, trade_log
