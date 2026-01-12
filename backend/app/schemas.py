from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from uuid import UUID

# Token
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# User
class UserBase(BaseModel):
    email: EmailStr

class Message(BaseModel):
    message: str

class ChatMessage(BaseModel):
    content: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

# News
class News(BaseModel):
    id: UUID
    title: str
    summary: Optional[str] = None
    link: Optional[str] = None
    source: Optional[str] = None
    published_at: Optional[datetime] = None
    sentiment: Optional[float] = None
    image_url: Optional[str] = None
    
    class Config:
        from_attributes = True

class NewsList(BaseModel):
    news: List[News]

class NewsDetail(News):
    content_html: Optional[str] = None
    url: Optional[str] = None # Alias for link
    
    class Config:
        from_attributes = True

class NewsDetail(News):
    content_html: Optional[str] = None
    url: Optional[str] = None # Alias for link
    
    class Config:
        from_attributes = True

# Backtest
# Internal Strategy Schema for Executor
class BacktestStrategy(BaseModel):
    initial_capital: float = 100000.0
    parameters: dict = {}

class BacktestResult(BaseModel):
    total_return: float
    total_trades: int
    final_equity: float
    max_drawdown: float
    sharpe_ratio: float
    equity_curve: List[float]
    trades: List[dict]

class BacktestInput(BaseModel):
    ticker: str
    strategy: str = "ma_crossover"
    # MA Params
    fast_ma: Optional[int] = 10
    slow_ma: Optional[int] = 30
    # RSI Params
    rsi_period: Optional[int] = 14
    rsi_lower: Optional[int] = 30
    rsi_upper: Optional[int] = 70
    
    engine: Optional[str] = "iterative" # iterative or vectorized
    start: str
    end: str

class BacktestTrade(BaseModel):
    date: str
    action: str
    price: float

class BacktestOutput(BaseModel):
    total_return: float
    max_drawdown: float
    win_rate: float
    equity_curve: List[float]
    trades: List[BacktestTrade]

# Stocks
class StockQuote(BaseModel):
    ticker: str
    price: float
    change_percent: float
    volume: int
    sparkline: List[float]
    error: Optional[str] = None

class StockIndicator(BaseModel):
    rsi: float
    macd: float
    sma20: float
    sma50: float

class StockHistoryPoint(BaseModel):
    Date: str 
    Open: float
    High: float
    Low: float
    Close: float
    Volume: int
    Close: float
    Volume: int
    # Optional Indicators
    ma20: Optional[float] = None
    ma50: Optional[float] = None
    rsi: Optional[float] = None
    macd: Optional[float] = None

class StockHistory(BaseModel):
    ticker: str
    history: List[StockHistoryPoint]

class MultiStockResponse(BaseModel):
    quotes: List[StockQuote]

# Watchlist
class WatchlistItem(BaseModel):
    ticker: str
    
class WatchlistResponse(BaseModel):
    watchlist: List[str]

# Portfolio Trades
class TradeBase(BaseModel):
    ticker: str
    action: str # BUY / SELL
    price: float
    shares: float
    date: datetime
    notes: Optional[str] = None

class TradeCreate(TradeBase):
    pass

class Trade(TradeBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True
