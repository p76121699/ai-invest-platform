# 履歷專案介紹 (Engineering & Problem-Solving Style)

這是一份針對「資深/核心開發者」或「強調解決問題能力」的履歷寫法。我們將語氣從「我做了一個什麼功能」轉變為「**我遇到什麼工程挑戰，我用什麼演算法/架構解決了它，並帶來什麼效益**」。

建議在履歷上加入 Numba JIT 與記憶體最佳化 (Playwright -> HTTPX) 的真實經歷，因為這些非常硬核且實在。

---

**AI 驅動量化投資與市場分析平台** 
*2025/12 ~ 2025/12*

**【專案概述】**
開發一套解決「傳統量化工具缺乏語意分析」與「大型語言模型 (LLM) 缺乏即時時效性資料」兩大痛點的系統。透過設計檢索增強生成 (RAG) 管道與非同步高併發爬蟲，實現具備即時市場感知能力的 AI 投資助理，並整合 Numba 優化的回測引擎以提供高效能的量化分析。

**【技術架構】**
*   **語言與框架**: Python (FastAPI), TypeScript (Next.js 14 App Router)
*   **核心組件**: Google Gemini 2.0 (LLM), Numba JIT, AsyncIO, BeautifulSoup, Recharts
*   **資料與基建**: PostgreSQL (Asyncpg), SQLAlchemy, Docker, SSR

**【工程挑戰與技術貢獻】**

**1. 解決 LLM 幻覺與時效性問題 (Context-Aware RAG 演算法實作)**
*   **Challenge (挑戰)**：通用 LLM 無法取得即時報價與當日新聞，常發生嚴重的時間錯位幻覺 (Temporal Hallucination)。
*   **Action (解決方案)**：實作動態 Context Injection 演算法。先利用輕量級 LLM 進行意圖提取 (Intent Extraction)，將口語問題轉換為結構化參數 (如：股票代碼)。在向主 LLM 發出請求前，動態組裝即時股價 (yfinance) 與從資料庫檢索的高關聯度新聞作為 Ground Truth 提示詞，強制模型基於當下事實進行推論。
*   **Result (成果)**：成功消除時間錯位幻覺，使系統能根據「今日市場現況」提供精確的財報解讀與投資分析。

**2. 克服記憶體 512MB 限制與反爬蟲機制 (資料採集管道重構)**
*   **Challenge (挑戰)**：初期使用 Headless Browser 抓取新聞，導致在雲端伺服器 (512MB RAM) 頻繁發生 OOM (Out of Memory) 服務崩潰；且常遭財經網站 (如 Reuters) 的反爬蟲機制封鎖。
*   **Action (解決方案)**：進行架構優雅降級 (Graceful Degradation)。全面汰換肥大的瀏覽器核心，遷移至 `HTTPX + BeautifulSoup` 的輕量化非同步方案。針對反爬蟲，實作 User-Agent 輪替與指數退避 (Exponential Backoff) 機制；若內文遭阻攔，則自動降級使用 RSS 摘要。
*   **Result (成果)**：每單一排程任務釋放了 >200MB 記憶體，徹底解決 OOM 問題，並維持了 99% 的資料擷取妥善率與系統 24/7 穩定運作。

**3. 突破 Python 運算效能瓶頸 (高頻回測引擎優化)**
*   **Challenge (挑戰)**：使用原生 Python 迴圈處理跨年份的逐日歷史資料回測時，效能嚴重低落，導致前端圖表渲染 API 請求逾時 (Timeout)。
*   **Action (解決方案)**：引入 Numba JIT (Just-In-Time) 編譯器重構核心運算。將交易邏輯 (如 SMA Crossover、RSI Reversal) 的迴圈展開並編譯為底層機器碼執行，並結合 Pandas 向量化運算 (Vectorization) 處理前置的特徵工程與指標計算。
*   **Result (成果)**：回測運算效能獲得指數級提升 (超過 100 倍加速)，將原本需數秒的歷史走勢回測壓縮至毫秒級，實現前端互動式圖表的流暢體驗。

**4. 解決高併發 I/O 阻塞問題 (全端非同步架構設計)**
*   **Challenge (挑戰)**：大量的 API 請求 (報價串流、新聞寫入、AI 推論) 容易導致伺服器 Thread Pool 耗盡，造成整體服務卡頓。
*   **Action (解決方案)**：後端全面採用 FastAPI 搭配 AsyncIO 事件迴圈 (Event Loop) 驅動。將資料庫查詢 (使用 Asyncpg 驅動) 與外部 API 呼叫 (Gemini、YFinance) 全數非同步化。前端採用 Next.js SSR 架構優化首屏載入速度 (FCP)，並以 Pydantic 確保嚴格的型別校驗。
*   **Result (成果)**：確保在單一執行緒下，高耗時 I/O 任務不會阻塞其他使用者的請求，顯著提升系統吞吐量 (Throughput) 與穩定性。
