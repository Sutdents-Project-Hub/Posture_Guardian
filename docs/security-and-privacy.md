# 安全、未成年使用者與隱私

## 原則

- 最小蒐集：能用衍生角度完成，就不保存照片、影片或臉部資訊。
- 目的限制：資料只用於姿勢覺察、趨勢與使用者要求的建議。
- 清楚同意：相機、測試資料與聯絡人通知分開同意，預設關閉非必要功能。
- 非醫療：不輸出診斷、疾病風險或治療指示；身體不適應尋求家長、教師或專業人員協助。

## 目前 MVP 的真實狀態

- 使用匿名本機 profile，沒有姓名、學校、Email 或密碼登入。
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
| 未成年資料被過度蒐集 | 匿名模式優先；需要帳號或聯絡人時再取得明確同意 |
| 聯絡人變成監控 | 預設關閉，只傳摘要，不傳即時影像；可查看收件人與撤回 |
| AI 產生錯誤健康建議 | 輸入限制為摘要、輸出套用安全模板、標示來源、禁止診斷語句 |
| AI 額度被濫用 | 短工作階段不呼叫外部 AI、SDK 零重試；公網部署仍需 endpoint-aware rate limit 與 access control |
| 越權讀取他人紀錄 | 目前匿名 API 只適用受控決賽 demo；若公開給多位使用者，必須先加入身份、每筆資源授權與 rate limit |
| Demo 洩漏真實資料 | 使用去識別測試帳號與同意素材；畫面、log、簡報與 repository 都檢查 |

## 相機與上傳規則

- 權限前先說明用途與是否離開裝置／瀏覽器。
- 畫面只取完成姿態推論所需解析度與頻率。
- API 已限制 image MIME、5 MB 與 1,200 萬像素，client 請求有 8 秒 timeout；production reverse proxy 仍需設定 request timeout、body limit 與依 endpoint 區分的 rate limit。
- 原始影格不可傳送給生成式 AI provider。
- debug 模式也不得把 base64 或可還原影像的資料寫入 log；API 回傳 landmarks 供即時 overlay，但資料庫不保存 landmarks 全量。

## 帳號與聯絡人

帳號與聯絡人通知仍是未決定功能，不是決賽 MVP 的既成能力。若實作：

- 使用成熟身份服務或安全 server-side session，不自製密碼學。
- 未登入、過期 session、越權 ID 與刪除他人資料都需有測試。
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
