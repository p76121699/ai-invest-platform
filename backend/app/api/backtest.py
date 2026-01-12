from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.services.backtester.executor import run_backtest
from app.services.backtester.strategies.ma_crossover import MACrossoverStrategy

from app import schemas
from app.services.backtester.strategies.rsi_reversal import RSIReversalStrategy

router = APIRouter()

@router.post("/run") # Matches /api/v1/backtest/run
async def run(request: schemas.BacktestInput):
    # Instantiate strategy (Must be Pydantic model for Executor)
    if request.strategy == "rsi_reversal":
        # RSI Strategy
        params = {
            "period": request.rsi_period or 14,
            "lower": request.rsi_lower or 30,
            "upper": request.rsi_upper or 70
        }
        strategy = schemas.BacktestStrategy(
            initial_capital=100000.0,
            parameters=params
        )
    else:
        # Default to MA
        # Map API keys (fast_ma) to Executor keys (fast_period)
        params = {
            "fast_period": request.fast_ma or 10,
            "slow_period": request.slow_ma or 30
        }
        strategy = schemas.BacktestStrategy(
            initial_capital=100000.0,
            parameters=params
        )

    import asyncio
    import traceback
    try:
        result = await asyncio.to_thread(
            run_backtest,
            request.ticker,
            request.start,
            request.end,
            strategy,
            request.engine # Pass engine selection
        )
        
        if "error" in result and result["error"]:
            raise HTTPException(status_code=400, detail=result["error"])

        return result
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
