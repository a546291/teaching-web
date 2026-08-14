# 風城師的AI遊記 — CLAUDE.md

## 專案資訊
- 網站名稱：風城師的AI遊記
- 副標題：20年工程師，10年老師，進行中的學習札記
- 網址：https://a546291.github.io/teaching-web/
- GitHub：https://github.com/a546291/teaching-web
- 工作目錄：c:\claude\teaching-web
- 開發方式：Claude Desktop Code 分頁

## 作者資訊
- 姓名：陳盈宏
- Facebook：https://www.facebook.com/alex.yh.chen
- Threads：https://www.threads.com/@a777x
- X：https://x.com/a546291

## 網站對象
國小／國中教師，無程式背景，語氣溫和不催促，鼓勵嘗試

## 設計原則
- 蘋果風格：白底、簡潔、不華麗
- 首頁：先案例，再從案例展開到技術主軸
- 導覽列：下拉選單依序為「案例」「技術主軸」「投資那些事」「關於」
- 每個新案例獨立一個 HTML 檔案，更新目錄即可

## 已完成檔案
| 檔案 | 說明 |
|------|------|
| index.html | 首頁（案例優先 + 下拉導覽） |
| case-wheel.html | 轉盤抽籤遊戲（含 GitHub Pages 教學）|
| case-calendar.html | LINE 行事曆 AI 助理 |
| case-ocr.html | OCR 錯卷題庫系統 |
| case-nknublock.html | NKNUBLOCK 學生作品自動批改系統 |
| tool-gas.html | 主軸一：GAS + Gemini |
| tool-antigravity.html | 主軸二：Antigravity 視覺識別 |
| tool-canvas.html | 主軸三：Canvas 純前端工具 |
| tool-linebot.html | 主軸四：LINE Bot 自動回覆 |
| tool-python.html | 主軸五：Python 本地工具 |
| case-stocks.html | 台股分類表（獨立分類「投資那些事」，不掛在「案例」或任一技術主軸下；開頁即表格，說明文字收在「如何做」浮動視窗）|
| CLAUDE.md | 本說明檔 |

## 每個案例頁面的固定結構
1. Hero（工具定位、技術標籤）
2. 這是什麼（白話說明）
3. 優點與限制（誠實並列）
4. 應用場景
5. 開發工具說明
6. 步驟教學（含截圖佔位框）
7. 常見問題 FAQ
8. 資安確認（依下方清單）
9. 立即體驗或原始程式碼連結

## 台股個股分類表（case-stocks.html）的資料架構

這個案例的資料分兩種性質，處理方式完全不同：

### 1. 產業分類／細分類／主要產品 — 人工維護，不可由程式產生
- 檔案：**stocks.json**（repo 根目錄，跟 index.html 同一層，**不是** data/ 目錄下）
- 欄位：`industry`（產業分類）、`subcategory`（細分類）、`name`（股票名稱）、`code`（股票代碼）、`products`（主要產品，含比例）
- 這幾欄是公司自行在財報／法說會揭露的資訊，TWSE／TPEx 的公開資料 API 查不到，**不可嘗試用報價 API 或 AI 推算生成**
- 原則：沒有揭露明確比例的產品欄位，一律照實寫「未揭露細項比例」，不自己編數字
- 新增／更新個股：直接手動編輯 stocks.json，加一筆即可，股價欄位不用管

### 2. 股價 — 自動抓取，不可手動編輯
- 檔案：**prices.json**（repo 根目錄，由 GitHub Actions 自動產生／覆寫）
- 欄位：`asOf`（交易日）、`updatedAt`（實際執行時間）、`items[code]` = `{ price, change, changePercent, market }`（changePercent 由 change / (price - change) * 100 算出，四捨五入到小數點後 2 位；market 為 `TWSE` 或 `TPEx`）
- 資料源：
  - 上市股票：證交所「個股日成交資訊」`https://www.twse.com.tw/exchangeReport/STOCK_DAY?response=json&date=YYYYMMDD&stockNo=代碼`（免 key），逐檔查詢當月資料，取最後一筆（最新交易日）。欄位對照：`data` 每列第 0 欄為日期（`115/08/13` 格式，斜線分隔）、第 6 欄收盤價、第 7 欄漲跌價差（帶正負號字串，如 `+20.00`；除權息等不比價會是 `X0.00`，此時 change 存 null）。
    - 原本用過整批查詢的 `openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL`，但實測發現它收盤後常常隔了很久（曾經到傍晚 6 點半都還沒更新）才放出當日收盤價；改用逐檔查詢的 STOCK_DAY 後，同一天傍晚就查得到，資料比較即時，代價是要對 38 檔各發一次請求（腳本內建每次間隔 3 秒，避免太密集被擋）。
  - 上櫃股票：TPEx OpenAPI `https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes`（免 key，整批查詢），欄位對照 `SecuritiesCompanyCode→code`、`Close→price`、`Change→change`（字串需 trim 並可能非數字如「除息」，此時 change 存 null）；實測更新速度正常，維持整批查詢
  - 兩者皆**沒有開放瀏覽器端 CORS**（`STOCK_DAY` 例外：這支有回 `Access-Control-Allow-Origin: *`，但為了架構一致、且 STOCK_DAY_ALL／TPEx 仍無 CORS，還是統一走 GitHub Actions 排程，不在頁面直接呼叫），所以頁面無法在載入當下直接 fetch，必須靠排程先抓好存成同源靜態檔
