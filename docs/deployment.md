# Coolify 部署邊界

## 目前狀態

- Coolify 是主要部署方向，但尚未建立 application、domain、DNS、secret 或正式 deployment。
- Repository 已提供 `compose.coolify.yaml`、client／API Dockerfile、healthcheck 與 PostgreSQL volume。
- Microsoft Foundry 與外部 PostgreSQL 資源仍未建立；三個本機 Linux ARM64 容器已實際建置、啟動並通過健康檢查，尚未在實際 Coolify 主機驗證。

## 命名契約

- Repository／本機根資料夾：`Posture_Guardian`
- Project slug／Coolify project：`posture-guardian`
- 本機 Docker Compose project：`posture_guardian`（`compose.coolify.yaml` 頂層 `name: posture_guardian`）
- Coolify services：`posture-guardian-web`、`posture-guardian-api`、`posture-guardian-postgres`
- Compose services：`web`、`api`、`postgres`；不設定 `container_name`

## 元件契約

| 元件 | Base directory | 已驗證 | 尚未驗證 |
|---|---|---|---|
| Web client | `apps/client` | `pnpm build`、Nginx static routing、port 80、container healthcheck 與首頁回應 | Coolify domain、HTTPS 與相機權限 |
| API | `services/api` | Uvicorn port 8000、PostgreSQL 連線、model ready health、multipart 影像分析 | Coolify CPU／RAM、cold start 與 timeout |
| PostgreSQL | Compose `postgres:17-alpine` | persistent volume、healthcheck、asyncpg URL 與 schema 自動建立 | Coolify backup／restore 與 migration 流程 |
| Microsoft Foundry | Azure external service | 競賽需要 Azure PoC | subscription、region、model deployment、quota、cost、key ownership |

Expo Web 由 build stage 執行 `expo export --platform web`，再交給 Nginx 提供靜態檔與 route fallback。API image 在 build 時下載官方 Pose Landmarker Lite model，不把 5.5 MB model binary 提交到 Git。MediaPipe 依賴允許 `0.10.18–0.10.x`，以兼容 Linux ARM64 wheel；目前 ARM64 image 實際解析為 0.10.18。

## Coolify Compose 設定

在 Coolify 指向 repository 根目錄與 `compose.coolify.yaml`，至少設定：

- `POSTGRES_PASSWORD`：由部署 secret 產生，不寫入 Git。
- `WEB_ORIGIN`：公開 client 的完整 HTTPS origin，用於 CORS。
- `PUBLIC_API_BASE_URL`：瀏覽器可連到的公開 HTTPS API URL，會在 client build 時寫入公開 bundle。
- `AI_PROVIDER=fallback`：Azure 尚未就緒時使用；切換 Foundry 時再加入 endpoint、key 與 model。

`web` 與 `api` 必須各綁定 HTTPS domain；Compose 內的 `api:8000` 只供容器網路使用，不能當作瀏覽器的 public API URL。

## 環境與秘密

- client 只允許 `EXPO_PUBLIC_API_BASE_URL` 等公開設定。
- API 的 `DATABASE_URL` 與 Foundry key 只放在 Coolify／Azure secret 管理或本機未追蹤 `.env`。
- 不把 production URL、密碼、token 或 connection string 寫進文件、Dockerfile、Compose 或 Git。
- CORS 必須列出實際 Web origin；開發用 wildcard 不得直接沿用到公開部署。

## 上線前門檻

1. `pnpm lint`、`pnpm typecheck`、`pnpm build` 通過。
2. `ruff`、`mypy`、`pytest` 通過，production start command 實測。
3. prototype schema 可在空資料庫建立；正式公開前補 migration 與可還原備份。
4. healthcheck 不依賴外部 AI，Foundry 失效時 API 仍可服務核心姿勢規則。
5. 測試帳號與資料去識別；沒有 raw frame、secret 或 debug log。
6. 使用決賽設備完成 HTTPS、相機權限、CORS 與 API latency 驗收。

## 發布與回滾

- Compose 與 image 可重建，但資料庫 migration／restore 尚未演練，故不得稱為 production-ready。
- 後續部署需記錄 Git commit、環境、migration version、人工 smoke test 與前一個可用 image／deployment。
- database migration 若不可逆，必須先備份並取得明確授權。
- Azure／Coolify deployment、DNS、release 與 production 資料操作都需要使用者另行明確授權。

## 參考

- [Expo Web 自架與輸出](https://docs.expo.dev/guides/publishing-websites/)
- [Coolify Docker Compose 行為](https://coolify.io/docs/knowledge-base/docker/compose)
