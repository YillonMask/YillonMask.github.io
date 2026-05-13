#!/usr/bin/env python3
"""
build_briefings.py — convert every briefings/*.md to a styled HTML page
and regenerate briefings/index.html (the list page).

Usage:
    python3 build_briefings.py

No external dependencies. Run it after writing a new briefing markdown file.
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent
BRIEF_DIR = ROOT / "briefings"

# ----- inline markdown -----

def inline(s: str) -> str:
    # code spans
    s = re.sub(r'`([^`]+)`', r'<code>\1</code>', s)
    # links (process before bold/italic so link text can still contain them)
    s = re.sub(
        r'\[([^\]]+)\]\(([^)]+)\)',
        lambda m: f'<a href="{m.group(2)}" target="_blank" rel="noopener">{m.group(1)}</a>',
        s,
    )
    # bold
    s = re.sub(r'\*\*([^*]+?)\*\*', r'<strong>\1</strong>', s)
    # italic (single * not adjacent to *)
    s = re.sub(r'(?<!\*)\*([^*\n]+?)\*(?!\*)', r'<em>\1</em>', s)
    return s


def parse_frontmatter(text: str):
    if not text.startswith("---\n"):
        return {}, text
    end = text.find("\n---\n", 4)
    if end == -1:
        return {}, text
    raw = text[4:end]
    body = text[end + 5 :]
    fm = {}
    for line in raw.splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            fm[k.strip()] = v.strip()
    return fm, body


# ----- block-level conversion -----

LIST_UL = re.compile(r'^[-*]\s+(.+)$')
LIST_OL = re.compile(r'^(\d+)\.\s+(.+)$')
HEADER = re.compile(r'^(#{1,6})\s+(.+)$')


def md_to_html(body: str) -> str:
    lines = body.split("\n")
    out = []
    list_kind = None  # None | "ul" | "ol"
    para = []

    def flush_para():
        if para:
            out.append(f'<p>{inline(" ".join(para).strip())}</p>')
            para.clear()

    def close_list():
        nonlocal list_kind
        if list_kind:
            out.append(f"</{list_kind}>")
            list_kind = None

    for line in lines:
        stripped = line.rstrip()
        if not stripped.strip():
            flush_para()
            close_list()
            continue

        if stripped.strip() == "---":
            flush_para()
            close_list()
            out.append("<hr>")
            continue

        h = HEADER.match(stripped.strip())
        if h:
            flush_para()
            close_list()
            level = len(h.group(1))
            out.append(f"<h{level}>{inline(h.group(2))}</h{level}>")
            continue

        ol = LIST_OL.match(stripped.strip())
        if ol:
            flush_para()
            if list_kind != "ol":
                close_list()
                out.append("<ol>")
                list_kind = "ol"
            out.append(f"<li>{inline(ol.group(2))}</li>")
            continue

        ul = LIST_UL.match(stripped.strip())
        if ul:
            flush_para()
            if list_kind != "ul":
                close_list()
                out.append("<ul>")
                list_kind = "ul"
            out.append(f"<li>{inline(ul.group(1))}</li>")
            continue

        # paragraph text (accumulate, join with single spaces)
        if list_kind:
            close_list()
        para.append(stripped.strip())

    flush_para()
    close_list()
    return "\n".join(out)


# ----- HTML templates -----

PAGE_CSS = r"""
:root {
  --bg: #f6f3ee;
  --bg-soft: #efeae2;
  --ink: #1a1a1a;
  --ink-soft: #4a4a4a;
  --ink-muted: #8a8a8a;
  --rule: #d9d3c8;
  --accent: #b8412c;
  --accent-soft: #e8c5bc;
  --card: #fbf9f5;
}
[data-theme="dark"] {
  --bg: #0e0e0c;
  --bg-soft: #161614;
  --ink: #f0ece4;
  --ink-soft: #b8b3a8;
  --ink-muted: #6e6a62;
  --rule: #2a2926;
  --accent: #e8a07a;
  --accent-soft: #4a2a20;
  --card: #14140f;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body {
  font-family: 'Geist', -apple-system, sans-serif;
  background: var(--bg);
  color: var(--ink);
  font-size: 16px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  transition: background 0.3s ease, color 0.3s ease;
}
.serif { font-family: 'Fraunces', Georgia, serif; }
.mono { font-family: 'Geist Mono', monospace; }
.container { max-width: 760px; margin: 0 auto; padding: 0 32px; }

