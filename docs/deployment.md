# Coolify／VPS 正式部署手冊

## 目前狀態與正式架構

- 部署目標是自有 VPS 上的 Coolify；Posture Guardian 的外部 Resources、DNS、production secret 與離機備份尚未建立或驗證。
- 正式 production 架構固定為同一個 Coolify project／environment 的三個**獨立 Resources**：
  1. `posture-guardian-postgres`：Coolify PostgreSQL 17 Database。
  2. `posture-guardian-api`：private GitHub repository 的 `/backend` Dockerfile Application。
  3. `posture-guardian-web`：同一 repository 的 `/app` Dockerfile Application。
- `app/Dockerfile` 與 `backend/Dockerfile` 是正式部署 image 的唯一建置來源；兩者已固定基底 image／依賴，且分別提供 `/` 與 `/health` Docker health check。
- `compose.coolify.yaml` 保留為三容器拓撲、migration、持久化與備份還原的本機整合驗證規格，**不作為 Coolify production Resource**；它不能取代下列各 Resource 的獨立網域、runtime secret、資料庫備份與回滾設定。
- API 啟動前會執行 `alembic upgrade head`；migration 失敗時不開始服務。量界智算正式 endpoint、model ID、key 與 API mode 仍待帳號文件確認。

## 命名與網路契約

| 用途 | 正式值／規則 |
|---|---|
| Repository | `Posture_Guardian` |
| Coolify project | `posture-guardian` |
| Environment | `production` |
| Database Resource | `posture-guardian-postgres` |
| API Resource | `posture-guardian-api` |
| Web Resource | `posture-guardian-web` |
| API 公開網址 | `https://api.<your-domain>`，不含 path 或尾斜線 |
| Web 公開網址 | `https://app.<your-domain>`，不含 path 或尾斜線 |

三個 Resources 必須位於相同 Coolify project、environment 與 server destination。PostgreSQL 不設定 public port 或 domain；API 只能透過該 database Resource 的內部連線資訊存取資料庫。Web 與 API 的公開 domain、DNS、TLS 及 Cloudflare 設定由部署操作者完成，不能以範例網址取代實際值。

## 部署前準備

1. 在 Coolify Source 使用團隊的 GitHub App，選 `Sutdents Project`，並只授權 `Posture_Guardian`。
2. 準備 Web 與 API 的正式 HTTPS domain；DNS 尚未生效前，可先不部署或使用 Coolify 產生的測試 domain，正式 domain 確定後必須同步重建 Web。
3. 在密碼管理器或 Coolify 產生獨立、高強度 PostgreSQL 密碼；不可重用其他 Resource 的 password，也不可提交至 repository。
4. 量界智算尚未完成帳號設定時，採 `AI_PROVIDER=fallback`；不要填入猜測的 endpoint、model 或 key。
5. production 寫入資料前，先設定 Coolify PostgreSQL backup 的加密、離機目的地與保存期限，並安排一次 restore 演練。

## 1. 建立 PostgreSQL Resource

在 `posture-guardian / production` 新增 Coolify PostgreSQL Database：

| 欄位 | 值／規則 |
|---|---|
| Name | `posture-guardian-postgres` |
| Version | `17` |
| Database | `posture_guardian` |
| Username | `posture_guardian` |
| Password | Coolify secret；高強度且不重用 |
| Public accessibility／Public port | 關閉 |
| Persistent storage | 保留 Coolify database 預設 persistent volume |

等待 database healthy 後，從 Coolify 的 internal connection details 取得 host、port、database、username 與 password。API 使用個別的 `DB_*` 變數，不把完整 connection URL 放進公開前端，也不為了連線問題公開 PostgreSQL。

## 2. 建立 API Dockerfile Application

新增 Private Repository Application，Source 選 `Sutdents Project`、repository 選 `Posture_Guardian`、branch 選 `main`：

| Coolify 欄位 | 值 |
|---|---|
| Name | `posture-guardian-api` |
| Build Pack | Dockerfile |
| Base Directory | `/backend` |
| Dockerfile Location | `/Dockerfile`（若 UI 顯示此欄，路徑相對 Base Directory） |
| Port Exposes | `8000` |
| Domain | `https://api.<your-domain>` |
| Health check | `/health`；Dockerfile 亦內建相同 readiness health check |
| Auto Deploy | 建議在首次成功部署與 smoke test 後開啟 |

以下值全部是 API runtime variables；`DB_PASSWORD`、`AI_API_KEY` 必須以 Coolify secret 保存，絕不可標成 Web build variable：

```dotenv
APP_ENV=production
DB_HOST=<posture-guardian-postgres internal host>
DB_PORT=5432
DB_NAME=posture_guardian
DB_USER=posture_guardian
DB_PASSWORD=<Coolify PostgreSQL secret>
CORS_ORIGINS=https://app.<your-domain>
AI_PROVIDER=fallback
AI_API_MODE=chat_completions
AI_TIMEOUT_SECONDS=8
AUTH_SESSION_DAYS=14
```

