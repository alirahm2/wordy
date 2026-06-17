import json
from pathlib import Path

# ── Config ────────────────────────────────────────────────────────────────────
INPUT_FILE  = Path("../A2_B1_wordlist_enriched_v3.json")
OUTPUT_FILE = Path("../wordlist.html")
ELEVENLABS_API_KEY = "your-elevenlabs-api-key-here"
ELEVENLABS_VOICE_ID = "your-voice-id-here"   # e.g. "21m00Tcm4TlvDq8ikWAM" (Rachel)
ELEVENLABS_MODEL_ID = "eleven_v3"
# ─────────────────────────────────────────────────────────────────────────────

data = json.loads(INPUT_FILE.read_text(encoding="utf-8"))
json_data = json.dumps(data, ensure_ascii=False)

html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>German Wordlist</title>
<style>
  *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}

  :root {{
    --bg: #0d0d0d;
    --surface: #1a1a1a;
    --surface2: #242424;
    --border: #2e2e2e;
    --text: #e8e8e8;
    --muted: #888;
    --accent: #6c63ff;
    --accent2: #a78bfa;
    --p1: #ef4444;
    --p2: #f59e0b;
    --p3: #6b7280;
    --green: #22c55e;
  }}

  body {{
    background: var(--bg);
    color: var(--text);
    font-family: 'Segoe UI', system-ui, sans-serif;
    min-height: 100vh;
  }}

  /* ── Header ── */
  header {{
    position: sticky; top: 0; z-index: 100;
    background: rgba(13,13,13,0.92);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--border);
    padding: 14px 24px;
    display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
  }}
  header h1 {{ font-size: 1.1rem; font-weight: 700; color: var(--accent2); white-space: nowrap; }}
  header h1 span {{ color: var(--muted); font-weight: 400; font-size: 0.85rem; margin-left: 8px; }}

  .search-box {{
    flex: 1; min-width: 200px;
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 8px; padding: 8px 14px;
    color: var(--text); font-size: 0.9rem; outline: none;
  }}
  .search-box:focus {{ border-color: var(--accent); }}

  .filter-btns {{ display: flex; gap: 6px; }}
  .fbtn {{
    background: var(--surface2); border: 1px solid var(--border);
    color: var(--muted); border-radius: 6px; padding: 6px 12px;
    font-size: 0.8rem; cursor: pointer; transition: all .15s;
  }}
  .fbtn:hover {{ border-color: var(--accent); color: var(--text); }}
  .fbtn.active {{ background: var(--accent); border-color: var(--accent); color: #fff; }}
  .fbtn.p1.active {{ background: var(--p1); border-color: var(--p1); }}
  .fbtn.p2.active {{ background: var(--p2); border-color: var(--p2); color: #000; }}
  .fbtn.p3.active {{ background: var(--p3); border-color: var(--p3); }}

  .count-label {{ color: var(--muted); font-size: 0.8rem; white-space: nowrap; }}

  /* ── Grid ── */
  main {{ padding: 24px; }}
  #grid {{
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
  }}

  /* ── Card ── */
  .card {{
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 16px;
    display: flex; flex-direction: column; gap: 10px;
    transition: border-color .2s, transform .2s;
  }}
  .card:hover {{ border-color: #444; transform: translateY(-2px); }}

  .card-meta {{ display: flex; align-items: center; gap: 6px; }}

  .word {{ font-size: 1.1rem; font-weight: 700; color: #fff; line-height: 1.4; }}

  .badges {{ display: flex; gap: 6px; align-items: center; flex-shrink: 0; }}
  .badge {{
    font-size: 0.68rem; font-weight: 600; padding: 2px 7px;
    border-radius: 4px; text-transform: uppercase; letter-spacing: .04em;
  }}
  .badge-idx {{ background: var(--surface2); color: var(--muted); }}
  .badge-p1 {{ background: rgba(239,68,68,.15); color: var(--p1); border: 1px solid rgba(239,68,68,.3); }}
  .badge-p2 {{ background: rgba(245,158,11,.15); color: var(--p2); border: 1px solid rgba(245,158,11,.3); }}
  .badge-p3 {{ background: rgba(107,114,128,.15); color: var(--p3); border: 1px solid rgba(107,114,128,.3); }}

  .role-tag {{
    display: inline-block; font-size: 0.72rem; color: var(--accent2);
    background: rgba(108,99,255,.12); border: 1px solid rgba(108,99,255,.25);
    border-radius: 4px; padding: 2px 8px;
  }}

  .english {{ font-size: 0.95rem; color: #c8c8c8; }}
  .pronunciation {{ font-size: 0.85rem; color: var(--muted); font-family: monospace; }}

  .past-tense {{ font-size: 0.78rem; color: var(--muted); }}
  .past-tense strong {{ color: #aaa; }}

  /* ── Examples ── */
  .examples-toggle {{
    background: none; border: none; cursor: pointer;
    color: var(--muted); font-size: 0.78rem;
    display: flex; align-items: center; gap: 4px;
    padding: 0; text-align: left;
  }}
  .examples-toggle:hover {{ color: var(--text); }}
  .examples-toggle .arrow {{ transition: transform .2s; display: inline-block; }}
  .examples-toggle.open .arrow {{ transform: rotate(90deg); }}

  .examples-list {{
    display: none; flex-direction: column; gap: 6px;
    border-left: 2px solid var(--border); padding-left: 12px; margin-top: 2px;
  }}
  .examples-list.open {{ display: flex; }}
  .examples-list li {{
    list-style: none; font-size: 0.8rem; color: #aaa; line-height: 1.5;
  }}

  /* ── Play button ── */
  .play-btn {{
    display: flex; align-items: center; justify-content: center; gap: 6px;
    background: var(--surface2); border: 1px solid var(--border);
    color: var(--text); border-radius: 8px; padding: 8px 14px;
    font-size: 0.82rem; cursor: pointer; transition: all .15s;
    margin-top: auto;
  }}
  .play-btn:hover {{ background: var(--accent); border-color: var(--accent); }}
  .play-btn.playing {{ background: var(--green); border-color: var(--green); color: #000; }}
  .play-btn.loading {{ opacity: .6; cursor: wait; }}
  .play-btn svg {{ width: 14px; height: 14px; flex-shrink: 0; }}

  /* ── Pagination ── */
  #pagination {{
    display: flex; justify-content: center; align-items: center; gap: 8px;
    padding: 32px 24px; flex-wrap: wrap;
  }}
  .page-btn {{
    background: var(--surface2); border: 1px solid var(--border);
    color: var(--text); border-radius: 6px; padding: 6px 12px;
    font-size: 0.85rem; cursor: pointer; min-width: 36px; text-align: center;
  }}
  .page-btn:hover {{ border-color: var(--accent); }}
  .page-btn.active {{ background: var(--accent); border-color: var(--accent); }}
  .page-btn:disabled {{ opacity: .3; cursor: default; }}

  #no-results {{
    display: none; grid-column: 1/-1;
    text-align: center; color: var(--muted); padding: 60px 0; font-size: 1rem;
  }}
</style>
</head>
<body>

<header>
  <h1>🇩🇪 Wordlist <span id="count-label"></span></h1>
  <input class="search-box" id="search" type="search" placeholder="Search word or translation…"/>
  <div class="filter-btns">
    <button class="fbtn active" data-p="all">All</button>
    <button class="fbtn p1" data-p="1">● Essential</button>
    <button class="fbtn p2" data-p="2">● Useful</button>
    <button class="fbtn p3" data-p="3">● Low</button>
  </div>
  <span class="count-label" id="showing"></span>
</header>

<main>
  <div id="grid"></div>
  <div id="pagination"></div>
</main>

<script>
const API_KEY   = "{ELEVENLABS_API_KEY}";
const VOICE_ID  = "{ELEVENLABS_VOICE_ID}";
const MODEL_ID  = "{ELEVENLABS_MODEL_ID}";
const PAGE_SIZE = 48;

const ALL_DATA = {json_data};

let filtered = [...ALL_DATA];
let currentPage = 1;
let activePriority = "all";
let searchQuery = "";

const priorityLabel = {{ 1: "badge-p1", 2: "badge-p2", 3: "badge-p3" }};
const priorityText  = {{ 1: "P1", 2: "P2", 3: "P3" }};

function escHtml(s) {{
  return String(s ?? "")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}}

function buildCard(entry) {{
  const pClass = priorityLabel[entry.priority] ?? "badge-p3";
  const pText  = priorityText[entry.priority]  ?? "?";

  const examplesHtml = (entry.examples || []).length
    ? `<button class="examples-toggle" onclick="toggleEx(this)">
         <span class="arrow">▶</span> ${{entry.examples.length}} example${{entry.examples.length > 1 ? "s" : ""}}
       </button>
       <ul class="examples-list">
         ${{entry.examples.map(e => `<li>${{escHtml(e)}}</li>`).join("")}}
       </ul>`
    : "";

  const pastTenseHtml = entry.past_tense
    ? `<div class="past-tense"><strong>Past:</strong> ${{escHtml(entry.past_tense)}}</div>`
    : "";

  const pronHtml = entry.pronunciation
    ? `<div class="pronunciation">${{escHtml(entry.pronunciation)}}</div>`
    : "";

  return `
  <div class="card">
    <div class="card-meta">
      <span class="badge badge-idx">#${{entry.index ?? ""}}</span>
      <span class="badge ${{pClass}}">${{pText}}</span>
    </div>
    <div class="word">${{escHtml(entry.word)}}</div>
    <span class="role-tag">${{escHtml(entry.role)}}</span>
    <div class="english">${{escHtml(entry.english)}}</div>
    ${{examplesHtml}}
    ${{pastTenseHtml}}
    ${{pronHtml}}
    <button class="play-btn" onclick="speak(this, ${{JSON.stringify(escHtml(entry.word))}})">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
      Play
    </button>
  </div>`;
}}

function renderGrid() {{
  const grid = document.getElementById("grid");
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = 1;

  const start = (currentPage - 1) * PAGE_SIZE;
  const slice = filtered.slice(start, start + PAGE_SIZE);

  grid.innerHTML = slice.length
    ? slice.map(buildCard).join("")
    : `<div id="no-results">No words found.</div>`;

  document.getElementById("count-label").textContent =
    `${{total}} word${{total !== 1 ? "s" : ""}}`;
  document.getElementById("showing").textContent =
    total ? `Showing ${{start + 1}}–${{Math.min(start + PAGE_SIZE, total)}} of ${{total}}` : "";

  renderPagination(totalPages);
  window.scrollTo({{ top: 0, behavior: "smooth" }});
}}

function renderPagination(totalPages) {{
  const el = document.getElementById("pagination");
  if (totalPages <= 1) {{ el.innerHTML = ""; return; }}

  let html = `<button class="page-btn" onclick="goPage(${{currentPage - 1}})" ${{currentPage === 1 ? "disabled" : ""}}>‹</button>`;

  const range = new Set([1, totalPages, currentPage]);
  for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) range.add(i);
  const pages = [...range].sort((a,b) => a - b);

  let prev = 0;
  for (const p of pages) {{
    if (p - prev > 1) html += `<span style="color:var(--muted)">…</span>`;
    html += `<button class="page-btn ${{p === currentPage ? "active" : ""}}" onclick="goPage(${{p}})">${{p}}</button>`;
    prev = p;
  }}

  html += `<button class="page-btn" onclick="goPage(${{currentPage + 1}})" ${{currentPage === totalPages ? "disabled" : ""}}>›</button>`;
  el.innerHTML = html;
}}

function goPage(p) {{
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  if (p < 1 || p > totalPages) return;
  currentPage = p;
  renderGrid();
}}

function applyFilters() {{
  const q = searchQuery.toLowerCase();
  filtered = ALL_DATA.filter(e => {{
    const matchP = activePriority === "all" || String(e.priority) === activePriority;
    const matchQ = !q
      || (e.word || "").toLowerCase().includes(q)
      || (e.english || "").toLowerCase().includes(q);
    return matchP && matchQ;
  }});
  currentPage = 1;
  renderGrid();
}}

document.getElementById("search").addEventListener("input", e => {{
  searchQuery = e.target.value;
  applyFilters();
}});

document.querySelectorAll(".fbtn").forEach(btn => {{
  btn.addEventListener("click", () => {{
    document.querySelectorAll(".fbtn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    activePriority = btn.dataset.p;
    applyFilters();
  }});
}});

function toggleEx(btn) {{
  btn.classList.toggle("open");
  btn.nextElementSibling.classList.toggle("open");
}}

let currentAudio = null;
let currentBtn = null;

async function speak(btn, word) {{
  if (btn.classList.contains("loading")) return;

  if (currentAudio) {{
    currentAudio.pause();
    if (currentBtn) {{ currentBtn.classList.remove("playing"); currentBtn.innerHTML = playIcon("Play"); }}
    if (currentBtn === btn) {{ currentAudio = null; currentBtn = null; return; }}
  }}

  btn.classList.add("loading");
  btn.innerHTML = playIcon("Loading…");

  try {{
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${{VOICE_ID}}`, {{
      method: "POST",
      headers: {{
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": API_KEY
      }},
      body: JSON.stringify({{
        text: word,
        model_id: MODEL_ID,
        voice_settings: {{ stability: 0.5, similarity_boost: 0.75 }}
      }})
    }});

    if (!res.ok) throw new Error(`API error ${{res.status}}`);

    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const audio = new Audio(url);

    currentAudio = audio;
    currentBtn   = btn;

    btn.classList.remove("loading");
    btn.classList.add("playing");
    btn.innerHTML = playIcon("Playing…");

    audio.play();
    audio.onended = () => {{
      btn.classList.remove("playing");
      btn.innerHTML = playIcon("Play");
      URL.revokeObjectURL(url);
      currentAudio = null; currentBtn = null;
    }};
  }} catch(err) {{
    btn.classList.remove("loading");
    btn.innerHTML = playIcon("Error");
    setTimeout(() => {{ btn.innerHTML = playIcon("Play"); }}, 2000);
    console.error(err);
  }}
}}

function playIcon(label) {{
  return `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>${{label}}`;
}}

renderGrid();
</script>
</body>
</html>"""

OUTPUT_FILE.write_text(html, encoding="utf-8")
print(f"Done! Generated {OUTPUT_FILE} ({OUTPUT_FILE.stat().st_size // 1024} KB)")
print(f"Open with: python -m http.server 8000  →  http://localhost:8000/{OUTPUT_FILE}")
