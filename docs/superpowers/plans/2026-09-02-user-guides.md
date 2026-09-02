# Three User Guide Drafts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create three publication-ready Chinese Markdown drafts and stage the five supplied Codex Desktop screenshots without modifying or publishing to the forum database.

**Architecture:** Keep each tutorial in a standalone Markdown file under one dated draft directory, with a hidden metadata block followed by paste-ready body content. Store renamed screenshots beside the drafts and use relative image links so the package can be previewed locally and uploaded through the existing forum Composer.

**Tech Stack:** Markdown, PowerShell file checks, Git, the forum's existing Markdown Composer

## Global Constraints

- Write for ordinary Windows users and lead with actionable checks before technical explanation.
- Use natural, direct Chinese with limited conversational humor and no marketing copy.
- Treat disabled antivirus and firewall protection as a short diagnostic test; require immediate restoration and recommend app/file exclusions for a lasting fix.
- Date or version-scope claims that can become stale.
- Do not change `.data/ai-forum.db`, call the publishing API, or publish any topic.
- Preserve `{{CODEX_DESKTOP_LAG_URL}}` exactly once as the user-approved publication marker for the unavailable lag-guide URL.
- Link the existing CLI guide as `/t/codex-cli-beginner-guide/10`.
- Use only the five supplied screenshots; do not generate replacement UI images.

---

### Task 1: Stage and identify the five supplied screenshots

**Files:**
- Create: `drafts/2026-09-02/assets/codex-store-search.png`
- Create: `drafts/2026-09-02/assets/codex-desktop-home-usage.png`
- Create: `drafts/2026-09-02/assets/codex-usage-menu.png`
- Create: `drafts/2026-09-02/assets/codex-settings-menu.png`
- Create: `drafts/2026-09-02/assets/codex-usage-billing-reset.png`

**Interfaces:**
- Consumes: Five PNG files supplied by the user in the current conversation.
- Produces: Stable relative paths used by `codex-desktop-windows-guide.md`.

- [ ] **Step 1: Verify every source image exists**

```powershell
$sourceImages = @(
  'C:\Users\18204\AppData\Local\Temp\utools-clipboard\1788342615569.png',
  'D:\download\wechat-list\xwechat_files\wxid_2fchhfyjtose22_1b5e\temp\RWTemp\2026-09\9e20f478899dc29eb19741386f9343c8\1a43b10bb52faf4b136d5d7a7e2d15ac.png',
  'D:\download\wechat-list\xwechat_files\wxid_2fchhfyjtose22_1b5e\temp\RWTemp\2026-09\9e20f478899dc29eb19741386f9343c8\537b501afbcd185106e6327942abd925.png',
  'D:\download\wechat-list\xwechat_files\wxid_2fchhfyjtose22_1b5e\temp\RWTemp\2026-09\9e20f478899dc29eb19741386f9343c8\bac198ce539e66e53c48b010a6b62a07.png',
  'D:\download\wechat-list\xwechat_files\wxid_2fchhfyjtose22_1b5e\temp\RWTemp\2026-09\9e20f478899dc29eb19741386f9343c8\b35ac57115c23b059d5e2e09969cfcf2.png'
)
$sourceImages | ForEach-Object { [pscustomobject]@{ Path = $_; Exists = Test-Path -LiteralPath $_ } }
```

Expected: All five rows show `Exists = True`.

- [ ] **Step 2: Copy the images to stable descriptive names**

Use `New-Item -ItemType Directory -Force drafts\2026-09-02\assets`, followed by five literal `Copy-Item` calls matching source order to destination order above. Do not resize or recompress the PNG files.

- [ ] **Step 3: Verify byte-for-byte copies**

Run `Get-FileHash -Algorithm SHA256` on each source/destination pair and confirm the two hashes in every pair match.

- [ ] **Step 4: Commit the staged screenshots**

```powershell
git add -- drafts/2026-09-02/assets
git commit -m "docs: stage Codex Desktop guide screenshots"
```

### Task 2: Write the Clash Verge node troubleshooting guide

**Files:**
- Create: `drafts/2026-09-02/clash-verge-node-troubleshooting.md`

**Interfaces:**
- Consumes: The approved design and cited primary sources.
- Produces: A standalone paste-ready troubleshooting article with no external asset dependency.

