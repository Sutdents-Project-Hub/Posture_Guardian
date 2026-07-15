# services/api 元件

## 元件責任

- 類型：後端／API
- 專案：姿勢守衛隊 Posture Guardian
- 本元件只負責與其執行環境及部署生命週期一致的功能。

## 技術證據

- 技術：FastAPI
- Framework：FastAPI
- Package manager：pip
- Manifest／入口：`pyproject.toml`

## 本機開發

Framework 與 package-manager 基本證據已通過初始化檢查，但品質指令尚需實際執行。請記錄成功結果後再補上已驗證的前置需求、啟動方式、port 與本機 URL。

## 品質與建置

- Manifest 中可見的 script 名稱：`lint`、`typecheck`、`test`
- 只把實際執行成功的 lint、typecheck、test、build 指令寫入本文件。

## 環境變數

以本元件的 `.env.example` 記錄名稱與安全 placeholder；不得提交真實值。

## 部署與限制

- 部署狀態：Coolify
- 跨元件資料、API、權限或秘密邊界需在根 README 或 `docs/` 說明。