nav {
  position: sticky; top: 0;
  background: color-mix(in srgb, var(--bg) 92%, transparent);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--rule); z-index: 100;
}
.nav-inner {
  display: flex; justify-content: space-between; align-items: center;
  padding: 18px 32px; max-width: 920px; margin: 0 auto;
}
.nav-brand {
  font-family: 'Fraunces', serif; font-weight: 500; font-size: 17px;
  letter-spacing: -0.01em; color: var(--ink); text-decoration: none;
}
.nav-brand .dot { color: var(--accent); }
.nav-links { display: flex; gap: 28px; align-items: center; font-size: 13px; }
.nav-links a { color: var(--ink-soft); text-decoration: none; transition: color 0.15s; }
.nav-links a:hover { color: var(--accent); }
.theme-toggle {
  background: none; border: 1px solid var(--rule); color: var(--ink-soft);
  cursor: pointer; padding: 6px 10px; border-radius: 6px;
  font-family: inherit; font-size: 12px; transition: all 0.2s;
  display: inline-flex; align-items: center; gap: 6px;
}
.theme-toggle:hover { border-color: var(--accent); color: var(--accent); }

/* briefing page header */
.brief-head {
  padding: 80px 0 48px; border-bottom: 1px solid var(--rule);
}
.brief-eyebrow {
  font-family: 'Geist Mono', monospace; font-size: 11px;
  letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--ink-muted); margin-bottom: 24px;
  display: flex; align-items: center; gap: 12px;
}
.brief-eyebrow::before { content: ""; width: 28px; height: 1px; background: var(--ink-muted); }
.brief-head h1 {
  font-family: 'Fraunces', serif; font-weight: 400;
  font-size: clamp(36px, 5vw, 56px); line-height: 1.1;
  letter-spacing: -0.025em; margin-bottom: 16px;
}
.brief-head h1 em { font-style: italic; color: var(--accent); font-weight: 300; }
.brief-meta {
  font-family: 'Geist Mono', monospace; font-size: 12px;
  color: var(--ink-muted); display: flex; gap: 18px; flex-wrap: wrap;
}
.brief-meta .tag {
  color: var(--ink-soft); border: 1px solid var(--rule);
  padding: 2px 8px; border-radius: 4px;
}

/* prose */
.prose { padding: 56px 0 80px; }
.prose h1 { display: none; } /* the markdown's title H1 — we render our own header */
.prose h2 {
  font-family: 'Fraunces', serif; font-weight: 400;
  font-size: 30px; letter-spacing: -0.02em;
  margin: 64px 0 24px; padding-top: 24px;
  border-top: 1px solid var(--rule);
}
.prose h2:first-child { border-top: none; padding-top: 0; margin-top: 0; }
.prose h3 {
  font-family: 'Fraunces', serif; font-weight: 500;
  font-size: 21px; letter-spacing: -0.015em;
  margin: 40px 0 14px; color: var(--ink);
}
.prose p {
  font-size: 16px; line-height: 1.75; color: var(--ink-soft);
  margin: 0 0 18px;
}
.prose p strong { color: var(--ink); font-weight: 500; }
.prose ul, .prose ol { margin: 0 0 22px 22px; }
.prose li {
  font-size: 16px; line-height: 1.7; color: var(--ink-soft);
  margin-bottom: 10px;
}
.prose li strong { color: var(--ink); font-weight: 500; }
.prose a {
  color: var(--ink); text-decoration: none;
  border-bottom: 1px solid var(--accent-soft);
  transition: color 0.15s, border-color 0.15s;
}
.prose a:hover { color: var(--accent); border-color: var(--accent); }
.prose code {
  font-family: 'Geist Mono', monospace; font-size: 0.92em;
  background: var(--bg-soft); padding: 1px 6px; border-radius: 3px;
  border: 1px solid var(--rule);
}
.prose hr {
  border: none; border-top: 1px solid var(--rule); margin: 48px 0;
}
.prose em { font-style: italic; color: var(--ink-muted); }