- [ ] **Step 1: Add exact publication metadata**

Place an HTML comment at the top with:

- Title: `Clash Verge 节点超时怎么办？从 Windows 到服务端的完整排查顺序`
- Category: `ChatGPT`
- Tags: `Clash Verge`, `节点排障`, `Windows`, `Xray`, `REALITY`
- Excerpt: a two-sentence summary explaining that node timeout is a symptom, and that the article separates local interception, client imports, carrier routes, server failures, blocked addresses, and Xray/Mihomo incompatibility.

- [ ] **Step 2: Write the fast diagnosis opening**

Open with a five-minute sequence: refresh subscription and restart the core; compare one node with all nodes; test the same subscription on another device; compare home Wi-Fi with phone data; inspect the client log. Explain how each comparison narrows the fault domain.

- [ ] **Step 3: Write the Windows security diagnostic**

Give the exact Windows Security navigation for temporarily disabling real-time protection and the active Microsoft Defender Firewall profile. Tell users to fully exit third-party security managers instead of only closing their window. State prominently that the test lowers protection, should be brief, and must be reversed immediately; if it changes the result, add a trusted app/path exclusion or firewall allow rule.

Use these primary sources:

- `https://support.microsoft.com/en-us/windows/help-protect-my-pc-with-microsoft-defender-offline-9306d528-64bf-4668-5b80-ff533f183d6c`
- `https://support.microsoft.com/en-us/windows/turn-microsoft-defender-firewall-on-or-off-ec0844f7-aebd-0583-67fe-601ecf5d774f`

- [ ] **Step 4: Explain silent YAML drag-and-drop failure**

Explain that Explorer normally runs at medium integrity while an administrator-launched Clash Verge runs at high integrity. Windows UIPI can block cross-integrity UI interaction, so the drop may appear to do nothing. Tell users to exit Clash Verge from the tray, start it normally without “Run as administrator,” and drag again; offer right-clicking the YAML file and choosing “Open with” as an alternative.

Use the Microsoft explanation at `https://learn.microsoft.com/en-us/troubleshoot/power-platform/power-automate/desktop-flows/ui-automation/uipi-issues`.

- [ ] **Step 5: Write the network and server decision tree**

Cover subscription expiry/traffic exhaustion, wrong local mode or stale core, DNS/UDP/IPv6 differences, carrier congestion or route loss, server process/port failure, certificate/SNI/time mismatch, and IP/domain interference. Include a safe `Test-NetConnection example.com -Port 443` example and explain that a successful TCP test does not prove the application-layer handshake succeeds.

- [ ] **Step 6: Add the scoped Xray/Mihomo REALITY case**

State that Xray-core v26.7.11+ can default an empty REALITY `minClientVer` to `26.3.27`, while Mihomo's REALITY handshake identifies itself as `1.8.2`; this causes rejection such as `REALITY authentication failed`. For a server the reader controls, recommend `minClientVer = 1.8.2`; mention `1.0.0` as the broader community workaround and explain that it weakens the minimum-version gate. Require a service restart and fresh test after the change.

Use:

- `https://github.com/MetaCubeX/mihomo/issues/2967`
- `https://github.com/XTLS/Xray-core/blob/main/infra/conf/transport_internet.go`
- `https://github.com/MHSanaei/3x-ui/blob/main/frontend/src/schemas/protocols/security/reality.ts`

- [ ] **Step 7: Run article-specific checks and commit**

```powershell
rg -n "重新开启|UIPI|minClientVer|1\.8\.2|1\.0\.0|REALITY authentication failed|Test-NetConnection" drafts/2026-09-02/clash-verge-node-troubleshooting.md
git diff --check
git add -- drafts/2026-09-02/clash-verge-node-troubleshooting.md
git commit -m "docs: add Clash Verge node troubleshooting guide"
```

Expected: Every required phrase is found and `git diff --check` reports no whitespace errors.

### Task 3: Write the Codex Desktop Windows beginner guide

**Files:**
- Create: `drafts/2026-09-02/codex-desktop-windows-guide.md`

**Interfaces:**
- Consumes: The five stable image paths from Task 1 and the existing CLI topic URL.
- Produces: A screenshot-led installation, login, usage, reset, and performance guide.

