#!/usr/bin/env python3
"""
发布契约回归测试 / publish contract regression test

Auto Blog Agent 用字符串替换的方式往本仓库写文章：它读取 _template-post.html，
替换固定占位符，然后把一条导航插入 create.html / observe.html / archives/index.html
里字面量 `<section class="entry-list">` 之后。本文件把那份逻辑复制进来（源：
https://github.com/tance-mang/auto-blog-agent/blob/main/autoblog/html_publish.py），
用它校验模板与列表页，任何改版只要破坏了自动发布链路就会在这里失败。

如果本机旁边就有 auto-blog-agent 仓库（默认 ../agent，可用 AGENT_REPO 覆盖），
测试还会直接 import 真实模块比对渲染结果，而不是只信这份副本。

用法：python tools/test_publish_contract.py
"""
import os
import re
import sys
import unittest
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEMPLATE = (ROOT / "_template-post.html").read_text(encoding="utf-8")
# render() deletes every HTML comment before it starts replacing, so the
# contract has to be judged on the markup that actually survives.
TEMPLATE_BODY = re.sub(r"(?s)<!--.*?-->", "", TEMPLATE)
MARKER = '<section class="entry-list">'
LIST_PAGES = ["create.html", "observe.html", "archives/index.html"]

# ---------------------------------------------------------------------------
# render() — copied from autoblog/html_publish.py
# ---------------------------------------------------------------------------
def render(template, title, body, day, section):
    label = section.title()
    headline = escape(title)
    date_label = day.replace("-", " · ")
    content = "".join(f"<p>{escape(block).replace(chr(10), '<br>')}</p>"
                      for block in re.split(r"\n\s*\n", body.strip()) if block.strip())
    replacements = {
        "【文章标题】": headline,
        "【一句话副标题】": f"{label} · {headline}",
        "2026-06-15": day,
        "2026 · 06 · 15": date_label,
        "02 / Observe · 【分类，比如：复盘 / 思考 / 学习】": f"{label} · 自动发布",
        "【标签1 / 标签2】": "Auto Blog Agent",
        "X min": "约 3 min",
    }
    template = re.sub(r"(?s)<!--.*?-->", "", template)
    for source, replacement in replacements.items():
        template = template.replace(source, replacement)
    template, count = re.subn(r'(?s)(<div class="post-body">).*?(</div>)',
                              lambda m: m[1] + content + m[2], template, count=1)
    if not count:
        raise ValueError("Blog template has no post-body slot")
    if section == "create":
        template = template.replace('href="/observe.html" class="is-current"', 'href="/observe.html"')
        template = template.replace('href="/create.html"', 'href="/create.html" class="is-current"', 1)
        template = template.replace('/observe.html">← back to observe', '/create.html">← back to create')
    return template


NAVIGATION = ('<a href="{href}" class="entry"><span class="entry-date">{date}</span>'
              '<div class="entry-body"><h2 class="entry-title">{title}</h2></div>'
              '<span class="entry-meta">{Label}</span></a>')


class TemplateContract(unittest.TestCase):
    def test_placeholders_present(self):
        for token in ["【文章标题】", "【一句话副标题】", "2026-06-15", "2026 · 06 · 15",
                      "X min", "【标签1 / 标签2】",
                      "02 / Observe · 【分类，比如：复盘 / 思考 / 学习】",
                      '<div class="post-body">',
                      'href="/observe.html" class="is-current"',
                      'href="/create.html"',
                      '/observe.html">← back to observe']:
            self.assertIn(token, TEMPLATE_BODY, f"模板缺少 Agent 依赖的字面量：{token}")

    def test_post_body_has_no_nested_div(self):
        """post-body 内出现 </div> 会让整体替换截断在错误位置。"""
        start = TEMPLATE_BODY.index('<div class="post-body">')
        inner = TEMPLATE_BODY[start + len('<div class="post-body">'):]
        first_close = inner.index('</div>')
        self.assertNotIn("<div", inner[:first_close],
                         "post-body 与第一个 </div> 之间不能再出现 <div")

    def test_div_balance(self):
        self.assertEqual(TEMPLATE_BODY.count("<div"), TEMPLATE_BODY.count("</div>"), "模板 div 未闭合")

    def test_render_observe(self):
        out = render(TEMPLATE, "测试文章 & 符号", "第一段。\n\n第二段 with <tag>.",
                     "2026-11-15", "observe")
        self.assertNotIn("【", out, "渲染后仍留有占位符")
        self.assertIn("测试文章 &amp; 符号", out)
        self.assertIn("<p>第二段 with &lt;tag&gt;.</p>", out)
        self.assertIn('datetime="2026-11-15"', out)
        self.assertIn("Observe · 自动发布", out)
        self.assertEqual(out.count("<div"), out.count("</div>"))

    def test_render_create_navigation_swap(self):
        out = render(TEMPLATE, "Create 测试", "正文", "2026-11-16", "create")
        self.assertIn('href="/create.html" class="is-current"', out)
        self.assertIn('/create.html">← back to create', out)
        self.assertIn("Create · 自动发布", out)
        self.assertNotIn('href="/observe.html" class="is-current"', out)


class ListPageContract(unittest.TestCase):
    def test_marker_is_unique_per_page(self):
        for page in LIST_PAGES:
            html = (ROOT / page).read_text(encoding="utf-8")
            self.assertEqual(html.count(MARKER), 1,
                             f"{page} 里 {MARKER} 必须恰好出现一次，否则自动发布会失败")

    def test_inserted_navigation_is_parseable(self):
        """插入后的条目必须能被运行时索引解析出 href / 标题 / 日期。"""
        html = (ROOT / "create.html").read_text(encoding="utf-8")
        href = "/2026/11/17/auto-create/"
        nav = NAVIGATION.format(href=href, date="2026 · 11 · 17",
                                title="插入测试", Label="Create")
        after = html.replace(MARKER, MARKER + "\n" + nav, 1)
        self.assertIn(f'href="{href}"', after)
        block = re.search(r'<a href="' + re.escape(href) + r'" class="entry">([\s\S]*?)</a>', after)
        self.assertIsNotNone(block, "运行时索引无法匹配新插入的条目")
        self.assertIn("插入测试", block.group(1))

    def test_entries_point_at_real_files(self):
        import json
        index = json.loads((ROOT / "data" / "site.json").read_text(encoding="utf-8"))
        self.assertTrue(index.get("email"), "site.json 缺少联系邮箱")
        for page in LIST_PAGES:
            html = (ROOT / page).read_text(encoding="utf-8")
            for m in re.finditer(r'<a href="(/2026-\d\d-\d\d/[^"]+)" class="entry">', html):
                target = ROOT / m.group(1).lstrip("/") / "index.html"
                self.assertTrue(target.exists(), f"列表指向不存在的文章：{m.group(1)}")


class AgainstRealAgent(unittest.TestCase):
    """Prefer the real module over the copy when it is available locally."""

    def setUp(self):
        repo = os.environ.get("AGENT_REPO", str(ROOT.parent / "agent"))
        if not Path(repo, "autoblog", "html_publish.py").exists():
            self.skipTest(f"未找到 auto-blog-agent 仓库（{repo}），跳过真实模块比对")
        sys.path.insert(0, repo)

    def test_real_render_matches_local_copy(self):
        from autoblog.html_publish import render as real_render
        args = ("契约测试", "段落一。\n\n段落二。", "2026-11-18", "create")
        self.assertEqual(real_render(TEMPLATE, *args), render(TEMPLATE, *args))


if __name__ == "__main__":
    unittest.main(verbosity=2)
