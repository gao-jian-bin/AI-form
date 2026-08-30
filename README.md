# AI 知识论坛

一个轻量、独立的论坛式个人知识站。界面参考 Discourse 的主题流信息结构，用于持续收录 ChatGPT 实践、AI 学习框架和实用在线工具。

首期采用“站长发布、公众阅读”模式：访客无需登录，可以浏览、筛选和搜索；登录、注册、回复和公开发帖均不开放。站长通过独立的私有工作台编写 Markdown 主题。

## 当前功能

- 基于官方 Discourse 源码结构重做的侧栏、导航和紧凑主题表格
- 后台可增删改查的一级板块，首次启动默认创建 `ChatGPT` 和 `工具箱`
- 板块、标签和全文关键词筛选
- Markdown 正文、代码块、引用、表格和安全外链
- 任意板块帖子都可以添加可选的外部网站按钮
- 深色模式、键盘焦点与减少动态效果支持
- 私有站长登录、帖子 CRUD、板块 CRUD、草稿和置顶
- HttpOnly 管理会话、登录限流、Markdown XSS 清理
- SQLite 持久化、Docker 部署、站点地图和 robots.txt

## 技术栈

- Nuxt 4 + Vue 3 + TypeScript
- Nitro 服务端 API
- SQLite + better-sqlite3
- Vitest
- Docker / Docker Compose

## Discourse 源码参考

公共界面依据官方 `discourse/discourse` 仓库提交 `c69b1bb8` 的前端结构重新实现，主要参考顶部栏、17em 侧栏、导航控件、主题表格和移动主题行。项目没有引入 Discourse 的 Rails/Ember 运行代码、Logo 或品牌素材，也不需要 PostgreSQL、Redis 和 Sidekiq。

## 本地启动

需要 Node.js 22 或 24。

```powershell
cd D:\Code\my-blog\ai-forum
Copy-Item .env.example .env
npm.cmd install
npm.cmd run db:seed
npm.cmd run dev
```

打开 <http://localhost:3000>。

本地未设置 `ADMIN_PASSWORD` 或 `ADMIN_PASSWORD_HASH` 时，可以使用开发密码：

```text
ai-forum-local-admin
```

管理入口：<http://localhost:3000/studio/sign-in>

该默认值只在非生产环境生效。生产环境没有管理员密码配置时，登录接口会拒绝工作。

## 常用命令

```powershell
npm.cmd run dev          # 开发服务器
npm.cmd test             # 单元、数据和安全测试
npm.cmd run typecheck    # Vue / TypeScript 类型检查
npm.cmd run build        # 生产构建
npm.cmd run test:e2e     # 构建后运行真实浏览器验收
npm.cmd run db:seed      # 空数据库中写入 8 篇演示主题
npm.cmd run password:hash -- "你的至少12位密码"
```

演示数据只会在主题表为空时写入，因此重复运行 `db:seed` 不会产生重复内容。

## 环境变量

复制 `.env.example` 后至少检查这些值：

| 变量 | 用途 |
|---|---|
| `SITE_URL` | 正式域名，用于站点地图和 canonical 地址 |
| `DATABASE_PATH` | SQLite 文件位置 |
| `UPLOAD_DIR` | 编辑器上传图片的保存目录 |
| `SEED_DEMO_CONTENT` | 空库启动时是否写入演示主题 |
| `ADMIN_PASSWORD_HASH` | 推荐的管理员密码 scrypt 哈希 |
| `ADMIN_PASSWORD` | 仅用于临时本地开发的明文密码 |
| `VIEW_HASH_SECRET` | 匿名浏览量指纹的随机密钥 |
| `TRUST_PROXY` | 仅在源站不可被公网直连时信任代理传来的访客地址 |
| `UPLOAD_QUOTA_MB` | 上传图片占用空间上限，默认 2048 MB |

生产环境建议执行：

```powershell
npm.cmd run password:hash -- "一段足够长且唯一的管理员密码"
```

