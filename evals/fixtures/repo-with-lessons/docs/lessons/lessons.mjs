#!/usr/bin/env node
// lessons-learned helper. One file per lesson in the lessons folder, one index row in its README.md.
// Zero dependencies: Node >= 20 built-ins only. Run `node lessons.mjs` for the command list.
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const VERSION = "1.0.0";

export const DEFAULT_AREAS = ["code", "test", "security", "review", "process", "shell", "tooling", "docs"];
export const SOURCES = ["execution", "verify", "review", "security", "browser", "user"];
/** Above this many active lessons, `check` warns that the fold step is due. */
export const DEFAULT_FOLD_THRESHOLD = 15;
/** Where a folded rule may live, and where `audit` looks for citations of a lesson id. */
export const DEFAULT_CITATION_ROOTS = ["AGENTS.md", "CLAUDE.md", "GEMINI.md", ".agents", ".claude", "docs"];

/**
 * @typedef {{ slug: string, title: string, area: string, source: string, keywords: string[], rule: string, date?: string }} LessonInput
 * @typedef {{ id: string, date: string, area: string, rule: string, keywords: string, status: string }} IndexRow
 * @typedef {{ id: string, area: string, rule: string, guard: string, citedIn: string[] }} AuditRow
 */

const INDEX = "README.md";
/** Lesson ids: L001 to L999, then L1000 and up. */
const ID_RE = /^L(\d{3,})$/;
const FILE_RE = /^(L\d{3,})-[a-z0-9-]+\.md$/;
/** A lesson row: six cells, with or without spaces around the pipes. */
const ROW_RE = /^[ \t]*\|\s*(L\d{3,})\s*\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|\s*$/;
/** A line that starts like a lesson row. `check` reports it when ROW_RE does not match. */
const ROW_START_RE = /^[ \t]*\|\s*L\d{3,}\s*\|/;
const SECTIONS = ["Symptom", "Cause", "Rule", "Guard", "Evidence"];
/** Descriptive sentences. A stricter count than 25 leaves room for tokens a reader may split. */
const MAX_WORDS = 22;
/** The rule is an instruction: 20 words. */
const RULE_MAX_WORDS = 20;
/** Index status of a lesson whose rule now lives in another file; its entry file is deleted. */
const FOLDED_RE = /^folded → (\S+)$/;
const SKIP_DIRS = new Set(["node_modules", ".git"]);

/** @param {string[]} ids */
export function nextId(ids) {
    const max = ids
        .map((id) => ID_RE.exec(id)?.[1])
        .filter((n) => n !== undefined)
        .reduce((best, n) => Math.max(best, Number(n)), 0);
    return `L${String(max + 1).padStart(3, "0")}`;
}

function today() {
    return new Date().toISOString().slice(0, 10);
}

/** @param {string} id @param {LessonInput} input */
export function renderEntry(id, input) {
    const date = input.date ?? today();
    return `# ${id} — ${input.title}

Date: ${date} · Area: ${input.area} · Source: ${input.source} · Status: active
Keywords: ${input.keywords.join(", ")}

## Symptom

TODO: what was seen (the command, the error text, the reviewer finding), in one to three sentences.

## Cause

TODO: the root cause, not the place where it was found.

## Rule

${input.rule}

## Guard

TODO: what now stops a repeat: a test, a lint, a skill line, a script check, or "none yet".

## Evidence

TODO: commit, review file, or test name.
`;
}

/** @param {string} dir @returns {IndexRow[]} */
export function readIndexRows(dir) {
    const path = join(dir, INDEX);
    if (!existsSync(path)) return [];
    return readFileSync(path, "utf8")
        .split(/\r?\n/)
        .map((line) => ROW_RE.exec(line))
        .filter((m) => m !== null)
        .map((m) => ({
            id: m[1],
            date: m[2].trim(),
            area: m[3].trim(),
            rule: m[4].trim(),
            keywords: m[5].trim(),
            status: m[6].trim(),
        }));
}

/** The id of an entry file name: `L1000-x.md` gives `L1000`. */
function fileId(file) {
    return FILE_RE.exec(file)?.[1] ?? "";
}

/** @param {string} dir */
function entryFiles(dir) {
    if (!existsSync(dir)) return [];
    return readdirSync(dir).filter((f) => FILE_RE.test(f));
}

/** The line ending a file already uses: CRLF when it has any, else LF. */
function eolOf(text) {
    return text?.includes("\r\n") ? "\r\n" : "\n";
}

/**
 * @param {string} dir @param {LessonInput} input @param {string[]} [areas]
 * @param {string} [root] the repo root; when given, refuse a lessons file that is a symlink outside it
 * @returns {string} the new id
 */
