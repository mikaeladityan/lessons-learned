# Agent instruction files and the trigger block

A skill activates only when an agent decides its description fits the task. An agent that is
about to repeat a mistake rarely knows it should look. So `init` also writes a short block into the
instruction files that agents load on every session. That block is what makes "find before work"
and "close-out after work" happen without anyone remembering.

## Which agent reads which file

Checked 2026-10-23 against each tool's docs. Paths are relative to the repo root.

| Agent | Always-on instruction file | Project skill path (`npx skills add`) |
|---|---|---|
| Claude Code | `CLAUDE.md` | `.claude/skills/` |
| Codex | `AGENTS.md` | `.agents/skills/` |
| opencode | `AGENTS.md`; `CLAUDE.md` only when no `AGENTS.md` exists | `.agents/skills/` |
| Antigravity | `AGENTS.md` and `GEMINI.md` (both always on) | `.agents/skills/` |
| Gemini CLI | `GEMINI.md` by default; `AGENTS.md` when listed in `context.fileName` | `.agents/skills/` |
| Cursor | `AGENTS.md` in the project root | `.agents/skills/` |

**Usual choices:**

- `AGENTS.md` + `CLAUDE.md` covers all six, except Gemini CLI on its default settings.
- When `CLAUDE.md` only imports `AGENTS.md` (a line `@AGENTS.md`), `AGENTS.md` alone is enough.
- Add `GEMINI.md` when the repo already has one.
- For a Gemini CLI user without `GEMINI.md`: create one that holds only `@AGENTS.md` (Gemini
  imports it), or add `AGENTS.md` to `context.fileName` in `.gemini/settings.json`. Either way,
  `init` does not need `GEMINI.md` as a target.

## The block

`init` writes this text, with the real lessons folder in place of `docs/lessons`:

```markdown
<!-- lessons-learned:start -->
## Lessons learned

This repo records agent mistakes as lessons in `docs/lessons/` so they do not repeat.

- Before a task that changes code, run `node docs/lessons/lessons.mjs find <keywords>`. Read every hit.
- After a mistake that will likely repeat and is not written down anywhere, record a lesson before the next task. Skip one-offs.
- To record a lesson, use the `lessons-learned` skill. Without the skill, run `node docs/lessons/lessons.mjs new` and fill the five sections.
- End every report with `Lessons: L0NN | none — <reason>`. If you recorded a lesson, run `node docs/lessons/lessons.mjs check` first.
- Gate commits on the check: `node docs/lessons/lessons.mjs check && git commit ...`.
- When `status` or `check` prints `fold: due`, run the fold from the `lessons-learned` skill. In mode `ask`, show the fold table and wait for approval.
<!-- lessons-learned:end -->
```

**How `init` treats the markers:**

- Only the text between the markers belongs to `init`.
- A rerun replaces that span and leaves every other byte of the file alone.
- It keeps LF or CRLF line endings as the file has them.
- A start marker without an end marker stops `init` with an error, before any file is written. Fix
  the file by hand, then run `init` again.

**Editing the block by hand:**

- Edit the text outside the markers freely.
- A hand edit inside the markers is replaced on the next `init`.
- To change what every agent sees, put your extra line outside the block.

## Removing it

1. Delete everything from `<!-- lessons-learned:start -->` to `<!-- lessons-learned:end -->` in
   each instruction file.
2. Delete the lessons folder, if you also want the lessons gone.
3. Remove the installed skill: `npx skills remove lessons-learned`.
