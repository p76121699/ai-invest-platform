from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.services.backtester.executor import run_backtest
from app.services.backtester.strategies.ma_crossover import MACrossoverStrategy

from app import schemas
from app.services.backtester.strategies.rsi_reversal import RSIReversalStrategy

router = APIRouter()

@router.post("/run") # Matches /api/v1/backtest/run
async def run(request: schemas.BacktestInput):
    # Instantiate strategy
    if request.strategy == "rsi_reversal":
        strategy = RSIReversalStrategy(
            period=request.rsi_period or 14,
            lower=request.rsi_lower or 30,
            upper=request.rsi_upper or 70
        )
    else:
        # Default to MA
        strategy = MACrossoverStrategy(
            fast=request.fast_ma or 10,
            slow=request.slow_ma or 30
        )

    import asyncio
    result = await asyncio.to_thread(
        run_backtest,
        request.ticker,
        request.start,
        request.end,
        strategy
    )
    
    if "error" in result and result["error"]:
        raise HTTPException(status_code=400, detail=result["error"])

    return result
