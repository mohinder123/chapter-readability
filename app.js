import {
  analyzeChapter,
  labelGrade,
  labelReadingEase,
} from "./readability.js";

const input = /** @type {HTMLTextAreaElement} */ (document.getElementById("chapter-input"));
const analyzeBtn = /** @type {HTMLButtonElement} */ (document.getElementById("analyze-btn"));
const sampleBtn = /** @type {HTMLButtonElement} */ (document.getElementById("sample-btn"));
const charHint = document.getElementById("char-hint");
const results = document.getElementById("results");
const emptyState = document.getElementById("empty-state");
const scoresEl = document.getElementById("scores");
const hardList = document.getElementById("hard-list");
const manuscript = document.getElementById("manuscript");

const SAMPLE = `The morning had the kind of silence that makes you notice your own breathing. Mara stepped onto the porch and watched the river flatten into glass.

She had not slept. The letter lay on the kitchen table, its creases soft from being unfolded and refolded until the paper felt like cloth. "You will understand when you arrive," it said, which was either kindness or cruelty depending on how much faith you still had in other people's intentions.

What she understood, standing there with coffee cooling in her hand, was that understanding rarely arrives as a lightning strike. More often it accumulates—the way sediment builds in a bend of the river, invisible until the channel shifts and old foundations suddenly stand in daylight, exposed and accusatory, asking questions you cannot answer without admitting you had seen the cracks for years and chosen, repeatedly, to call them character instead of damage.

She went inside, locked the door, and began to pack.`;

function updateHint() {
  const t = input.value;
  const words = t.trim() ? t.trim().split(/\s+/).length : 0;
  charHint.textContent = `${t.length.toLocaleString()} characters · ${words.toLocaleString()} words`;
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * @param {import("./readability.js").SentenceStat[]} hardest
 * @param {Set<number>} hardestStarts
 * @param {import("./readability.js").SentenceStat[]} sentencesInOrder
 * @param {string} chapter
 */
function renderManuscript(hardest, hardestStarts, sentencesInOrder, chapter) {
  if (!chapter.trim()) {
    manuscript.textContent = "";
    return;
  }

  const rankByStart = new Map(hardest.map((s, i) => [s.start, i + 1]));
  const spans = sentencesInOrder;

  let html = "";
  let cursor = 0;

  for (const s of spans) {
    if (s.start > cursor) {
      html += escapeHtml(chapter.slice(cursor, s.start));
    }
    const chunk = chapter.slice(s.start, s.end);
    if (hardestStarts.has(s.start)) {
      const rank = rankByStart.get(s.start) ?? 0;
      html += `<mark class="hard" data-rank="${rank}" title="Hardest sentence #${rank}">${escapeHtml(chunk)}</mark>`;
    } else {
      html += escapeHtml(chunk);
    }
    cursor = s.end;
  }
  if (cursor < chapter.length) {
    html += escapeHtml(chapter.slice(cursor));
  }

  manuscript.innerHTML = html.replace(/\n/g, "<br>");
}

function renderScores(analysis) {
  const ease = analysis.fleschReadingEase;
  const grade = analysis.fleschKincaidGrade;

  scoresEl.innerHTML = `
    <div class="score-card primary">
      <span class="score-label">Flesch reading ease</span>
      <span class="score-value">${ease.toFixed(1)}</span>
      <span class="score-meta">${labelReadingEase(ease)} · higher is easier</span>
    </div>
    <div class="score-card">
      <span class="score-label">Grade level (FK)</span>
      <span class="score-value">${grade.toFixed(1)}</span>
      <span class="score-meta">${labelGrade(grade)} · U.S. school years</span>
    </div>
    <div class="score-card">
      <span class="score-label">Words</span>
      <span class="score-value">${analysis.words.toLocaleString()}</span>
      <span class="score-meta">${analysis.sentenceCount.toLocaleString()} sentences</span>
    </div>
  `;
}

/**
 * @param {import("./readability.js").SentenceStat[]} hardest
 */
function renderHardList(hardest) {
  hardList.innerHTML = "";
  if (hardest.length === 0) {
    hardList.innerHTML = `<li class="muted">Add more text — need at least a few multi-word sentences to rank difficulty.</li>`;
    return;
  }

  for (const s of hardest) {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="hard-rank">${hardList.children.length + 1}</span>
      <div class="hard-body">
        <p class="hard-text">${escapeHtml(s.text)}</p>
        <p class="hard-stats">${s.words} words · ~${s.syllables} syllables · FK ~${s.fkGrade.toFixed(1)}</p>
      </div>
    `;
    hardList.appendChild(li);
  }
}

function runAnalysis() {
  const chapter = input.value;
  if (!chapter.trim()) {
    results.classList.add("hidden");
    emptyState.classList.remove("hidden");
    return;
  }

  const analysis = analyzeChapter(chapter);
  renderScores(analysis);
  renderHardList(analysis.hardest);
  renderManuscript(
    analysis.hardest,
    analysis.hardestStarts,
    analysis.sentencesInOrder,
    chapter,
  );

  emptyState.classList.add("hidden");
  results.classList.remove("hidden");
}

input.addEventListener("input", updateHint);
analyzeBtn.addEventListener("click", runAnalysis);
sampleBtn.addEventListener("click", () => {
  input.value = SAMPLE;
  updateHint();
  runAnalysis();
});

input.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    runAnalysis();
  }
});

updateHint();