export function createLesson(dir, input, areas = DEFAULT_AREAS, root) {
    if (root) assertLessonsInRepo(root, dir);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(input.slug)) throw new Error(`slug must be kebab-case: ${input.slug}`);
    if (/[|\r\n]/.test(input.area)) throw new Error("area must not contain | or a line break");
    if (!areas.includes(input.area)) throw new Error(`area must be one of ${areas.join(", ")}`);
    if (!SOURCES.includes(input.source)) throw new Error(`source must be one of ${SOURCES.join(", ")}`);
    // A `|` or a line break would split the index row, and `check` would then lose the lesson.
    if (/[|\r\n]/.test(input.rule)) throw new Error("rule must not contain | or a line break");
    if (input.keywords.some((k) => /[|\r\n]/.test(k))) throw new Error("keywords must not contain | or a line break");
    if (/[\r\n]/.test(input.title)) throw new Error("title must not contain a line break");
    const ids = [...readIndexRows(dir).map((r) => r.id), ...entryFiles(dir).map(fileId)];
    const id = nextId(ids);
    const date = input.date ?? today();
    const entry = join(dir, `${id}-${input.slug}.md`);
    // A file can exist without its index row (a hand edit). Never write over it.
    if (existsSync(entry)) throw new Error(`${id}-${input.slug}.md already exists; fix the index, then run new again`);
    writeFileSync(entry, renderEntry(id, { ...input, date }));
    const indexPath = join(dir, INDEX);
    const index = existsSync(indexPath) ? readFileSync(indexPath, "utf8") : "";
    const eol = eolOf(index);
    const row = `| ${id} | ${date} | ${input.area} | ${input.rule} | ${input.keywords.join(", ")} | active |${eol}`;
    writeFileSync(indexPath, index.endsWith("\n") || index === "" ? index + row : `${index}${eol}${row}`);
    return id;
}

/** @param {string} dir @param {string[]} keywords */
export function findRows(dir, keywords) {
    const needles = keywords.map((k) => k.toLowerCase());
    return readIndexRows(dir).filter((row) => {
        const hay = `${row.area} ${row.rule} ${row.keywords}`.toLowerCase();
        return needles.some((n) => hay.includes(n));
    });
}

/**
 * The prose sentences of an entry. Headings, the meta lines, and table rows are not prose. A blank line or a
 * list item ends a sentence, so a list of short items is not read as one long sentence.
 * @param {string} text
 */
function sentences(text) {
    const paragraphs = [];
    let current = [];
    const flush = () => {
        if (current.length > 0) paragraphs.push(current.join(" "));
        current = [];
    };
    for (const line of text.replace(/```[\s\S]*?```/g, "").split("\n")) {
        const trimmed = line.trim();
        if (trimmed === "" || /^(#|\||Date:|Keywords:|Retired:)/.test(trimmed)) {
            flush();
            continue;
        }
        if (/^([-*+]|\d+\.)\s/.test(trimmed)) flush();
        current.push(trimmed);
    }
    flush();
    return paragraphs
        .map((p) => p.replace(/`[^`]*`/g, "x"))
        .flatMap((p) => p.split(/(?<=[.!?])\s+/))
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
}

/** True when `text` names `id` as a whole token: `(L001)` matches; `L0010`, `L001a`, `xL001` do not. */
export function citesId(text, id) {
    return new RegExp(`(?<![A-Za-z0-9])${id}(?![A-Za-z0-9])`).test(text);
}

/**
 * @param {string} dir the lessons folder
 * @param {{ root?: string, areas?: string[], foldThreshold?: number }} [opts] `root` is the repo root; folded destinations are relative to it.
 */
export function checkLessons(dir, opts = {}) {
    const root = opts.root ?? join(dir, "..", "..");
    const areas = opts.areas ?? DEFAULT_AREAS;
    const foldThreshold = opts.foldThreshold ?? DEFAULT_FOLD_THRESHOLD;
    const errors = [];
    const warnings = [];
    const rows = readIndexRows(dir);
    const files = entryFiles(dir);
    const fileIds = new Set(files.map(fileId));
    const rowIds = new Set(rows.map((r) => r.id));

    const indexPath = join(dir, INDEX);
    if (existsSync(indexPath)) {
        for (const line of readFileSync(indexPath, "utf8").split(/\r?\n/)) {
            if (ROW_START_RE.test(line) && !ROW_RE.test(line)) {
                errors.push(`${/L\d{3,}/.exec(line)?.[0]}: index row does not have 6 cells: ${line.trim()}`);
            }
        }
    }
    // Two branches can each add the same id. After the merge, both survive until someone renumbers one.
    for (const [what, ids] of [["index rows", rows.map((r) => r.id)], ["entry files", files.map(fileId)]]) {
        const counts = new Map();
        for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
        for (const [id, n] of counts) if (n > 1) errors.push(`${id}: id used by ${n} ${what}; renumber all but one`);
    }
    for (const row of rows) {
        if (!areas.includes(row.area)) errors.push(`${row.id}: unknown area ${row.area}`);
        const folded = FOLDED_RE.exec(row.status);
        if (folded) {
            if (fileIds.has(row.id)) errors.push(`${row.id}: folded, so delete its entry file`);
            const target = folded[1];
            const path = join(root, target);
            if (!insideRepo(root, target) || !realInsideRepo(root, path)) {
                errors.push(`${row.id}: folded destination must be inside the repo: ${target}`);
            } else if (!existsSync(path)) {
                errors.push(`${row.id}: folded destination ${target} does not exist`);
            } else if (!citesId(readFileSync(path, "utf8"), row.id)) {
                // The id is the trace from the index to the rule; without it an edit can drop the rule unseen.
                errors.push(`${row.id}: folded destination ${target} does not cite ${row.id}`);
            }
            continue;
        }
        if (!fileIds.has(row.id)) errors.push(`${row.id}: index row without an entry file`);
        if (!["active", "retired"].includes(row.status)) {
            errors.push(`${row.id}: status must be active, retired, or "folded → <path>"`);
        }
    }
    const active = rows.filter((r) => r.status === "active").length;
    if (active > foldThreshold) {
        warnings.push(`${active} active lessons (fold threshold ${foldThreshold}): run the fold step (lessons-learned skill → Fold)`);
    }
    for (const file of files) {
        const id = fileId(file);
        if (!rowIds.has(id)) errors.push(`${id}: entry file without an index row`);
        const text = readFileSync(join(dir, file), "utf8").replace(/\r\n/g, "\n");
        if (text.includes("TODO")) errors.push(`${id}: TODO text left in ${file}`);
        for (const section of SECTIONS) {
            if (!new RegExp(`\\n## ${section}[ \\t]*\\n`).test(text)) errors.push(`${id}: section "${section}" missing in ${file}`);
        }
        // Case-sensitive: `/Users/` is a macOS home, `/users/` is usually an API route.
        if (/\/Users\/|\/home\/|[A-Z]:\\Users\\/.test(text)) warnings.push(`${id}: private path in ${file}`);
        const rule = /\n## Rule[ \t]*\n([\s\S]*?)\n## Guard[ \t]*\n/.exec(text)?.[1]?.trim() ?? "";
        const indexed = rows.find((r) => r.id === id);
        if (indexed && indexed.rule !== rule) errors.push(`${id}: index rule differs from the entry rule in ${file}`);
        const ruleWords = rule.split(/\s+/).filter(Boolean).length;
        if (ruleWords > RULE_MAX_WORDS) errors.push(`${id}: rule has ${ruleWords} words (max ${RULE_MAX_WORDS}) in ${file}`);
        if (rule.includes("\n\n")) errors.push(`${id}: rule must be one paragraph in ${file}`);
        for (const sentence of sentences(text)) {
            const words = sentence.split(/\s+/).length;
            if (words > MAX_WORDS) errors.push(`${id}: long sentence (${words} words) in ${file}`);
        }
    }
    return { errors, warnings };
}

