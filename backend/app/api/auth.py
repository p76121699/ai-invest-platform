from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app import schemas, models
from app.api import deps
from app.core import security
from app.database import get_db

router = APIRouter()

@router.post("/login", response_model=schemas.Token)
async def login(
    login_data: schemas.UserCreate, # Using UserCreate struct for simplicity as per spec example, real world uses OAuth2Form
    db: AsyncSession = Depends(get_db)
):
    # Spec says input is email/password json.
    result = await db.execute(select(models.User).where(models.User.email == login_data.email))
    user = result.scalars().first()
    
    if not user or not security.verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    
    access_token = security.create_access_token(subject=user.id)
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/register", response_model=schemas.User)
async def register(
    user_in: schemas.UserCreate,
    db: AsyncSession = Depends(get_db)
):
    # Check existing
    result = await db.execute(select(models.User).where(models.User.email == user_in.email))
    if result.scalars().first():
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )
    
    print(f"Hashing password for {user_in.email}...")
    try:
        hashed_password = security.get_password_hash(user_in.password)
        print(f"Hash success: {hashed_password[:10]}...")
    except Exception as e:
        print(f"Hash failed: {e}")
        # Detailed error for debugging only
        raise HTTPException(status_code=500, detail=f"Hash failed: {str(e)}")

    user = models.User(
        email=user_in.email,
        password_hash=hashed_password
    )
    db.add(user)
    try:
        await db.commit()
    except Exception as e:
        print(f"Commit failed: {e}")
        raise HTTPException(status_code=500, detail=f"Commit failed: {str(e)}")

    await db.refresh(user)
    return user

@router.delete("/me", response_model=schemas.Message)
async def delete_me(
    current_user: models.User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from sqlalchemy import delete
    # Manual Cascade Delete to ensure everything is gone
    # 1. Delete Trades
    await db.execute(delete(models.Trade).where(models.Trade.user_id == current_user.id))
    # 2. Delete Watchlist
    await db.execute(delete(models.Watchlist).where(models.Watchlist.user_id == current_user.id))
    # 3. Delete Backtest Runs
    await db.execute(delete(models.BacktestRun).where(models.BacktestRun.user_id == current_user.id))
    # 4. Delete API Keys
    await db.execute(delete(models.ApiKey).where(models.ApiKey.user_id == current_user.id))
    
    # 5. Delete User
    await db.delete(current_user)
    
    try:
        await db.commit()
    except Exception as e:
        print(f"Delete failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
        
    return {"message": "Account and all related data deleted successfully"}
