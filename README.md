# lessons-learned

**English** · [Bahasa Indonesia](README.id.md)

An [Agent Skill](https://agentskills.io) that stops AI coding agents from repeating the same
mistake.

AI agents forget. The next session, or the next agent, makes the error you fixed yesterday,
sometimes with a confident explanation that is not true. This skill gives your repo a shared
memory that every agent reads:

1. **Record.** When something goes wrong and the cause is known, the agent writes one lesson:
   symptom, cause, a one-sentence rule, the guard that stops a repeat, and evidence.
2. **Find.** Before work starts, every agent searches the lessons for the task's keywords.
3. **Close out.** Every task ends with `Lessons: L0NN | none — <reason>`.
4. **Fold.** When lessons pile up, each rule moves into the file the agent reads at the moment of
   the mistake (`AGENTS.md`, a skill, a test), and the lesson file is deleted.

Lessons are plain Markdown in your repo, not in one tool's private memory. Claude Code, Codex,
opencode, Antigravity, Gemini CLI, and Cursor all read the same lessons. It works with any tech
stack: the helper script is one Node file with zero dependencies.

## Install

```bash
npx skills add mikaeladityan/lessons-learned
```

The [`skills` CLI](https://github.com/vercel-labs/skills) detects your agents and installs the
skill for them.

- Pick agents with `-a`, for example `-a claude-code -a codex`.
- Add `-g` to install for every project.
- The CLI needs Node ≥ 22.20. The skill's own script needs Node ≥ 20.

## First use

Ask your agent:

> set up lessons learned in this repo

The agent runs `status`, sees that setup is needed, and asks you three questions:

1. **Trigger block.** May it add a short always-on block to your agent instruction files
   (`AGENTS.md`, `CLAUDE.md`, and `GEMINI.md` if you have one)?
2. **Folder.** Keep lessons in `docs/lessons/`?
3. **Areas.** Which areas to use? The defaults are `code, test, security, review, process, shell,
   tooling, docs`, and you can add your own.

Then it runs `init`, which creates:

```
your-repo/
├── AGENTS.md / CLAUDE.md      ← a block between <!-- lessons-learned:start/end --> markers
└── docs/lessons/
    ├── README.md              ← the index: one row per lesson
    ├── config.json            ← areas, trigger choice, fold threshold
    ├── lessons.mjs            ← a copy of the script, so every agent and CI run one path
    └── L001-<slug>.md ...     ← one file per lesson
```

The block is the part that makes it work across agents. A skill only activates when an agent
thinks it fits, and an agent about to repeat a mistake rarely does. The instruction file is
loaded every session. Your text outside the markers is never touched.

## How a lesson looks

```markdown
# L001 — Quote heredoc delimiters

Date: 2026-10-23 · Area: shell · Source: execution · Status: active
Keywords: heredoc, backtick, EOF, command substitution, shell

## Symptom
A heredoc that wrote a Markdown file ran `npm test` in the middle of the write.

## Cause
The delimiter was `<<EOF`, not `<<'EOF'`, so the shell expanded the backticks in the body.

## Rule
Quote the heredoc delimiter (`<<'EOF'`) whenever the body holds backticks, `$`, or code.

## Guard
A line in `AGENTS.md` under "Shell" cites L001.

## Evidence
The fix commit that rewrote the file with a quoted delimiter.
```

## Lifecycle

```
mistake ──► find (is there a lesson already?) ──► new L0NN ──► fill 5 sections ──► move the rule
                                                                                    to AGENTS.md /
                                                                                    a skill / a test
next task ──► find <keywords> before the first edit
end of task ──► check ──► "Lessons: L0NN | none — <reason>"
> 15 active ──► audit ──► fold table ──► user approves ──► rule lands in its owner file,
                                                         lesson file deleted, index row kept
```

## Commands

Run the repo copy from anywhere in the repo: `node docs/lessons/lessons.mjs <command>`.

| Command | What it does | Exit code |
|---|---|---|
| `status` | Shows the folder, the index, the trigger choice, which instruction files hold the block, and the script version. Prints `setup: needed` or `setup: done`. | 0 |
| `init --targets AGENTS.md,CLAUDE.md` | Creates or updates the folder, the index, the config, the script copy, and the block. Safe to run again. Also takes `--no-hook`, `--dir <path>`, and `--areas a,b`. | 0, or 2 on error |
| `new --slug --title --area --source --rule --keywords` | Creates `L0NN-<slug>.md` and its index row. | 0, or 2 on bad input |
| `find <keyword> ...` | Searches the index (area, rule, keywords), ignoring case. A folded hit prints `→ read <file>`. | 0 |
| `check` | Validates every lesson and the index. Warns when the fold threshold is passed. | 0, or 1 on any error |
| `audit` | For each active lesson, prints its guard and the files that cite its id. Used for the fold. | 0 |

Every command takes `--dir <path>` to point at a lessons folder other than the default.

## CI

Fail the build when a lesson is incomplete or a folded rule lost its citation:

```yaml
# .github/workflows/lessons.yml
name: lessons
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: node docs/lessons/lessons.mjs check
```

## Supported agents

| Agent | Reads the block from | Skill install path |
|---|---|---|
| Claude Code | `CLAUDE.md` | `.claude/skills/` |
| Codex | `AGENTS.md` | `.agents/skills/` |
| opencode | `AGENTS.md` (or `CLAUDE.md` when no `AGENTS.md` exists) | `.agents/skills/` |
| Antigravity | `AGENTS.md`, `GEMINI.md` | `.agents/skills/` |
| Gemini CLI | `GEMINI.md` (or `AGENTS.md` via `context.fileName`) | `.agents/skills/` |
| Cursor | `AGENTS.md` | `.agents/skills/` |

An agent without the skill installed still gets the block and the script. It can still run `find`
and `check`. It loses only the step-by-step guidance for writing and folding.

## FAQ

**Why is the script copied into my repo?**
The installed skill lives in a different place for every agent: `.claude/skills/`,
`.agents/skills/`, or a global home folder. A teammate who clones the repo may not have it at
all. The copy gives every agent, every teammate, and CI one command that always works.

**How do I update the copy?**
Update the skill (`npx skills update`), then ask your agent to run `status`. When it prints
`script: outdated`, it runs `init` with no flags, which keeps your earlier answer about the block.

**I chose a custom folder and declined the block. Now the agent asks to set up again.**
Without the block, nothing tells a fresh agent where your folder is. Either accept the block, or
tell the agent the folder so it passes `--dir <folder>`.

**Can I edit the block?**
Edit the text outside the markers freely. Text inside the markers is replaced on the next
`init`.

**How do I uninstall?**
1. Delete the text between `<!-- lessons-learned:start -->` and `<!-- lessons-learned:end -->`.
2. Delete the lessons folder.
3. Run `npx skills remove lessons-learned`.

**Is this a replacement for my agent's memory feature?**
No. Agent memory is private to one tool and one user. Lessons are part of the repo: reviewed in
pull requests, shared with the team, and read by every agent.

## Development

```bash
npm test         # node --test skills/lessons-learned/scripts/lessons.test.mjs tests/repo.test.mjs
npm run check    # node --check skills/lessons-learned/scripts/lessons.mjs
```

Every change to `lessons.mjs` bumps `VERSION` and the `package.json` version together.
`init` updates a repo copy only when the copy is older, so an unbumped change never reaches users.
`tests/repo.test.mjs` fails until both match. After a bump, copy the script into
`evals/fixtures/*/docs/lessons/`.

`evals/` holds the skill-creator test prompts and fixture repos used to check the skill text.

## License

[MIT](LICENSE) © mikaeladityan
