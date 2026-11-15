# 更新日志

本文件记录 **TANCE · Neural Orbit**（https://tance-mang.github.io/）的公开变更。

条目按日期排列，日期为改动合入 `main` 的当天；每条只写访问者能感知或能核对的内容。
站点没有语义化版本号，因此不虚构 `v1.2.3` 这类版本标记——需要引用某一次状态时使用日期或 commit。

---

## 2026-11-15 · Neural Orbit V2 + 联系方式分流

**新增**

- 首页从「两个入口」扩展为 12 个连续区块：星核首屏、个人宣言、Create × Observe、思维星图、精选文章、作品星系、演化时间线、思想碎片、实时信号、档案预览、读者星环、巨型字标页脚。
- 可交互**思维星图**：节点与连线全部由站内真实标签、分类与仓库主题聚合生成，支持悬停、点击、拖动、缩放、键盘方向键与移动端触摸；标签按碰撞裁剪，不堆成文字墙。
- 页面体系：`/projects/` 与 10 个真实项目详情页、`/archives/`（关键词 + 年份 + 分类 + 主题筛选）、`/orbit/` 读者空间、`404.html`。
- 文章阅读系统（旧文章一个文件都没改，由运行时注入）：自动目录与 sticky 侧栏、阅读进度、标题锚点、代码高亮与复制、图片放大、GitHub 仓库卡片、上一篇 / 下一篇、相关文章、标签导航。
- 联系方式拆成 **Personal / 个人交流**（`tance_mang@qq.com`）与 **Business / 商务合作**（`tance.hub@gmail.com`）：About 页 `#contact` 双卡片展示完整地址与可用的复制按钮，首页页脚与读者空间提供简洁入口。
- 工具链：`tools/gen-projects.mjs`（项目页生成）、`tools/gen-feeds.mjs`（RSS 与 sitemap）、`tools/check_site.mjs`（结构自检）、`tools/test_publish_contract.py`（发布契约回归）、`tools/serve.mjs`（对齐 GitHub Pages 行为的本地服务器）。
- `LICENSE`（MIT，覆盖站点代码与工具；文章正文版权归作者，见 README「许可证」）。

**变更**

- 内容索引改为运行时汇总：新增一篇文章只需一个文章文件 + 它所属列表里的一条记录，首页卡片、星图、时间线、碎片、主题索引、档案搜索、RSS 与相关文章自动跟随。
- 视觉令牌化：`--void-black / --deep-violet / --royal-purple / --nebula-violet / --starlight / --dream-pink / --moon-white / --card-surface`，背景分为深空底色、星轨、星尘、星云、光晕、神经纤维与颗粒纹理七层。
- 实时信号区在 GitHub 事件 API 配额耗尽或请求失败时，自动切换为 `data/site.json` 的快照并标注「离线快照 + 原因 + 日期」，不伪造在线状态。

**修复**

- 滚动位置在内容补全后被重置的问题：改为「索引就绪渲染一次 + 全文抓取完成渲染一次」，并对区块动画做单次触发。
- 移动端横向溢出（星轨画布按 `100vw` 计算、读者星环装饰环超出容器）与导航在窄屏下的折行断词。
- About 页长期缺失的 `.about-*` 样式（此前整页依赖浏览器默认排版），以及 17 个页面缺少 favicon 声明导致的 `/favicon.ico` 404。

---

## 2026-11-04 → 2026-11-08 · 内容补齐与占位清理

- 11-03 记录 Auto Blog Agent 的工程实践（`/2026/11/03/auto-blog-agent/`）。
- 11-04 新增「Auto Blog Agent：把博客自动化拆成可执行的模块」与「让 AI 帮忙记录时，怎样保留真实的自己」，并**删除列表里的占位条目**——占位内容不再留在导航中。
- 11-05 新增无人值守任务的故障报告与「先查结果再重跑」两篇，并把文章指向独立的 Workflow Guardian 仓库。
- 11-07 新增 Codex 项目找回与博客配图取舍两篇。
- 11-08 新增「如果科技能改造整个宇宙」，并分别补入 Observe 与档案列表。

## 2026-06-04 · void · two cards · neural threads

- 确立 Create / Observe 双卡片入口（`create.html`、`observe.html`），移除早期的单页 `projects.html`。
- 背景换成深空 + 神经纤维线条；净删除约 1500 行，把上一版的堆叠样式收敛掉。

## 2026-05-22 · 黑紫技术向改版

- 站点从默认主题切换为黑紫技术风格，引入 `blog.html`、`projects.html` 与按年月分层的 `archives/2026/MM/` 页面。
- 单次阅读 +2856 / −2497 行，覆盖 14 个文件。

## 2026-05-01 → 2026-05-02 · 起点

- 仓库建立（当时为 `mang-root.github.io`，后更名为 `tance-mang.github.io`），发布第一篇复盘文章 `/2026/05/01/app-story/`。
- 05-02 补上 README 与基础说明。

---

## 尚未完成 / 需要外部配置

| 项目 | 状态 | 说明 |
| --- | --- | --- |
| 邮件订阅推送 | 未配置 | 需要订阅服务与密钥；页面不放点了没反应的提交表单 |
| 读者账户 / 会员 / 支付 / 徽章 | 未实现 | 静态托管无法真实生效，`/orbit/` 中标注为 In development |
| feed / sitemap 自动更新 | 需手动命令 | `node tools/gen-feeds.mjs`；未加 Actions 以免改动线上部署链路 |
| Auto Blog Agent 真实联调 | 进行中 | 状态以该项目页为准：/projects/auto-blog-agent/ |
| `css/images/banner.jpg` | 未被引用 | 旧版遗留图，保留未删 |