- [ ] **Step 1: Add exact publication metadata**

Use:

- Title: `Codex Desktop Windows 新手教程：下载、登录、查看额度与使用重置卡`
- Category: `ChatGPT`
- Tags: `Codex`, `Windows`, `OpenAI`, `额度`, `新手教程`
- Excerpt: two sentences covering Store installation, account login, usage checks, reset credits, and lower-memory alternatives.

- [ ] **Step 2: Write installation and login instructions**

Link `https://learn.chatgpt.com/docs/windows/windows-app`, explain that its Windows download enters the Microsoft Store flow, and insert `assets/codex-store-search.png`. If the Store fails through the active proxy node, tell the reader to exit the proxy and retry by direct connection. Add the official command-line fallback:

```powershell
winget install --id 9PLM9XGG6VKS -s msstore
```

Then explain ChatGPT account/API-key sign-in without promising that every plan or region exposes identical features.

- [ ] **Step 3: Explain both usage entry points with screenshots**

Insert `assets/codex-desktop-home-usage.png` and `assets/codex-usage-menu.png`. Explain the lower-left account/percentage entry and the `/status` command. State that official slash-command documentation defines `/status` as showing chat ID, context usage, and rate limits.

Link `https://learn.chatgpt.com/docs/reference/slash-commands` and `https://learn.chatgpt.com/docs/pricing`.

- [ ] **Step 4: Explain reset credits and expiry**

Insert `assets/codex-settings-menu.png` and `assets/codex-usage-billing-reset.png`. Give the path Settings > Usage & billing > Usage limit resets. Explain that eligible accounts may receive earned or promotional rate-limit reset credits; the visible card controls scope and expiry. For a Full reset card, “Use reset” restores eligible displayed limits, but it does not renew the subscription or create paid API balance.

- [ ] **Step 5: Add a factual performance note and internal links**

Explain that the inspected Windows build uses an Electron/Chromium shell and therefore has a multi-process memory baseline. Say rapid feature growth can expose rendering, state-retention, or resource-release bugs, but high memory alone does not prove a leak. Keep the phrase “有点内部 vibe coding 产物的味道” as opinion, not a sourced fact.

Add:

- `[Codex Desktop 卡顿处理教程]({{CODEX_DESKTOP_LAG_URL}})`
- `[Codex CLI 新手教程：常用命令与上手速查表](/t/codex-cli-beginner-guide/10)`

- [ ] **Step 6: Run article-specific checks and commit**

```powershell
rg -n "winget install|/status|Usage & billing|Use reset|Electron|vibe coding|\{\{CODEX_DESKTOP_LAG_URL\}\}|/t/codex-cli-beginner-guide/10" drafts/2026-09-02/codex-desktop-windows-guide.md
rg -n "assets/codex-(store-search|desktop-home-usage|usage-menu|settings-menu|usage-billing-reset)\.png" drafts/2026-09-02/codex-desktop-windows-guide.md
git diff --check
git add -- drafts/2026-09-02/codex-desktop-windows-guide.md
git commit -m "docs: add Codex Desktop Windows guide"
```

Expected: The publication marker occurs once, all five image paths are referenced, both internal links are present, and whitespace checks pass.

### Task 4: Write the Codex 1M context guide

**Files:**
- Create: `drafts/2026-09-02/codex-enable-1m-context.md`

**Interfaces:**
- Consumes: OpenAI configuration/model documentation and the locally inspected Codex 0.152.1 model catalog values.
- Produces: A version-scoped configuration guide explaining nominal and displayed context values.

- [ ] **Step 1: Add exact publication metadata**

Use:

- Title: `如何开启 Codex 的 1M 上下文：配置方法、828K 显示与额度消耗说明`
- Category: `ChatGPT`
- Tags: `Codex`, `GPT-5.6`, `上下文`, `config.toml`, `进阶设置`
- Excerpt: two sentences stating that three TOML settings request the larger window, while client limits, safety headroom, existing context, and compaction explain why `/status` may show roughly 828K rather than 1M.

- [ ] **Step 2: Explain and open the user configuration file**

State that Codex user defaults live at `~/.codex/config.toml`; on Windows this normally resolves to `%USERPROFILE%\.codex\config.toml`. Give:

