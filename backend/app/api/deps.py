from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession
from app import models, schemas
from app.core import security
from app.core.config import settings
from app.database import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> models.User:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        token_data = schemas.TokenData(email=payload.get("sub")) # In token creation we used ID as sub, actually. Let's correct that. 
        # Wait, security.py: to_encode = {"exp": expire, "sub": str(subject)} -> subject is user.id.
        # So payload.get("sub") returns the ID string.
    except (JWTError, ValidationError):
         raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    
    # We should query by ID
    from sqlalchemy.future import select
    # result = await db.execute(select(models.User).where(models.User.id == token_data.email)) # Wait, "sub" is ID.
    
    user_id = payload.get("sub")
    if user_id is None:
         raise HTTPException(status_code=403, detail="Invalid token")

    import uuid
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=403, detail="Invalid user ID format")

    result = await db.execute(select(models.User).where(models.User.id == user_uuid))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
