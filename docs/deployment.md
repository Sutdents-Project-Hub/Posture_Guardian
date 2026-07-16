# Coolify／VPS 部署手冊

## 目前狀態

- 部署目標已確定為自有 VPS 上的 Coolify；repository 尚未連到實際 Coolify、DNS 或 production secret。
- `compose.coolify.yaml` 是部署 single source of truth，包含 `web`、`api`、`postgres`、健康檢查、隔離網路、log rotation 與 PostgreSQL persistent volume。
- Python、Node、Nginx、PostgreSQL image 與 MediaPipe model 都固定到本次已驗證 digest／版本；升級時需重新跑本文件的完整驗證。
- API 啟動前會執行 Alembic migration；先前以 `create_all` 建立的完整 MVP schema 會保留資料並標記 baseline。
- 本機 Linux ARM64 已重驗三個 containers、migration、PostgreSQL restart persistence 與一次 backup／restore；實際 VPS 與離機備份仍未驗證。
- 量界智算採可設定的 OpenAI-compatible adapter；真實 endpoint、model ID、key 與 API 模式尚待量界智算帳號文件確認。

## 命名契約

- Repository／本機根資料夾：`Posture_Guardian`
- Coolify project：`posture-guardian`
- Compose project：`posture_guardian`
- Compose services：`web`、`api`、`postgres`；不設定 `container_name`
- 建議 Coolify service 顯示名稱：`posture-guardian-web`、`posture-guardian-api`、`posture-guardian-postgres`

## 建立 Coolify Resource

1. 在 VPS 的 Coolify 建立 project `posture-guardian`。
2. 新增 Docker Compose resource，repository base directory 使用根目錄，Compose 檔指定 `/compose.coolify.yaml`。
3. 在 Coolify 的 `web` domain 欄填入 `https://app.example.com`。
4. 在 `api` domain 欄填入 `https://api.example.com:8000`；`8000` 是容器 target port，公開仍由 HTTPS 443 存取。
5. `postgres` 不綁 domain、不設定 public port；它只存在 internal backend network。
6. 完成 DNS 後再部署，等待三個 service healthy。

以上 domain 只為格式範例，部署時換成實際網域。Coolify Compose domain 規則以官方文件為準。

## Coolify 環境變數

必填：

| 變數 | 類型 | 範例／規則 |
|---|---|---|
| `POSTGRES_PASSWORD` | runtime secret | 使用密碼管理器產生；程式會安全 URL encode 特殊字元 |
| `WEB_ORIGIN` | runtime public config | `https://app.example.com`，不可有 path 或尾斜線 |
| `PUBLIC_API_BASE_URL` | Web build variable | `https://api.example.com`，不可有尾斜線 |

量界智算尚未填妥前：

```env
AI_PROVIDER=fallback
AI_API_MODE=chat_completions
AI_TIMEOUT_SECONDS=8
```

取得量界智算正式帳號文件後：

```env
AI_PROVIDER=liangjie
AI_BASE_URL=https://provider-documentation.example/v1
AI_API_KEY=<Coolify runtime secret>
AI_MODEL=<provider model id>
AI_API_MODE=chat_completions
AI_TIMEOUT_SECONDS=8
```

- `AI_BASE_URL` 必須是文件指定的完整 base URL；程式不會自行補 `/v1` 或 `/openai/v1`。
- 只有供應商明確支援 Responses API 時，才改成 `AI_API_MODE=responses`。
- production 的外部 `AI_BASE_URL` 必須使用 HTTPS，且不可包含帳密、query 或 fragment。
- `AI_PROVIDER=liangjie` 缺少 URL、key 或 model 時，API 會拒絕啟動，避免 UI 冒充 AI 已啟用。
- `AI_API_KEY` 與 `POSTGRES_PASSWORD` 都是 runtime secret，不可勾成 Web build variable；`PUBLIC_API_BASE_URL` 則必須在 Web build 時存在，修改後要 rebuild。

