# 安全、未成年使用者與隱私

## 原則

- 最小蒐集：能用衍生角度完成，就不保存照片、影片或臉部資訊。
- 目的限制：資料只用於姿勢覺察、趨勢與使用者要求的建議。
- 清楚同意：相機、測試資料與聯絡人通知分開同意，預設關閉非必要功能。
- 非醫療：不輸出診斷、疾病風險或治療指示；身體不適應尋求家長、教師或專業人員協助。

## 目前 MVP 的真實狀態

- 使用者可用 Email 與至少 12 字元密碼註冊／登入；只保存正規化 Email 與 Argon2 password hash，不收集姓名、學校或聯絡人。
- 登入採 14 天（可設 1–30 天）的隨機 opaque bearer session；server 只保存 token 的 SHA-256 digest，登出會立即刪除目前 session。每個工作階段都依登入帳號檢查 ownership。
- 相機影格以 multipart 暫存送到 API，限制 image MIME、5 MB 與 1,200 萬像素；推論完成即釋放。
- 資料庫只保存衍生角度、事件與摘要；設定頁可刪除該 profile 的伺服器資料。
- 量界智算只接收至少 10 分鐘工作階段的去識別彙總；API key 只存在 backend／Coolify runtime secret，設定不足時服務拒絕冒充已啟用。
- 量界智算的資料區域、保存、訓練與未成年條款尚未由正式文件確認；確認前不傳原始影像、自由文字或直接識別資訊。
- `.env.example` 只有安全預設與變數名稱；真實 secret 不得提交。

## 主要風險與控制

| 風險 | 控制 |
|---|---|
| 相機畫面外洩 | 預設不保存；不寫 log；請求完成即釋放；展示時避免拍到旁人 |
| 前端 secret 外洩 | `EXPO_PUBLIC_*` 只放公開設定；AI key、DB 密碼只在 API／部署平台 |
| 未成年資料被過度蒐集 | 只收 Email 作登入；正式公開前應補足年齡／監護人同意流程，聯絡人功能仍預設關閉 |
| 聯絡人變成監控 | 預設關閉，只傳摘要，不傳即時影像；可查看收件人與撤回 |
| AI 產生錯誤健康建議 | 輸入限制為摘要、輸出套用安全模板、標示來源、禁止診斷語句 |
| AI 額度被濫用 | 短工作階段不呼叫外部 AI、SDK 零重試；公網部署仍需 endpoint-aware rate limit 與 access control |
| 越權讀取他人紀錄 | API 以 bearer session 取得帳號，所有 session 讀寫與刪除都依 user ownership；未知或他人 ID 回 404，公網仍需 proxy rate limit |
| Demo 洩漏真實資料 | 使用去識別測試帳號與同意素材；畫面、log、簡報與 repository 都檢查 |

## 相機與上傳規則

- 權限前先說明用途與是否離開裝置／瀏覽器。
- 畫面只取完成姿態推論所需解析度與頻率。
- API 已限制 image MIME、5 MB 與 1,200 萬像素，client 請求有 8 秒 timeout；API 正常處理的回應另帶 `Cache-Control: no-store`、`X-Content-Type-Options: nosniff`、`X-Frame-Options: DENY`、`Referrer-Policy: no-referrer`、關閉 camera／microphone／geolocation 的 `Permissions-Policy`，以及 `X-Robots-Tag: noindex, nofollow`。這些 browser-level defaults 不取代 production reverse proxy 的 request timeout、body limit、依 endpoint 區分的 rate limit 或 access control。
- 原始影格不可傳送給生成式 AI provider。
- debug 模式也不得把 base64 或可還原影像的資料寫入 log；API 回傳 landmarks 供即時 overlay，但資料庫不保存 landmarks 全量。

## 帳號與聯絡人

帳號已使用 pwdlib 的 Argon2 與 server-side session 實作，且未登入、登出後與他人 session ID 的 API 行為已有測試。原生 App 使用系統 SecureStore；Web 使用當前 tab 的 `sessionStorage`，因此公開 Web 必須全程 HTTPS，並保持 Content Security Policy。尚未實作 Email 驗證、忘記密碼、帳號永久刪除、登入端點 rate limit 與監護人同意流程；在完成前不可把它描述成已完成的未成年正式帳號服務。

- 聯絡人通知只在使用者主動開啟後生效；未滿 18 歲需處理適當同意。
- 收件人只能收到必要摘要，不得取得相機畫面或完整活動紀錄。
- 聯絡人通知只在使用者主動開啟後生效；未滿 18 歲需處理適當同意。
- 收件人只能收到必要摘要，不得取得相機畫面或完整活動紀錄。

## 公開前安全檢查

- [ ] `git status --short --branch`、branch 與 remote 已確認。
- [ ] staged、unstaged、untracked 沒有 `.env`、key、個資、原始測試影像或內部文件。
- [ ] client bundle 不含 AI／資料庫 secret。
- [ ] API error 不回傳 stack trace、prompt、connection string 或 provider response 原文。
- [ ] demo 帳號、簡報截圖與 log 已去識別。
- [ ] 資料刪除與同意撤回流程有人工驗收。
- [ ] 若服務可由公開網路存取，已使用 Coolify／反向代理存取控制保護 demo API；正式多使用者版另有身份、ownership 與 rate limit。