- 產生方式：`scripts/update_prices.py`（純標準庫，無需 pip install），由 `.github/workflows/update-stock-prices.yml` 排程執行
  - 排程：平日（週一至週五）台灣時間 14:00（cron `0 6 * * 1-5`，UTC）收盤後跑一次，另可手動 `workflow_dispatch`
  - 若抓到的交易日跟現有 prices.json 的 `asOf` 相同，腳本不覆寫檔案，避免產生無意義 commit；`asOf` 取「這批資料裡最舊的交易日」而非多數決，確保這個日期底下 46 檔都保證同一天或更早，不會有「asOf 寫今天，但某幾檔其實還是舊價」的不誠實情況
  - 用內建 `GITHUB_TOKEN`（`contents: write`）commit，沒有使用任何個人 PAT 或外部帳號

### 頁面渲染
case-stocks.html 純前端，載入時 `fetch('stocks.json')` + `fetch('prices.json')`，依 `code` 合併；若 prices.json 抓取失敗或某代碼查無資料，顯示「暫時無法取得」，絕不顯示假數字或 0。

### 頁面結構（跟其他案例頁不同，不套用固定案例結構）
開頁即直接顯示表格（標題＋一句話副標＋篩選/排序表格），不是先看一大段介紹文字。原本案例頁固定結構的「這是什麼／優點與限制／應用場景／開發工具說明／步驟教學／FAQ／資安確認」七段文字都保留、內容不變，只是收進標頭「💡 如何做」按鈕觸發的浮動視窗（`#howtoOverlay`），用 ✕ 按鈕／Esc／點背景都可以關閉。這是因為這個頁面掛在「投資那些事」分類、不是「案例」，目的是工具本身能立刻用，不是教學導向的案例研讀。

## 新增案例的 git 流程
```
cd c:\claude\teaching-web
git add .
git commit -m "新增 case-xxx.html：xxx 案例"
git push
```

---

## 新增案例時的資安檢查清單

每次新增案例，**必須逐項確認**，全部通過才可納入。

### 🔑 金鑰與憑證
- [ ] 無硬編碼 API Key（AIza...、sk-...）
- [ ] 無硬編碼帳號、密碼、Token
- [ ] 金鑰使用環境變數或 Script Properties 讀取
- [ ] .env 已加入 .gitignore

### 🌐 後端部署設定
- [ ] debug 模式已關閉（debug=False）
- [ ] 正式環境 host 不設為 0.0.0.0
- [ ] uploads/ 未暴露在靜態路由下
- [ ] 無預設 secret_key

### 🗄️ 資料庫
- [ ] SQL 使用參數化查詢，未用 f-string 拼接
- [ ] .db / .sqlite 已加入 .gitignore
- [ ] 使用者資料未明碼儲存

### 🖥️ 前端
- [ ] innerHTML 來源為內部狀態，非使用者直接輸入
- [ ] 前端 JS 無 API Key
- [ ] CDN 來源可信

### 📋 GitHub Repo
- [ ] .gitignore 已設定敏感檔案排除
- [ ] commit 歷史無真實金鑰
- [ ] README 範例程式碼為佔位符

### 🔓 權限
- [ ] GAS Webhook 設為 Anyone 屬必要設計已說明
- [ ] Google 授權範圍最小化
- [ ] 無不必要管理員權限

---

## 已完成資安檢查的案例
| 案例 | 結果 |
|------|------|
| 轉盤遊戲（wheel-game）| ✅ 整體安全，純前端無金鑰 |
| LINE 行事曆助理（line-bot-gemini-calendar-assistant）| ✅ 安全，建議改用 Script Properties |
| OCR 錯卷題庫（OCR-CAD）| ⚠️ 需修正：debug=True+0.0.0.0、uploads 路由、SQL f-string |
| NKNUBLOCK 自動批改（NKNUBLOCK）| ✅ 已修正：路徑穿越(secure_filename)、XSS(escHtml)、debug=False；init_db f-string 低風險（硬編碼值）；.db 建議 gitignore |
| 台股分類表（case-stocks.html）| ✅ 整體安全，純前端無金鑰、無後端伺服器、無資料庫；TWSE/TPEx OpenAPI 免 key；前端渲染一律用 textContent、無 innerHTML；GitHub Actions 僅用內建 GITHUB_TOKEN |
