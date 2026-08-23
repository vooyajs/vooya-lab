# Cloudflare WASM 资源部署经验

Vooya Lab 的页面和大型 WASM 采用分层部署：

```text
GitHub main
   │
   └─ GitHub Actions
       ├─ R2：大型 WASM（私有 bucket）
       ├─ Worker：受控资源入口、CORS、缓存、每日配额
       └─ Pages：HTML、JS/CSS、Vooya Rust/WASM、Rolldown WASM
```

这样做的原因是 Cloudflare Pages 存在单文件大小限制，而 Rspack Browser
WASM 超过该限制。WASM 仍然是普通静态资源，只是由 Worker 从私有 R2
读取并返回。

## 一次性账号配置

1. 在 Cloudflare Dashboard 启用 R2，并添加支付方式。R2 的基础费用为
   `$0`，超出免费额度才按量计费。
2. 在仓库的 **Settings → Secrets and variables → Actions** 添加：

   - `CLOUDFLARE_ACCOUNT_ID`：Cloudflare 账号 ID；
   - `CLOUDFLARE_API_TOKEN`：专用于 CI 的 API Token。

   API Token 至少需要当前账号的 Workers Script 编辑、Pages 编辑、R2
   Object Read & Write 权限。不要把 Wrangler OAuth 文件或 R2 Secret Key
   提交到仓库。

3. 确认以下资源已经存在：

   - R2 bucket：`vooya-lab-assets`；
   - Worker：`vooya-lab-wasm-assets`；
   - Pages project：`vooya-lab`。

## 自动发布流程

`.github/workflows/cloudflare.yml` 在 `main` push 或手动触发时执行：

1. 从依赖包读取 Rspack WASM 并上传到
   `vooya-lab-assets/wasm/rspack.wasm`；
2. 部署 Worker 网关；
3. 构建 Vooya Rust/WASM 和页面；
4. 删除 Pages 无法接收的大型 Rspack 文件；
5. 发布 Pages。

页面使用带 `${GITHUB_SHA}` 的 WASM URL 查询参数做缓存破坏，因此同名
资源更新后不会被旧的浏览器/CDN 缓存永久卡住。Worker 返回长期缓存头，
依靠这个版本参数保证更新可见。

未来增加大型资源时，按下面的边界扩展：

- 在 Worker 的 `ALLOWED_KEYS` 中登记资源路径；
- 在 workflow 的 R2 上传步骤加入对应对象；
- 页面通过带 commit SHA 的 URL 或 manifest 引用它。

## 自动防刷和账单保护

预算提醒已经设置为 `$5`，但 Cloudflare Budget Alert 是通知，不是账单
熔断器。Worker 另有一个 Durable Object 全局每日配额：

- `MAX_REQUESTS_PER_DAY=5000`；
- 达到上限后返回 `429`；
- 下一 UTC 日自动恢复；
- bucket 保持私有，只有 Worker 能读取。

5000 次/天约为 15.5 万次/月，低于 R2 每月 1000 万次 Class B 免费额度。
即使你没有及时看到邮件，这条网关也不会无限接受读取请求。

## 紧急操作

手动关闭资源入口：

```sh
pnpm exec wrangler deploy \
  --config workers/wasm-assets/wrangler.jsonc \
  --var ASSETS_ENABLED:false
```

恢复资源入口：

```sh
pnpm exec wrangler deploy \
  --config workers/wasm-assets/wrangler.jsonc \
  --var ASSETS_ENABLED:true
```

如果 CI Token 泄露，应立即在 Cloudflare Dashboard 撤销并重新创建，随后
更新 GitHub Secret。
