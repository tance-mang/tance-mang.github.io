<div align="center">

# TANCE · Neural Orbit

**会自己汇总内容的静态博客 · 银河纵深与 3D 星域**
零构建 · GitHub Pages · Create / Observe 双主线 · 可旋转的三维内容结构

星核 → 宣言 → 两个世界 → 3D 星域 → 精选文章 → 作品星系 → 演化时间线 → 思想碎片 → 主题概况 → 实时信号 → 档案 → ORBIT 入口 → 字标页脚

[![Live](https://img.shields.io/badge/live-tance--mang.github.io-9D70FF)](https://tance-mang.github.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Articles](https://img.shields.io/badge/articles-12-brightgreen)](archives/index.html)
[![Projects](https://img.shields.io/badge/projects-10-blue)](projects/index.html)
[![Build](https://img.shields.io/badge/build-none-lightgrey)](#-内容如何自动更新)
[![Issues Welcome](https://img.shields.io/badge/issues-welcome-success)](https://github.com/tance-mang/tance-mang.github.io/issues)

</div>

---

> 一句话：把「做过的东西」和「想过的事情」放进同一张星图，并且让新增一篇文章只需要写一个文件。
> 不是模板博客，是野外笔记本 —— 没有后端、没有构建步骤、没有假指标。

在线地址：**https://tance-mang.github.io/**

## 📑 目录

- [这个站点在解决什么](#-这个站点在解决什么)
- [30 秒跑起来](#-30-秒跑起来)
- [站点结构](#-站点结构)
- [内容如何自动更新](#-内容如何自动更新)
- [3D 星域装置](#-3d-星域装置)
- [工具与自检](#-工具与自检)
- [Auto Blog Agent 发布契约](#-auto-blog-agent-发布契约硬约束)
- [部署与 URL 兼容](#-部署与-url-兼容)
- [数据与真实性](#-数据与真实性)
- [尚未完成 / 需要配置](#-尚未完成--需要配置)
- [更新日志](#-更新日志)
- [联系方式](#-联系方式)
- [许可证](#-许可证)

## ✨ 这个站点在解决什么

- **静态站也能自动汇总**：浏览器在运行时读取 `create.html`、`observe.html`、`archives/index.html` 的文章列表，派生出首页卡片、时间线、思想碎片、主题概况与主题索引、档案搜索、相关文章与三维星域。新增一篇文章不需要改第二遍文件。
- **改版不能伤害历史**：改版前 9 篇文章的地址、正文与发布时间保持不变，只给页面外壳补上背景层与统一导航（每个文件 +4 行装饰性标记）；改版期间 Auto Blog Agent 又发布了 3 篇，用的是同一套模板。新的阅读体验（目录侧栏、进度条、代码复制、仓库卡片、上一篇下一篇）全部由运行时脚本注入。
- **自动化必须可验证**：博客由 [Auto Blog Agent](https://github.com/tance-mang/auto-blog-agent) 自动发布，所以发布契约在仓库里有专门的回归测试，而不是靠人记住。
- **不装作有后端**：站点只呈现已经存在的东西——没有真实数据的区块留白，仓库是私有的就写私有，不给访客一个打不开的链接。
- **交互是真的**：3D 星域的旋转缩放与节点面板、档案筛选、复制按钮、阅读进度都是可操作的代码，不是静态截图。

## ⚡ 30 秒跑起来

```bash
git clone https://github.com/tance-mang/tance-mang.github.io.git
cd tance-mang.github.io
node tools/serve.mjs          # http://localhost:8080
```

无需 `npm install`，没有构建步骤。`tools/serve.mjs` 的行为对齐 GitHub Pages：目录 URL 解析到 `index.html`，未知路径返回真实的 `404.html`，文件每次请求都从磁盘读取。

## 📁 站点结构

```
index.html                    13 区块首页
create.html observe.html      两个内容入口，也是文章列表的真实存放处
archives/index.html           档案库（关键词 + 年份 + 分类 + 主题筛选）
about.html                    个人数字档案，含 #contact 联系卡片
orbit/index.html              联系与内容入口：GitHub / RSS / Issue / 记录 / 两个邮箱
projects/index.html           作品星系
projects/<slug>/index.html    项目详情（由 data/projects.json 生成）
2026/MM/DD/<slug>/index.html  文章
_template-post.html           新文章模板，也是 Auto Blog Agent 的写入目标
css/style.css                 设计令牌 + 全站基础 + 文章阅读系统
css/universe.css              首页区块、星图、作品、星环、404、联系卡片
js/script.js                  内容索引 + 星轨背景 + 阅读系统（每页都加载）
js/universe.js                首页与派生区块的渲染
js/constellation.js           3D 星域装置：三层纵深、拖动旋转缩放、节点简介面板
data/projects.json            项目数据（真实仓库元数据，含可见性）
data/site.json                站点文案、主题说明、联系方式、精选与里程碑、离线快照
tools/                        生成器、仓库数据同步、自检、发布契约测试、本地服务器
feed.xml sitemap.xml robots.txt LICENSE CHANGELOG.md
```

## 🧠 内容如何自动更新

新增一篇文章只有两步：

1. 复制 `_template-post.html` 到 `2026/MM/DD/<slug>/index.html`，替换占位符；
2. 在 `create.html` **或** `observe.html` 的 `<section class="entry-list">` 里加一条 `<a class="entry">`。

结束。首页精选文章、3D 星域节点与连线、演化时间线、思想碎片、主题概况与主题索引、档案搜索、相关文章与联系入口都由运行时索引派生；文章页自身不需要改动任何既有文件。`feed.xml` 与 `sitemap.xml` 是提交进仓库的静态文件，需要 `node tools/gen-feeds.mjs` 重新生成（原因见「部署」一节）。

两个手工字段控制「什么才进首页」，避免自动派生把半成品直接推到访客面前：

- `data/site.json` 的 `featured`：精选文章位；留空时自动取最新记录，填入 `href` 列表则按指定顺序展示。
- `data/site.json` 的 `milestones`：站点里程碑，与文章、仓库推送时间合并进演化时间线；只写已经发生的事。

## 🌌 3D 星域装置

首页 `#constellation-section` 不是装饰，也不是平面力导图：它是一个真的三维场。

- **三层纵深**：主题壳（0.5）、项目壳（0.84）、记录壳（1.14）。记录与项目按所属主题方向聚簇，前中后景由透视与远近衰减区分，绘制顺序按深度排序（远→近）。
- **数据来源只有站内真实内容**：主题取自 `content.tagMap()`，项目取自 `data/projects.json`，记录取自文章索引；连线来自同一篇文章、同一仓库或共现两次以上的主题。当前规模 44 节点 / 105 连线（22 个主题 + 10 个项目 + 12 篇记录）。
- **交互**：鼠标与触摸拖动旋转（带惯性衰减）、滚轮与双指缩放、缓慢自转（交互后暂停）、点击节点、方向键在空间中就近步进、Enter 打开节点、Esc 复位。
- **节点简介面板**：点击任意节点后，星图**下方**的卡片显示名称、一两句说明（主题用 `data/site.json` 的 `topicNotes`，项目用 tagline 与状态，记录用摘要）和一个跳转按钮。不弹窗、不遮挡页面。
- 无法使用 Canvas 时退化为芯片列表，内容与链接保持一致。

## 🔧 工具与自检

```bash
node tools/check_site.mjs             # 结构自检：链接、占位符、标签闭合、发布标记、联系方式一致性
node tools/gen-projects.mjs           # 由 data/projects.json 重新生成项目详情页
node tools/gen-feeds.mjs              # 重新生成 feed.xml 与 sitemap.xml
node tools/sync-github.mjs            # 拉取仓库真实元数据（star/fork/推送日期/可见性/许可证），--dry-run 只看差异
python tools/test_publish_contract.py # Auto Blog Agent 发布契约回归测试
node tools/serve.mjs                  # 本地服务器（对齐 GitHub Pages 行为）
```

最近一次验证（2026-11-15，Windows 10 / Node v24.22.1 / Python 3，基于 `b780bab` 的本轮改版工作副本，本地 `tools/serve.mjs`，无网络与 CPU 限速）：

| 命令 | 退出码 | 结果 |
| --- | --- | --- |
| `node tools/check_site.mjs` | 0 | 31 个 HTML 页面 · 12 篇文章 · 10 个项目 · feed 12 条 · sitemap 29 条 |
| `python tools/test_publish_contract.py` | 0 | 9 项测试全部通过（模板逐字节比对 + 列表页标记 + 插入后可解析） |
| `node tools/sync-github.mjs --dry-run` | 0 | 10/10 仓库可达（7 rest + 3 gh 私有），本轮无字段差异 |
| Chrome 性能轨迹（首页） | — | LCP 512 ms · CLS 0.00 |
| Lighthouse（桌面端，首页） | — | 无障碍 100 · 最佳实践 100 · SEO 100 · Agentic 100（58 项通过，0 项失败） |

限制说明：以上为本地单次测量，非 CI 持续结果；本仓库没有配置任何 GitHub Actions 工作流。线上实时信号依赖 GitHub 事件 API 配额，配额耗尽时页面会显示离线快照并在控制台留下一次请求失败记录。

## 📜 Auto Blog Agent 发布契约（硬约束）

本站由 [tance-mang/auto-blog-agent](https://github.com/tance-mang/auto-blog-agent) 自动发布。它用字符串替换写入本仓库，因此下列内容**不能改动**，否则自动发布立刻失败：

- `_template-post.html` 中的字面占位符：`【文章标题】`、`【一句话副标题】`、`2026-06-15`、`2026 · 06 · 15`、`X min`、`【标签1 / 标签2】`、`02 / Observe · 【分类，比如：复盘 / 思考 / 学习】`；
- `<div class="post-body">` 与其后**第一个** `</div>` 之间不得出现嵌套 `<div>`；
- `create.html`、`observe.html`、`archives/index.html` 中，字面量 `<section class="entry-list">` 必须**恰好出现一次**且不带额外属性（注释里也不要原样写出这个字符串）；
- 模板内的 HTML 注释会被发布器整体删除，所以注释只能当说明用，不能承载数据。

`tools/test_publish_contract.py` 会优先调用 Agent 仓库的真实 `render()` 做逐字节比对（默认在相邻的 `../agent` 目录寻找，可用环境变量 `AGENT_REPO` 指定），找不到时退回到内置的等价实现。

## 🚀 部署与 URL 兼容

- GitHub Pages 保持原有 **legacy 分支部署**（`main` 分支根目录），未新增构建工作流，未改动任何部署配置。推送到 `main` 即上线。
- `feed.xml` 与 `sitemap.xml` 需要手动再生成并提交：
  ```bash
  node tools/gen-feeds.mjs && git add feed.xml sitemap.xml && git commit -m "feeds: sync"
  ```
  可以另加一个只在 push 后回写这两个文件的 Actions 任务，但本仓库刻意没有添加，以免改动线上部署链路。
- 9 篇既有文章地址保持原样（`/2026/MM/DD/<slug>/`），没有重命名、没有删除、没有内容改写。
- `create.html` / `observe.html` / `about.html` / `archives/` 地址不变；新增路径只有 `/projects/`、`/projects/<slug>/`、`/orbit/`、`404.html`。

## 📊 数据与真实性

- 项目页的日期、语言、star / fork 数取自 GitHub 仓库元数据与各仓库 README / CHANGELOG，观测日期写在页脚（当前 2026-11-15）；`node tools/sync-github.mjs` 负责刷新，失败时不写入任何猜测值。
- 仓库可见性一并记录在 `data/projects.json`。私有仓库在项目页与卡片上直接标注「私有仓库」，按钮退化为不可点的说明，不给出访客打不开的链接。
- 实时信号读取 GitHub 公开事件 API；失败或配额耗尽时自动切换为 `data/site.json` 的快照，并显示「离线快照 + 原因 + 日期」。
- 未展示任何粉丝数、订阅数、使用量或推测性成果。

## ⏳ 尚未完成 / 需要配置

| 项目 | 状态 | 说明 |
| --- | --- | --- |
| 邮件订阅推送 | 未配置 | 需要订阅服务与密钥；站点不放点了没反应的提交表单 |
| 读者账户 / 会员 / 支付 / 徽章 | 不做 | 静态托管无法真实生效；2026-11-15 已从站点移除相关条目，将来真有后端再重新设计 |
| feed / sitemap 自动更新 | 需手动命令 | 见「部署」一节 |
| Auto Blog Agent 真实联调 | 进行中 | 状态以 [项目页](projects/auto-blog-agent/index.html) 为准 |
| `css/images/banner.jpg` | 未被引用 | 旧版遗留图，保留未删 |

## 📝 更新日志

完整记录见 [CHANGELOG.md](CHANGELOG.md)。

- **2026-11-15 · 银河纵深 + 3D 星域 + 内容自动联动** — 背景改为四层纵深（深空底层 / 斜向银河雾带 / 大尺度星轨弧线 / 星点与神经连接），删除漂浮光晕；首屏重排为入口终端式构图；思维星图升级为真三维装置（三层壳、透视衰减、拖动旋转与惯性、缩放、缓慢自转），点击节点在星图**下方**展开简介卡片；新增主题概况区块，首页扩为 13 区块；`tools/sync-github.mjs` 刷新仓库元数据与观测日期，私有仓库改为如实标注并去掉打不开的链接；全站文案重写；9 篇旧文章的页面外壳补齐背景层与统一导航（正文一字未改）；`/orbit/` 从「读者会员中心」改为联系与内容入口，删除会员 / 徽章 / 支付 / 邮件推送条目。
- **2026-11-15 · Neural Orbit V2** — 首页扩为 12 区块；新增可交互思维星图、`/projects/`（10 个项目详情页）、`/archives/` 筛选、`/orbit/` 读者空间与 `404.html`；旧文章在不改一个文件的前提下获得完整阅读系统；视觉令牌化。
- **2026-11-15 · 联系方式分流** — About 页 `#contact` 拆成 Personal / 个人交流与 Business / 商务合作两张卡片，带真实可用的复制按钮；首页页脚与读者空间给简洁入口。
- **2026-11-04 → 11-08** — 补齐自动化工程与思考类文章，并删除列表里的占位条目。
- **2026-06-04 · void** — 确立 Create / Observe 双卡片入口，背景换成深空 + 神经纤维。
- **2026-05-22 · 黑紫改版** — 从默认主题切换为黑紫技术风格。
- **2026-05-01** — 仓库建立，发布第一篇复盘文章。

## 📬 联系方式

两个邮箱按用途分流。数据源是 `data/site.json` 的 `contacts`，`tools/check_site.mjs` 会核对它与 About 卡片、复制按钮是否一致。

| 用途 | 标签 | 邮箱 | 覆盖范围 |
| --- | --- | --- | --- |
| 个人交流 | Personal | tance_mang@qq.com | 技术交流 · 开源讨论 · 日常联系 |
| 商务合作 | Business | tance.hub@gmail.com | 项目合作 · 产品咨询 · 商务联系 |

- GitHub：https://github.com/tance-mang
- RSS：[feed.xml](feed.xml)
- 留言与纠错：[仓库 Issues](https://github.com/tance-mang/tance-mang.github.io/issues)
- 措辞约定：只写 Personal / Business，不使用「私人邮箱」「工作室邮箱」「官方商务邮箱」「企业邮箱」这类把个人品牌说成机构的称呼；商务邮箱不附带任何尚不存在的商业成果承诺。

## 📃 许可证

站点代码与工具（HTML / CSS / JS、`tools/`、`data/`）采用 [MIT](LICENSE) © 2026 tance-mang，可自由使用、修改、二次分发。

`2026/` 目录下的文章是个人写作，不属于软件：**版权归作者，保留所有权利**，未经许可不转载；引用或链接原文地址随时欢迎。

<div align="center">

**在黑暗里做笔记，把笔记连成星图**

[⬆ 回到顶部](#tance--neural-orbit)

</div>
