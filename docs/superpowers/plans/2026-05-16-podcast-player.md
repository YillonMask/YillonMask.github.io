# Podcast Player on Briefing Pages — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-date custom audio player UI (play/pause, ±10s skip, click-to-seek progress bar, time display, AI-disclosure caption) to briefing HTML pages, auto-injected by the build when a matching MP3 exists.

**Architecture:** Single-source approach — player HTML/CSS/JS all live in `build_briefings.py` and are injected at render time. Player presence is determined by file existence (`briefings/audio/<DATE>-podcast.mp3`). `publish.sh` is extended to copy MP3s from the source `podcast/` directory. Markdown source stays clean (no `<audio>` tags or directives).

**Tech Stack:** Python 3 (standard library only), vanilla JS, CSS variables. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-05-16-podcast-player-design.md`

**Repos affected:**
- Primary: `/Users/xinruiyi/Documents/profolio` (portfolio repo — `publish.sh`, `build_briefings.py`)
- Source-only: `/Users/xinruiyi/Library/CloudStorage/OneDrive-NortheasternUniversity/playground/daily_briefing_prompting/` (where source briefings + MP3s live; no commits made here)

---

## Task 0: Clean up the manual audio block in the source briefing

**Why:** During earlier brainstorming an HTML `<audio>` block was hand-inserted into the source markdown at `2026-05-14-briefing.md`. The new design renders the player from the build script, so that block must be removed; otherwise the next `publish.sh` run would copy it into the portfolio and produce a broken duplicate `<audio>` inside a `<p>` wrapper.

**Files:**
- Modify: `/Users/xinruiyi/Library/CloudStorage/OneDrive-NortheasternUniversity/playground/daily_briefing_prompting/2026-05-14-briefing.md` (remove lines 9–18)

- [ ] **Step 1: Verify the audio block exists in the source**

```bash
grep -n '<audio' "/Users/xinruiyi/Library/CloudStorage/OneDrive-NortheasternUniversity/playground/daily_briefing_prompting/2026-05-14-briefing.md"
```

Expected output: a line number around 11 showing `<audio controls preload="none">`.

- [ ] **Step 2: Remove the entire audio block**

Use Edit to replace this exact text:

```
# Morning Briefing — 2026-05-14 (Thursday)

## 🎧 Audio

<audio controls preload="none">
  <source src="podcast/2026-05-14-podcast.mp3" type="audio/mpeg">
  Your browser does not support the audio element. [Download MP3](podcast/2026-05-14-podcast.mp3).
</audio>

*AI-generated audio digest (~6 min, Mandarin). Voiced by Fish Audio TTS — not a human narrator.*

---

## 重点
```

with:

```
# Morning Briefing — 2026-05-14 (Thursday)

