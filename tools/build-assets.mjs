// Builds the README images as self-contained SVG files: the two diagrams (English and Indonesian)
// and the badges. Run `npm run assets` after you change any text here.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "assets");
const FONT = "-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const lines = (x, y, step, list, attrs) =>
    `<text x="${x}" y="${y}" ${attrs}>${list.map((l, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : step}">${esc(l)}</tspan>`).join("")}</text>`;

function howItWorks(t) {
    const accents = ["#f59e0b", "#3b82f6", "#10b981", "#a855f7"];
    const xs = [60, 340, 620, 900];
    const cards = t.steps
        .map((s, i) => {
            const x = xs[i];
            return `
  <rect x="${x}" y="140" width="240" height="230" rx="14" fill="#1e293b" stroke="#334155"/>
  <rect x="${x}" y="140" width="240" height="5" rx="2.5" fill="${accents[i]}"/>
  <circle cx="${x + 40}" cy="185" r="18" fill="${accents[i]}"/>
  <text x="${x + 40}" y="191" text-anchor="middle" font-size="17" font-weight="700" fill="#0f172a">${i + 1}</text>
  ${lines(x + 24, 236, 24, s.title, `font-size="19" font-weight="700" fill="#f8fafc"`)}
  ${lines(x + 24, 300, 21, s.body, `font-size="15" fill="#cbd5e1"`)}`;
        })
        .join("");
    const arrows = [0, 1, 2]
        .map((i) => `<line x1="${xs[i] + 246}" y1="255" x2="${xs[i + 1] - 10}" y2="255" stroke="#64748b" stroke-width="2.5" marker-end="url(#arrow)"/>`)
        .join("");
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="450" viewBox="0 0 1200 450" font-family="${FONT}" role="img" aria-label="${esc(t.title)}">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="#64748b"/>
    </marker>
  </defs>
  <rect width="1200" height="450" rx="20" fill="#0f172a"/>
  <text x="60" y="72" font-size="28" font-weight="700" fill="#f8fafc">${esc(t.title)}</text>
  <text x="60" y="104" font-size="16" fill="#94a3b8">${esc(t.subtitle)}</text>
  ${cards}
  ${arrows}
  <path d="M1020,372 L1020,408 L180,408 L180,380" fill="none" stroke="#475569" stroke-width="2" stroke-dasharray="6 6" marker-end="url(#arrow)"/>
  <rect x="${600 - t.loop.length * 4.2}" y="396" width="${t.loop.length * 8.4}" height="24" fill="#0f172a"/>
  <text x="600" y="413" text-anchor="middle" font-size="14" fill="#94a3b8">${esc(t.loop)}</text>
</svg>
`;
}