/**
 * True when `path` (relative to `root`) stays inside the repo and below its root. Every path that comes
 * from a file (a trigger block, config.json, an index row) passes this check before the script reads or writes it.
 */
export function insideRepo(root, path) {
    if (typeof path !== "string" || path === "" || isAbsolute(path) || /^[A-Za-z]:/.test(path)) return false;
    const relPath = rel(root, resolve(root, path));
    return relPath !== "" && !relPath.startsWith("..") && !isAbsolute(relPath);
}

/**
 * Characters a lessons folder may use. The folder goes into shell commands in the trigger block, so a
 * character a shell treats as special (`$`, `;`, a backtick, a quote, a space) would run code.
 */
const SAFE_DIR_RE = /^[A-Za-z0-9._/-]+$/;

/**
 * True when the real path of `path` (or of its nearest existing parent) is inside the real repo root.
 * This catches a symlink that points outside the repo.
 */
export function realInsideRepo(root, path) {
    let existing = path;
    while (!existsSync(existing)) {
        const parent = dirname(existing);
        if (parent === existing) return false;
        existing = parent;
    }
    const realRoot = realpathSync(root);
    const relPath = relative(realRoot, realpathSync(existing));
    return !relPath.startsWith("..") && !isAbsolute(relPath);
}

/**
 * Throw unless the lessons folder and every file in it stay inside the repo. Run it before any command
 * that writes, so a symlinked file cannot send a write outside the repo.
 */
export function assertLessonsInRepo(root, dir) {
    const dirRel = rel(root, dir);
    if (!realInsideRepo(root, dir)) throw new Error(`${dirRel} resolves outside the repo (a symlink); the script does not write there`);
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
        if (!realInsideRepo(root, join(dir, name))) {
            throw new Error(`${dirRel}/${name} resolves outside the repo (a symlink); the script does not write there`);
        }
    }
}

/** Repo-relative path with forward slashes, so output reads the same on every OS. */
export function rel(root, path) {
    return relative(root, path).split(sep).join("/");
}

// ---- Paths and config ----

/** Agent instruction files that may hold the trigger block. */
export const INSTRUCTION_FILES = ["AGENTS.md", "CLAUDE.md", "GEMINI.md"];
export const MARK_START = "<!-- lessons-learned:start -->";
export const MARK_END = "<!-- lessons-learned:end -->";
export const DEFAULT_DIR = "docs/lessons";
const CONFIG = "config.json";

/**
 * @typedef {{ version: string, dir?: string, fold: "ask" | "auto", areas: string[], trigger: "installed" | "declined" | "undecided", targets: string[], foldThreshold: number, citationRoots: string[] }} Config
 */

export class ConfigError extends Error {}

/** The nearest ancestor of `start` that holds `.git`, else `start` itself. */
export function findRoot(start) {
    let current = start;
    for (;;) {
        if (existsSync(join(current, ".git"))) return current;
        const parent = dirname(current);
        if (parent === current) return start;
        current = parent;
    }
}

/**
 * The lessons folder config. Without `config.json`, the defaults, with every area the index already uses,
 * so `check` does not fail on a repo that predates the config file.
 * @param {string} dir @returns {Config}
 */
