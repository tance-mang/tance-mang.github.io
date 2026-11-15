<div align="center">

# TANCE · Neural Orbit

**个人数字宇宙 · 一个会自己汇总内容的静态博客**
零构建 · GitHub Pages · Create / Observe 双主线 · 可交互思维星图

星核 → 宣言 → 两个世界 → 思维星图 → 精选文章 → 作品星系 → 演化时间线 → 思想碎片 → 实时信号 → 档案 → 读者星环 → 字标页脚

[![Live](https://img.shields.io/badge/live-tance--mang.github.io-9D70FF)](https://tance-mang.github.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Articles](https://img.shields.io/badge/articles-9-brightgreen)](archives/index.html)
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
- [思维星图](#-思维星图)
- [工具与自检](#-工具与自检)
- [Auto Blog Agent 发布契约](#-auto-blog-agent-发布契约硬约束)
- [部署与 URL 兼容](#-部署与-url-兼容)
- [数据与真实性](#-数据与真实性)
- [尚未完成 / 需要配置](#-尚未完成--需要配置)
- [更新日志](#-更新日志)
- [联系方式](#-联系方式)
- [许可证](#-许可证)

## ✨ 这个站点在解决什么

- **静态站也能自动汇总**：浏览器在运行时读取 `create.html`、`observe.html`、`archives/index.html` 的文章列表，派生出首页卡片、时间线、思想碎片、主题索引、档案搜索、相关文章与星图。新增一篇文章不需要改第二遍文件。
- **改版不能伤害历史**：9 篇文章的地址、正文、发布时间一字未动，新的阅读体验（目录侧栏、进度条、代码复制、仓库卡片、上一篇下一篇）由运行时脚本注入。
- **自动化必须可验证**：博客由 [Auto Blog Agent](https://github.com/tance-mang/auto-blog-agent) 自动发布，所以发布契约在仓库里有专门的回归测试，而不是靠人记住。
- **不装作有后端**：没有真实数据的地方保持空白或明确标注 In development / Not configured，不展示粉丝数、订阅数、使用量。
- **交互是真的**：思维星图、档案筛选、复制按钮、阅读进度都是可操作的代码，不是静态截图。

## ⚡ 30 秒跑起来

```bash
git clone https://github.com/tance-mang/tance-mang.github.io.git
cd tance-mang.github.io
node tools/serve.mjs          # http://localhost:8080
```

无需 `npm install`，没有构建步骤。`tools/serve.mjs` 的行为对齐 GitHub Pages：目录 URL 解析到 `index.html`，未知路径返回真实的 `404.html`，文件每次请求都从磁盘读取。

## 📁 站点结构

```
index.html                    12 区块首页
create.html observe.html      两个内容入口，也是文章列表的真实存放处
archives/index.html           档案库（关键词 + 年份 + 分类 + 主题筛选）
about.html                    个人数字档案，含 #contact 联系卡片
orbit/index.html              读者空间：只放真实可用的渠道
projects/index.html           作品星系
projects/<slug>/index.html    项目详情（由 data/projects.json 生成）
2026/MM/DD/<slug>/index.html  文章
_template-post.html           新文章模板，也是 Auto Blog Agent 的写入目标
css/style.css                 设计令牌 + 全站基础 + 文章阅读系统
css/universe.css              首页区块、星图、作品、星环、404、联系卡片
js/script.js                  内容索引 + 星轨背景 + 阅读系统（每页都加载）
js/universe.js                首页与派生区块的渲染
js/constellation.js           交互式思维星图
data/projects.json            项目数据（真实仓库元数据）
data/site.json                站点文案、主题说明、联系方式、离线快照
tools/                        生成器、自检、发布契约测试、本地服务器
feed.xml sitemap.xml robots.txt LICENSE CHANGELOG.md
```

## 🧠 内容如何自动更新

新增一篇文章只有两步：

1. 复制 `_template-post.html` 到 `2026/MM/DD/<slug>/index.html`，替换占位符；
2. 在 `create.html` **或** `observe.html` 的 `<section class="entry-list">` 里加一条 `<a class="entry">`。

结束。首页精选文章、思维星图节点、演化时间线、思想碎片、主题索引、档案搜索、相关文章与读者空间入口都由运行时索引派生。`feed.xml` 与 `sitemap.xml` 是提交进仓库的静态文件，需要 `node tools/gen-feeds.mjs` 重新生成（原因见「部署」一节）。

## 🌌 思维星图

星图不是装饰：节点由站内真实标签、分类和项目主题聚合生成，连线来自同一篇文章或同一个仓库的实际共现。文章变多，星图自己变密；删掉一个标签，节点随之消失。

- 支持悬停、点击、拖动、滚轮缩放、键盘方向键与移动端触摸。
- 布局是一次性力导向松弛后固定，窗口变化只做重映射，不重复迭代。
- 标签按碰撞裁剪，避免糊成文字墙；无法使用 Canvas 时有等价的芯片列表作为回退。

## 🔧 工具与自检

```bash
node tools/check_site.mjs             # 结构自检：链接、占位符、标签闭合、发布标记、联系方式一致性
node tools/gen-projects.mjs           # 由 data/projects.json 重新生成项目详情页
node tools/gen-feeds.mjs              # 重新生成 feed.xml 与 sitemap.xml
python tools/test_publish_contract.py # Auto Blog Agent 发布契约回归测试
node tools/serve.mjs                  # 本地服务器（对齐 GitHub Pages 行为）
```

最近一次验证（2026-11-15，Windows 10 / Node v24.22.1 / Python 3，commit `94bc3ec`，本地 `tools/serve.mjs`，无网络与 CPU 限速）：

| 命令 | 退出码 | 结果 |
| --- | --- | --- |
| `node tools/check_site.mjs` | 0 | 28 个 HTML 页面 · 9 篇文章 · 10 个项目 · feed 9 条 · sitemap 26 条 |
| `python tools/test_publish_contract.py` | 0 | 9 项测试全部通过 |
| Chrome 性能轨迹（首页） | — | LCP 709 ms · CLS 0.00 |
| Lighthouse（桌面端，About 页） | — | 无障碍 100 · 最佳实践 100 · SEO 100 · Agentic 100 |

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

- 项目页的日期、语言、star / fork 数取自 GitHub 仓库元数据与各仓库 README / CHANGELOG，观测日期 2026-11-15，页面内明确标注观测时间。
- 实时信号读取 GitHub 公开事件 API；失败或配额耗尽时自动切换为 `data/site.json` 的快照，并显示「离线快照 + 原因 + 日期」。
- 未展示任何粉丝数、订阅数、使用量或推测性成果；未实现的会员、徽章、支付、邮件推送在 `/orbit/` 中如实标注。

## ⏳ 尚未完成 / 需要配置

| 项目 | 状态 | 说明 |
| --- | --- | --- |
| 邮件订阅推送 | 未配置 | 需要订阅服务与密钥；页面不放点了没反应的提交表单 |
| 读者账户 / 会员 / 支付 / 徽章 | 未实现 | 静态托管无法真实生效，`/orbit/` 标注 In development |
| feed / sitemap 自动更新 | 需手动命令 | 见「部署」一节 |
| Auto Blog Agent 真实联调 | 进行中 | 状态以 [项目页](projects/auto-blog-agent/index.html) 为准 |
| `css/images/banner.jpg` | 未被引用 | 旧版遗留图，保留未删 |

## 📝 更新日志

完整记录见 [CHANGELOG.md](CHANGELOG.md)。

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