function sharedMemory(t) {
    const left = [["Claude Code", "#d97706"], ["Codex", "#10b981"], ["opencode", "#64748b"]];
    const right = [["Antigravity", "#3b82f6"], ["Gemini CLI", "#a855f7"], ["Cursor", "#e2e8f0"]];
    const ys = [176, 276, 376];
    const chip = (x, [name, color], cy) => `
  <rect x="${x}" y="${cy - 27}" width="230" height="54" rx="27" fill="#111c33" stroke="${color}" stroke-width="2"/>
  <text x="${x + 115}" y="${cy + 6}" text-anchor="middle" font-size="18" font-weight="600" fill="#f8fafc">${esc(name)}</text>`;
    const chips = left.map((a, i) => chip(80, a, ys[i])).join("") + right.map((a, i) => chip(890, a, ys[i])).join("");
    const wires = ys
        .map(
            (y) => `
  <line x1="312" y1="${y}" x2="410" y2="${y}" stroke="#475569" stroke-width="2" marker-end="url(#arrow)"/>
  <line x1="888" y1="${y}" x2="790" y2="${y}" stroke="#475569" stroke-width="2" marker-end="url(#arrow)"/>`,
        )
        .join("");
    const rows = t.tree
        .map(([name, note, color], i) => {
            const y = 210 + i * 27;
            return `<text x="446" y="${y}" font-family="${MONO}" font-size="15" fill="${color ?? "#e2e8f0"}" xml:space="preserve">${esc(name)}</text>${
                note ? `<text x="640" y="${y}" font-family="${MONO}" font-size="14" fill="#10b981">${esc(note)}</text>` : ""
            }`;
        })
        .join("\n  ");
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="460" viewBox="0 0 1200 460" font-family="${FONT}" role="img" aria-label="${esc(t.title)}">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="#475569"/>
    </marker>
  </defs>
  <rect width="1200" height="460" rx="20" fill="#0f172a"/>
  <text x="60" y="72" font-size="28" font-weight="700" fill="#f8fafc">${esc(t.title)}</text>
  <text x="60" y="104" font-size="16" fill="#94a3b8">${esc(t.subtitle)}</text>
  <rect x="420" y="135" width="360" height="290" rx="14" fill="#1e293b" stroke="#475569"/>
  <text x="446" y="174" font-family="${MONO}" font-size="17" font-weight="700" fill="#f8fafc">${esc(t.repo)}</text>
  <line x1="446" y1="186" x2="754" y2="186" stroke="#334155"/>
  ${rows}
  ${wires}
  ${chips}
</svg>
`;
}

const en = {
    how: {
        title: "How lessons-learned works",
        subtitle: "A simple loop that turns every mistake into a rule all your agents follow.",
        loop: "repeat for every new mistake",
        steps: [
            { title: ["Something goes", "wrong"], body: ["A failed test, a wrong", "command, or your", "correction."] },
            { title: ["The agent writes", "a lesson"], body: ["One file with one rule", "of 20 words or fewer,", "kept in docs/lessons/."] },
            { title: ["Every agent", "reads it first"], body: ["Before each task, any", "agent searches the", "lessons for the topic."] },
            { title: ["The rule moves", "where it belongs"], body: ["After 15 lessons, rules", "fold into AGENTS.md,", "a skill, or a test."] },
        ],
    },
    shared: {
        title: "One memory, every agent",
        subtitle: "Lessons live in your repo, so every tool and every teammate reads the same rules.",
        repo: "your-repo/",
        tree: [
            ["AGENTS.md", "trigger block"],
            ["CLAUDE.md", "trigger block"],
            ["docs/lessons/", null, "#93c5fd"],
            ["  README.md", "index"],
            ["  L001-quote-heredocs.md"],
            ["  L002-vitest-run-once.md"],
            ["  L003-filter-with-t.md"],
            ["  lessons.mjs", "find · check"],
        ],
    },
};
const id = {
    how: {
        title: "Cara kerja lessons-learned",
        subtitle: "Satu putaran sederhana yang mengubah setiap kesalahan jadi aturan untuk semua agent.",
        loop: "berulang untuk setiap kesalahan baru",
        steps: [
            { title: ["Ada yang", "salah"], body: ["Test gagal, perintah", "keliru, atau koreksi", "dari Anda."] },
            { title: ["Agent menulis", "lesson"], body: ["Satu file, satu aturan", "maksimal 20 kata, di", "docs/lessons/."] },
            { title: ["Semua agent", "membacanya dulu"], body: ["Sebelum tugas, agent", "apa pun mencari lesson", "yang relevan."] },
            { title: ["Aturan pindah ke", "tempatnya"], body: ["Lewat 15 lesson, aturan", "masuk ke AGENTS.md,", "skill, atau test."] },
        ],
    },
    shared: {
        title: "Satu ingatan untuk semua agent",
        subtitle: "Lesson tinggal di repo, jadi setiap tool dan rekan tim membaca aturan yang sama.",
        repo: "repo-anda/",
        tree: [
            ["AGENTS.md", "blok pemicu"],
            ["CLAUDE.md", "blok pemicu"],
            ["docs/lessons/", null, "#93c5fd"],
            ["  README.md", "index"],
            ["  L001-quote-heredocs.md"],
            ["  L002-vitest-run-once.md"],
            ["  L003-filter-with-t.md"],
            ["  lessons.mjs", "find · check"],
        ],
    },
};
// Badges in a status-pill style: a full pill, a thin tinted border, a soft tint fill, and uppercase
// heavy text with wide letter spacing. Three green-family tones: success, primary, and warning.
const TONES = {
    success: { ink: "#167249", fill: "#E8F3EE", line: "#B9D8C9" },
    primary: { ink: "#344832", fill: "#EEF4EE", line: "#CAD0CA" },
    warning: { ink: "#8A5900", fill: "#F7EFE0", line: "#E2CC9F" },
};

function badge({ label, value, tone, alt }) {
    const c = TONES[tone];
    const labelWidth = label.length * 7.3;
    const valueWidth = value.length * 7.9;
    const x0 = 26;
    const x1 = x0 + labelWidth + 9;
    const width = Math.ceil(x1 + valueWidth + 14);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="28" viewBox="0 0 ${width} 28" font-family="${FONT}" role="img" aria-label="${esc(alt)}">
  <title>${esc(alt)}</title>
  <rect x="0.5" y="0.5" width="${width - 1}" height="27" rx="13.5" fill="${c.fill}" stroke="${c.line}"/>
  <circle cx="14" cy="14" r="3.5" fill="${c.ink}"/>
  <text x="${x0}" y="18" font-size="10.5" font-weight="700" letter-spacing="1.1" fill="${c.ink}" fill-opacity="0.72" textLength="${labelWidth.toFixed(1)}" lengthAdjust="spacingAndGlyphs">${esc(label)}</text>
  <text x="${x1.toFixed(1)}" y="18" font-size="10.5" font-weight="900" letter-spacing="1.1" fill="${c.ink}" textLength="${valueWidth.toFixed(1)}" lengthAdjust="spacingAndGlyphs">${esc(value)}</text>
</svg>
`;
}

