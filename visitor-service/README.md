# 自建访客统计

主页由 GitHub Pages 托管，地图轮廓由本仓库直接提供。Cloudflare Worker 读取请求的国家/地区及粗略经纬度，D1 保存累计统计。地图不调用第三方地图组件或地图瓦片。

当前已部署的统计服务：`https://zijianzhou-visitors.zijianzhou-visitors.workers.dev`。此仓库的数据库配置已经指向正式数据库；日常更新只需 `npm run deploy`，不要重复创建数据库。

## 统计口径

- **Visits 是访问次数，不是独立人数。** 同一标签页每天（UTC）计一次；刷新不重复计数。新标签页、跨天访问可能再次计数。
- 浏览器使用 `sessionStorage` 保存随机 UUID。服务端保存 UUID 与日期的 SHA-256 摘要，不保存原始 UUID、IP、User-Agent、页面 URL 或精确位置。
- 位置只取 Cloudflare 请求元数据，按 5° 网格聚合；地图圆点是网格中心，并非访客真实所在城市。缺少位置的请求仍计入总数，不伪造地图位置。未知国家/地区列为 Unknown，不计入国家/地区总数。
- 临时去重摘要保留约 48 小时，定时任务每小时清理；累计总数、国家/地区与网格计数长期保存。
- 本地预览、开启 DNT/GPC、禁止 sessionStorage 的浏览器不记录访问；常见爬虫也不计数。脚本拦截、VPN、网络错误、共享浏览器或主动刷量会影响结果，数据不是审计级流量或精确独立访客数据。
- 限流每 IP、每操作类型、每 Cloudflare 节点 30 次/分钟，限流键为 IP 摘要。它与来源白名单一起降低随意刷量；公开接口无法彻底阻止伪造请求。
- 读请求缓存最多 60 秒，写入后返回即时统计。未配置服务地址时，主页与导航均不展示 Visitors。

## 在新账号重建（当前实例无需重复执行）

需要 Node.js 22.13+、Cloudflare 账号及其 Workers/D1 功能。先用免费计划；额度与当前价格以 Cloudflare 官方为准，不会自动购买付费计划。

在此目录运行：

```powershell
npm ci
npm test
npx wrangler login
npx wrangler d1 create homepage-visitors
```

将创建结果里的 `database_id` 填入新副本的 `wrangler.toml`。当前实例已经配置好正式数据库，日常更新不需要更换。若账号已存在同名数据库，应先确认其用途，不能直接套用或清空已有数据。

```powershell
npm run migrate:remote
npm run deploy
```

记录部署输出的 HTTPS 服务地址。在主页根目录 `_config.yml` 中填写：

```yaml
visitor_stats_url: "https://你的实际服务地址"
```

然后提交并发布 GitHub Pages。`ALLOWED_ORIGINS` 已包含 `https://zijianzhou.xyz` 和 `https://cayleyz.github.io`；如果实际使用其他域名，需要同步修改并重新部署 Worker。服务配置了 Workers 子域名，不改变现有主页的域名或 DNS。

## 本地验证

```powershell
npm test
npx wrangler deploy --dry-run --outdir ../tmp/worker-build
npm run migrate:local
npm run dev
```

本地开发使用独立 D1 数据。Cloudflare 的真实地理位置只在边缘请求中可用，本地请求缺少位置时按 Unknown 处理。自动化测试使用 SQLite 执行真实迁移和触发器，覆盖重复请求、跨天、累计统计、清理、非法请求、来源、限流和前端失败状态。

`GET /stats` 返回 `visits`、`country_count`、`started_at`、`countries` 和 `locations`，不含临时去重摘要。`POST /visit` 只接收 `{"session":"随机 UUID v4"}`，必须携带白名单 Origin 和 JSON Content-Type；客户端提交国家/经纬度会被拒绝。

若修改数据库，新增迁移文件，不修改已经在线应用过的迁移。不要删除线上数据库或聚合表，否则会丢失累计统计。停用功能只需将主页 `visitor_stats_url` 留空并重新发布；原有统计可保留。

地图来源和许可见 [`assets/geo/README.md`](../assets/geo/README.md)。可先下载其链接的 `land-110m.json`，再运行 `node scripts/build-map.mjs 路径` 重建轮廓。

## 尚需人工完成的步骤

运行 `npm run preview -- --sample` 可在 `http://127.0.0.1:8765/` 查看标有“sample data”的本地地图预览；示例数据不会写入数据库。省略 `--sample` 则读取本地 Worker（需先运行 `npm run dev`）。预览文件、依赖、服务代码均不进入 GitHub Pages 构建。

首次 Cloudflare 登录和授权由账号持有人在浏览器中完成，不在聊天中发送密码或 API 密钥。此仓库不会提交登录令牌、`.dev.vars`、`.env` 或本地数据库。
