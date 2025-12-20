# AI Invest Platform

這是一個整合 AI 新聞情感分析、即時股價查詢與回測系統的金融投資平台。

## 系統架構

- **Backend**: FastAPI (Python), SQLite/AsyncSQLAlchemy, Playwright (Crawler), YFinance
- **Frontend**: Next.js (App Router), TypeScript, TailwindCSS, Recharts
- **Database**: SQLite (`sql_app.db` 位於專案根目錄)

## 快速啟動 (Quick Start)

請開啟兩個終端機 (Terminal)，分別執行以下指令：

### 1. 啟動後端 (Backend)

```powershell
# 進入後端目錄 (重要：必需在 backend 目錄執行，否則會有 Import Error)
cd e:\project3\backend

# 啟動虛擬環境 (如果有的話) - 如在根目錄有 enve，需先退回一層啟用
..\enve\Scripts\activate

# 安裝依賴 (初次執行時)
pip install -r requirements.txt
playwright install chromium

# 啟動伺服器
uvicorn app.main:app --reload --port 8000
```
> 後端將運行於 `http://localhost:8000`

### 2. 啟動前端 (Frontend)

```powershell
# 進入前端目錄
cd e:\project3\frontend

# 安裝依賴 (初次執行時)
npm install

# 啟動開發伺服器
npm run dev
```
> 前端將運行於 `http://localhost:3000`

## 主要功能與注意事項

### 1. 市場新聞 (Market News)
- **來源**: TechCrunch, Investing.com, CNA Taiwan 等 RSS Feed。
- **爬蟲機制**: 系統使用 Playwright 進行網頁爬取。
- **重新整理**: 點擊前端 "Refresh Sources" 按鈕後，後端會以 **背景任務 (Background Task)** 開始爬取。
    - **注意**: 爬取過程約需 1-3 分鐘。點擊後請稍候，新聞列表會隨後更新。
- **故障排除**: 若發現新聞內容全是舊的 (Yahoo)，請確認 `sql_app.db` 是否位於 `e:\project3\` 根目錄，且 Uvicorn 是從該目錄啟動。

### 2. 股市儀表板 (Stock Dashboard)
- **多股票查詢**: 支援輸入多個代號 (e.g. `AAPL, TSLA, NVDA`)。
- **技術指標**: 提供 RSI, MACD, SMA 等指標計算。
- **資料來源**: 使用 `yfinance` 抓取 Yahoo Finance 即時數據。
- **快取**: 股價資料有 60 秒的快取時間。

### 3. 回測系統 (Backtest)
- 支援 SMA Crossover、RSI Reversal 等策略回測。
- 顯示權益曲線 (Equity Curve) 與詳細交易紀錄。

## 常見問題 (Troubleshooting)

**Q: 為什麼 Refresh News 後沒有馬上看到新新聞？**
A: 因為爬蟲是背景執行的 (避免前端超時)。請等待約 1-2 分鐘後再次刷新頁面。

**Q: 出現 "Network Error"？**
A: 請確認後端 (Port 8000) 是否正在執行。

**Q: 資料庫檔案不見了？**
A: backend 會在啟動目錄產生 `sql_app.db`。請確保始終在 `e:\project3` 根目錄執行 `uvicorn` 指令，以共用同一個資料庫檔案。