const BADGES = {
    tested: { label: "TESTED", value: "LINUX · MACOS · WINDOWS", tone: "success", alt: "Tested on Linux, macOS, and Windows" },
    license: { label: "LICENSE", value: "MIT", tone: "primary", alt: "License: MIT" },
    dependencies: { label: "DEPENDENCIES", value: "ZERO", tone: "success", alt: "Zero dependencies" },
    node: { label: "NODE", value: "20+", tone: "warning", alt: "Node 20 or later" },
    skill: { label: "AGENT SKILL", value: "AGENTSKILLS.IO", tone: "primary", alt: "Agent Skill format (agentskills.io)" },
};

// "Tested in real projects": one card with a backend row and a frontend row of tool logos.
const ICONS = join(dirname(fileURLToPath(import.meta.url)), "icons");

/** The path data and viewBox of an icon file, so it can be drawn at any size and color. */
function icon(name) {
    const text = readFileSync(join(ICONS, `${name}.svg`), "utf8");
    const [, , , w, h] = /viewBox="([\d.-]+) ([\d.-]+) ([\d.]+) ([\d.]+)"/.exec(text);
    const paths = [...text.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((m) => m[1]);
    return { w: Number(w), h: Number(h), paths };
}

function chipRow(x, y, tools) {
    let cx = x;
    return tools
        .map(([label, name, color]) => {
            const ic = icon(name);
            const size = 22;
            const scale = size / Math.max(ic.w, ic.h);
            const width = 54 + label.length * 8.6;
            const out = `
  <g transform="translate(${cx},${y})">
    <rect width="${width.toFixed(0)}" height="44" rx="22" fill="#ffffff" stroke="#e2e8f0"/>
    <g transform="translate(14,${(22 - (ic.h * scale) / 2).toFixed(1)}) scale(${scale.toFixed(4)})" fill="${color}">${ic.paths.map((d) => `<path d="${d}"/>`).join("")}</g>
    <text x="44" y="28" font-size="15" font-weight="600" fill="#0f172a">${esc(label)}</text>
  </g>`;
            cx += width + 10;
            return out;
        })
        .join("");
}

function testedStacks(t) {
    const backend = [["Bun", "bun", "#000000"], ["Hono", "hono", "#E36002"], ["Rust", "rust", "#000000"], ["PostgreSQL", "postgresql", "#4169E1"], ["Redis", "redis", "#FF4438"], ["Prisma", "prisma", "#2D3748"]];
    const frontend = [["TanStack Start", "tanstack", "#000000"], ["React", "react", "#087EA4"], ["TypeScript", "typescript", "#3178C6"], ["Vite", "vite", "#646CFF"], ["Tailwind CSS", "tailwindcss", "#06B6D4"], ["Vitest", "vitest", "#6E9F18"]];
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="330" viewBox="0 0 1200 330" font-family="${FONT}" role="img" aria-label="${esc(t.title)}">
  <rect width="1200" height="330" rx="20" fill="#f8fafc" stroke="#e2e8f0"/>
  <text x="60" y="66" font-size="26" font-weight="700" fill="#0f172a">${esc(t.title)}</text>
  <text x="60" y="96" font-size="15" fill="#475569">${esc(t.subtitle)}</text>
  <text x="60" y="152" font-size="12" font-weight="800" letter-spacing="1.6" fill="#167249">${esc(t.backend)}</text>
  <text x="60" y="242" font-size="12" font-weight="800" letter-spacing="1.6" fill="#167249">${esc(t.frontend)}</text>
  ${chipRow(200, 124, backend)}
  ${chipRow(200, 214, frontend)}
</svg>
`;
}

writeFileSync(join(OUT, "tested-stacks.svg"), testedStacks({
    title: "Tested in real projects",
    subtitle: "Used every day in three full-stack monorepos with Claude Code, Codex, Antigravity, and opencode.",
    backend: "BACKEND",
    frontend: "FRONTEND",
}));
writeFileSync(join(OUT, "tested-stacks.id.svg"), testedStacks({
    title: "Sudah diuji di project nyata",
    subtitle: "Dipakai setiap hari di tiga monorepo full-stack bersama Claude Code, Codex, Antigravity, dan opencode.",
    backend: "BACKEND",
    frontend: "FRONTEND",
}));

mkdirSync(join(OUT, "badges"), { recursive: true });
for (const [name, spec] of Object.entries(BADGES)) writeFileSync(join(OUT, "badges", `${name}.svg`), badge(spec));

writeFileSync(join(OUT, "how-it-works.svg"), howItWorks(en.how));
writeFileSync(join(OUT, "how-it-works.id.svg"), howItWorks(id.how));
writeFileSync(join(OUT, "shared-memory.svg"), sharedMemory(en.shared));
writeFileSync(join(OUT, "shared-memory.id.svg"), sharedMemory(id.shared));
console.log("ok");
