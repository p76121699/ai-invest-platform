# Backtester Engine Documentation

## Overview
The Backtester Engine allows users to stimulate trading strategies on historical price data.
It is built using a modular architecture for easy extension.

## Architecture

### Core Modules (`backend/app/services/backtester/`)
1.  **data_loader.py**: Handles data fetching from `yfinance`. Automatically handles Taiwan tickers (`.TW`).
2.  **indicators.py**: Wrapper around `pandas_ta` to calculate technical indicators (SMA, etc).
3.  **strategy_base.py**: Abstract base class for all strategies.
4.  **strategies/ma_crossover.py**: Implementation of Moving Average Crossover strategy.
5.  **performance.py**: Calculates critical metrics:
    *   **Total Return**: Cumulative percentage gain/loss.
    *   **Max Drawdown**: Maximum peak-to-trough decline.
    *   **Sharpe Ratio**: Risk-adjusted return (annualized).
6.  **executor.py**: Orchestrates the data loading, signal generation, and performance calculation.

## API Endpoint
### `POST /api/v1/backtest/run`

**Request Body**:
```json
{
  "ticker": "AAPL",
  "fast": 10,
  "slow": 30,
  "start_date": "2025-06-01",
  "end_date": "2025-11-30"
}
```

**Response**:
```json
{
  "equity_curve": [1.0, 1.01, 0.99, ...],
  "stats": {
    "total_return": 0.15,
    "max_drawdown": 0.05,
    "sharpe": 1.2
  },
  "trades": []
}
```

## How to Add New Strategies
1.  Create a new file in `strategies/` (e.g., `rsi_strategy.py`).
2.  Inherit from `StrategyBase`.
3.  Implement `prepare(df)` to add indicators.
4.  Implement `generate_signals(df)` to set the `signal` column (1 for Long, -1 for Short/Exit, 0 for Hold).
5.  Register it in the API endpoint selector (currently hardcoded to MACrossover).

## Frontend
The dashboard is located at `/backtest`.
It visualizes the **Equity Curve** using Recharts and displays key performance metrics.
