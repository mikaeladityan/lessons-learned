#!/usr/bin/env node
// Grades one eval run: node evals/grade.mjs <run dir> <eval name>
// The run dir (skill-creator layout: eval-N-<name>/<config>/run-1) holds outputs/repo, outputs/final_reply.md, outputs/commands.md. Writes <run dir>/grading.json.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const [runArg, evalName] = process.argv.slice(2);
const runDir = resolve(runArg);
const out = join(runDir, "outputs");
const repo = join(out, "repo");
const read = (p) => (existsSync(p) ? readFileSync(p, "utf8") : "");
const reply = read(join(out, "final_reply.md"));
const commands = read(join(out, "commands.md"));
const lessons = join(repo, "docs", "lessons");
const script = join(lessons, "lessons.mjs");
const run = (args) => spawnSync(process.execPath, [script, ...args], { cwd: repo, encoding: "utf8" });
const blocks = (name) => read(join(repo, name)).split("<!-- lessons-learned:start -->").length - 1;
const entries = () => (existsSync(lessons) ? readdirSync(lessons).filter((f) => /^L\d{3}-.*\.md$/.test(f)) : []);

const checks = [];
const add = (text, passed, evidence) => checks.push({ text, passed: Boolean(passed), evidence });

if (evalName === "setup-fresh-repo") {
    add("docs/lessons/README.md index exists", existsSync(join(lessons, "README.md")), lessons);
    add("docs/lessons/lessons.mjs repo copy exists", existsSync(script), script);
    add("AGENTS.md holds exactly one marker block", blocks("AGENTS.md") === 1, `${blocks("AGENTS.md")} block(s)`);
    add("CLAUDE.md holds exactly one marker block", blocks("CLAUDE.md") === 1, `${blocks("CLAUDE.md")} block(s)`);
    const status = existsSync(script) ? run(["status"]).stdout : "";
    add("status prints setup: done", status.includes("setup: done"), status.trim().split("\n").at(-1) ?? "no script");
    const check = existsSync(script) ? run(["check"]) : { status: -1 };
    add("check exits 0", check.status === 0, `exit ${check.status}`);
}
if (evalName === "record-user-correction") {
    const files = entries();
    const l003 = files.find((f) => f.startsWith("L003"));
    add("a new lesson L003 exists", l003, files.join(", "));
    const check = existsSync(script) ? run(["check"]) : { status: -1, stderr: "" };
    add("check exits 0 (all five sections filled, no TODO, rule <= 20 words)", check.status === 0, `exit ${check.status} ${check.stderr ?? ""}`.trim());
    const text = l003 ? read(join(lessons, l003)) : "";
    add("L003 source is user", /Source: user/.test(text), /Source: \w+/.exec(text)?.[0] ?? "none");
    add("L003 names the vitest filter flag -t", /-t\b/.test(text), "grep -t in entry");
    add("L002 was not duplicated (only one new entry)", files.length === 3, `${files.length} entries`);
    const findIdx = commands.search(/lessons\.mjs find/);
    const newIdx = commands.search(/lessons\.mjs new/);
    add("find ran before new", findIdx >= 0 && (newIdx < 0 || findIdx < newIdx), `find@${findIdx} new@${newIdx}`);
    add("rule moved to an always-read file (AGENTS.md or CLAUDE.md cites L003)", /L003/.test(read(join(repo, "AGENTS.md")) + read(join(repo, "CLAUDE.md"))), "grep L003");
    add("final reply ends with a Lessons: line", /Lessons: L003/.test(reply), "grep Lessons:");
}
if (evalName === "fold-due") {
    add("no lesson entry file was deleted", entries().length === 16, `${entries().length} entries`);
    add("reply holds a fold table with Decision and Owner columns", /\|[^\n]*Decision[^\n]*\|/i.test(reply) && /owner/i.test(reply), "table header");
    add("reply asks the user for approval", /approv/i.test(reply), "grep approv");
    add("audit ran", /lessons\.mjs audit/.test(commands), "grep audit");
    const index = read(join(lessons, "README.md"));
    add("no index row changed to folded before approval", !/^\| L\d{3} \|.*\| folded → /m.test(index), "index rows");
}
if (evalName === "retire-outdated") {
    const index = read(join(lessons, "README.md"));
    add("L002 index status is retired", /^\| L002 \|.*\| retired \|\s*$/m.test(index), "index row");
    const l002 = entries().find((f) => f.startsWith("L002"));
    add("L002 entry file still exists", l002, entries().join(", "));
    const text = l002 ? read(join(lessons, l002)) : "";
    add("L002 entry holds a Retired: line with a date and reason", /\nRetired: \d{4}-\d{2}-\d{2} — \S/.test(text), "grep Retired:");
    add("L001 is still active", /^\| L001 \|.*\| active \|\s*$/m.test(index), "index row");
    const check = existsSync(script) ? run(["check"]) : { status: -1 };
    add("check exits 0", check.status === 0, `exit ${check.status}`);
    add("final reply ends with a Lessons: line", /Lessons: /.test(reply), "grep Lessons:");
}
if (evalName === "headless-no-setup") {
    // Run it: a comment or a broken body must not pass.
    const math = join(repo, "src", "math.js");
    const probe = spawnSync(process.execPath, ["--input-type=module", "-e", `import { subtract } from ${JSON.stringify(pathToFileURL(math).href)}; process.stdout.write(String(subtract(5, 3)));`], { encoding: "utf8" });
    add("src/math.js exports subtract", probe.stdout === "2", `subtract(5, 3) -> ${probe.stdout || probe.stderr.trim().split("\n").at(-1)}`);
    add("no AGENTS.md or CLAUDE.md was created", !existsSync(join(repo, "AGENTS.md")) && !existsSync(join(repo, "CLAUDE.md")), "ls");
    add("no docs/lessons folder was created", !existsSync(lessons), lessons);
    add("final reply says Lessons: setup needed", /Lessons: setup needed/.test(reply), "grep Lessons:");
}
if (evalName === "fold-auto") {
    add("audit ran", /lessons\.mjs audit/.test(commands), "grep audit");
    add("reply holds a fold table with Decision and Owner columns", /\|[^\n]*Decision[^\n]*\|/i.test(reply) && /owner/i.test(reply), "table header");
    const folded = [...read(join(lessons, "README.md")).matchAll(/^\| (L\d{3}) \|.*\| folded → \S+ \|\s*$/gm)].map((m) => m[1]);
    add("at least one index row is folded", folded.length > 0, folded.join(", ") || "none");
    const check = existsSync(script) ? run(["check"]) : { status: -1, stderr: "" };
    add("every folded row's owner file cites its id (check exits 0)", check.status === 0, `exit ${check.status} ${check.stderr ?? ""}`.trim());
    const left = folded.filter((id) => entries().some((f) => f.startsWith(id)));
    add("no folded lesson keeps its entry file", left.length === 0, left.join(", ") || "none");
}
const passed = checks.filter((c) => c.passed).length;
const summary = { passed, failed: checks.length - passed, total: checks.length, pass_rate: Number((passed / checks.length).toFixed(2)) };
writeFileSync(join(runDir, "grading.json"), JSON.stringify({ expectations: checks, summary }, null, 2));
console.log(`${evalName} ${runDir.split("/").at(-1)}: ${checks.filter((c) => c.passed).length}/${checks.length}`);
