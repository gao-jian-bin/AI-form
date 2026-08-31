# AI 知识论坛

一个轻量、独立的论坛式个人知识站。界面参考 Discourse 的主题流信息结构，用于持续收录 ChatGPT 实践、AI 学习框架和实用在线工具。

首期采用“站长发布、公众阅读”模式：访客无需登录，可以浏览、筛选和搜索；登录、注册、回复和公开发帖均不开放。站长通过独立的私有工作台编写 Markdown 主题。

## 当前功能

- 基于官方 Discourse 源码结构重做的侧栏、导航和紧凑主题表格
- 后台可增删改查的一级板块，首次启动默认创建 `ChatGPT` 和 `工具箱`
- 板块、标签和全文关键词筛选，公开帖子支持分页
- Markdown 正文、代码块、引用、表格和安全外链
- 任意板块帖子都可以添加可选的外部网站按钮
- 深色模式、键盘焦点与减少动态效果支持
- 私有站长登录，帖子、板块、标签完整 CRUD，草稿和置顶
- 编辑器本机自动暂存、帖子历史版本与一键恢复
- 图片上传、容量限制、引用保护和未使用图片清理
- HttpOnly 管理会话、登录限流、Markdown XSS 清理
- SQLite 持久化、Docker 部署、完整站点地图、Atom 订阅和 robots.txt

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

管理入口：<http://localhost:3000/admin/sign-in>

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
| `UPLOAD_CLEANUP_GRACE_HOURS` | 新上传但尚未发帖的图片保护时间，默认 168 小时（7 天） |

图片管理只会清理“当前帖子和历史版本都没有引用”并且已经超过保护期的文件。刚粘贴进编辑器、还只存在于浏览器本机草稿里的图片不会立刻被误删。

生产环境建议执行：

```powershell
npm.cmd run password:hash -- "一段足够长且唯一的管理员密码"
```

将输出写入 `.env`：

```dotenv
ADMIN_PASSWORD_HASH='scrypt$...'
```

单引号可以避免 Docker Compose 将哈希中的 `$` 当作变量插值。不要同时保留 `ADMIN_PASSWORD`。

## 新手上线方案

推荐结构是：

```text
访客 → Cloudflare 域名与 HTTPS → Cloudflare Tunnel → Ubuntu 服务器 → Docker 中的本站
                                                        └─ data/（SQLite + 图片）
```

这套方式不需要把服务器的 `3000`、`80` 或 `443` 端口暴露到公网。本站继续运行在普通 VPS 上；Cloudflare 负责域名、HTTPS 和隧道，并不保存 SQLite 或上传图片。当前代码使用 `better-sqlite3` 和本地文件，不能原样部署到 Cloudflare Workers/Pages；若要完全运行在 Cloudflare 上，需要把数据库重写为 D1、图片重写为 R2。

### 1. 服务器准备