export function readConfig(dir) {
    const path = join(dir, CONFIG);
    /** @type {Partial<Config>} */
    let stored = {};
    if (existsSync(path)) {
        try {
            stored = JSON.parse(readFileSync(path, "utf8"));
        } catch (error) {
            throw new ConfigError(`${CONFIG}: invalid JSON (${error.message})`);
        }
    }
    validateConfig(stored);
    const indexAreas = readIndexRows(dir).map((r) => r.area);
    return {
        ...stored,
        version: stored.version ?? VERSION,
        areas: stored.areas ?? [...new Set([...DEFAULT_AREAS, ...indexAreas])],
        trigger: stored.trigger ?? "undecided",
        targets: stored.targets ?? [],
        foldThreshold: stored.foldThreshold ?? DEFAULT_FOLD_THRESHOLD,
        fold: stored.fold ?? "ask",
        citationRoots: stored.citationRoots ?? DEFAULT_CITATION_ROOTS,
    };
}

/** Throw a ConfigError naming the key when stored config has the wrong shape. Unknown keys are allowed. */
function validateConfig(stored) {
    const fail = (message) => {
        throw new ConfigError(`${CONFIG}: ${message}`);
    };
    if (stored === null || typeof stored !== "object" || Array.isArray(stored)) fail("must be a JSON object");
    for (const key of ["areas", "targets", "citationRoots"]) {
        const value = stored[key];
        if (value !== undefined && !(Array.isArray(value) && value.every((v) => typeof v === "string"))) {
            fail(`${key} must be a list of strings`);
        }
    }
    if (stored.areas?.some((a) => /[|\r\n]/.test(a))) fail("areas must not contain | or a line break");
    if (stored.targets?.some((name) => !INSTRUCTION_FILES.includes(name))) {
        fail(`targets must be ${INSTRUCTION_FILES.slice(0, -1).join(", ")}, or ${INSTRUCTION_FILES.at(-1)}`);
    }
    // `.` is not inside the repo by `insideRepo`, but searching the whole repo for citations is fine.
    if (stored.citationRoots?.some((p) => p !== "." && !insideRepo(".", p))) fail("citationRoots must be paths inside the repo");
    if (stored.foldThreshold !== undefined && typeof stored.foldThreshold !== "number") fail("foldThreshold must be a number");
    if (stored.fold !== undefined && !["ask", "auto"].includes(stored.fold)) fail("fold must be ask or auto");
    if (stored.dir !== undefined && typeof stored.dir !== "string") fail("dir must be a string");
    if (stored.trigger !== undefined && !["installed", "declined", "undecided"].includes(stored.trigger)) {
        fail("trigger must be installed, declined, or undecided");
    }
}

/** @param {string} dir @param {Config} cfg */
export function writeConfig(dir, cfg) {
    writeFileSync(join(dir, CONFIG), `${JSON.stringify(cfg, null, 2)}\n`);
}

/** The lessons folder named in a trigger block (`node <dir>/lessons.mjs`), or null. Text outside the markers is ignored. */
export function dirFromBlock(text) {
    const start = text.indexOf(MARK_START);
    const end = text.indexOf(MARK_END, start);
    if (start < 0 || end < 0) return null;
    const named = /node (\S+)\/lessons\.mjs/.exec(text.slice(start, end))?.[1] ?? null;
    return named !== null && SAFE_DIR_RE.test(named) ? named : null;
}

/**
 * Where the lessons live: `--dir`, else this script's own folder when it is the repo copy (it sits next to
 * `config.json`), else the folder a trigger block names, else `docs/lessons`.
 * @param {{ argDir?: string, root: string, scriptDir: string }} opts @returns {string} an absolute path
 */
export function resolveDir({ argDir, root, scriptDir }) {
    if (argDir) return resolve(root, argDir);
    if (existsSync(join(scriptDir, CONFIG))) return scriptDir;
    for (const name of INSTRUCTION_FILES) {
        const path = join(root, name);
        if (!existsSync(path)) continue;
        const named = dirFromBlock(readFileSync(path, "utf8"));
        // A hand-edited block must not point the script outside the repo.
        if (named && insideRepo(root, named)) return resolve(root, named);
    }
    return join(root, DEFAULT_DIR);
}

// ---- Trigger block and init ----

/** The always-on block for agent instruction files. Every command names `dirRel`, so any agent can run it. */
export function renderBlock(dirRel) {
    return `${MARK_START}
## Lessons learned

This repo records agent mistakes as lessons in \`${dirRel}/\` so they do not repeat.

- Before you start a task, run \`node ${dirRel}/lessons.mjs find <keywords>\`. Read every hit.
- After a mistake, record a lesson before the next task. A mistake is an error, a blocked or retried command, a failed check, or a user correction.
- To record a lesson, use the \`lessons-learned\` skill. Without the skill, run \`node ${dirRel}/lessons.mjs new\` and fill the five sections.
- Before you report a task as done, run \`node ${dirRel}/lessons.mjs check\`. End the report with \`Lessons: L0NN | none — <reason>\`.
- Gate commits on the check: \`node ${dirRel}/lessons.mjs check && git commit ...\`.
- When \`status\` or \`check\` prints \`fold: due\`, run the fold from the \`lessons-learned\` skill. In mode \`ask\`, show the fold table and wait for approval.
${MARK_END}`;
}

/**
 * Put `block` into `text`: replace the span between the markers, or append it. Text outside the markers is
 * never touched, and the file's line ending (LF or CRLF) is kept.
 * @param {string | null} text current file text, or null when the file does not exist
 * @param {string} block @param {string} file name used in errors
 */
