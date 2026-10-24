import { afterEach, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "lessons.mjs");

import {
    auditLessons,
    checkLessons,
    citesId,
    compareVersions,
    createLesson,
    DEFAULT_AREAS,
    DEFAULT_FOLD_THRESHOLD,
    dirFromBlock,
    findRoot,
    findRows,
    initLessons,
    nextId,
    readConfig,
    readIndexRows,
    rel,
    renderBlock,
    renderEntry,
    resolveDir,
    statusLines,
    upsertBlock,
    VERSION,
    writeConfig,
} from "./lessons.mjs";

const FOLD_THRESHOLD = DEFAULT_FOLD_THRESHOLD;
const INDEX_HEAD = "# Lessons\n\n## Index\n\n| ID | Date | Area | Rule | Keywords | Status |\n|---|---|---|---|---|---|\n";

let dir;

beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "lessons-"));
    writeFileSync(join(dir, "README.md"), INDEX_HEAD);
});

afterEach(() => rmSync(dir, { recursive: true, force: true }));

const input = {
    slug: "quote-heredocs",
    title: "Quote the heredoc delimiter",
    area: "shell",
    source: "execution",
    keywords: ["heredoc", "backtick"],
    date: "2026-10-20",
    rule: "Quote the heredoc delimiter when the text holds backticks.",
};

function completed(id = "L001", slug = "quote-heredocs") {
    const file = join(dir, `${id}-${slug}.md`);
    writeFileSync(file, readFileSync(file, "utf8").replaceAll("TODO", "Done"));
    return file;
}

function foldL001(target) {
    unlinkSync(join(dir, "L001-quote-heredocs.md"));
    const readme = join(dir, "README.md");
    writeFileSync(readme, readFileSync(readme, "utf8").replace("| active |", `| folded → ${target} |`));
}

test("nextId starts at L001 and follows the highest id", () => {
    assert.equal(nextId([]), "L001");
    assert.equal(nextId(["L001", "L007", "L003"]), "L008");
});

test("createLesson writes the file and one index row", () => {
    const id = createLesson(dir, input);

    assert.equal(id, "L001");
    const entry = readFileSync(join(dir, "L001-quote-heredocs.md"), "utf8");
    assert.ok(entry.includes("# L001 — Quote the heredoc delimiter"));
    assert.ok(entry.includes("Area: shell"));
    assert.ok(entry.includes("## Symptom"));
    const index = readFileSync(join(dir, "README.md"), "utf8");
    assert.ok(
        index.includes(
            "| L001 | 2026-10-20 | shell | Quote the heredoc delimiter when the text holds backticks. | heredoc, backtick | active |",
        ),
    );
});

test("createLesson refuses an unknown area and a slug that is not kebab-case", () => {
    assert.throws(() => createLesson(dir, { ...input, area: "misc" }), /area/);
    assert.throws(() => createLesson(dir, { ...input, slug: "Bad Slug" }), /slug/);
});

test("createLesson accepts an area from the given list and refuses one outside it", () => {
    assert.equal(createLesson(dir, { ...input, area: "frontend" }, [...DEFAULT_AREAS, "frontend"]), "L001");
    assert.throws(() => createLesson(dir, { ...input, slug: "other", area: "frontend" }), /area must be one of/);
});

test("a fresh entry fails the check until the TODO text is replaced", () => {
    createLesson(dir, input);

    const problems = checkLessons(dir).errors;

    assert.ok(problems.some((p) => p.includes("TODO")));
});

test("a completed entry passes the check", () => {
    createLesson(dir, input);
    completed();

    assert.deepEqual(checkLessons(dir).errors, []);
});

test("checkLessons flags a row whose area is not in opts.areas", () => {
    createLesson(dir, { ...input, area: "frontend" }, [...DEFAULT_AREAS, "frontend"]);
    completed();

    const { errors } = checkLessons(dir, { root: dir, areas: DEFAULT_AREAS });

    assert.ok(errors.some((e) => e.includes("L001: unknown area frontend")));
});

test("the check finds an entry without an index row and a row without an entry", () => {
    createLesson(dir, input);
    const file = completed();
    writeFileSync(join(dir, "L002-orphan.md"), readFileSync(file, "utf8").replace("L001", "L002"));
    const readme = join(dir, "README.md");
    writeFileSync(readme, readFileSync(readme, "utf8") + "| L009 | 2026-10-20 | shell | Ghost. | x | active |\n");

    const errors = checkLessons(dir).errors.join("\n");

    assert.ok(errors.includes("L002"));
    assert.ok(errors.includes("L009"));
});

test("a long sentence fails the check; a private path only warns", () => {
    createLesson(dir, input);
    const file = join(dir, "L001-quote-heredocs.md");
    const long = "word ".repeat(30).trim() + ".";
    writeFileSync(file, readFileSync(file, "utf8").replaceAll("TODO", `See /Users/someone/x. ${long}`));

    const result = checkLessons(dir);

    assert.ok(result.errors.join("\n").includes("long sentence"));
    assert.ok(result.warnings.join("\n").includes("private path"));
});

