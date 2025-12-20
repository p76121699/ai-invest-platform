from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app import schemas, models
from app.api.deps import get_current_user, get_db
import uuid

router = APIRouter()

@router.get("/", response_model=List[schemas.Trade])
async def get_trades(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    result = await db.execute(select(models.Trade).where(models.Trade.user_id == current_user.id).order_by(models.Trade.date.desc()))
    return result.scalars().all()

@router.post("/", response_model=schemas.Trade)
async def create_trade(
    trade: schemas.TradeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_trade = models.Trade(
        **trade.dict(),
        user_id=current_user.id
    )
    db.add(db_trade)
    await db.commit()
    await db.refresh(db_trade)
    return db_trade

@router.delete("/reset")
async def purge_portfolio(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    from sqlalchemy import delete
    await db.execute(delete(models.Trade).where(models.Trade.user_id == current_user.id))
    await db.commit()
    return {"message": "Portfolio Reset Successfully"}

@router.delete("/{trade_id}")
async def delete_trade(
    trade_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    result = await db.execute(select(models.Trade).where(models.Trade.id == trade_id, models.Trade.user_id == current_user.id))
    trade = result.scalars().first()
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    
    await db.delete(trade)
    await db.commit()
    return {"message": "Trade deleted"}