export function upsertBlock(text, block, file) {
    const eol = eolOf(text);
    const body = block.replace(/\r?\n/g, eol);
    if (text === null || text === "") return body + eol;
    const start = text.indexOf(MARK_START);
    if (start < 0) {
        // Keep every user byte. Add only the line breaks needed for one blank line before the block.
        const breaks = text.endsWith(eol + eol) ? "" : text.endsWith(eol) ? eol : eol + eol;
        return text + breaks + body + eol;
    }
    const end = text.indexOf(MARK_END, start);
    if (end < 0) throw new Error(`${file}: start marker without end marker; fix the file by hand, then run init again`);
    return text.slice(0, start) + body + text.slice(end + MARK_END.length);
}

/** Compare numeric x.y.z versions: -1, 0, or 1. */
export function compareVersions(a, b) {
    const pa = a.split(".").map(Number);
    const pb = b.split(".").map(Number);
    for (let i = 0; i < 3; i++) {
        const d = (pa[i] ?? 0) - (pb[i] ?? 0);
        if (d !== 0) return d < 0 ? -1 : 1;
    }
    return 0;
}

/** The `VERSION` a lessons.mjs file declares, or null when the file or the line is missing. */
export function fileVersion(path) {
    if (!existsSync(path)) return null;
    return /export const VERSION = "(\d+\.\d+\.\d+)"/.exec(readFileSync(path, "utf8"))?.[1] ?? null;
}

function renderIndex(dirRel) {
    return `# Lessons learned

Mistakes and incidents that must not repeat, one rule each. Agents read this index before work starts, and
each rule also moves to the file an agent reads at the moment of the mistake (\`lessons-learned\` skill → Fold).

Find: \`node ${dirRel}/lessons.mjs find <keyword> ...\`
Check: \`node ${dirRel}/lessons.mjs check\`

A row with status \`folded → <file>\` has no entry file any more: its rule lives in that file.

## Index

| ID | Date | Area | Rule | Keywords | Status |
|---|---|---|---|---|---|
`;
}

/**
 * Set up a lessons folder and the trigger block. Safe to run again: it never overwrites the index or a lesson,
 * only replaces text between its own markers, and only updates an older script copy.
 * @param {{ root: string, dir: string, targets: string[], noHook: boolean, areas?: string[], fold?: "ask" | "auto", scriptPath: string }} opts
 * @returns {{ created: string[], updated: string[], unchanged: string[] }} repo-relative paths
 */
export function initLessons({ root, dir, targets, noHook, areas, fold, scriptPath }) {
    const dirRel = rel(root, dir);
    if (dirRel === "" || dirRel.startsWith("..") || isAbsolute(dirRel)) {
        throw new Error(`lessons folder must be inside the repo, below its root: ${dirRel || "."}`);
    }
    if (/\s/.test(dirRel)) throw new Error(`lessons folder must not contain spaces: ${dirRel}`);
    if (!SAFE_DIR_RE.test(dirRel)) {
        throw new Error(`lessons folder may use only letters, digits, ".", "_", "-", and "/": ${dirRel}`);
    }
    if (!realInsideRepo(root, dir)) throw new Error(`${dirRel} resolves outside the repo (a symlink); choose a real folder`);
    if (areas?.some((a) => /[|\r\n]/.test(a))) throw new Error("area must not contain | or a line break");
    // Each file init may write must also stay in the repo: a symlinked file inside a real folder is a second way out.
    for (const name of [INDEX, CONFIG, "lessons.mjs"]) {
        if (!realInsideRepo(root, join(dir, name))) throw new Error(`${dirRel}/${name} resolves outside the repo (a symlink); init does not write there`);
    }
    // Never adopt a folder that holds other files: init would overwrite its config.json and README.md.
    if (existsSync(dir) && readdirSync(dir).length > 0 && !isLessonsFolder(dir)) {
        throw new Error(`${dirRel} is not a lessons folder (no lessons config.json or index); choose an empty or new folder`);
    }
    const copy = join(dir, "lessons.mjs");
    const copyVersion = fileVersion(copy);
    if (existsSync(copy) && copyVersion === null && resolve(copy) !== resolve(scriptPath)) {
        throw new Error(`${dirRel}/lessons.mjs is not the lessons-learned script; move it away, then run init again`);
    }
    for (const name of noHook ? [] : targets) {
        if (!INSTRUCTION_FILES.includes(name)) throw new Error(`target must be one of ${INSTRUCTION_FILES.join(", ")}: ${name}`);
        if (!realInsideRepo(root, join(root, name))) throw new Error(`${name} resolves outside the repo (a symlink); init does not write there`);
    }
    const cfg = readConfig(dir);
    const result = { created: [], updated: [], unchanged: [] };
    /** Write `text` to `path` when it differs, and record what happened. */
    const put = (path, text) => {
        const old = existsSync(path) ? readFileSync(path, "utf8") : null;
        const bucket = old === null ? result.created : old === text ? result.unchanged : result.updated;
        bucket.push(rel(root, path));
        if (old !== text) writeFileSync(path, text);
    };
    // Read every target before writing anything, so a broken marker stops init with no change made.
    const blocks = noHook
        ? []
        : targets.map((name) => {
              const path = join(root, name);
              const old = existsSync(path) ? readFileSync(path, "utf8") : null;
              return { path, text: upsertBlock(old, renderBlock(dirRel), name) };
          });

    mkdirSync(dir, { recursive: true });
    const index = join(dir, INDEX);
    if (existsSync(index)) result.unchanged.push(rel(root, index));
    else put(index, renderIndex(dirRel));

    if (areas) cfg.areas = areas;
    if (fold) cfg.fold = fold;
    cfg.version = VERSION;
    cfg.dir = dirRel;
    cfg.trigger = noHook ? "declined" : "installed";
    cfg.targets = noHook ? [] : targets;
    put(join(dir, CONFIG), `${JSON.stringify(cfg, null, 2)}\n`);

    if (resolve(copy) === resolve(scriptPath) || (copyVersion && compareVersions(copyVersion, VERSION) >= 0)) {
        result.unchanged.push(rel(root, copy));
    } else {
        put(copy, readFileSync(scriptPath, "utf8"));
    }

    for (const { path, text } of blocks) put(path, text);
    return result;
}

