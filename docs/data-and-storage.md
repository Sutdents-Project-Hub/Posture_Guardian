# 資料與儲存

## 目前狀態

- SQLAlchemy 已建立 `users`、`auth_sessions`、`posture_sessions`、`posture_samples` 與 `session_feedback` schema；本機預設 SQLite，Coolify 使用 PostgreSQL。
- API 已能註冊／登入、建立、追加衍生 sample、完成、查詢及刪除目前帳號的工作階段。
- Alembic migrations `20260716_01` 與 `20260722_01` 已加入；API 啟動前升級 schema。舊匿名工作階段保留但不會自動歸屬到新帳號，避免以舊識別碼冒領資料。
- 原始相機影格不寫入資料庫；處理完成後即釋放。
- 內建展示模式只在 client 產生模擬分析與本地摘要，不建立、上傳或完成後端工作階段，因此不會污染正式歷史、趨勢或 AI 輸入。

## 預定資料最小集

| 資料 | 用途 | 敏感性 | 是否含影像 |
|---|---|---|---|
| `users`（已實作） | 正規化 Email、Argon2 密碼 hash、建立時間 | 直接識別資料／驗證資料 | 否 |
| `auth_sessions`（已實作） | token 的 SHA-256 digest、到期與撤銷狀態 | 身份驗證資料 | 否 |
| `posture_sessions`（已實作） | 帳號 ownership、基線、時間、比例、提醒、建議 | 行為／人體衍生資料 | 否 |
| `posture_samples`（已實作） | 約每影格的角度、偏移、分數與事件狀態 | 人體衍生資料 | 否 |
| 本機儲存（已實作） | AsyncStorage 的提醒階段／震動／主題；原生 SecureStore 的 bearer token；Web 當前 tab 的 sessionStorage token | 個人偏好／登入憑證 | 否 |
| AI provider audit（部分已實作） | session provider、model／API mode／prompt version 與去敏結構化 log；正式同意與長期稽核表仍待實作 | 法務／AI 稽核 | 否 |

## 資料流

1. client 以 Email／密碼註冊或登入，API 回傳隨機 bearer token；server 只保存其 digest。
2. client 取得相機權限並擷取影格；展示模式跳過帳號與 API 寫入。
3. 影格只在記憶體／請求生命週期中供姿態節點推論使用。
4. API 依 bearer session 取得帳號，回傳姿態節點品質、衍生角度、門檻與事件狀態，並只寫入該帳號的聚合指標與工作階段摘要。
5. 合格工作階段達 10 分鐘時，量界智算只接收去識別摘要，例如視角、良好比例、常見偏移與介入階段；短資料固定在本地 fallback。

## 保存與刪除

- 競賽測試資料：只保留完成驗證所需期間，決賽後由團隊人工確認刪除或取得新的使用同意。
- 未來產品的詳細指標與摘要保存期尚未決定，不在初始化階段猜測固定天數。
- 設定頁已提供目前登入帳號的 API 端全部姿勢紀錄刪除；帳號刪除與資料匯出尚未實作。
- 不做不可逆 migration 或批次刪除，除非已有備份、還原與人工確認。
- PostgreSQL named volume 不是備份；部署前需完成 `pg_dump`／`pg_restore` 演練與離機保存。

## 測試資料

- 只使用團隊自製、已取得知情同意、可用於本競賽的影像／影片。
- Repository 只放不含可識別人體的合成 fixtures 或姿態節點 JSON。
- 不下載或使用來源、授權、人物同意不明的坐姿資料集。

## 待實作決策

- production backup 保存期限、還原責任人與定期演練頻率。
- Email 驗證、忘記密碼、帳號刪除與未成年使用者同意流程。
- sample 聚合與 production 保存期限。
- 資料匯出、刪除與聯絡人通知的審計紀錄。