- `DB_HOST` 必須使用 Coolify database Resource 的 internal host，不能使用 public IP 或 localhost。
- `CORS_ORIGINS` 只接受完整 HTTPS Web origin；不要填 `*`、path、尾斜線或 API domain。
- 使用量界智算時，再額外設定 `AI_PROVIDER=liangjie`、`AI_BASE_URL`、`AI_API_KEY`、`AI_MODEL`，並依正式文件確認 `AI_API_MODE`。URL、key 或 model 任一缺失時 API 會拒絕啟動。
- Docker image 會下載固定的 MediaPipe 模型並在啟動時跑 Alembic migration；不設定額外 pre／post migration command，避免重複執行。

## 3. 建立 Web Dockerfile Application

新增第二個 Private Repository Application，使用同一 Source、repository 與 branch：

| Coolify 欄位 | 值 |
|---|---|
| Name | `posture-guardian-web` |
| Build Pack | Dockerfile |
| Base Directory | `/app` |
| Dockerfile Location | `/Dockerfile`（若 UI 顯示此欄，路徑相對 Base Directory） |
| Port Exposes | `80` |
| Domain | `https://app.<your-domain>` |
| Health check | `/`；Dockerfile 內建 Nginx health check |
| Auto Deploy | 建議在首次成功部署與 smoke test 後開啟 |

Web 只設定一個公開的 **build-only** variable：

```dotenv
EXPO_PUBLIC_API_BASE_URL=https://api.<your-domain>
```

在 Coolify 勾選 Build Variable、取消 Runtime Variable。此值會編入 Expo Web bundle，不能放 password、token、AI key 或 database URL；API domain 變更後，必須重新建置並部署 Web。

## 第一次部署與驗收順序

1. PostgreSQL 顯示 healthy，並確認 API 可讀到其內部連線資訊。
2. 設定 API runtime variables，Deploy API；確認 Alembic migration 完成與 `/health` 回 HTTP 200。
3. 設定 Web 的 build-only API URL，Deploy Web；確認首頁、登入、展示模式與相機權限的 HTTPS 行為。
4. 用 Web 註冊測試帳號，完成校準、工作階段、完成摘要與歷史查詢；重啟 API 後確認資料仍存在。
5. 以錯誤 Origin 重測 CORS，確認不回傳 `Access-Control-Allow-Origin`；再驗證量界智算 timeout 時顯示透明 fallback。
6. 執行一次 backup，還原至隔離 PostgreSQL Resource 後確認資料可讀回，才把正式資料視為可恢復。

```bash
curl -fsS https://api.<your-domain>/live
curl -fsS https://api.<your-domain>/health
curl -fsSI https://app.<your-domain>/
curl -i -X OPTIONS https://api.<your-domain>/api/v1/sessions \
  -H 'Origin: https://app.<your-domain>' \
  -H 'Access-Control-Request-Method: POST'
```

`/health` 只檢查 PostgreSQL、Pose model 與 AI 設定，不呼叫付費 AI。真實量界智算成功仍須以至少 10 分鐘的有效工作階段、provider=`liangjie` 與去敏 log 另外驗收。

## 公開服務安全邊界

- API 已提供 Argon2 密碼雜湊、可撤銷 bearer session 與 resource ownership；Web token 只在當前 browser tab 保存，原生 token 只在 SecureStore 保存。
- 反向代理／Coolify 必須在公開前設定 TLS、登入端點與影像端點各自的 rate limit、request timeout、body limit、監控與稽核。姿態影格與 AI 完成呼叫不能套用同一個過低限制。
- Email 驗證、忘記密碼、帳號永久刪除與未成年同意尚未實作；現階段只可在受控競賽展示條件使用，不能宣稱為完整公開未成年帳號服務。
- production `/docs` 與 `/openapi.json` 應由反向代理限制存取；PostgreSQL 永遠不公開到 Internet。

## 發布、回滾與備份

- Web 與 API 各自使用 Dockerfile image，確認健康後才開啟 Auto Deploy；`main` 新 commit 會分別重新建置受影響的 application，database volume 不會被 application deploy 重建。
- 每次 deployment 記錄 Git commit、Resource、migration revision、image、正式 domain 與人工 smoke test；API rollback 不能單獨回滾已不相容的 schema migration。
- PostgreSQL persistent volume 不等於備份。major version、資料庫設定、migration 或 password rotation 前先備份；rotation 需先更新 database role，再更新 API 的 `DB_PASSWORD` secret 並立即驗證 `/health`。
- migration、還原、DNS、secret rotation 與 production 資料操作仍需部署操作者明確執行；本文件不代表這些外部操作已完成。

## 官方參考

- [Coolify Dockerfile Build Pack](https://coolify.io/docs/applications/build-packs/dockerfile)
- [Coolify GitHub Auto Deploy](https://coolify.io/docs/applications/ci-cd/github/auto-deploy)
- [Coolify environment variables](https://coolify.io/docs/knowledge-base/environment-variables)
- [Coolify databases](https://coolify.io/docs/databases/)
- [Coolify database backups](https://coolify.io/docs/databases/backups)
- [Expo Web 自架與輸出](https://docs.expo.dev/guides/publishing-websites/)
