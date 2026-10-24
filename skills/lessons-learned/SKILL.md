---
name: lessons-learned
description: >-
  Record and look up lessons from agent mistakes so they do not repeat. Use whenever a test,
  check, command, or review fails with a known cause, or the user corrects you ("don't do that
  again", "you did this before", "again?!"); before starting a task, to find past lessons; and at
  task close-out. Also use when the user says lesson, lessons learned, or post-mortem, when
  `lessons.mjs check` warns that a fold is due, and the first time a repo uses lessons (setup).
  Lessons live in the repo, so every agent reads them. Not for product decisions or architecture
  records.
license: MIT
metadata:
  author: mikaeladityan
  version: "1.0.0"
---

# Lessons Learned

A lesson is a mistake or incident that must not repeat, written as one rule the next agent can
apply. Lessons live in the repo (default `docs/lessons/`), not in one agent's private memory.
Every agent and every model that opens the repo can read them: Claude Code, Codex, opencode,
Antigravity, Gemini CLI, Cursor, and the next session of the same agent.

The script has two copies with the same commands:

- **Skill copy**: `node <this skill folder>/scripts/lessons.mjs <command>`. Use it for `status`
  and `init`. It knows the newest version.
- **Repo copy**: `node <lessons folder>/lessons.mjs <command>`. `init` puts it there, so the
  trigger block, teammates without the skill, and CI all run one stable path.

`<this skill folder>` is the folder that holds this `SKILL.md`. Claude Code exposes it as
`${CLAUDE_SKILL_DIR}`. In other agents, use the path this file was loaded from. If you do not know
it, look for the installed copy:

```bash
ls .agents/skills/lessons-learned/scripts/lessons.mjs .claude/skills/lessons-learned/scripts/lessons.mjs 2>/dev/null
```

Below, `lessons.mjs` means the repo copy unless a step says otherwise. Every command prints
repo-relative paths and works from any subfolder of the repo.

## Setup (first contact with a repo)

Run the skill copy first, every time this skill activates:

```bash
node <this skill folder>/scripts/lessons.mjs status
```

When the last line is `setup: done`, skip to the task at hand. When it is `setup: needed`, stop
other work and set up. A lesson cannot be recorded or found without the folder.

1. Read the `file <name>: ...` lines. They show which instruction files exist and which already
   hold the block.
2. Ask the user these questions in plain chat (one message). Use a question tool if your agent
   has one.
   - **Trigger block:** "May I add a short always-on block to your agent instruction files, so
     every agent checks lessons before work and records new ones? I would add it to: <files>."
     - Offer every instruction file that exists.
     - When none exists, offer `AGENTS.md` and `CLAUDE.md`.
     - Offer `GEMINI.md` only when it already exists.
     - When `CLAUDE.md` holds only `@AGENTS.md`, offer `AGENTS.md` alone.
     - `references/agent-files.md` says which agent reads which file.
   - **Folder:** "Keep lessons in `docs/lessons/`?" Accept another new or empty folder inside the
     repo, without spaces. Pass it as `--dir` to every later `init`.
   - **Areas:** "Default areas are code, test, security, review, process, shell, tooling, docs.
     Add any for your stack (for example backend, frontend, database, infra)?"
3. Run the skill copy with the answers:

   ```bash
   node <this skill folder>/scripts/lessons.mjs init --targets AGENTS.md,CLAUDE.md [--dir <folder>] [--areas a,b,c]
   ```

   When the user declines the block, run `init --no-hook` instead. That records the answer, so
   no agent asks again. A later `init --targets ...` can still add the block.
4. Report the `created:` and `updated:` lines to the user.

**When nobody can answer** (a headless run, CI, or a batch job), do not touch instruction files.
Writing to them is the user's call. Finish the task, then end the report with
`Lessons: setup needed — run the lessons-learned setup`.

`init` is safe to run again:
- It never overwrites the index or a lesson.
- It only replaces text between its own markers.
- It updates the repo copy only when that copy is older.
- It refuses the repo root, a folder outside the repo, and an existing folder that holds other
  files. Pick a new or empty folder.
- When `status` prints `script: outdated`, run `init` with no flags (add `--dir <folder>` for a
  custom folder). It reuses the stored answer, so a declined block stays declined.

## When to write one

Write a lesson in the same session, as soon as the cause is known, before the next task, when:

- a test, check, or verification step fails for a reason the plan did not foresee;
- a command errors, is blocked, or needs a retry;
- a reviewer (human or another model) finds a real gap;
- a security check or a browser check finds a defect;
- the user corrects the agent;
- the agent lost more than a few minutes that a note would have saved.

The point is the next agent: it does not remember this session. A lesson is the only way the cause
you just found reaches it.

**No lesson for:**
- a typo fixed in one step;
- a product decision (it belongs in the project docs or an ADR);
- a reviewer finding the author rejected with evidence;
- a fact the code already states.

## How to write one

A read-only reviewer runs only `find` and `check`. It reports the lesson it would write as a
finding, and the author writes it.

1. **Find the rule first, then the symptom.** Run `lessons.mjs find <keyword> ...`. On a hit,
   improve that lesson or its guard. A twin splits the history and doubles the reading.
2. **Create the entry:**

   ```bash
   node <lessons folder>/lessons.mjs new --slug <kebab> --title "<t>" --area <area> --source <source> \
     --rule "<one sentence>" --keywords a,b,c
   ```

   - Areas: the list in `<lessons folder>/config.json`.
   - Sources: `execution`, `verify`, `review`, `security`, `browser`, `user`. A user correction
     is `user`.
3. **Fill the five sections:** Symptom, Cause, Rule, Guard, Evidence.
   - `references/template.md` says what each section must hold and has a worked example.
   - Replace every `TODO`.
   - Write the rule as one command sentence of at most 20 words. A longer rule does not survive
     being copied into another file.
   - The guard names what stops a repeat: a test, a lint, a skill or rule line, a script check.
     "none yet" is allowed and is itself a follow-up.
4. **Move the rule to where the next agent reads it at the moment of the mistake.** Candidates:
   - the instruction file (`AGENTS.md`, `CLAUDE.md`);
   - a skill step;
   - a project rules document;
   - a test or lint.

   The lesson file keeps the story and points there. A rule only in `docs/lessons/` depends on
   someone searching for it.
5. **Gate the commit on the check's exit code**, in the same command:

   ```bash
   node <lessons folder>/lessons.mjs check && git commit ...
   ```

   Reading the output instead lets a failing check slip through. Commit the lesson with its fix,
   or alone as `docs(lessons): L0NN <title>`.

## When to read them

| Moment | Run |
|---|---|
| Before the first edit of a task | `find` with the module, layer, and tool words. Read every hit. |
| Before the first debugging hypothesis | `find` with the error text and the symptom words. |
| Before a review round | `find review`. Honor the hits in the review prompt. |
| Before every commit | `check`. |

A folded hit prints `→ read <file>`. Its rule now lives in that file, so read that file.

## Close-out after every task

Every task ends with this step, also the small ones. The trigger block reminds every agent of it.

1. List the session's incidents (the triggers in "When to write one"). Give each a lesson or a
   reason for none.
2. Run `lessons.mjs check`. Errors block "done".
3. End the report with one line: `Lessons: L0NN[, L0NN] | none — <reason>`.
4. When `check` warns that the fold threshold is passed, add `Fold due: N active lessons`. Do not
   fold inside a feature or bugfix change. The fold is its own change, with its own review.

## Fold: move lessons into their owner files

The fold moves each rule into the file where the mistake happens and deletes the lesson file. Git
history keeps the story, and the index row keeps the id.

- **When:** `check` warns (more than `foldThreshold` active lessons, default 15), or the user asks.
- **How:** follow `references/fold.md`. Run `audit`, decide fold, keep, or retire for each lesson,
  and build the fold table.
- **Approval:** show the table to the user and stop. Delete nothing before approval.

The folded row stays in the index:
- `new` never reuses an id;
- old citations in reviews and plans still resolve;
- `check` fails when a folded row's owner file is missing or does not cite the id.

## Retire

When a tool or rule change makes a lesson wrong:

1. Set its index `Status` to `retired`.
2. Add a `Retired: <date> — <reason>` line under the title.
3. Keep the file.

A retired lesson does not count toward the fold threshold.

## Files and checks

In the user's repo (default folder shown):

- `docs/lessons/README.md`: the index. Columns: id, date, area, rule, keywords, status. Status is
  `active`, `retired`, or `folded → <file>`.
- `docs/lessons/L0NN-<slug>.md`: one active or retired lesson.
- `docs/lessons/config.json`: areas, trigger decision, targets, fold threshold, citation roots.
- `docs/lessons/lessons.mjs`: the repo copy of the script.
- A block between `<!-- lessons-learned:start -->` and `<!-- lessons-learned:end -->` in the
  chosen instruction files.

**`check` fails on:**
- an index or entry gap;
- a missing section;
- `TODO` text;
- a rule over 20 words or with two paragraphs;
- an index rule that differs from the entry;
- a sentence over 22 words;
- an area outside the config;
- a folded row with a file left, with no owner file, or with an owner file that does not cite the id.

**`check` warns on:**
- a private path (`/Users/`, `/home/`, `C:\Users\`);
- a passed fold threshold.

In this skill:

- `references/template.md`: the entry shape, a worked example, and the writing rules.
- `references/fold.md`: the full fold procedure and owner-file guidance.
- `references/agent-files.md`: which agent reads which instruction file, the block text, and how
  to remove it.
- `scripts/lessons.mjs`: commands `status`, `init`, `new`, `find`, `check`, `audit`. Node ≥ 20,
  zero dependencies.
