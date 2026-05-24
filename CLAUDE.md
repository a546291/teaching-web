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
- 導覽列：下拉選單分別連結「案例」「技術主軸」「關於」
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
| NKNUBLOCK 自動批改（NKNUBLOCK）| ⚠️ debug=True 需修正；init_db f-string 低風險（硬編碼值）；.db 建議 gitignore |