/* index page list */
.brief-list { padding: 56px 0 80px; }
.brief-row {
  display: grid; grid-template-columns: 140px 1fr;
  gap: 32px; padding: 28px 0;
  border-top: 1px solid var(--rule);
  align-items: baseline;
}
.brief-row:last-child { border-bottom: 1px solid var(--rule); }
.brief-row .date {
  font-family: 'Geist Mono', monospace; font-size: 12px;
  color: var(--ink-muted); letter-spacing: 0.04em;
}
.brief-row a {
  font-family: 'Fraunces', serif; font-weight: 500; font-size: 22px;
  color: var(--ink); text-decoration: none;
  letter-spacing: -0.015em; transition: color 0.15s;
}
.brief-row a:hover { color: var(--accent); }
.brief-row .tags {
  margin-top: 6px; font-family: 'Geist Mono', monospace;
  font-size: 11px; color: var(--ink-muted);
}

footer {
  padding: 28px 0; font-family: 'Geist Mono', monospace;
  font-size: 11px; color: var(--ink-muted);
  border-top: 1px solid var(--rule);
}
footer .container { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px; }

@media (max-width: 720px) {
  .container { padding: 0 22px; }
  .nav-inner { padding: 14px 22px; }
  .nav-links { gap: 16px; font-size: 12px; }
  .brief-head { padding: 56px 0 36px; }
  .prose { padding: 40px 0 56px; }
  .prose h2 { font-size: 25px; }
  .prose h3 { font-size: 19px; }
  .brief-row { grid-template-columns: 1fr; gap: 6px; }
}
"""

PAGE_JS = r"""
const root = document.documentElement;
const toggle = document.getElementById('themeToggle');
const icon = document.getElementById('themeIcon');
const text = document.getElementById('themeText');
const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
let theme = prefersDark ? 'dark' : 'light';
applyTheme(theme);
toggle.addEventListener('click', () => {
  theme = theme === 'dark' ? 'light' : 'dark';
  applyTheme(theme);
});
function applyTheme(t) {
  if (t === 'dark') {
    root.setAttribute('data-theme', 'dark');
    icon.textContent = '◑'; text.textContent = 'Light';
  } else {
    root.removeAttribute('data-theme');
    icon.textContent = '◐'; text.textContent = 'Dark';
  }
}
"""

HEAD = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>{title}</title>
<meta name="description" content="{desc}" />
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600;9..144,700&family=Geist:wght@300;400;500;600&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>{css}</style>
</head>
<body>
<nav>
  <div class="nav-inner">
    <a href="../index.html" class="nav-brand">Xinrui Yi<span class="dot">.</span></a>
    <div class="nav-links">
      <a href="../index.html#work">Work</a>
      <a href="../index.html#experience">Experience</a>
      <a href="index.html">Briefings</a>
      <a href="../index.html#contact">Contact</a>
      <button class="theme-toggle" id="themeToggle" aria-label="Toggle theme">
        <span id="themeIcon">◐</span>
        <span id="themeText">Dark</span>
      </button>
    </div>
  </div>
</nav>
"""

FOOT = """<footer>
  <div class="container">
    <span>© 2026 Xinrui Yi · Briefings</span>
    <span><a href="index.html" style="color:inherit;text-decoration:none;border-bottom:1px solid var(--rule);">← All briefings</a></span>
  </div>
</footer>
<script>{js}</script>
</body>
</html>
"""