将输出写入 `.env`：

```dotenv
ADMIN_PASSWORD_HASH='scrypt$...'
```

单引号可以避免 Docker Compose 将哈希中的 `$` 当作变量插值。不要同时保留 `ADMIN_PASSWORD`。

## Docker 部署

服务器建议使用 Ubuntu、Docker Engine、Docker Compose Plugin，并由 Caddy 或 Nginx 提供 HTTPS。

```bash
git clone <your-repository-url> ai-forum
cd ai-forum
cp .env.example .env
# 编辑 .env：正式域名、密码哈希、VIEW_HASH_SECRET
docker compose up -d --build
docker compose logs -f forum
```

容器的 `3000` 端口只绑定服务器本机 `127.0.0.1`，不能从公网直接访问。SQLite 写入 `./data/ai-forum.db`，图片写入 `./data/uploads`；反向代理或 Cloudflare Tunnel 再把正式域名转发到 `http://127.0.0.1:3000`。

更新版本：

```bash
git pull
docker compose up -d --build
docker image prune -f
```

## 数据备份与恢复

数据库和上传图片都在 `data` 目录。为得到一致备份，先停止应用，再完整打包该目录：

```bash
mkdir -p backups
docker compose stop forum
sudo tar -C data -czf "backups/ai-forum-data-$(date +%F-%H%M%S).tar.gz" .
docker compose start forum
```

恢复前同样先停止应用：

```bash
docker compose stop forum
sudo find data -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +
sudo tar -C data -xzf backups/需要恢复的备份.tar.gz
docker compose start forum
```

备份文件包含未发布草稿和全部图片，不要放进公开下载目录，也不要提交到 Git。至少再复制一份到另一台设备或可信对象存储；Cloudflare CDN 和 Tunnel 都不会替你备份这些文件。

## SQLite 和 MySQL

本项目当前使用 **SQLite**。它不是某个在线服务，而是由应用直接读写的单个数据库文件：本地默认是 `.data/ai-forum.db`，Docker 部署时是 `data/ai-forum.db`。

SQLite 适合当前这种单服务器、单管理员、以阅读为主的轻量论坛：不需要另外安装数据库服务，备份和迁移也只需要安全复制数据库文件。MySQL 则是独立运行的数据库服务，应用通过网络连接它，更适合大量并发写入、多个应用实例同时工作以及需要专职数据库运维的场景。

两者不是简单改一个配置名就能互换。以后迁移到 MySQL，需要更换数据库驱动、编写表结构迁移和数据转换程序，并完整测试查询语法。当前规模优先使用 SQLite，维护成本更低。

## 项目结构

```text
ai-forum/
├─ app/
│  ├─ assets/css/       视觉系统与响应式样式
│  ├─ components/       主题流、导航、侧栏和编辑器
│  ├─ layouts/          公共站点与私有工作台布局
│  └─ pages/            公共路由与管理路由
├─ server/
│  ├─ api/              公共读取、认证和管理 API
│  ├─ routes/           sitemap.xml 与 robots.txt
│  └─ utils/            SQLite、认证、Markdown 和校验
├─ scripts/             初始化数据与密码哈希命令
├─ tests/               单元、数据库和安全测试
├─ Dockerfile
└─ compose.yaml
```

日常发布和板块维护请查看 [管理员 CRUD 入门指南](docs/admin-crud-guide.md)。需要修改站点文案、标签折叠、Composer 尺寸或 Markdown 工具栏时，查看 [自定义修改指南](docs/customization-guide.md)。

## 上线前检查

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
npm.cmd run test:e2e
```

然后确认：

- `.env` 没有提交到 Git
- 已设置正式 `SITE_URL`
- 已设置 `ADMIN_PASSWORD_HASH` 和随机 `VIEW_HASH_SECRET`
- 公共首页没有登录、注册和发帖入口
- `/studio` 未登录时会跳转至 `/studio/sign-in`
- HTTPS、服务器防火墙和定期备份已经启用