建议从 Ubuntu 24.04、2 核 CPU、2 GB 内存、20 GB 磁盘起步。按 [Docker 官方 Ubuntu 安装指南](https://docs.docker.com/engine/install/ubuntu/) 安装 Docker Engine 和 Compose Plugin，然后确认：

```bash
docker --version
docker compose version
```

把仓库放在固定目录：

```bash
sudo mkdir -p /opt/ai-forum
sudo chown "$USER":"$USER" /opt/ai-forum
git clone 你的Git仓库地址 /opt/ai-forum
cd /opt/ai-forum
cp .env.example .env
```

先在自己的 Windows 电脑里生成管理员密码哈希：

```powershell
cd D:\Code\my-blog\ai-forum
npm.cmd run password:hash -- "你自己的至少12位强密码"
```

再编辑服务器 `/opt/ai-forum/.env`。不要把 `.env` 发给任何人，也不要提交到 Git：

```dotenv
SITE_URL=https://你的域名
DATABASE_PATH=/data/ai-forum.db
UPLOAD_DIR=/data/uploads
SEED_DEMO_CONTENT=false
ADMIN_PASSWORD_HASH='粘贴刚生成的scrypt哈希'
ADMIN_PASSWORD=
VIEW_HASH_SECRET=粘贴openssl-rand-hex-32生成的随机值
TRUST_PROXY=false
UPLOAD_QUOTA_MB=2048
UPLOAD_CLEANUP_GRACE_HOURS=168
```

`VIEW_HASH_SECRET` 可以在服务器运行 `openssl rand -hex 32` 生成。Compose 会强制把数据路径指向 `/data`，并在仅绑定本机端口的前提下启用可信代理，因此 `.env` 中 `TRUST_PROXY=false` 保持默认即可。

启动：

```bash
cd /opt/ai-forum
docker compose up -d --build
docker compose ps
docker compose logs --tail=200 forum
curl http://127.0.0.1:3000/api/health
```

健康检查应返回 `{"ok":true}`。SQLite 在 `/opt/ai-forum/data/ai-forum.db`，图片在 `/opt/ai-forum/data/uploads`。容器会自动创建目录并处理写权限。

### 2. 把域名加入 Cloudflare

1. 在 Cloudflare 控制台选择 **Add a domain**，输入已购买的域名。
2. 仔细确认自动导入的 DNS 记录，尤其不要误删邮箱使用的 MX、TXT 记录。
3. 到购买域名的注册商后台，把域名服务器改成 Cloudflare 分配的两条 Nameserver。
4. 等 Cloudflare 中域名状态变成 **Active**。

官方说明：[添加域名](https://developers.cloudflare.com/fundamentals/manage-domains/) 与 [完整区域 Nameserver 设置](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/)。

### 3. 创建 Cloudflare Tunnel

按 [Cloudflare Tunnel 官方安装流程](https://developers.cloudflare.com/tunnel/setup/) 操作：

1. 打开 **Zero Trust → Networks → Tunnels → Create a tunnel**。
2. 选择 `cloudflared`，按页面给出的 Debian/Ubuntu 命令在服务器安装连接器。页面命令中的 Token 属于密码，不能发给我或截图公开。
3. 在 Tunnel 的 **Public Hostname** 中填写你的域名或子域名，例如 `www.example.com`。
4. Service 类型选择 `HTTP`，地址填写 `http://localhost:3000`。
5. 保存后 Cloudflare 会自动建立对应 DNS 路由。访问 `https://你的域名` 验证首页，再访问 `/admin/sign-in` 验证管理入口。

Cloudflare 中再开启 **Always Use HTTPS**。不要给本站启用“Cache Everything”；`/admin/*`、`/api/studio/*`、`/api/auth/*` 必须保持不缓存。Nuxt 官方也建议关闭 Cloudflare 的 Rocket Loader 和 Email Address Obfuscation，避免页面 hydration 被改写；参见 [Nuxt 部署说明](https://nuxt.com/docs/4.x/getting-started/deployment)。登录接口可以在 Cloudflare WAF 中额外限制 `/api/auth/login` 的请求频率。

如果以后不用 Tunnel，而改用 Nginx/Caddy，则只把它反向代理到 `127.0.0.1:3000`，Cloudflare SSL 模式使用 **Full (strict)**；不要让公网直接访问 `服务器IP:3000`。

## 更新、备份与恢复

每次更新前先记下当前提交并备份全部数据：

```bash
cd /opt/ai-forum
git rev-parse HEAD
mkdir -p backups
docker compose stop forum
sudo tar -C data -czf "backups/ai-forum-data-$(date +%F-%H%M%S).tar.gz" .
docker compose start forum
git pull --ff-only
docker compose up -d --build
docker compose ps
docker compose logs --tail=200 forum
```

数据库和图片必须一起备份。备份文件含草稿和全部图片，不要放进网站公开目录，也不要提交到 Git；至少再同步一份到另一台设备或可信对象存储。Cloudflare 不会替你备份服务器数据。

恢复时保留现有目录作为第二层保险，不直接删除：

```bash
cd /opt/ai-forum
docker compose stop forum
sudo mv data "data.before-restore-$(date +%F-%H%M%S)"
sudo mkdir data
sudo tar -C data -xzf backups/需要恢复的备份.tar.gz
docker compose start forum
docker compose logs --tail=200 forum
```

代码更新出问题但数据没问题时，可用更新前 `git rev-parse HEAD` 记下的提交创建临时恢复分支，再重建容器：

```bash
git switch -c emergency-rollback 更新前的提交哈希
docker compose up -d --build
```

## 可以安全发给我的服务器信息

等你准备部署时，可以把下面信息发给我，我会根据你的真实服务器一步步带你操作：

- 服务器系统名称与版本、CPU/内存/磁盘大小；
- 是否安装 Docker、Docker Compose、Nginx/Caddy、宝塔或 1Panel；
- 你准备使用根域名还是子域名；
- 项目准备放在哪个目录；
- `docker --version`、`docker compose version`、`df -h`、`free -h` 的输出；
- 可以发目录名称，但不要发 `.env` 的内容。

绝对不要发送：服务器密码、SSH 私钥、Cloudflare API Token、Tunnel Token、Cookie、管理员密码或完整 `.env`。如果截图里出现这些内容，要先遮住再发。

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
- `/admin` 未登录时会跳转至 `/admin/sign-in`，旧的 `/studio` 地址只负责兼容跳转
- HTTPS、服务器防火墙和定期备份已经启用