test("a rule over 20 words fails the check", () => {
    createLesson(dir, { ...input, rule: "word ".repeat(21).trim() + "." });
    completed();

    assert.ok(checkLessons(dir).errors.join("\n").includes("rule has 21 words"));
});

test("an index rule that differs from the entry rule fails the check", () => {
    createLesson(dir, input);
    const file = join(dir, "L001-quote-heredocs.md");
    writeFileSync(file, readFileSync(file, "utf8").replaceAll("TODO", "Done").replace(input.rule, "Another rule."));

    assert.ok(checkLessons(dir).errors.join("\n").includes("index rule differs"));
});

test("findRows matches any keyword in the row, ignoring case", () => {
    createLesson(dir, input);
    createLesson(dir, { ...input, slug: "second", title: "Second", keywords: ["vitest"], rule: "Run the vitest filter." });

    assert.deepEqual(findRows(dir, ["HEREDOC"]).map((r) => r.id), ["L001"]);
    assert.deepEqual(findRows(dir, ["vitest", "backtick"]).map((r) => r.id), ["L001", "L002"]);
    assert.deepEqual(findRows(dir, ["nothing"]), []);
});

test("renderEntry keeps the five sections in order", () => {
    const text = renderEntry("L001", input);
    const heads = [...text.matchAll(/^## (.+)$/gm)].map((m) => m[1]);

    assert.deepEqual(heads, ["Symptom", "Cause", "Rule", "Guard", "Evidence"]);
});

test("a folded row needs no entry file and an existing destination", () => {
    createLesson(dir, input);
    completed();
    writeFileSync(join(dir, "SKILL.md"), "Quote the heredoc delimiter (L001).\n");
    foldL001("SKILL.md");

    assert.deepEqual(checkLessons(dir, { root: dir }).errors, []);
});

test("citesId accepts the id as a whole token only", () => {
    for (const text of ["(L001)", "see L001, then", "rule L001.", "L001"]) assert.equal(citesId(text, "L001"), true);
    for (const text of ["L0010", "L001a", "xL001", "L00"]) assert.equal(citesId(text, "L001"), false);
});

test("a folded row fails when its destination does not cite the lesson id", () => {
    // An edit that drops the folded line leaves the index pointing at a file without the rule.
    createLesson(dir, input);
    completed();
    writeFileSync(join(dir, "SKILL.md"), "Quote the heredoc delimiter. See L0010.\n");
    foldL001("SKILL.md");

    assert.ok(
        checkLessons(dir, { root: dir }).errors.join("\n").includes("L001: folded destination SKILL.md does not cite L001"),
    );
});

test("a folded row fails when its destination is gone or its entry file is left", () => {
    createLesson(dir, input);
    completed();
    foldL001("missing/SKILL.md");
    writeFileSync(join(dir, "L001-quote-heredocs.md"), "left over\n");

    const errors = checkLessons(dir, { root: dir }).errors.join("\n");

    assert.ok(errors.includes("folded destination missing/SKILL.md does not exist"));
    assert.ok(errors.includes("folded, so delete its entry file"));
});

test("a folded id is never given out again", () => {
    createLesson(dir, input);
    completed();
    writeFileSync(join(dir, "SKILL.md"), "x (L001)\n");
    foldL001("SKILL.md");

    assert.equal(createLesson(dir, { ...input, slug: "next" }), "L002");
});

test("find points a folded lesson to its destination row", () => {
    createLesson(dir, input);
    completed();
    writeFileSync(join(dir, "SKILL.md"), "x (L001)\n");
    foldL001("SKILL.md");

    assert.deepEqual(findRows(dir, ["heredoc"]).map((r) => r.status), ["folded → SKILL.md"]);
});

test("the check does not warn at the threshold, and counts only active rows", () => {
    for (let i = 0; i < FOLD_THRESHOLD + 2; i++) {
        const id = createLesson(dir, { ...input, slug: `lesson-${i}` });
        completed(id, `lesson-${i}`);
    }
    writeFileSync(join(dir, "SKILL.md"), "x (L001)\n");
    const readme = join(dir, "README.md");
    unlinkSync(join(dir, "L001-lesson-0.md"));
    writeFileSync(
        readme,
        readFileSync(readme, "utf8")
            .replace(/(\| L001 \|.*)\| active \|/, "$1| folded → SKILL.md |")
            .replace(/(\| L002 \|.*)\| active \|/, "$1| retired |"),
    );

    const result = checkLessons(dir, { root: dir });

    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.warnings, []);
});

test("the check warns when active lessons pass the fold threshold", () => {
    for (let i = 0; i <= FOLD_THRESHOLD; i++) {
        const id = createLesson(dir, { ...input, slug: `lesson-${i}` });
        completed(id, `lesson-${i}`);
    }

    const result = checkLessons(dir, { root: dir });

    assert.deepEqual(result.errors, []);
    assert.ok(result.warnings.join("\n").includes(`${FOLD_THRESHOLD + 1} active lessons`));
});

test("audit lists the guard and the skill files that cite each active lesson", () => {
    createLesson(dir, input);
    const file = completed();
    writeFileSync(file, readFileSync(file, "utf8").replace(/## Guard\n\n[^\n]*/, "## Guard\n\nA line in the shell skill."));
    mkdirSync(join(dir, ".agents", "skills", "shell"), { recursive: true });
    writeFileSync(join(dir, ".agents", "skills", "shell", "SKILL.md"), "Quote it (L001).\n");
    writeFileSync(join(dir, "AGENTS.md"), "No citation here, only L0010 and XL001.\n");

    const rows = auditLessons(dir, { root: dir, citationRoots: [".agents", "AGENTS.md"] });

    assert.deepEqual(rows, [
        {
            id: "L001",
            area: "shell",
            rule: input.rule,
            guard: "A line in the shell skill.",
            citedIn: [".agents/skills/shell/SKILL.md"],
        },
    ]);
});

// ---- Task 2: config, root, folder resolution ----

test("findRoot returns the ancestor that holds .git, from a nested directory", () => {
    mkdirSync(join(dir, ".git"));
    mkdirSync(join(dir, "a", "b"), { recursive: true });

    assert.equal(findRoot(join(dir, "a", "b")), dir);
    rmSync(join(dir, ".git"), { recursive: true });
    const lone = mkdtempSync(join(tmpdir(), "lone-"));
    try {
        assert.equal(findRoot(lone), lone);
    } finally {
        rmSync(lone, { recursive: true, force: true });
    }
});

test("rel prints repo-relative paths with forward slashes", () => {
    assert.equal(rel(dir, join(dir, "docs", "lessons", "README.md")), "docs/lessons/README.md");
});

test("readConfig without config.json seeds areas from defaults plus index rows", () => {
    writeFileSync(join(dir, "README.md"), INDEX_HEAD + "| L001 | 2026-10-20 | frontend | Rule. | x | active |\n");

    const cfg = readConfig(dir);

    assert.ok(cfg.areas.includes("code"));
    assert.ok(cfg.areas.includes("frontend"));
    assert.equal(cfg.trigger, "undecided");
    assert.equal(cfg.foldThreshold, 15);
});

test("readConfig reads a written config back", () => {
    writeConfig(dir, { ...readConfig(dir), areas: ["code", "infra"], trigger: "declined" });

    const cfg = readConfig(dir);

    assert.deepEqual(cfg.areas, ["code", "infra"]);
    assert.equal(cfg.trigger, "declined");
    assert.ok(readFileSync(join(dir, "config.json"), "utf8").endsWith("}\n"));
});

test("readConfig throws ConfigError naming config.json on invalid JSON", () => {
    writeFileSync(join(dir, "config.json"), "{ nope");

    assert.throws(() => readConfig(dir), /config\.json: invalid JSON/);
});

test("dirFromBlock reads the folder from a marker block and ignores text outside it", () => {
    const text = [
        "Run `node outside/lessons.mjs find x` here.",
        "<!-- lessons-learned:start -->",
        "- Before you start, run `node notes/lessons/lessons.mjs find <keywords>`.",
        "<!-- lessons-learned:end -->",
    ].join("\n");

    assert.equal(dirFromBlock(text), "notes/lessons");
    assert.equal(dirFromBlock("Run `node outside/lessons.mjs find x`."), null);
});

test("resolveDir order: argDir, repo copy, marker block, docs/lessons", () => {
    const scriptDir = join(dir, "skill", "scripts");
    mkdirSync(scriptDir, { recursive: true });

    assert.equal(resolveDir({ root: dir, scriptDir }), join(dir, "docs", "lessons"));

    writeFileSync(
        join(dir, "CLAUDE.md"),
        "<!-- lessons-learned:start -->\n`node notes/lessons/lessons.mjs check`\n<!-- lessons-learned:end -->\n",
    );
    assert.equal(resolveDir({ root: dir, scriptDir }), join(dir, "notes", "lessons"));

    writeFileSync(join(scriptDir, "config.json"), "{}");
    assert.equal(resolveDir({ root: dir, scriptDir }), scriptDir);

    assert.equal(resolveDir({ argDir: "custom", root: dir, scriptDir }), join(dir, "custom"));
});

// ---- Task 3: trigger block and init ----

const BLOCK = renderBlock("docs/lessons");
const MARK_START_TEXT = "<!-- lessons-learned:start -->";

function freshRepo() {
    const root = mkdtempSync(join(tmpdir(), "repo-"));
    mkdirSync(join(root, ".git"));
    return root;
}

test("renderBlock names the lessons folder in every command", () => {
    const block = renderBlock("notes/ll");
    const commands = [...block.matchAll(/`node ([^`]*)`/g)].map((m) => m[1]);

    assert.ok(block.startsWith("<!-- lessons-learned:start -->"));
    assert.ok(block.endsWith("<!-- lessons-learned:end -->"));
    assert.ok(commands.length >= 3);
    for (const c of commands) assert.ok(c.startsWith("notes/ll/lessons.mjs "), c);
    assert.equal(dirFromBlock(block), "notes/ll");
});

test("upsertBlock appends to text without markers and keeps the user text", () => {
    const out = upsertBlock("# My rules\n\nBe nice.\n", BLOCK, "AGENTS.md");

    assert.equal(out, `# My rules\n\nBe nice.\n\n${BLOCK}\n`);
    assert.equal(upsertBlock(null, BLOCK, "AGENTS.md"), `${BLOCK}\n`);
});

test("upsertBlock replaces only the marked span; text before and after is byte-identical", () => {
    const before = "# Rules\n\nKeep  two  spaces.\n\n";
    const after = "\n\n## Later\n\ttab line\n";
    const old = "<!-- lessons-learned:start -->\nold text\n<!-- lessons-learned:end -->";

    const out = upsertBlock(before + old + after, BLOCK, "AGENTS.md");

    assert.equal(out, before + BLOCK + after);
});

test("upsertBlock run twice gives the same text", () => {
    const once = upsertBlock("# Rules\n", BLOCK, "AGENTS.md");

    assert.equal(upsertBlock(once, BLOCK, "AGENTS.md"), once);
});

test("upsertBlock keeps CRLF line endings and does not duplicate the block on rerun", () => {
    const once = upsertBlock("# Rules\r\n\r\nBe nice.\r\n", BLOCK, "AGENTS.md");
    const twice = upsertBlock(once, BLOCK, "AGENTS.md");

    assert.equal(twice, once);
    assert.equal(once.split(MARK_START_TEXT).length - 1, 1);
    assert.equal(/(?<!\r)\n/.test(once), false);
});

test("upsertBlock throws naming the file when the start marker has no end marker", () => {
    assert.throws(
        () => upsertBlock("# Rules\n<!-- lessons-learned:start -->\nhalf\n", BLOCK, "AGENTS.md"),
        /AGENTS\.md: start marker without end marker/,
    );
});

test("compareVersions orders x.y.z numerically", () => {
    assert.equal(compareVersions("0.9.0", "1.0.0"), -1);
    assert.equal(compareVersions("1.10.0", "1.9.9"), 1);
    assert.equal(compareVersions("1.0.0", "1.0.0"), 0);
});

test("initLessons on an empty repo creates the index, config, script copy, and both target blocks", () => {
    const root = freshRepo();
    try {
        const result = initLessons({
            root,
            dir: join(root, "docs", "lessons"),
            targets: ["AGENTS.md", "CLAUDE.md"],
            noHook: false,
            scriptPath: SCRIPT,
        });

        assert.deepEqual(result.created.sort(), [
            "AGENTS.md",
            "CLAUDE.md",
            "docs/lessons/README.md",
            "docs/lessons/config.json",
            "docs/lessons/lessons.mjs",
        ]);
        assert.equal(readConfig(join(root, "docs", "lessons")).trigger, "installed");
        assert.ok(readFileSync(join(root, "AGENTS.md"), "utf8").includes("node docs/lessons/lessons.mjs find"));
        assert.ok(readFileSync(join(root, "docs", "lessons", "README.md"), "utf8").includes("| ID | Date | Area | Rule | Keywords | Status |"));
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test("initLessons twice reports everything unchanged on the second run", () => {
    const root = freshRepo();
    try {
        const opts = { root, dir: join(root, "docs", "lessons"), targets: ["AGENTS.md"], noHook: false, scriptPath: SCRIPT };
        initLessons(opts);
        const second = initLessons(opts);

        assert.deepEqual(second.created, []);
        assert.deepEqual(second.updated, []);
        assert.ok(second.unchanged.includes("AGENTS.md"));
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test("initLessons with noHook records declined and writes no instruction file", () => {
    const root = freshRepo();
    try {
        initLessons({ root, dir: join(root, "docs", "lessons"), targets: ["AGENTS.md"], noHook: true, scriptPath: SCRIPT });

        const cfg = readConfig(join(root, "docs", "lessons"));
        assert.equal(cfg.trigger, "declined");
        assert.deepEqual(cfg.targets, []);
        assert.equal(existsSync(join(root, "AGENTS.md")), false);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test("initLessons leaves a non-target instruction file untouched", () => {
    const root = freshRepo();
    try {
        writeFileSync(join(root, "GEMINI.md"), "# Gemini\n");
        initLessons({ root, dir: join(root, "docs", "lessons"), targets: ["AGENTS.md"], noHook: false, scriptPath: SCRIPT });

        assert.equal(readFileSync(join(root, "GEMINI.md"), "utf8"), "# Gemini\n");
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test("initLessons refuses a lessons folder with spaces", () => {
    const root = freshRepo();
    try {
        assert.throws(
            () => initLessons({ root, dir: join(root, "my lessons"), targets: ["AGENTS.md"], noHook: false, scriptPath: SCRIPT }),
            /lessons folder must not contain spaces/,
        );
        assert.equal(existsSync(join(root, "AGENTS.md")), false);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test("initLessons keeps an existing README.md index and seeds areas from its rows", () => {
    const root = freshRepo();
    const lessons = join(root, "docs", "lessons");
    try {
        mkdirSync(lessons, { recursive: true });
        const index = INDEX_HEAD + "| L001 | 2026-10-20 | frontend | Rule. | x | active |\n";
        writeFileSync(join(lessons, "README.md"), index);

        initLessons({ root, dir: lessons, targets: ["AGENTS.md"], noHook: false, scriptPath: SCRIPT });

        assert.equal(readFileSync(join(lessons, "README.md"), "utf8"), index);
        assert.ok(readConfig(lessons).areas.includes("frontend"));
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test("initLessons --areas replaces the area list", () => {
    const root = freshRepo();
    const lessons = join(root, "docs", "lessons");
    try {
        initLessons({ root, dir: lessons, targets: ["AGENTS.md"], noHook: false, areas: ["api", "web"], scriptPath: SCRIPT });

        assert.deepEqual(readConfig(lessons).areas, ["api", "web"]);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test("initLessons replaces an older script copy and keeps a newer one", () => {
    const root = freshRepo();
    const lessons = join(root, "docs", "lessons");
    const copy = join(lessons, "lessons.mjs");
    const opts = { root, dir: lessons, targets: ["AGENTS.md"], noHook: false, scriptPath: SCRIPT };
    try {
        mkdirSync(lessons, { recursive: true });
        writeFileSync(copy, 'export const VERSION = "0.9.0";\n');
        assert.ok(initLessons(opts).updated.includes("docs/lessons/lessons.mjs"));
        assert.ok(readFileSync(copy, "utf8").includes(`export const VERSION = "${VERSION}"`));

        writeFileSync(copy, 'export const VERSION = "9.0.0";\n');
        assert.ok(initLessons(opts).unchanged.includes("docs/lessons/lessons.mjs"));
        assert.equal(readFileSync(copy, "utf8"), 'export const VERSION = "9.0.0";\n');
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

// ---- Task 4: status and the CLI ----

/** Run the skill script as a CLI. */
function run(args, cwd, script = SCRIPT) {
    const r = spawnSync(process.execPath, [script, ...args], { cwd, encoding: "utf8" });
    return { code: r.status, stdout: r.stdout, stderr: r.stderr };
}

function withRepo(fn) {
    const root = freshRepo();
    try {
        fn(root);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
}

const fill = (path) => writeFileSync(path, readFileSync(path, "utf8").replaceAll("TODO", "Done"));

test("status on an empty repo reports setup needed and the script missing", () => {
    withRepo((root) => {
        const lines = statusLines({ root, dir: join(root, "docs", "lessons"), scriptPath: SCRIPT });

        assert.equal(lines[0], `lessons-learned ${VERSION}`);
        assert.ok(lines.includes("dir: docs/lessons"));
        assert.ok(lines.includes("index: missing"));
        assert.ok(lines.includes("trigger: undecided"));
        assert.ok(lines.includes("file AGENTS.md: absent"));
        assert.ok(lines.includes("script: missing"));
        assert.equal(lines.at(-1), "setup: needed");
    });
});

test("status after init reports setup done, both target files with a block, script current", () => {
    withRepo((root) => {
        assert.equal(run(["init", "--targets", "AGENTS.md,CLAUDE.md"], root).code, 0);

        const { code, stdout } = run(["status"], root);

        assert.equal(code, 0);
        for (const line of [
            "index: present",
            "config: present",
            "trigger: installed",
            "file AGENTS.md: block",
            "file CLAUDE.md: block",
            "file GEMINI.md: absent",
            `script: current (${VERSION})`,
            "setup: done",
        ]) {
            assert.ok(stdout.includes(`${line}\n`), line);
        }
    });
});

test("status reports an outdated repo copy with the fix", () => {
    withRepo((root) => {
        run(["init", "--targets", "AGENTS.md"], root);
        writeFileSync(join(root, "docs", "lessons", "lessons.mjs"), 'export const VERSION = "0.9.0";\n');

        const { stdout } = run(["status"], root);

        assert.ok(stdout.includes(`script: outdated (copy 0.9.0, skill ${VERSION}) — run init to update\n`));
    });
});

test("status after a declined trigger reports setup done", () => {
    withRepo((root) => {
        run(["init", "--no-hook"], root);

        const { stdout } = run(["status"], root);

        assert.ok(stdout.includes("trigger: declined\n"));
        assert.ok(stdout.includes("setup: done\n"));
    });
});

test("CLI init then new then check exits 0 after the TODO lines are filled", () => {
    withRepo((root) => {
        run(["init", "--targets", "AGENTS.md"], root);
        const created = run(
            ["new", "--slug", "quote-heredocs", "--title", "Quote heredocs", "--area", "shell", "--source", "execution",
                "--rule", "Quote the heredoc delimiter when the text holds backticks.", "--keywords", "heredoc,backtick"],
            root,
        );
        assert.equal(created.code, 0);
        assert.ok(created.stdout.includes("L001 created: docs/lessons/L001-quote-heredocs.md"));

        assert.equal(run(["check"], root).code, 1);
        fill(join(root, "docs", "lessons", "L001-quote-heredocs.md"));
        const checked = run(["check"], root);

        assert.equal(checked.code, 0, checked.stderr);
        assert.ok(checked.stdout.includes("lessons: ok (1 entries)"));
        assert.ok(run(["find", "HEREDOC"], root).stdout.includes("L001 [shell]"));
        assert.ok(run(["audit"], root).stdout.includes("L001 [shell]"));
    });
});

test("CLI new refuses an area outside config.json", () => {
    withRepo((root) => {
        run(["init", "--no-hook", "--areas", "api,web"], root);

        const r = run(["new", "--slug", "x", "--title", "X", "--area", "shell", "--source", "user", "--rule", "Do x.", "--keywords", "x"], root);

        assert.equal(r.code, 2);
        assert.ok(r.stderr.includes("error: area must be one of api, web"));
    });
});

test("CLI run from a nested directory finds the repo root and prints repo-relative paths", () => {
    withRepo((root) => {
        mkdirSync(join(root, "src", "deep"), { recursive: true });

        const r = run(["init", "--targets", "AGENTS.md"], join(root, "src", "deep"));

        assert.equal(r.code, 0, r.stderr);
        assert.ok(existsSync(join(root, "docs", "lessons", "README.md")));
        assert.ok(existsSync(join(root, "AGENTS.md")));
        assert.ok(r.stdout.includes("created: docs/lessons/README.md"));
        assert.equal(r.stdout.includes(root), false);
    });
});

test("CLI on invalid config.json exits 2 with the config error and no stack trace", () => {
    withRepo((root) => {
        mkdirSync(join(root, "docs", "lessons"), { recursive: true });
        writeFileSync(join(root, "docs", "lessons", "config.json"), "{ nope");

        const r = run(["check"], root);

        assert.equal(r.code, 2);
        assert.ok(r.stderr.includes("error: config.json: invalid JSON"));
        assert.equal(r.stderr.includes("    at "), false);
    });
});

test("CLI init on a broken marker exits 2 and changes nothing", () => {
    withRepo((root) => {
        writeFileSync(join(root, "AGENTS.md"), "# Rules\n<!-- lessons-learned:start -->\nhalf\n");

        const r = run(["init", "--targets", "AGENTS.md"], root);

        assert.equal(r.code, 2);
        assert.ok(r.stderr.includes("AGENTS.md: start marker without end marker"));
        assert.equal(existsSync(join(root, "docs")), false);
    });
});

test("CLI unknown command exits 2 and lists the commands", () => {
    withRepo((root) => {
        const r = run(["nope"], root);

        assert.equal(r.code, 2);
        assert.ok(r.stderr.includes("commands: status | init | new | find | check | audit"));
    });
});

test("the repo copy resolves its own folder without --dir", () => {
    withRepo((root) => {
        assert.equal(run(["init", "--dir", "notes/lessons", "--no-hook"], root).code, 0);

        const r = run(["check"], root, join(root, "notes", "lessons", "lessons.mjs"));

        assert.equal(r.code, 0, r.stderr);
        assert.ok(r.stdout.includes("lessons: ok (0 entries)"));
    });
});

test("the skill copy finds a custom folder through the trigger block", () => {
    withRepo((root) => {
        run(["init", "--dir", "notes/lessons", "--targets", "CLAUDE.md"], root);

        assert.ok(run(["status"], root).stdout.includes("dir: notes/lessons\n"));
    });
});

// ---- Skill metadata ----

/** The frontmatter block of a SKILL.md, read the same way from an LF or a CRLF checkout. */
function frontmatter(text) {
    return /^---\n([\s\S]*?)\n---\n/.exec(text.replace(/\r\n/g, "\n"))?.[1] ?? "";
}

test("frontmatter reads a CRLF checkout of SKILL.md", () => {
    const text = readFileSync(join(dirname(SCRIPT), "..", "SKILL.md"), "utf8").replace(/\n/g, "\r\n");

    assert.match(frontmatter(text), /^name: lessons-learned$/m);
});

test("SKILL.md frontmatter keeps a plain-scalar-safe description and matches the folder name", () => {
    const text = readFileSync(join(dirname(SCRIPT), "..", "SKILL.md"), "utf8");
    const front = frontmatter(text);

    assert.match(front, /^name: lessons-learned$/m);
    // A one-line description with ": " breaks strict YAML parsers; the block scalar form is safe.
    assert.match(front, /^description: >-\n/m);
    const description = /^description: >-\n((?: {2}.*\n?)+)/m.exec(front)?.[1].replace(/\s+/g, " ").trim() ?? "";
    assert.ok(description.length > 0 && description.length <= 1024, `${description.length} chars`);
    assert.ok(text.split("\n").length < 500);
    assert.match(front, new RegExp(`version: "${VERSION.replace(/\./g, "\\.")}"`));
});

test("the trigger block names the new command, for agents without the skill", () => {
    assert.ok(renderBlock("docs/lessons").includes("`node docs/lessons/lessons.mjs new"));
});

test("references/agent-files.md shows the exact block init writes", () => {
    const doc = readFileSync(join(dirname(SCRIPT), "..", "references", "agent-files.md"), "utf8");

    assert.ok(doc.includes(renderBlock("docs/lessons")));
});

// ---- Final review fixes ----

const initOpts = (root, dir, extra = {}) => ({ root, dir, targets: ["AGENTS.md"], noHook: false, scriptPath: SCRIPT, ...extra });

test("initLessons refuses the repo root and a folder outside the repo", () => {
    withRepo((root) => {
        assert.throws(() => initLessons(initOpts(root, root)), /lessons folder must be inside the repo/);
        assert.throws(() => initLessons(initOpts(root, join(root, "..", "outside"))), /lessons folder must be inside the repo/);
        assert.equal(existsSync(join(root, "AGENTS.md")), false);
    });
});

test("initLessons refuses an existing folder that is not a lessons folder and changes nothing", () => {
    withRepo((root) => {
        mkdirSync(join(root, "src"));
        writeFileSync(join(root, "src", "config.json"), '{"port":3000}\n');

        assert.throws(() => initLessons(initOpts(root, join(root, "src"))), /src is not a lessons folder/);
        assert.equal(readFileSync(join(root, "src", "config.json"), "utf8"), '{"port":3000}\n');
        assert.equal(existsSync(join(root, "src", "README.md")), false);
        assert.equal(existsSync(join(root, "AGENTS.md")), false);
    });
});

test("initLessons never overwrites a lessons.mjs that is not this script", () => {
    withRepo((root) => {
        const lessons = join(root, "docs", "lessons");
        mkdirSync(lessons, { recursive: true });
        writeFileSync(join(lessons, "README.md"), INDEX_HEAD);
        writeFileSync(join(lessons, "lessons.mjs"), "console.log('mine');\n");

        assert.throws(() => initLessons(initOpts(root, lessons)), /lessons\.mjs is not the lessons-learned script/);
        assert.equal(readFileSync(join(lessons, "lessons.mjs"), "utf8"), "console.log('mine');\n");
        assert.equal(existsSync(join(lessons, "config.json")), false);
    });
});

test("initLessons on an invalid config.json writes nothing", () => {
    withRepo((root) => {
        const lessons = join(root, "docs", "lessons");
        mkdirSync(lessons, { recursive: true });
        writeFileSync(join(lessons, "config.json"), "{ nope");

        assert.throws(() => initLessons(initOpts(root, lessons)), /config\.json: invalid JSON/);
        assert.equal(existsSync(join(lessons, "README.md")), false);
        assert.equal(existsSync(join(root, "AGENTS.md")), false);
    });
});

test("initLessons keeps config.json keys it does not know", () => {
    withRepo((root) => {
        const lessons = join(root, "docs", "lessons");
        initLessons(initOpts(root, lessons));
        const path = join(lessons, "config.json");
        writeFileSync(path, JSON.stringify({ ...JSON.parse(readFileSync(path, "utf8")), myKey: "keep me" }));

        initLessons(initOpts(root, lessons));

        assert.equal(JSON.parse(readFileSync(path, "utf8")).myKey, "keep me");
    });
});

test("readConfig refuses valid JSON of the wrong shape, naming config.json and the key", () => {
    const cases = [
        ["null", /config\.json: must be a JSON object/],
        ['{"areas":"code,shell"}', /config\.json: areas must be a list of strings/],
        ['{"citationRoots":"docs"}', /config\.json: citationRoots must be a list of strings/],
        ['{"targets":[1]}', /config\.json: targets must be a list of strings/],
        ['{"foldThreshold":"15"}', /config\.json: foldThreshold must be a number/],
        ['{"trigger":"maybe"}', /config\.json: trigger must be installed, declined, or undecided/],
    ];
    for (const [json, error] of cases) {
        writeFileSync(join(dir, "config.json"), json);
        assert.throws(() => readConfig(dir), error, json);
    }
});

test("a long first sentence right under a heading fails the check", () => {
    createLesson(dir, input);
    const file = join(dir, "L001-quote-heredocs.md");
    const long = "word ".repeat(29).trim() + ".";
    writeFileSync(file, readFileSync(file, "utf8").replace(/## Symptom\n\nTODO[^\n]*/, `## Symptom\n\n${long}`).replaceAll("TODO", "Done"));

    assert.ok(checkLessons(dir).errors.join("\n").includes("long sentence (29 words)"));
});

test("a guard of short list items passes the check", () => {
    createLesson(dir, input);
    const file = join(dir, "L001-quote-heredocs.md");
    const guard = "- a line in AGENTS.md\n- a test in shell.test.mjs\n- a grep in CI\n- a skill step that cites the id\n- a lint rule for heredocs\n- a review checklist row";
    writeFileSync(file, readFileSync(file, "utf8").replace(/## Guard\n\nTODO[^\n]*/, `## Guard\n\n${guard}`).replaceAll("TODO", "Done"));

    assert.deepEqual(checkLessons(dir).errors, []);
});

test("audit skips installed copies of this skill and does not follow symlinked folders", () => {
    withRepo((root) => {
        const lessons = join(root, "docs", "lessons");
        initLessons(initOpts(root, lessons, { noHook: true }));
        createLesson(lessons, input);
        const skill = join(root, ".agents", "skills", "lessons-learned");
        mkdirSync(join(skill, "scripts"), { recursive: true });
        mkdirSync(join(skill, "references"));
        writeFileSync(join(skill, "SKILL.md"), "Example (L001).\n");
        writeFileSync(join(skill, "scripts", "lessons.mjs"), "");
        writeFileSync(join(skill, "references", "template.md"), "# L001 — example\n");
        mkdirSync(join(root, ".claude", "skills"), { recursive: true });
        symlinkSync(skill, join(root, ".claude", "skills", "lessons-learned"), "junction");
        mkdirSync(join(root, "docs", "sub"));
        symlinkSync(join(root, "docs"), join(root, "docs", "sub", "loop"), "junction");
        writeFileSync(join(root, "AGENTS.md"), "Quote it (L001).\n");

        const rows = auditLessons(lessons, { root });

        assert.deepEqual(rows[0].citedIn, ["AGENTS.md"]);
    });
});

test("CLI init without flags reuses the stored choice, so a declined block stays declined", () => {
    withRepo((root) => {
        run(["init", "--no-hook"], root);
        writeFileSync(join(root, "docs", "lessons", "lessons.mjs"), 'export const VERSION = "0.9.0";\n');

        const r = run(["init"], root);

        assert.equal(r.code, 0, r.stderr);
        assert.ok(r.stdout.includes("updated: docs/lessons/lessons.mjs"));
        assert.equal(existsSync(join(root, "AGENTS.md")), false);
        assert.equal(readConfig(join(root, "docs", "lessons")).trigger, "declined");
    });
});

test("CLI init without flags on a fresh repo asks for a choice", () => {
    withRepo((root) => {
        const r = run(["init"], root);

        assert.equal(r.code, 2);
        assert.ok(r.stderr.includes("usage: lessons.mjs init --targets"));
    });
});

// ---- Minor review fixes ----

test("createLesson refuses | and line breaks that would break the index row", () => {
    assert.throws(() => createLesson(dir, { ...input, keywords: ["a|b"] }), /keywords must not contain \| or a line break/);
    assert.throws(() => createLesson(dir, { ...input, keywords: ["a\nb"] }), /keywords must not contain \| or a line break/);
    assert.throws(() => createLesson(dir, { ...input, rule: "Do x.\nDo y." }), /rule must not contain \| or a line break/);
    assert.throws(() => createLesson(dir, { ...input, title: "Two\nlines" }), /title must not contain a line break/);
    assert.deepEqual(readIndexRows(dir), []);
});

test("createLesson keeps the CRLF line endings of an index", () => {
    writeFileSync(join(dir, "README.md"), INDEX_HEAD.replace(/\n/g, "\r\n"));

    createLesson(dir, input);

    const index = readFileSync(join(dir, "README.md"), "utf8");
    assert.equal(/(?<!\r)\n/.test(index), false);
    assert.equal(readIndexRows(dir).length, 1);
});

test("the private-path warning ignores an API route like /api/users/ and still flags a home folder", () => {
    createLesson(dir, input);
    const file = join(dir, "L001-quote-heredocs.md");
    writeFileSync(file, readFileSync(file, "utf8").replaceAll("TODO", "The route `/api/users/:id` failed"));
    assert.deepEqual(checkLessons(dir).warnings, []);

    writeFileSync(file, readFileSync(file, "utf8").replace("`/api/users/:id`", "`C:\\Users\\dev\\x`"));
    assert.ok(checkLessons(dir).warnings.join("\n").includes("private path"));
});

test("the repo copy finds its root without .git, from any working directory", () => {
    const root = mkdtempSync(join(tmpdir(), "nogit-"));
    const elsewhere = mkdtempSync(join(tmpdir(), "elsewhere-"));
    try {
        assert.equal(run(["init", "--dir", "notes/lessons", "--no-hook"], root).code, 0);
        const lessons = join(root, "notes", "lessons");
        createLesson(lessons, input);
        unlinkSync(join(lessons, "L001-quote-heredocs.md"));
        const index = join(lessons, "README.md");
        writeFileSync(index, readFileSync(index, "utf8").replace("| active |", "| folded → AGENTS.md |"));
        writeFileSync(join(root, "AGENTS.md"), "Quote it (L001).\n");

        const r = run(["check"], elsewhere, join(lessons, "lessons.mjs"));

        assert.equal(r.code, 0, r.stderr);
    } finally {
        rmSync(root, { recursive: true, force: true });
        rmSync(elsewhere, { recursive: true, force: true });
    }
});
