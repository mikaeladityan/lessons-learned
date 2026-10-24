// Checks of this repository, not of the skill. They do not ship with the installed skill.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { VERSION } from "../skills/lessons-learned/scripts/lessons.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = join(ROOT, "skills", "lessons-learned", "scripts", "lessons.mjs");

test("VERSION in lessons.mjs equals the package.json version", () => {
    // `init` updates a repo copy only when it is older, so a script change without a version bump never ships.
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));

    assert.equal(VERSION, pkg.version);
});

test("eval fixtures carry the current script", () => {
    const fixtures = join(ROOT, "evals", "fixtures");
    const script = readFileSync(SCRIPT, "utf8");
    const copies = readdirSync(fixtures)
        .map((name) => join(fixtures, name, "docs", "lessons", "lessons.mjs"))
        .filter((path) => existsSync(path));

    assert.ok(copies.length > 0);
    for (const copy of copies) {
        assert.equal(readFileSync(copy, "utf8"), script, `${copy} is stale: copy the script there, then run init with no flags`);
    }
});
