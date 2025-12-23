from .data_loader import load_price_history
from .performance import compute_returns, compute_equity_curve, compute_stats
import traceback

def run_backtest(ticker, start, end, strategy):
    try:
        # 1. Load Data (returns buffered df and original start date string)
        df, original_start = load_price_history(ticker, start, end)
        if df.empty:
            return {"error": "No data found for ticker"}

        # 2. Prepare Indicators
        df = strategy.prepare(df)
        
        # 3. Generate Signals
        df = strategy.generate_signals(df)
        
        # 3.5. Slice Data to Original Timeframe (Trim Buffer)
        # Convert index to datetime if needed, or string comparison
        # df.index is DatetimeIndex usually
        df = df.loc[original_start:]
        
        # 4. Compute Returns
        df = compute_returns(df)
        
        # 5. Compute Equity & Stats
        equity_curve = compute_equity_curve(df, None)
        stats = compute_stats(equity_curve)
        
        # 6. Extract Trades (T+1 Logic)
        trades = []
        position = 0
        df['prev_signal'] = df['signal'].shift(1).fillna(0)
        
        # We iterate through the dataframe. 
        # Logic: 
        # On Date T, we see a Signal (based on Close T).
        # We execute on Date T+1 Open.
        
        dates = df.index
        for i in range(len(df) - 1): # Stop at 2nd to last, because we need i+1 for execution
            date_t = dates[i]
            date_next = dates[i+1]
            
            # Signal at Close of T
            signal_t = df['signal'].iloc[i] 
            
            # Check for Status Change
            action = None
            if position == 0 and signal_t == 1:
                action = "buy"
            elif position == 1 and signal_t != 1:
                action = "sell"
            
            if action:
                # EXECUTE AT T+1 OPEN
                exec_price_adj = df['open'].iloc[i+1] # Adjusted Open for PnL (Future implementation of real PnL tracking needs this)
                exec_price_raw = df['raw_open'].iloc[i+1] # Raw Open for Display
                
                # For now, we just record the trade log exactly as requested
                # Update PnL/Equity Curve logic is based on Close prices in compute_equity_curve, 
                # which is slightly approximate if we execute at Open. 
                # Ideally we should rebuild the equity curve simulation here loop-by-loop.
                # But for now, let's fix the Trade Log first as requested.
                
                trades.append({
                    "date": date_t.strftime("%Y-%m-%d"), # Signal Date
                    "execution_date": date_next.strftime("%Y-%m-%d"),
                    "action": action,
                    "price": round(exec_price_raw, 2), # Display Raw
                    "adj_price": round(exec_price_adj, 2) # Internal ref
                })
                
                # Update position state
                if action == "buy":
                    position = 1
                elif action == "sell":
                    position = 0

        # Note: compute_equity_curve currently uses 'signal' column which implies T Close execution.
        # If we want exact PnL based on T+1 Open, we really should rewrite the equity calculation loop.
        # Given the request focused on "Trade Log" and "price_exec", getting the Log right is Priority 1.
        # The equity curve usually approximates to Close-to-Close for daily charts unless we build a tick-level or open-level sim.
        # For this task, I will keep existing vectorized equity curve (approx) but ensure Trade Log is exact T+1 Open.
        
        return {
            "equity_curve": equity_curve,
            "stats": stats,
            "trades": trades,
            "error": None
        }
    except Exception as e:
        traceback.print_exc()
        return {"error": str(e), "equity_curve": [], "stats": {}}
    finally:
        import gc
        gc.collect()
