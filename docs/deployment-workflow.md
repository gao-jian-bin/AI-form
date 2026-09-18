# 从本地修改到服务器上线

这套流程分成三段：**本地修改与验证 → 推送 GitHub → 服务器拉取并重建容器**。GitHub 保存源码版本，服务器运行网站；`data/` 和 `.env` 只留在服务器，不跟着 Git 更新。

## 1. 在本地修改

项目目录：

```powershell
cd D:\Code\my-blog\ai-forum
```

例如更换 Logo，只需用新的正方形 SVG 覆盖 `public/logo.svg`。公共页顶部、内容工作台、错误页和浏览器标签页都会使用它。

改完先检查：

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
git diff --check
git status --short
```

在浏览器打开本地网站确认布局，尤其检查桌面、手机宽度和深色模式。

## 2. 保存版本并推送 GitHub

```powershell
git add app public nuxt.config.ts vitest.config.ts docs README.md
git commit -m "feat: update site branding"
git push origin main
```

这里的三个 Git 动作分别是：

- `git add`：挑选要放进本次版本的文件；
- `git commit`：在本地创建一个可以回退的版本点；
- `git push`：把版本上传到 GitHub 的 `main` 分支。

不要提交 `.env`、`data/`、数据库、服务器密码、SSH 私钥或任何 Token。

## 3. 在服务器更新

以下假设项目位于 `/opt/ai-forum`；如果实际目录不同，只替换第一条路径。先记录旧版本并备份数据：

```bash
cd /opt/ai-forum
git rev-parse HEAD
mkdir -p backups
docker compose stop forum
sudo tar -C data -czf "backups/ai-forum-data-$(date +%F-%H%M%S).tar.gz" .
docker compose start forum
```

然后拉取代码并重建：

```bash
git switch main
git pull --ff-only origin main
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 forum
curl --fail http://127.0.0.1:3000/api/health
```

健康检查应成功返回包含 `"ok":true` 的 JSON。最后打开正式域名，确认首页 Logo、浏览器标签页图标和后台登录页正常。如果仍显示旧 Logo，先强制刷新浏览器；Cloudflare 开了静态缓存时，再清理对应的 `/logo.svg` 缓存。

## 4. 出问题时回退

把下面的 `<旧提交哈希>` 换成更新前 `git rev-parse HEAD` 输出的值：

```bash
cd /opt/ai-forum
git switch -C emergency-rollback <旧提交哈希>
docker compose up -d --build
curl --fail http://127.0.0.1:3000/api/health
```

这只回退代码，不会删除 `data/`。如果确实需要恢复数据库或上传图片，应先停止容器，把当前 `data/` 改名保留，再从备份解压；不要直接覆盖唯一的数据副本。

## 5. 每次更新的记忆口诀

```text
改 → 测 → 看 diff → commit → push → 服务器备份 → pull → build → health → 浏览器验收
```
