# 風城師的AI遊記 — 專案說明

## 專案資訊
- 網站名稱：風城師的AI遊記
- 副標題：20年工程師，10年老師，進行中的學習札記
- 對象：國小／國中教師（無程式背景）
- 目標：降低對 AI 工具的恐懼感，鼓勵嘗試，不催促
- 工作目錄：c:\claude\teaching-web
- 開發工具：Claude Code

---

## 新增案例時的資安檢查清單

每次新增一個案例到網站，**必須逐項確認**以下項目，
全部通過才能納入教學文件。

### 🔑 金鑰與憑證
- [ ] 程式碼中沒有硬編碼的 API Key（如 `AIza...`、`sk-...`）
- [ ] 程式碼中沒有硬編碼的帳號、密碼、Token
- [ ] 若有金鑰，確認使用環境變數或 Script Properties 讀取，而非直接寫在程式裡
- [ ] .env 檔案已加入 .gitignore，不會被 commit 到 repo

### 🌐 後端部署設定（Python / Node / GAS 等）
- [ ] Flask / Express 等框架：debug 模式已關閉（`debug=False`）
- [ ] 伺服器未對外網開放不必要的 port（`host` 不應設為 `0.0.0.0` 在正式環境）
- [ ] 上傳資料夾（uploads/）未暴露在靜態路由下，外部無法直接存取檔案
- [ ] 沒有使用預設的 `secret_key`（如 Flask session 需要設定隨機字串）

### 🗄️ 資料庫
- [ ] SQL 查詢使用參數化語法（`?` 或 `%s`），未使用 f-string 或字串拼接組合 SQL
- [ ] 資料庫檔案（.db、.sqlite）已加入 .gitignore
- [ ] 使用者資料未以明碼儲存

### 🖥️ 前端程式碼
- [ ] `innerHTML` 賦值來源為程式內部狀態，而非使用者直接輸入（防 XSS）
- [ ] 無敏感資訊寫在前端 JavaScript（如 API Key 直接出現在 .js 中）
- [ ] 外部載入的 CDN 資源來自可信來源

### 📋 GitHub Repo 公開設定
- [ ] Repo 設為 Public 前，確認所有敏感檔案已排除（.gitignore 已設定）
- [ ] commit 歷史中無曾經提交過的真實金鑰（若有，需用 git filter-repo 清除）
- [ ] README 中的範例程式碼均為佔位符（如「請填入你的 API Key」）

### 🔓 權限與存取控制
- [ ] GAS Webhook 設為 Anyone 可存取時，確認為 LINE/外部平台整合的必要設計
- [ ] 若系統會讀取使用者的 Google Calendar / Drive，確認授權範圍最小化
- [ ] 無不必要的管理員權限暴露給使用者

---

## 網站主軸規劃

以「AI 工具 / 技術」為主軸，每個主軸說明優缺點與應用場景，
並附上對應的實際案例（含教學文件）。

### 四大主軸（已確認）
1. **對話式 AI**：GAS + Gemini API
2. **視覺識別與文件處理**：Antigravity
3. **純前端互動工具**：Gemini Canvas / Claude
4. **LINE Bot 自動回覆系統**

### 技術棧
- 純 HTML + CSS + JavaScript（無框架，易於維護）
- GitHub Pages 部署
- 模組化結構，新案例只需新增一個 HTML 檔

---

## 作者資訊
- 姓名：陳盈宏
- Facebook：https://www.facebook.com/alex.yh.chen
- Threads：https://www.threads.com/@a777x
- X：https://x.com/a546291

---

## 開發原則
- 語氣溫和，不催促，鼓勵嘗試
- 每個功能頁面獨立一個 HTML 檔案
- 新案例加入前必須完成上方資安檢查清單
