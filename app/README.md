# Client：Expo Android／iOS／Web

## 元件責任

`app` 是唯一的使用者介面 codebase，負責相機權限、視角與校準引導、即時指標、提醒、工作階段與趨勢畫面。敏感 AI／資料庫操作必須由 API 執行。

目前已完成 AI-first 首頁、正面／側面設定、10 秒校準、即時骨架、8 秒持續事件、3 秒回正、分級提醒、摘要、六次改善圖、AI／Azure 證據鏈、提醒感受、隱私設定，以及可持久化的跟隨系統／淺色／深色外觀。首頁另有不需相機的展示模式，供決賽備援。

## 已驗證環境

- Node.js 24.14.0
- pnpm 11.7.0
- Expo 54.0.35
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

2026-07-15 已通過：

```bash
pnpm lint
pnpm typecheck
pnpm build
```

`pnpm build` 執行 `expo export --platform web`，輸出到 `dist/`。

## 環境變數

- `EXPO_PUBLIC_API_BASE_URL`：公開 API base URL，不得包含 secret。

複製 `.env.example` 成 `.env` 後填入本機或部署 URL；`.env` 已被忽略。

## 操作流程

- 選擇側面或正面；兩種視角只顯示各自能可靠量測的指標。
- 依畫面引導完成 10 秒校準，有效骨架影格需達 80%。
- 任一角度超過門檻持續 8 秒後進入姿勢事件；回到門檻內 3 秒才解除。
- 結束後顯示良好坐姿率、提醒次數、平均分數與建議。
- 「AI 洞察」會分開呈現真實 Foundry 成功、已設定待呼叫與規則式 fallback，並顯示最近六次資料充分度。
- 摘要頁可選填提醒強度與心情分類，不提供自由文字欄位。
- 設定頁可選擇跟隨系統、霧白淺色或深靛深色主題；Web、iOS、Android 共用同一組語意色規則。

## 限制

- 真實相機模式需要可連線的 API 與已下載 MediaPipe 模型；展示模式可離線執行核心互動。
- Expo Go 適合決賽快速展示，但加入不支援的 native module 時可能需要 development build。
- Web 與手機的相機權限、視角與版面必須各自人工驗收。
