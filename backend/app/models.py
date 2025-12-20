from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, Float, Date, Boolean, Uuid
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    api_keys = relationship("ApiKey", back_populates="user")
    backtest_runs = relationship("BacktestRun", back_populates="user")

class News(Base):
    __tablename__ = "news"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(Text)
    summary = Column(Text)
    link = Column(Text, unique=True, index=True)
    published_at = Column(DateTime, index=True)
    sentiment = Column(Float) # -1 to 1
    entities = Column(JSON) # {org:[], money:[], ...}
    relevance = Column(Integer) # 0-2
    content_html = Column(Text, nullable=True)
    image_url = Column(Text, nullable=True)
    source = Column(String(50)) # Kept for compatibility/tracking
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class BacktestRun(Base):
    __tablename__ = "backtest_runs"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"))
    ticker = Column(String)
    strategy_name = Column(String)
    parameters = Column(JSON)
    start_date = Column(Date)
    end_date = Column(Date)
    profit_pct = Column(Float)
    max_drawdown = Column(Float)
    sharpe = Column(Float)
    trades = Column(JSON)
    equity_curve = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", back_populates="backtest_runs")

class ApiKey(Base):
    __tablename__ = "api_keys"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"))
    provider = Column(String) # alphavantage / finnhub / newsapi
    api_key = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", back_populates="api_keys")

class Watchlist(Base):
    __tablename__ = "watchlist"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"))
    ticker = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", back_populates="watchlist")

class Trade(Base):
    __tablename__ = "trades"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"))
    ticker = Column(String)
    action = Column(String) # BUY / SELL
    price = Column(Float)
    shares = Column(Float)
    date = Column(DateTime)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", back_populates="trades")

# Update User relationship
User.watchlist = relationship("Watchlist", back_populates="user")
User.trades = relationship("Trade", back_populates="user")
