# TANCE · Neural Orbit

个人数字宇宙博客。黑紫星轨视觉、可交互思维星图、Create / Observe 两条内容主线。

访问地址：**https://tance-mang.github.io/**

---

## 这次改版（NEURAL ORBIT V2）

- 首页从「两个入口」升级为 12 个连续区块：星核首屏、个人宣言、Create × Observe、思维星图、精选文章、作品星系、演化时间线、思想碎片、实时信号、档案、读者星环、巨型字标页脚。
- 新增可交互**思维星图**：节点与连线全部由站内真实标签、分类和仓库主题聚合而来，支持悬停、点击、拖动、缩放、键盘方向键与移动端触摸。
- 新增页面体系：`/projects/`（含 10 个真实项目详情页）、`/archives/`（搜索 + 年份 + 分类 + 主题筛选）、`/orbit/`（读者空间）、`404.html`。
- 文章阅读系统升级：自动目录与 sticky 侧栏、阅读进度、标题锚点、代码复制、图片放大、GitHub 仓库卡片、上一篇/下一篇、相关文章、标签导航。**旧文章一个文件都没改**，这些能力由运行时脚本统一注入。
- 视觉令牌化：`--void-black / --deep-violet / --royal-purple / --nebula-violet / --starlight / --dream-pink / --moon-white / --card-surface`，背景由深空底色、星轨、星尘、星云、光晕、神经纤维与颗粒纹理分层组成。

---

## 目录结构

```
index.html                 12 区块首页
create.html observe.html   两个内容入口（也是文章列表的真实存放处）
archives/index.html        档案库
about.html                 个人数字档案
orbit/index.html           读者空间
projects/index.html        作品星系
projects/<slug>/index.html 项目详情（由 data/projects.json 生成）
2026/MM/DD/<slug>/index.html 文章
_template-post.html        新文章模板（Auto Blog Agent 的写入目标）
css/style.css              设计令牌 + 全站基础 + 文章阅读系统
css/universe.css           首页区块、星图、作品、星环、404
js/script.js               内容索引 + 星轨背景 + 动效管理 + 阅读系统（每页都加载）
js/universe.js             首页与派生页面的内容渲染
js/constellation.js        交互式思维星图
data/projects.json         项目数据（真实仓库元数据）
data/site.json             站点文案、主题说明、快照数据
tools/                     生成器、自检、发布契约测试、本地服务器
feed.xml sitemap.xml robots.txt
```

---

## 本地运行

```bash
node tools/serve.mjs            # http://localhost:8080，行为对齐 GitHub Pages（目录→index.html，未知路径→404.html）
node tools/gen-projects.mjs     # 由 data/projects.json 重新生成项目详情页
node tools/gen-feeds.mjs        # 重新生成 feed.xml 与 sitemap.xml
node tools/check_site.mjs       # 结构自检：链接、占位符、标签闭合、发布标记
python tools/test_publish_contract.py   # Auto Blog Agent 发布契约回归测试
```

无需安装依赖，无构建步骤。

---

## 内容系统：新增一篇文章只需要一个文件

1. 复制 `_template-post.html` 到 `2026/MM/DD/<slug>/index.html`，替换占位符；
2. 在 `create.html` **或** `observe.html` 的 `<section class="entry-list">` 里加一条 `<a class="entry">`。

到这里就结束了。首页精选文章、思维星图、演化时间线、思想碎片、主题索引、档案搜索、RSS 与相关文章都由浏览器在运行时从这些列表汇总，不需要再改第二个文件。

### Auto Blog Agent 兼容（硬约束）

本站由 `github.com/tance-mang/auto-blog-agent` 自动发布。它用字符串替换写入本仓库，因此以下内容**不能改动**，否则自动发布立刻失败：

- `_template-post.html` 中的占位符：`【文章标题】`、`【一句话副标题】`、`2026-06-15`、`2026 · 06 · 15`、`X min`、`【标签1 / 标签2】`、`02 / Observe · 【分类，比如：复盘 / 思考 / 学习】`；
- `<div class="post-body">` 与其后**第一个** `</div>` 之间不得出现嵌套 `<div>`；
- `create.html`、`observe.html`、`archives/index.html` 中，字面量 `<section class="entry-list">` 必须**恰好出现一次**且不带额外属性（注释里也不要原样写出这个字符串）；
- 模板内的 HTML 注释会被发布器整体删除，所以注释只能当说明用，不能承载数据。

`python tools/test_publish_contract.py` 会调用 Agent 仓库的真实 `render()` 做逐字节比对（默认在相邻的 `../agent` 目录寻找，可用 `AGENT_REPO` 指定），9 项测试覆盖以上全部约束。

---

## 部署

GitHub Pages 保持原有 **legacy 分支部署**（`main` 分支根目录），未新增构建工作流，未改动任何部署配置。推送到 `main` 即上线。

`feed.xml` 与 `sitemap.xml` 是提交进仓库的静态文件。自动发布的新文章会立刻出现在首页、档案与星图中（运行时汇总），但这两个 XML 需要重新生成才更新：

```bash
node tools/gen-feeds.mjs && git add feed.xml sitemap.xml && git commit -m "feeds: sync"
```

如果希望它们也全自动，可另加一个只在 push 后回写这两个文件的 Actions 任务——本次没有添加，以免改动线上部署链路。

---

## URL 兼容

- 9 篇既有文章的地址全部保持原样（`/2026/MM/DD/<slug>/`），没有重命名、没有删除、没有内容改写。
- 新增路径只有 `/projects/`、`/projects/<slug>/`、`/orbit/`、`404.html`。
- `create.html` / `observe.html` / `about.html` / `archives/` 地址不变。

---

## 数据与真实性

- 项目页的日期、语言、star / fork 数取自 GitHub 仓库元数据与各仓库 README / CHANGELOG，观测日期 2026-11-15，页面内明确标注。
- 实时信号读取 GitHub 公开事件 API；配额耗尽或请求失败时自动切换为 `data/site.json` 里的快照，并显示「离线快照 + 原因 + 日期」，不伪造在线状态。
- 未展示任何粉丝数、订阅数、使用量或推测性成果。

---

## 需要我配置或尚未完成

| 项目 | 状态 | 说明 |
| --- | --- | --- |
| 邮件订阅推送 | 未配置 | 需要订阅服务与密钥；页面没有放会误导人的提交表单 |
| 读者账户 / 会员 / 支付 | 未实现 | 静态托管无法真实生效，`/orbit/` 里标注为 In development |
| 读者留言墙 | 走 GitHub Issues | 有身份与反垃圾能力；自建评论服务需要后端 |
| feed / sitemap 自动更新 | 需手动命令 | 见「部署」一节，可另加 Actions |
| `css/images/banner.jpg` | 未被引用 | 旧版遗留图，本次保留未删 |
| Auto Blog Agent 真实联调 | 进行中 | 该仓库 README 已注明；截至 2026-11-15 本站尚无由它产生的发布提交 |

---

## 联系方式

- GitHub：https://github.com/tance-mang
- Email：tance_mang@qq.com
- RSS：/feed.xml
- 留言与纠错：仓库 Issues