/** True when `dir` already holds a lessons config, index, or script copy, so init may adopt it. */
function isLessonsFolder(dir) {
    if (fileVersion(join(dir, "lessons.mjs")) !== null) return true;
    if (existsSync(join(dir, CONFIG))) {
        try {
            const stored = JSON.parse(readFileSync(join(dir, CONFIG), "utf8"));
            if (stored && typeof stored === "object" && ("foldThreshold" in stored || "trigger" in stored)) return true;
        } catch {
            // An invalid config.json is reported by readConfig, with a clearer message.
            return true;
        }
    }
    const index = join(dir, INDEX);
    return existsSync(index) && readFileSync(index, "utf8").includes("| ID | Date | Area | Rule | Keywords | Status |");
}

/** Every `.md` file under `path`, skipping `skip`, `node_modules`, and `.git`. */
function listMarkdown(path, skip) {
    if (!existsSync(path) || path === skip || isSkillCopy(path)) return [];
    if (statSync(path).isFile()) return path.endsWith(".md") ? [path] : [];
    return readdirSync(path, { withFileTypes: true }).flatMap((d) =>
        // A symlinked folder is either a second path to files already listed or a loop.
        SKIP_DIRS.has(d.name) || (d.isSymbolicLink() && statSync(join(path, d.name), { throwIfNoEntry: false })?.isDirectory())
            ? []
            : listMarkdown(join(path, d.name), skip),
    );
}

/** An installed copy of this skill: its own examples cite lesson ids, but they are not the repo's rules. */
function isSkillCopy(path) {
    return existsSync(join(path, "SKILL.md")) && existsSync(join(path, "scripts", "lessons.mjs"));
}

/**
 * One row per active lesson: its guard text and the files that cite its id.
 * @param {string} dir @param {{ root?: string, citationRoots?: string[] }} [opts] @returns {AuditRow[]}
 */
export function auditLessons(dir, opts = {}) {
    const root = opts.root ?? join(dir, "..", "..");
    const roots = opts.citationRoots ?? DEFAULT_CITATION_ROOTS;
    const files = entryFiles(dir);
    const seen = new Set();
    const sources = roots
        .flatMap((r) => listMarkdown(join(root, r), dir))
        .filter((f) => {
            const real = realpathSync(f);
            return !seen.has(real) && seen.add(real);
        })
        .map((f) => ({ path: rel(root, f), text: readFileSync(f, "utf8") }));
    return readIndexRows(dir)
        .filter((row) => row.status === "active")
        .map((row) => {
            const file = files.find((f) => fileId(f) === row.id);
            const text = file ? readFileSync(join(dir, file), "utf8").replace(/\r\n/g, "\n") : "";
            const guard = /\n## Guard[ \t]*\n([\s\S]*?)\n## Evidence[ \t]*\n/.exec(text)?.[1]?.trim().replace(/\s+/g, " ") ?? "";
            const citedIn = sources.filter((s) => citesId(s.text, row.id)).map((s) => s.path);
            return { id: row.id, area: row.area, rule: row.rule, guard, citedIn };
        });
}

// ---- Status and CLI ----

/**
 * The fold line `status` and `check` print. The mode tells the agent what to do: `ask` shows the fold
 * table and waits for approval; `auto` applies it once the user said yes to automatic folds at setup.
 */
export function foldLine(dir, cfg) {
    const active = readIndexRows(dir).filter((r) => r.status === "active").length;
    return active > cfg.foldThreshold
        ? `fold: due (${active} active, threshold ${cfg.foldThreshold}, mode ${cfg.fold})`
        : `fold: not due (${active} active, threshold ${cfg.foldThreshold})`;
}

/**
 * Fold one lesson after its rule is written into the owner file: check that the owner cites the id,
 * delete the entry file, and mark the index row `folded → <owner>`. Nothing changes when a check fails.
 * @param {{ root: string, dir: string, id: string, to: string }} opts
 * @returns {{ deleted: string, folded: string }}
 */