## 重点
```

- [ ] **Step 3: Verify removal**

```bash
grep -c '<audio' "/Users/xinruiyi/Library/CloudStorage/OneDrive-NortheasternUniversity/playground/daily_briefing_prompting/2026-05-14-briefing.md"
```

Expected output: `0`

- [ ] **Step 4: No commit needed**

The source briefings dir is not a git repo. Nothing to commit for this task.

---

## Task 1: Stage MP3 fixture in `briefings/audio/`

**Why:** Subsequent tasks need the MP3 to exist at `briefings/audio/2026-05-14-podcast.mp3` for the build script to detect it. This task stages it manually; later `publish.sh` automates this.

**Files:**
- Create: `/Users/xinruiyi/Documents/profolio/briefings/audio/2026-05-14-podcast.mp3` (copy from source)

- [ ] **Step 1: Verify source MP3 exists**

```bash
ls -la "/Users/xinruiyi/Library/CloudStorage/OneDrive-NortheasternUniversity/playground/daily_briefing_prompting/podcast/2026-05-14-podcast.mp3"
```

Expected: file exists, ~7.6 MB.

- [ ] **Step 2: Create audio dir and copy**

```bash
mkdir -p /Users/xinruiyi/Documents/profolio/briefings/audio
cp "/Users/xinruiyi/Library/CloudStorage/OneDrive-NortheasternUniversity/playground/daily_briefing_prompting/podcast/2026-05-14-podcast.mp3" /Users/xinruiyi/Documents/profolio/briefings/audio/
ls -la /Users/xinruiyi/Documents/profolio/briefings/audio/
```

Expected: one file `2026-05-14-podcast.mp3` in the dir.

- [ ] **Step 3: Confirm pre-change state (no player in current HTML)**

```bash
grep -c 'brief-audio' /Users/xinruiyi/Documents/profolio/briefings/2026-05-14-briefing.html
```

Expected: `0` (we haven't built it in yet).

- [ ] **Step 4: No commit yet**

We'll commit the MP3 together with the build-script changes in Task 4 so the repo state is coherent.

---

## Task 2: Add MP3 detection + player-block injection to `build_briefings.py`

**Files:**
- Modify: `/Users/xinruiyi/Documents/profolio/build_briefings.py`

- [ ] **Step 1: Add `AUDIO_DIR` constant**

Locate the existing block near the top of the file:

```python
ROOT = Path(__file__).parent
BRIEF_DIR = ROOT / "briefings"
```

Edit to add the new constant:

```python
ROOT = Path(__file__).parent
BRIEF_DIR = ROOT / "briefings"
AUDIO_DIR = BRIEF_DIR / "audio"
```

- [ ] **Step 2: Build the player-block string constant**

Add the following new function and constant immediately above the `def render_briefing(` line (around line 370 in the existing file). The function returns the player HTML when given an audio filename, or empty string otherwise.

```python
AUDIO_BLOCK_TEMPLATE = """
<section class="brief-audio" aria-label="Audio digest">
  <div class="container">
    <div class="audio-card">
      <div class="audio-controls">
        <button class="audio-btn audio-back" aria-label="Back 10 seconds" type="button">
          <span class="audio-icon">&#9194;</span><span class="audio-num">10</span>
        </button>
        <button class="audio-btn audio-play" aria-label="Play" type="button">
          <span class="audio-icon-play">&#9654;</span>
        </button>
        <button class="audio-btn audio-fwd" aria-label="Forward 10 seconds" type="button">
          <span class="audio-num">10</span><span class="audio-icon">&#9193;</span>
        </button>
        <div class="audio-track" role="slider" aria-label="Seek">
          <div class="audio-buffered"></div>
          <div class="audio-progress"></div>
        </div>
        <div class="audio-time">
          <span class="audio-cur">0:00</span> / <span class="audio-dur">--:--</span>
        </div>
      </div>
      <p class="audio-caption">AI-generated audio digest &middot; Mandarin &middot; Voiced by Fish Audio TTS</p>
      <audio class="audio-el" preload="metadata" src="audio/{audio_filename}"></audio>
    </div>
  </div>
</section>
"""


def audio_block(audio_filename):
    if not audio_filename:
        return ""
    return AUDIO_BLOCK_TEMPLATE.format(audio_filename=audio_filename)
```

- [ ] **Step 3: Add `audio_filename` parameter to `render_briefing`**

Locate the existing function signature:

```python
def render_briefing(date_str: str, tags: str, body_html: str) -> str:
```

Change to:

```python
def render_briefing(date_str: str, tags: str, body_html: str, audio_filename: str | None) -> str:
```

Inside the function body, locate the existing `header = f"""..."""` block that ends with:

```python
</header>
<main class="prose">
  <div class="container">
    {body_html}
  </div>
</main>
"""
```

Insert the audio block between `</header>` and `<main class="prose">`:

```python
    header = f"""
<header class="brief-head">
  <div class="container">
    <div class="brief-eyebrow">Morning Briefing</div>
    <h1>{date_str} <em>·</em> daily signal</h1>
    <div class="brief-meta">{tag_html}</div>
  </div>
</header>
{audio_block(audio_filename)}
<main class="prose">
  <div class="container">
    {body_html}
  </div>
</main>
"""
```

- [ ] **Step 4: Update `main()` to detect the MP3 and pass it through**

Locate this block in `main()`:

```python
    for md_path in md_files:
        text = md_path.read_text(encoding="utf-8")
        fm, body = parse_frontmatter(text)
        date_str = fm.get("date", md_path.stem.replace("-briefing", ""))
        tags = fm.get("tags", "")
        body_html = md_to_html(body)
        html = render_briefing(date_str, tags, body_html)
```

Change to:

```python
    for md_path in md_files:
        text = md_path.read_text(encoding="utf-8")
        fm, body = parse_frontmatter(text)
        date_str = fm.get("date", md_path.stem.replace("-briefing", ""))
        tags = fm.get("tags", "")
        body_html = md_to_html(body)
        mp3_path = AUDIO_DIR / f"{date_str}-podcast.mp3"
        audio_filename = f"{date_str}-podcast.mp3" if mp3_path.exists() else None
        html = render_briefing(date_str, tags, body_html, audio_filename)
```

- [ ] **Step 5: Run the build**

```bash
cd /Users/xinruiyi/Documents/profolio && python3 build_briefings.py
```

Expected output: a `built briefings/<DATE>-briefing.html` line for each date and `done — N briefing(s)`.

- [ ] **Step 6: Verify player injected for 2026-05-14**

```bash
grep -c 'brief-audio' /Users/xinruiyi/Documents/profolio/briefings/2026-05-14-briefing.html
```

Expected: `1`

```bash
grep -A 2 'class="audio-el"' /Users/xinruiyi/Documents/profolio/briefings/2026-05-14-briefing.html
```

Expected: a line containing `src="audio/2026-05-14-podcast.mp3"`.

- [ ] **Step 7: Verify NO player on other dates**

```bash
grep -c 'brief-audio' /Users/xinruiyi/Documents/profolio/briefings/2026-05-15-briefing.html
grep -c 'brief-audio' /Users/xinruiyi/Documents/profolio/briefings/2026-05-13-briefing.html
```

Expected: `0` for both.

- [ ] **Step 8: No commit yet**

CSS and JS still need to be added before the player will look or behave correctly. Commit after Task 4.

---

## Task 3: Add player CSS to `PAGE_CSS`

**Files:**
- Modify: `/Users/xinruiyi/Documents/profolio/build_briefings.py` (the `PAGE_CSS` constant)

- [ ] **Step 1: Append player CSS rules**

Locate the end of the `PAGE_CSS` raw string. It currently ends with the mobile media query:

```python
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
```

Edit the file: keep the existing rules; add the audio rules and an extended mobile breakpoint BEFORE the closing `"""`. Add this block immediately above the `@media (max-width: 720px) {` line:

```css
/* audio player */
.brief-audio { padding: 24px 0 8px; }
.audio-card {
  background: var(--card); border: 1px solid var(--rule);
  border-radius: 8px; padding: 20px 24px;
}
.audio-controls {
  display: flex; align-items: center; gap: 14px;
}
.audio-btn {
  width: 40px; height: 40px; border-radius: 50%;
  background: transparent; border: 1px solid var(--rule);
  color: var(--ink-soft); cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
  font-family: inherit; font-size: 13px; gap: 2px;
  transition: all 0.15s; flex-shrink: 0;
}
.audio-btn:hover, .audio-btn:focus-visible {
  border-color: var(--accent); color: var(--accent); outline: none;
}
.audio-play { width: 48px; height: 48px; font-size: 16px; }
.audio-num {
  font-family: 'Geist Mono', monospace; font-size: 11px;
}
.audio-track {
  flex: 1; height: 4px; background: var(--rule);
  border-radius: 2px; position: relative; cursor: pointer;
  min-width: 60px;
}
.audio-buffered, .audio-progress {
  position: absolute; top: 0; bottom: 0; left: 0;
  border-radius: 2px; width: 0;
}
.audio-buffered { background: color-mix(in srgb, var(--accent) 25%, transparent); }
.audio-progress { background: var(--accent); }
.audio-time {
  font-family: 'Geist Mono', monospace; font-size: 12px;
  color: var(--ink-muted); white-space: nowrap;
}
.audio-caption {
  font-size: 12px; font-style: italic;
  color: var(--ink-muted); margin: 12px 0 0; line-height: 1.4;
}
.audio-el { display: none; }

```

Then locate the `@media (max-width: 720px) {` block already present and append the following lines inside its braces (before its closing `}`):

```css
  .audio-card { padding: 16px 18px; }
  .audio-controls { flex-wrap: wrap; gap: 10px; }
  .audio-time { flex-basis: 100%; text-align: right; margin-top: 4px; }
```

- [ ] **Step 2: Rebuild**

```bash
cd /Users/xinruiyi/Documents/profolio && python3 build_briefings.py
```

Expected: same `built ... done — N briefing(s)` output.

- [ ] **Step 3: Verify CSS is in the output**

```bash
grep -c 'audio-card' /Users/xinruiyi/Documents/profolio/briefings/2026-05-14-briefing.html
```

Expected: at least `2` (one in the `<style>` block, one in the rendered HTML).

- [ ] **Step 4: Visual verification (light + dark)**

Open `file:///Users/xinruiyi/Documents/profolio/briefings/2026-05-14-briefing.html` in a browser.

Expected:
- Player card visible immediately below the title block.
- Three circular buttons (back-10, play, forward-10) on the left.
- Thin progress track filling the remaining width.
- Time display `0:00 / 6:12` (or similar) on the right.
- Italic caption "AI-generated audio digest · Mandarin · Voiced by Fish Audio TTS" below the controls.
- Click the theme toggle (top-right "Dark") and confirm the card adapts: dark card background, lighter borders, accent color remains terracotta/peach.

- [ ] **Step 5: Mobile breakpoint check**

In the same browser, narrow the window to under 720px wide (or use device-emulation devtools).

Expected: time display drops to its own line below the buttons + progress bar; buttons stay in a row.

- [ ] **Step 6: No commit yet**

JS still needed before player is functional. Commit after Task 4.

---

## Task 4: Add player JS to `PAGE_JS`, then commit Tasks 1–4 together

**Files:**
- Modify: `/Users/xinruiyi/Documents/profolio/build_briefings.py` (the `PAGE_JS` constant)

- [ ] **Step 1: Append player JS**

Locate the end of the existing `PAGE_JS` raw string. It currently ends:

```python
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
```

Add the following block BEFORE the closing `"""`:

```javascript

const audio = document.querySelector('.audio-el');
if (audio) {
  const playBtn = document.querySelector('.audio-play');
  const playIcon = document.querySelector('.audio-icon-play');
  const backBtn = document.querySelector('.audio-back');
  const fwdBtn = document.querySelector('.audio-fwd');
  const track = document.querySelector('.audio-track');
  const progress = document.querySelector('.audio-progress');
  const buffered = document.querySelector('.audio-buffered');
  const curEl = document.querySelector('.audio-cur');
  const durEl = document.querySelector('.audio-dur');

  const fmt = (s) => {
    if (!isFinite(s)) return '--:--';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, '0');
    return m + ':' + sec;
  };

  const setPlaying = (isPlaying) => {
    playIcon.textContent = isPlaying ? '⏸' : '▶';
    playBtn.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play');
  };

  playBtn.addEventListener('click', () => {
    if (audio.paused) { audio.play(); }
    else { audio.pause(); }
  });
  audio.addEventListener('play', () => setPlaying(true));
  audio.addEventListener('pause', () => setPlaying(false));
  audio.addEventListener('ended', () => setPlaying(false));

  backBtn.addEventListener('click', () => {
    audio.currentTime = Math.max(0, audio.currentTime - 10);
  });
  fwdBtn.addEventListener('click', () => {
    const dur = isFinite(audio.duration) ? audio.duration : audio.currentTime + 10;
    audio.currentTime = Math.min(dur, audio.currentTime + 10);
  });

  audio.addEventListener('timeupdate', () => {
    const ratio = audio.duration ? (audio.currentTime / audio.duration) : 0;
    progress.style.width = (ratio * 100) + '%';
    curEl.textContent = fmt(audio.currentTime);
  });
  audio.addEventListener('loadedmetadata', () => {
    durEl.textContent = fmt(audio.duration);
  });
  audio.addEventListener('progress', () => {
    if (audio.buffered.length && audio.duration) {
      const end = audio.buffered.end(audio.buffered.length - 1);
      buffered.style.width = ((end / audio.duration) * 100) + '%';
    }
  });

  track.addEventListener('click', (e) => {
    if (!audio.duration) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * audio.duration;
  });

  document.addEventListener('keydown', (e) => {
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;
    if (e.code === 'Space') { e.preventDefault(); playBtn.click(); }
    else if (e.code === 'ArrowLeft') { backBtn.click(); }
    else if (e.code === 'ArrowRight') { fwdBtn.click(); }
  });
}
```

- [ ] **Step 2: Rebuild**

```bash
cd /Users/xinruiyi/Documents/profolio && python3 build_briefings.py
```

Expected: same `built ... done — N briefing(s)` output.

- [ ] **Step 3: Verify JS is in the output**

```bash
grep -c 'audio-el' /Users/xinruiyi/Documents/profolio/briefings/2026-05-14-briefing.html
```

Expected: at least `2` (one in the inline `<script>`, one in the rendered HTML).

- [ ] **Step 4: Functional verification in browser**

Open `file:///Users/xinruiyi/Documents/profolio/briefings/2026-05-14-briefing.html` and walk through all behaviors:

1. Click play button. Audio starts; icon swaps to pause (⏸); `aria-label` becomes "Pause".
2. Click pause; audio pauses; icon swaps back to ▶.
3. Let audio play for a few seconds; verify progress bar fills, current-time updates `0:01 → 0:02 → ...`, total duration appears (e.g. `/ 6:12`).
4. Click back-10 button; current time jumps back ~10 seconds (or 0 if near start).
5. Click forward-10 button; current time jumps ahead ~10 seconds.
6. Click somewhere in the middle of the progress track; current time jumps to that ratio of total duration.
7. Focus somewhere outside the player. Press `Space`; play/pause toggles. Press `←`/`→`; skips ±10s.
8. Let the track play to end; icon returns to ▶ and aria-label to "Play".
9. Toggle dark mode; verify the player still works and looks correct.
10. Open browser devtools console; verify no errors.

- [ ] **Step 5: Commit Tasks 1–4 together**

```bash
cd /Users/xinruiyi/Documents/profolio && git status
```

Expected to show:
- New: `briefings/audio/2026-05-14-podcast.mp3`
- Modified: `build_briefings.py`
- Modified: `briefings/2026-05-12-briefing.html`, `2026-05-13-briefing.html`, `2026-05-14-briefing.html`, `2026-05-15-briefing.html`, `2026-05-16-briefing.html`, `briefings/index.html` (all rebuilt with the new CSS/JS even though only 2026-05-14 has the audio block)

```bash
cd /Users/xinruiyi/Documents/profolio && git add briefings/ build_briefings.py
git commit -m "$(cat <<'EOF'
Add audio player to briefing pages

build_briefings.py now detects briefings/audio/<DATE>-podcast.mp3 and
injects a player section (play/pause, ±10s, click-to-seek progress bar,
time display, AI disclosure) below the brief header. Ships the
2026-05-14 episode as the first audio-enabled briefing.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 6: Verify clean status**

```bash
cd /Users/xinruiyi/Documents/profolio && git status
```

Expected: `nothing to commit, working tree clean`.

---

## Task 5: Extend `publish.sh` to copy MP3 automatically

**Files:**
- Modify: `/Users/xinruiyi/Documents/profolio/publish.sh`

- [ ] **Step 1: Edit `publish.sh`**

Locate this existing block:

```bash
/bin/cp -f "$SRC_FILE" "$REPO_DIR/briefings/"
echo "  copied $(basename "$SRC_FILE") → briefings/"

cd "$REPO_DIR"
python3 build_briefings.py
```

Change to:

```bash
/bin/cp -f "$SRC_FILE" "$REPO_DIR/briefings/"
echo "  copied $(basename "$SRC_FILE") → briefings/"

SRC_MP3="$SRC_DIR/podcast/${DATE}-podcast.mp3"
if [[ -f "$SRC_MP3" ]]; then
  mkdir -p "$REPO_DIR/briefings/audio"
  /bin/cp -f "$SRC_MP3" "$REPO_DIR/briefings/audio/"
  echo "  copied $(basename "$SRC_MP3") → briefings/audio/"
fi

cd "$REPO_DIR"
python3 build_briefings.py
```

- [ ] **Step 2: Shell syntax check**

`publish.sh` auto-commits + pushes on its own, so we do NOT run it end-to-end here (that's Task 6). Instead, do a syntax check and a visual diff of the new block:

```bash
bash -n /Users/xinruiyi/Documents/profolio/publish.sh
```

Expected: no output (exit code 0 = syntactically valid).

- [ ] **Step 3: Inspect the new block is in place**

```bash
grep -n -A 5 'SRC_MP3=' /Users/xinruiyi/Documents/profolio/publish.sh
```

Expected: the 5-line block (`SRC_MP3=...` through the `fi`) appears between the markdown-copy `echo` and the `cd "$REPO_DIR"` line.

- [ ] **Step 4: Isolated logic test — MP3 present case**

Test only the new copy-block logic in isolation (does NOT invoke publish.sh's git/push behavior):

```bash
rm -f /tmp/audio-test && mkdir -p /tmp/audio-test
DATE=2026-05-14
SRC_DIR="/Users/xinruiyi/Library/CloudStorage/OneDrive-NortheasternUniversity/playground/daily_briefing_prompting"
SRC_MP3="$SRC_DIR/podcast/${DATE}-podcast.mp3"
if [[ -f "$SRC_MP3" ]]; then
  cp "$SRC_MP3" /tmp/audio-test/
  echo "would copy: $(basename "$SRC_MP3")"
fi
ls /tmp/audio-test/
```

Expected: `would copy: 2026-05-14-podcast.mp3` and the file is in `/tmp/audio-test/`.

- [ ] **Step 5: Isolated logic test — MP3 missing case**

```bash
DATE=2026-05-15
SRC_MP3="$SRC_DIR/podcast/${DATE}-podcast.mp3"
if [[ -f "$SRC_MP3" ]]; then
  echo "would copy: $(basename "$SRC_MP3")"
else
  echo "no MP3 for $DATE — skipped"
fi
```

Expected: `no MP3 for 2026-05-15 — skipped`.

- [ ] **Step 6: Clean up test dir**

```bash
rm -rf /tmp/audio-test
```

- [ ] **Step 7: Commit the publish.sh change**

```bash
cd /Users/xinruiyi/Documents/profolio && git status
```

Expected: only `publish.sh` shows as modified.

```bash
cd /Users/xinruiyi/Documents/profolio && git add publish.sh
git commit -m "$(cat <<'EOF'
publish.sh: copy date-matched MP3 into briefings/audio/

Extends the publish flow so running ./publish.sh <DATE> also stages
the matching podcast MP3 from the source podcast/ dir, if present.
Silently skipped when no MP3 exists for the date.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 8: Verify clean status**

```bash
cd /Users/xinruiyi/Documents/profolio && git status
```

Expected: `nothing to commit, working tree clean`.

---

## Task 6: End-to-end live verification + push

**Files:** none modified — this is the deploy + smoke test.

- [ ] **Step 1: Inspect commits about to be pushed**

```bash
cd /Users/xinruiyi/Documents/profolio && git log origin/main..HEAD --oneline
```

Expected: three commits visible — the spec, the player implementation, and the publish.sh extension.

- [ ] **Step 2: Push to GitHub**

```bash
cd /Users/xinruiyi/Documents/profolio && git push
```

Expected: a normal push, branch advances on `origin/main`.

- [ ] **Step 3: Wait ~30–60s for GitHub Pages to redeploy**

GitHub Pages typically picks up changes within a minute. Avoid sleeping in a loop — just wait, then check.

- [ ] **Step 4: Visit the live page**

Open in a browser: `https://yillonmask.github.io/briefings/2026-05-14-briefing.html`

Repeat the full functional walkthrough from Task 4 step 4 against the live page. Pay particular attention to:
- MP3 actually loads from `https://yillonmask.github.io/briefings/audio/2026-05-14-podcast.mp3` (check Network tab in devtools — should be 200 with `Content-Type: audio/mpeg`).
- No mixed-content or CORS errors in the console.
- Time and progress update correctly.
- Theme toggle persists styling.

- [ ] **Step 5: Verify negative case on live site**

Open: `https://yillonmask.github.io/briefings/2026-05-15-briefing.html`

Expected: page renders normally, no audio player visible, no console errors.

- [ ] **Step 6: Done**

No further commit needed. Implementation is complete.

---

## Rollback notes

If something breaks in production after pushing:

- The previous portfolio state is at `git rev-parse origin/main~3` (before the three new commits). Reverting is `git revert <commit-sha>` for each of the three commits, in reverse order, then `git push`.
- The MP3 alone is non-disruptive — it's just a static asset. If only the player JS is broken, you can hotfix by removing the `audio_block()` call site in `build_briefings.py` and rebuilding; the MP3 file can stay in `briefings/audio/` without rendering on any page.
