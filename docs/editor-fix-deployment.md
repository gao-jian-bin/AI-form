# 编辑器修复与后续部署

服务器 SSH 别名为 `Oracle`，项目目录为 `/opt/ai-forum`，Compose 服务为 `forum`。
本次修复保留 Markdown 格式操作前的编辑框滚动位置，并恢复选区；点击工具栏不再让正文失去焦点。测试覆盖桌面、手机宽度、代码块、粗体和斜体快捷键。

## 1. 本地验证并推送

在 Windows PowerShell 中执行：

```powershell
cd D:\Code\my-blog\ai-forum
npm.cmd test
npm.cmd run typecheck
npm.cmd run test:e2e
git diff --check
git status --short

# 按本次改动选择文件，不要把其他未完成的修改一起发布。
git add app/components/TopicEditor.vue tests/e2e/editor-position.spec.ts docs/editor-fix-deployment.md
git commit -m "fix: preserve Markdown editor position when formatting"
git push origin main
```

`test:e2e` 包含生产构建。本地若有运行中的生产预览占用 `.output`，先停止该预览再构建；Windows 上 SQLite 原生模块被进程占用时无法清理旧产物。

## 2. 登录服务器并更新

```powershell
ssh Oracle
```

以下命令在服务器 Linux shell 中执行。不要在 Windows PowerShell 中直接运行这段：

```bash
set -eu
cd /opt/ai-forum

# 有服务器本地修改时先停下，避免覆盖。
test -z "$(git status --porcelain)"
STAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p backups
git rev-parse HEAD > "backups/previous-commit-$STAMP.txt"

git switch main
git pull --ff-only origin main
# 构建期间旧容器继续提供服务；构建失败不会替换运行中的容器。
docker compose build forum

# 停止写入后，完整备份 SQLite（含 WAL）和图片。
# 备份失败或命令中断时，也尝试启动原容器。
trap 'docker compose start forum >/dev/null 2>&1 || true' EXIT
docker compose stop forum
sudo tar -C data -czf "backups/ai-forum-data-$STAMP.tar.gz" .
sudo chmod 600 "backups/ai-forum-data-$STAMP.tar.gz"
docker compose start forum
trap - EXIT

docker compose up -d --no-build forum
docker compose ps
curl --fail --retry 12 --retry-delay 5 --retry-connrefused http://127.0.0.1:3000/api/health
```

`git pull` 获取源码，`docker compose build` 构建新镜像，`up -d --no-build` 用新镜像重建容器。
成功时健康接口返回 `{"ok":true}`。最后在浏览器刷新后台，打开长帖，在中间选中文字，点击代码块或粗体，确认仍停留在编辑处。
`.env` 和 `data/` 不随 Git 更新；不要删除它们，也不要执行 `docker compose down -v`。

查看状态与日志：

```bash
cd /opt/ai-forum
docker compose ps
docker compose logs --tail=100 forum
git log -1 --oneline
```

## 3. 回退代码

先用 `ls -lt backups/previous-commit-*.txt` 找到本次更新前记录，读取对应文件。将下面的 `OLD_COMMIT` 设置为该文件中的提交哈希：

```bash
cd /opt/ai-forum
OLD_COMMIT=旧提交哈希
git switch --detach "$OLD_COMMIT"
docker compose build forum
docker compose up -d --no-build forum
curl --fail --retry 12 --retry-delay 5 --retry-connrefused http://127.0.0.1:3000/api/health
```

这只回退代码，保留更新后产生的帖子和图片。数据库恢复需另行处理，不能直接覆盖当前唯一的数据副本。
下次重新更新时，先 `git switch main`，再按更新流程执行。