```powershell
notepad $env:USERPROFILE\.codex\config.toml
```

Tell users to preserve existing settings and update duplicate top-level keys instead of appending a second copy.

- [ ] **Step 3: Add and explain the exact TOML**

```toml
model = "gpt-5.6-sol"
model_context_window = 1000000
model_auto_compact_token_limit = 900000
```

Explain that `model_context_window` requests the active context size and `model_auto_compact_token_limit` sets the automatic history-compaction trigger. Tell users to fully restart the desktop app or start a new CLI session, then run `/status`.

Link:

- `https://learn.chatgpt.com/docs/config-file/config-basic`
- `https://learn.chatgpt.com/docs/config-file/config-reference`

- [ ] **Step 4: Explain 258K, 828K, and nearby values**

Use exact version scope: on 2026-09-02, local Codex CLI 0.152.1 catalog data for `gpt-5.6-sol` contains `context_window = 272000`, `max_context_window = 872000`, and `effective_context_window_percent = 95`. Therefore the default effective budget is about 258,400 and the catalog-capped large-window budget is about 828,400. Explain that a build using 900,000 before the 95% reserve would yield about 855,000, while already loaded instructions/tools can make the live display differ further; 828K and 858K are client-effective figures, not separate model sizes.

State separately that the official GPT-5.6 Sol model page lists a 1,050,000-token model context window, so API capacity, requested config, Codex catalog maximum, auto-compaction threshold, and remaining live context must not be treated as one number.

Link `https://developers.openai.com/api/docs/models/gpt-5.6-sol`.

- [ ] **Step 5: Write the usage warning**

Explain that larger active history carries more prompts, files, tool schemas/results, and prior responses into later turns. Quote no pricing numbers beyond what the source supports; state that OpenAI says context affects usage and that GPT-5.6 Sol prompts above 272K input tokens use the published long-context multiplier. Strongly advise non-Pro users to leave defaults unless a genuinely long task needs the larger window, and recommend `/compact` or a new chat for routine work.

Link `https://learn.chatgpt.com/docs/pricing`.

- [ ] **Step 6: Run article-specific checks and commit**

```powershell
rg -n "1000000|900000|272,000|258,400|872,000|828,400|1,050,000|超过 272K|/compact|非 Pro" drafts/2026-09-02/codex-enable-1m-context.md
git diff --check
git add -- drafts/2026-09-02/codex-enable-1m-context.md
git commit -m "docs: explain Codex large context configuration"
```

Expected: All numerical explanations and warnings are present, and whitespace checks pass.

### Task 5: Validate the complete draft package

**Files:**
- Verify: `drafts/2026-09-02/clash-verge-node-troubleshooting.md`
- Verify: `drafts/2026-09-02/codex-desktop-windows-guide.md`
- Verify: `drafts/2026-09-02/codex-enable-1m-context.md`
- Verify: `drafts/2026-09-02/assets/*.png`

**Interfaces:**
- Consumes: All outputs from Tasks 1-4.
- Produces: A clean, self-contained handoff ready for the forum Composer.

- [ ] **Step 1: Confirm exact file inventory**

```powershell
rg --files drafts/2026-09-02
```

Expected: Exactly three Markdown files and five PNG files.

- [ ] **Step 2: Validate local image references**

For every `](assets/*.png)` reference extracted from the Desktop article, resolve it relative to `drafts/2026-09-02` and confirm `Test-Path -LiteralPath` returns `True`.

- [ ] **Step 3: Validate metadata and Markdown fences**

Confirm each file contains one leading metadata comment with title, category, tags, and excerpt. Count triple-backtick lines per file and confirm each count is even. Run `git diff --check`.

- [ ] **Step 4: Review accuracy and safety statements**

Read all three files once end-to-end. Confirm the firewall/antivirus restoration warning is adjacent to the shutdown steps; the Xray workaround is scoped to VLESS + REALITY; reset-card behavior is qualified by eligibility and card scope; Electron memory usage is not presented as proof of a leak; and the context figures are dated to Codex 0.152.1.

- [ ] **Step 5: Check repository state**

```powershell
git status --short
git log -5 --oneline
```

Expected: The three article commits and screenshot commit are visible, with only this implementation-plan file remaining uncommitted unless it is included in a final documentation commit.