## PostgreSQL 與 migration

- Compose 以 `DB_HOST`、`DB_PORT`、`DB_NAME`、`DB_USER`、`DB_PASSWORD` 傳給 API，再由 SQLAlchemy 安全建立連線 URL。
- API 啟動時執行 `alembic upgrade head`；migration 失敗時不開始服務。
- 部署後可在 API container 檢查：`alembic current`，預期為 `20260716_01 (head)`。
- Named volume 只提供持久化，不等於備份；Coolify 可能替實際 volume 名稱加入 resource UUID，不可用猜測的 volume 名操作 production。
- 更改 `POSTGRES_PASSWORD` 環境變數不會自動旋轉既有 PostgreSQL role 密碼。輪替時先在資料庫執行 `ALTER ROLE`，再更新 Coolify secret，並立即驗證 API readiness。

## 備份與還原門檻

上正式資料前：

1. 以 Coolify database backup 或排程 `pg_dump --format=custom --no-owner --no-acl` 建立備份。
2. 備份送到加密、與 VPS 分離的儲存位置，設定合理保存期限。
3. 在臨時 PostgreSQL database 執行一次 `pg_restore`，確認不是只有「有備份檔」而是真的可還原。
4. PostgreSQL major version、Compose project 名稱、volume 或 migration 變更前再做一次備份。

## 部署後驗證

```bash
curl -fsS https://api.example.com/live
curl -fsS https://api.example.com/health
curl -fsS https://app.example.com/
```

`/health` 應回報 PostgreSQL、Pose model、AI 設定狀態；它不會呼叫付費 AI，也不代表量界智算已成功推論。真實 AI 驗證需完成至少 10 分鐘有效工作階段，確認摘要 provider=`liangjie` 並核對去敏 log。

CORS 正向測試：

```bash
curl -i -X OPTIONS https://api.example.com/api/v1/sessions \
  -H 'Origin: https://app.example.com' \
  -H 'Access-Control-Request-Method: POST'
```

再以錯誤 Origin 重測，確認沒有 `Access-Control-Allow-Origin`。最後用決賽手機人工驗證 HTTPS 相機權限、正／側面校準、完成／查詢／刪除工作階段、PostgreSQL restart 後資料仍在，以及量界智算 timeout 時透明 fallback。

## 公開服務安全邊界

- 目前匿名 profile API 適合受控決賽 demo，不是完整多使用者身份系統。
- 對公網開放前，必須先在 Coolify／反向代理加入 endpoint-aware rate limit、request timeout、body limit 與 demo access control；未完成時只可在受控網路展示，不可直接公開。姿態影格流量和 AI 完成呼叫不可使用同一個過低限制。
- 正式多使用者產品仍需身份驗證、resource ownership、額度與稽核；不能只靠前端匿名 ID。
- production `/docs`／`openapi.json` 應由反向代理限制，避免把測試介面無條件公開。

## 發布與回滾

- 每次部署記錄 Git commit、環境名稱、migration revision、image、人工 smoke test 與前一個可用 deployment。
- API production 套件由 `backend/requirements.lock` 固定；依賴更新必須連同 lock、測試與候選映像一起審查，避免 Coolify 重建時漂移。
- App/API image 可回滾；已執行的資料庫 migration 必須依 migration 性質處理，不能只回滾 container。
- migration、還原、DNS、正式部署與 production 資料操作仍需部署操作者明確執行；本文件不代表已建立外部資源。

## 官方參考

- [Coolify Docker Compose](https://coolify.io/docs/knowledge-base/docker/compose)
- [Coolify environment variables](https://coolify.io/docs/knowledge-base/environment-variables)
- [Coolify health checks](https://coolify.io/docs/knowledge-base/health-checks)
- [Coolify database backups](https://coolify.io/docs/databases/backups)
- [Expo Web 自架與輸出](https://docs.expo.dev/guides/publishing-websites/)
