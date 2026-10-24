# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-10-23

### Added

- `lessons-learned` Agent Skill, installable with `npx skills add mikaeladityan/lessons-learned`.
- `SKILL.md` with:
  - setup on first contact;
  - when and how to write a lesson;
  - when to read lessons;
  - close-out after every task;
  - fold and retire.
- `references/template.md`: the five-section entry shape, a worked example, and writing rules.
- `references/fold.md`: the fold procedure, owner-file guidance, and the approval table.
- `references/agent-files.md`: which agent reads which instruction file, the trigger block, and
  removal steps.
- `scripts/lessons.mjs`: a zero-dependency Node (≥ 20) CLI.
  - Commands: `status`, `init`, `new`, `find`, `check`, `audit`.
  - Lessons folder resolution: `--dir`, then the repo copy's own folder, then the trigger block,
    then `docs/lessons`.
  - `init`:
    - writes a marked always-on block into `AGENTS.md`, `CLAUDE.md`, or `GEMINI.md`;
    - keeps user text and CRLF line endings;
    - is idempotent;
    - copies the script into the lessons folder and updates the copy only when it is older.
  - `config.json` per repo: areas, trigger choice, targets, fold threshold, citation roots.
    Unknown keys are kept. A wrong shape fails with a message that names the key.
- Safety guards in `init`. It refuses:
  - the repo root;
  - a folder outside the repo;
  - an existing folder that is not a lessons folder;
  - a foreign `lessons.mjs`.

  Every check runs before the first write.
- `init` with no flags reuses the stored trigger choice, so updating an outdated script copy never
  adds a declined block.
- `audit` skips installed copies of this skill and does not follow symlinked folders.
- Test suite (`node:test`) and a GitHub Actions workflow on Linux, Windows, and macOS, Node 22 and 24.
- `tests/repo.test.mjs`: the script `VERSION` must equal the `package.json` version, and the eval
  fixtures must carry the current script. A script change therefore always ships with a version bump.
- `.gitattributes` keeps LF line endings on every OS.
- `new` refuses `|` and line breaks in the rule and keywords, and line breaks in the title.
- `new` keeps the line endings of a CRLF index.
- The repo copy finds the repo root without `.git` and from any working directory, through `dir`
  in `config.json`.
- The private-path warning is case-sensitive, so `/api/users/` is not flagged.
- `README.md` (English) and `README.id.md` (Bahasa Indonesia).
- `evals/`: skill-creator test prompts, fixture repos, and a grader script.