export function foldLesson({ root, dir, id, to }) {
    assertLessonsInRepo(root, dir);
    const matches = readIndexRows(dir).filter((r) => r.id === id);
    if (matches.length > 1 || entryFiles(dir).filter((f) => fileId(f) === id).length > 1) {
        throw new Error(`${id} is used more than once; renumber one of them, then fold`);
    }
    const row = matches[0];
    if (!row) throw new Error(`${id} is not in the index`);
    if (row.status !== "active") throw new Error(`${id} is ${row.status}, not active`);
    // The path goes into an index cell, and `check` reads it back as one token, so keep it simple.
    if (!SAFE_DIR_RE.test(to)) throw new Error(`owner file path may use only letters, digits, ".", "_", "-", and "/": ${to}`);
    if (!insideRepo(root, to) || !realInsideRepo(root, join(root, to))) throw new Error(`owner file must be inside the repo: ${to}`);
    const owner = resolve(root, to);
    const ownerRel = rel(root, owner);
    if (!existsSync(owner)) throw new Error(`${ownerRel} does not exist`);
    // Compare real paths: a symlink outside the folder can still point at a file inside it.
    if (!relative(realpathSync(dir), realpathSync(owner)).startsWith("..")) {
        throw new Error(`owner file must be outside the lessons folder: ${ownerRel}`);
    }
    if (!citesId(readFileSync(owner, "utf8"), id)) {
        throw new Error(`${ownerRel} does not cite ${id}; write the rule there with "(${id})" first`);
    }
    const file = entryFiles(dir).find((f) => fileId(f) === id);
    const indexPath = join(dir, INDEX);
    const index = readFileSync(indexPath, "utf8");
    const lines = index.split(/(?<=\n)/);
    const at = lines.findIndex((line) => ROW_RE.exec(line.replace(/\r?\n$/, ""))?.[1] === id);
    const eol = /\r?\n$/.exec(lines[at])?.[0] ?? "";
    lines[at] = lines[at].replace(/\r?\n$/, "").replace(/\|[^|]*\|\s*$/, `| folded → ${ownerRel} |`) + eol;
    writeFileSync(indexPath, lines.join(""));
    if (file) unlinkSync(join(dir, file));
    return { deleted: file ? rel(root, join(dir, file)) : "(no entry file)", folded: `${id} → ${ownerRel}` };
}

/**
 * One `key: value` line per fact the agent needs to decide whether setup is due.
 * @param {{ root: string, dir: string, scriptPath: string }} opts
 */
export function statusLines({ root, dir, scriptPath }) {
    const hasIndex = existsSync(join(dir, INDEX));
    const hasConfig = existsSync(join(dir, CONFIG));
    const cfg = readConfig(dir);
    const files = INSTRUCTION_FILES.map((name) => {
        const path = join(root, name);
        if (!existsSync(path)) return `file ${name}: absent`;
        return `file ${name}: ${readFileSync(path, "utf8").includes(MARK_START) ? "block" : "no block"}`;
    });
    const skill = fileVersion(scriptPath) ?? VERSION;
    const copy = fileVersion(join(dir, "lessons.mjs"));
    let script;
    if (copy === null) script = "missing";
    else if (compareVersions(copy, skill) < 0) script = `outdated (copy ${copy}, skill ${skill}) — run init to update`;
    else if (compareVersions(copy, skill) > 0) script = `newer (copy ${copy}, skill ${skill})`;
    else script = `current (${copy})`;
    const needed = !hasIndex || cfg.trigger === "undecided" || copy === null;
    const outdated = copy !== null && compareVersions(copy, skill) < 0;
    return [
        `lessons-learned ${VERSION}`,
        `dir: ${rel(root, dir)}`,
        `index: ${hasIndex ? "present" : "missing"}`,
        `config: ${hasConfig ? "present" : "missing"}`,
        `trigger: ${cfg.trigger}`,
        ...files,
        `script: ${script}`,
        foldLine(dir, cfg),
        `setup: ${needed ? "needed" : outdated ? "update" : "done"}`,
    ];
}

const COMMANDS = "commands: status | init | new | find | check | audit | fold";
const USAGE_NEW = "usage: lessons.mjs new --slug <kebab> --title <t> --area <a> --source <s> --rule <r> --keywords a,b";

function arg(args, name) {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : undefined;
}

function list(value) {
    return (value ?? "").split(",").map((v) => v.trim()).filter(Boolean);
}

/** Positional words, without `--flag value` pairs and bare `--flag`s. */
function positional(args) {
    const out = [];
    for (let i = 0; i < args.length; i++) {
        if (args[i] === "--no-hook") continue;
        if (args[i].startsWith("--")) i++;
        else out.push(args[i]);
    }
    return out;
}

/**
 * The repo root seen from the repo copy, so it works from any working directory and without `.git`
 * (a Docker build context, a CI cache): its folder minus the stored `dir`, else the nearest `.git` above it.
 * Null for the skill copy.
 */
export function copyRoot(scriptDir) {
    if (!existsSync(join(scriptDir, CONFIG))) return null;
    // The `dir` that init stored is the anchor. It wins over the nearest `.git`, so a project inside a
    // bigger git repo (a monorepo, a fixture) keeps its own root.
    const stored = readConfig(scriptDir).dir;
    if (typeof stored === "string" && stored !== "") {
        const depth = stored.split("/").filter(Boolean).length;
        const root = resolve(scriptDir, ...Array(depth).fill(".."));
        if (rel(root, scriptDir) === stored) return root;
    }
    return findRoot(scriptDir);
}

