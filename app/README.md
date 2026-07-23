# Client：Expo Android／iOS／Web

## 元件責任

`app` 是唯一的使用者介面 codebase，負責相機權限、視角與校準引導、即時指標、提醒、工作階段與趨勢畫面。敏感 AI／資料庫操作必須由 API 執行。

目前已完成 Email／密碼登入與註冊、AI-first 首頁、正面／側面設定、10 秒校準、5 秒滾動中位數、8 秒有效偏移事件、3 秒有效回正、分級提醒、摘要、合格工作階段改善圖、VPS／PostgreSQL／量界智算證據鏈、提醒感受、隱私設定，以及可持久化的跟隨系統／淺色／深色外觀。雙主題共用方角編輯式視覺系統；首頁另有不需相機、API 或 MediaPipe 的展示模式，供決賽備援，且不建立或污染正式工作階段歷史。

## 已驗證環境

- Node.js 24.14.0
- pnpm 11.7.0
- Expo 54.0.36
- React Native 0.81.5
- TypeScript 5.9.3

使用 SDK 54 是為了配合 Expo 官方在 SDK 57 過渡期對實體 Expo Go 的建議。正式 native build、bundle identifier 與商店簽署尚未設定。

## 本機開發

```bash
pnpm install
pnpm start
pnpm web
```

- `pnpm start`：顯示 Expo Go QR code 與平台選項。
- `pnpm web`：啟動 Web 開發模式。
- 實機若要連本機 API，`localhost` 指向手機本身，應使用開發電腦的區網 IP。
- Web 相機需要 `localhost` 或 HTTPS；公開部署不可只使用 HTTP。

## 品質指令

2026-07-16 已通過：

```bash
pnpm lint
pnpm typecheck
pnpm build
```

`pnpm build` 執行 `expo export --platform web`，輸出到 `dist/`。

## 環境變數

- `EXPO_PUBLIC_API_BASE_URL`：公開 API base URL，不得包含 secret。

複製 `.env.example` 成 `.env` 後填入本機或部署 URL；`.env` 已被忽略。

## Coolify 正式部署

Web 在 Coolify 是獨立的 `posture-guardian-web` Dockerfile Application：repository Base Directory 設 `/app`、Dockerfile 設 `/Dockerfile`、expose port 設 `80`，health check 為 `/`。只設定 `EXPO_PUBLIC_API_BASE_URL=https://api.<your-domain>` 為 **build-only** variable；網址變更後必須重新 build Web。前端 bundle 不得包含 PostgreSQL password、AI key 或任何其他 secret。

登入 token 不使用 `EXPO_PUBLIC_*`：原生 iOS／Android 透過 Expo SecureStore 保存，Web 只保留在當前 tab 的 `sessionStorage`。公開 Web 必須使用 HTTPS，且不可在未信任的頁面嵌入 client。

## 操作流程

- 選擇側面或正面；兩種視角只顯示各自能可靠量測的指標。
- 正式觀察、歷史與趨勢先要求登入；展示模式不需要帳號，也不會建立 API 工作階段。
- 依畫面引導完成 10 秒校準，有效骨架影格需達 80%。
- 指標先取最近 5 秒有效值的中位數；有效偏移累積 8 秒後進入事件，無效影格不會偷算時間；回到門檻內連續 3 秒才解除。
- 結束後顯示良好坐姿率、提醒次數、平均分數與建議。
- 展示模式固定使用本地摘要，不建立、上傳或完成 API 工作階段；只有正式觀察且至少 10 分鐘有效資料的工作階段會進入改善趨勢與階段評估。
- 「AI 洞察」會分開呈現量界智算成功、已設定待呼叫、舊版雲端資料與規則式 fallback，並顯示 model ID、API mode、prompt version 與去識別輸入邊界。
- API 請求有 8 秒 timeout；工作階段進行中返回或滑動離開時，會先詢問是否結束並前往摘要，避免留下孤兒工作階段。
- 摘要頁可選填提醒強度與心情分類，不提供自由文字欄位。
- 設定頁可選擇跟隨系統、暖象牙淺色或炭墨深色主題；Web、iOS、Android 共用同一組方角、襯線展示字與語意色規則。

## 限制

- 真實相機模式需要可連線的 API 與已下載 MediaPipe 模型；展示模式可離線執行核心互動。
- Expo Go 適合決賽快速展示，但加入不支援的 native module 時可能需要 development build。
- Web 與手機的相機權限、視角與版面必須各自人工驗收。
