# AI 知识论坛

一个使用 Nuxt 构建的个人知识站，适合整理 AI 学习笔记、工具和实践记录。

公开页面以阅读为主，支持板块、标签、搜索和分页。内容由管理员在独立后台维护，普通访客无需注册。

## 功能

- Markdown 主题发布与历史版本恢复
- 板块、标签、搜索、置顶和草稿
- 图片上传、配额限制和未引用图片清理
- 深色模式与响应式布局
- 管理员会话、登录限流和 XSS 过滤
- sitemap、Atom 订阅和 robots.txt
- SQLite 数据存储与 Docker 部署

## 技术栈

帖子地址使用 `/t/123`，编号直接沿用数据库自增 ID，从 1 开始按创建顺序分配。
草稿也占用编号，删除后不复用；修改标题、发布时间或置顶不会改变编号。
旧的 `/t/标题/123` 地址会 301 跳转到数字地址，保留查询参数和浏览器锚点。
现有数据库无需重新编号或额外迁移。

- Nuxt 4、Vue 3、TypeScript
- Nitro
- SQLite、better-sqlite3
- Vitest、Playwright
- Docker Compose

界面结构参考了 `discourse/discourse` 提交 `c69b1bb8`，没有引入 Discourse 的 Rails、Ember 代码或品牌素材。

## 本地运行

需要 Node.js 22 或 24。

```bash
cp .env.example .env
npm install
npm run db:seed
npm run dev
```

Windows PowerShell 可使用：

```powershell
Copy-Item .env.example .env
npm.cmd install
npm.cmd run db:seed
npm.cmd run dev
```

网站默认运行在 <http://localhost:3000>，管理入口为 <http://localhost:3000/admin/sign-in>。

## 环境变量

| 变量 | 说明 |
|---|---|
| `SITE_URL` | 站点公开地址 |
| `DATABASE_PATH` | SQLite 数据库路径 |
| `UPLOAD_DIR` | 上传图片目录 |
| `SEED_DEMO_CONTENT` | 是否在空数据库中写入演示内容 |
| `ADMIN_PASSWORD_HASH` | 管理员密码的 scrypt 哈希 |
| `VIEW_HASH_SECRET` | 匿名浏览量指纹密钥 |
| `UPLOAD_QUOTA_MB` | 图片存储上限 |

生产环境应使用密码哈希：

```bash
npm run password:hash -- "your-password"
```

将生成的哈希和随机 `VIEW_HASH_SECRET` 写入服务器上的 `.env`。`.env` 已加入 `.gitignore`，不要提交到仓库。

## Docker

完成 `.env` 配置后运行：

```bash
docker compose up -d --build
docker compose ps
curl http://127.0.0.1:3000/api/health
```

Compose 只将应用端口绑定到 `127.0.0.1:3000`。公网访问应通过 Cloudflare Tunnel、Caddy 或 Nginx 转发，并启用 HTTPS。

数据库和上传图片保存在 `data/`。升级前应同时备份数据库和图片目录。

## 测试

```bash
npm test
npm run typecheck
npm run build
npm run test:e2e
```

推送到 `main` 后，GitHub Actions 会运行相同的质量检查和浏览器测试。

## 项目结构

```text
app/          页面、组件和样式
server/       API、数据库、认证和内容处理
scripts/      数据初始化与密码哈希工具
tests/        单元测试和端到端测试
docs/         管理与定制文档
```

- [管理员使用说明](docs/admin-crud-guide.md)
- [界面定制说明](docs/customization-guide.md)
- [从本地修改到服务器上线](docs/deployment-workflow.md)