/** @returns {number} the exit code */
function main(argv) {
    const [command, ...rest] = argv;
    const scriptPath = fileURLToPath(import.meta.url);
    const scriptDir = dirname(scriptPath);
    const argDir = arg(rest, "dir");
    const root = (!argDir && copyRoot(scriptDir)) || findRoot(process.cwd());
    const dir = resolveDir({ argDir, root, scriptDir });
    const dirRel = rel(root, dir);

    if (command === "status") {
        for (const line of statusLines({ root, dir, scriptPath })) console.log(line);
        return 0;
    }
    if (command === "init") {
        let noHook = rest.includes("--no-hook");
        let targets = list(arg(rest, "targets"));
        if (!noHook && targets.length === 0) {
            // A rerun (for example to update an outdated copy) keeps the user's earlier answer.
            const stored = readConfig(dir);
            if (stored.trigger === "declined") noHook = true;
            if (stored.trigger === "installed") targets = stored.targets;
        }
        if (!noHook && targets.length === 0) {
            console.error("usage: lessons.mjs init --targets AGENTS.md,CLAUDE.md | --no-hook [--dir <path>] [--areas a,b] [--fold ask|auto]");
            return 2;
        }
        const areas = list(arg(rest, "areas"));
        const fold = arg(rest, "fold");
        if (fold !== undefined && !["ask", "auto"].includes(fold)) throw new Error(`--fold must be ask or auto: ${fold}`);
        const result = initLessons({ root, dir, targets, noHook, areas: areas.length ? areas : undefined, fold, scriptPath });
        for (const [label, paths] of Object.entries(result)) for (const p of paths) console.log(`${label}: ${p}`);
        return 0;
    }
    const cfg = readConfig(dir);
    if (command === "new") {
        const keywords = list(arg(rest, "keywords"));
        const input = {
            slug: arg(rest, "slug"),
            title: arg(rest, "title"),
            area: arg(rest, "area"),
            source: arg(rest, "source"),
            rule: arg(rest, "rule"),
            keywords,
        };
        if (Object.values(input).some((v) => !v) || keywords.length === 0) {
            console.error(USAGE_NEW);
            return 2;
        }
        if (!existsSync(join(dir, INDEX))) throw new Error(`no index at ${dirRel}/${INDEX}: run init first`);
        const id = createLesson(dir, input, cfg.areas, root);
        console.log(`${id} created: ${dirRel}/${id}-${input.slug}.md (fill the TODO lines, then run check)`);
        return 0;
    }
    if (command === "find") {
        const words = positional(rest);
        if (words.length === 0) {
            console.error("usage: lessons.mjs find <keyword> [<keyword> ...]");
            return 2;
        }
        const rows = findRows(dir, words);
        if (rows.length === 0) console.log("lessons: no match");
        for (const row of rows) {
            const folded = FOLDED_RE.exec(row.status);
            const where = folded ? ` → read ${folded[1]}` : "";
            // A retired rule is wrong now. Say so before the rule, so an agent that reads one line stops there.
            const label = row.status === "retired" ? " (retired: do not follow)" : "";
            console.log(`${row.id} [${row.area}]${label} ${row.rule} (${row.keywords})${where}`);
        }
        return 0;
    }
    if (command === "check") {
        const { errors, warnings } = checkLessons(dir, { root, areas: cfg.areas, foldThreshold: cfg.foldThreshold });
        // The fold warning is printed as the `fold:` line below, so skip it here.
        for (const w of warnings.filter((w) => !w.includes("fold threshold"))) console.log(`warning: ${w}`);
        for (const e of errors) console.error(`error: ${e}`);
        console.log(foldLine(dir, cfg));
        console.log(errors.length === 0 ? `lessons: ok (${entryFiles(dir).length} entries)` : `lessons: ${errors.length} error(s)`);
        return errors.length === 0 ? 0 : 1;
    }
    if (command === "audit") {
        const rows = auditLessons(dir, { root, citationRoots: cfg.citationRoots });
        console.log(`lessons: ${rows.length} active (fold threshold ${cfg.foldThreshold})`);
        for (const row of rows) {
            console.log(`\n${row.id} [${row.area}] ${row.rule}`);
            console.log(`  guard: ${row.guard || "none"}`);
            console.log(`  cited in: ${row.citedIn.length > 0 ? row.citedIn.join(", ") : "none"}`);
        }
        return 0;
    }
    if (command === "fold") {
        const [id] = positional(rest);
        const to = arg(rest, "to");
        if (!id || !to) {
            console.error("usage: lessons.mjs fold <L0NN> --to <owner file>   (write the rule with (L0NN) in the owner file first)");
            return 2;
        }
        const result = foldLesson({ root, dir, id, to });
        console.log(`deleted: ${result.deleted}`);
        console.log(`folded: ${result.folded}`);
        const { errors } = checkLessons(dir, { root, areas: cfg.areas, foldThreshold: cfg.foldThreshold });
        for (const e of errors) console.error(`error: ${e}`);
        console.log(foldLine(dir, cfg));
        return errors.length === 0 ? 0 : 1;
    }
    console.error(COMMANDS);
    return 2;
}

/** True when this file is the entry point. Compare real paths: a symlinked folder (macOS `/var`) gives two spellings. */
function isMain() {
    if (!process.argv[1]) return false;
    try {
        return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
    } catch {
        return false;
    }
}

if (isMain()) {
    try {
        process.exitCode = main(process.argv.slice(2));
    } catch (error) {
        // Expected failures (bad config, bad input, broken marker) get one line, not a stack trace.
        console.error(`error: ${error.message}`);
        process.exitCode = 2;
    }
}