def render_briefing(date_str: str, tags: str, body_html: str) -> str:
    title = f"Morning Briefing — {date_str}"
    head = HEAD.format(
        title=f"{title} · Xinrui Yi",
        desc=f"Daily AI/AEC/wearables briefing for {date_str}.",
        css=PAGE_CSS,
    )
    tag_html = ""
    if tags:
        # strip brackets and quotes from yaml-ish list
        cleaned = tags.strip().lstrip("[").rstrip("]")
        for t in [x.strip().strip('"').strip("'") for x in cleaned.split(",")]:
            if t:
                tag_html += f'<span class="tag">{t}</span>'

    header = f"""
<header class="brief-head">
  <div class="container">
    <div class="brief-eyebrow">Morning Briefing</div>
    <h1>{date_str} <em>·</em> daily signal</h1>
    <div class="brief-meta">{tag_html}</div>
  </div>
</header>
<main class="prose">
  <div class="container">
    {body_html}
  </div>
</main>
"""
    foot = FOOT.format(js=PAGE_JS)
    return head + header + foot


def render_index(entries):
    """entries: list of (date_str, tags, filename)"""
    head = HEAD.format(
        title="Briefings · Xinrui Yi",
        desc="Daily briefings on AI, AEC, wearables, markets.",
        css=PAGE_CSS,
    )
    # tweak nav: this IS the briefings page
    head = head.replace(
        '<a href="index.html">Briefings</a>',
        '<a href="index.html" style="color:var(--accent);">Briefings</a>',
    )
    rows = []
    for date_str, tags, fname in entries:
        tag_str = ""
        if tags:
            cleaned = tags.strip().lstrip("[").rstrip("]")
            tag_list = [x.strip().strip('"').strip("'") for x in cleaned.split(",")]
            tag_str = " · ".join(t for t in tag_list if t)
        rows.append(
            f"""<div class="brief-row">
  <div class="date">{date_str}</div>
  <div>
    <a href="{fname}">Morning Briefing — {date_str}</a>
    <div class="tags">{tag_str}</div>
  </div>
</div>"""
        )
    body = f"""
<header class="brief-head">
  <div class="container">
    <div class="brief-eyebrow">Daily Signal</div>
    <h1>Morning <em>briefings</em>.</h1>
    <p style="font-size:17px;color:var(--ink-soft);max-width:560px;line-height:1.6;margin-top:8px;">
      Pre-curated daily reads on AI, AEC, wearables, and markets. Sources linked inline; takes are mine.
    </p>
  </div>
</header>
<main class="brief-list">
  <div class="container">
    {''.join(rows) if rows else '<p style="color:var(--ink-muted);">No briefings yet.</p>'}
  </div>
</main>
"""
    foot = FOOT.format(js=PAGE_JS).replace(
        '<span><a href="index.html"', '<span><a href="../index.html"'
    ).replace("← All briefings", "← Back to portfolio")
    return head + body + foot


def main():
    if not BRIEF_DIR.exists():
        print(f"error: {BRIEF_DIR} does not exist", file=sys.stderr)
        sys.exit(1)

    md_files = sorted(BRIEF_DIR.glob("*-briefing.md"), reverse=True)
    if not md_files:
        print("no *-briefing.md files found")
        return

    entries = []
    for md_path in md_files:
        text = md_path.read_text(encoding="utf-8")
        fm, body = parse_frontmatter(text)
        date_str = fm.get("date", md_path.stem.replace("-briefing", ""))
        tags = fm.get("tags", "")
        body_html = md_to_html(body)
        html = render_briefing(date_str, tags, body_html)
        out_path = md_path.with_suffix(".html")
        out_path.write_text(html, encoding="utf-8")
        print(f"  built {out_path.relative_to(ROOT)}")
        entries.append((date_str, tags, out_path.name))

    index_html = render_index(entries)
    (BRIEF_DIR / "index.html").write_text(index_html, encoding="utf-8")
    print(f"  built {(BRIEF_DIR / 'index.html').relative_to(ROOT)}")
    print(f"done — {len(entries)} briefing(s)")


if __name__ == "__main__":
    main()
