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
- `scripts/lessons.mjs`: a zero-dependency Node (≥ 22) CLI.
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
- `fold <L0NN> --to <owner file>` command. It checks that the owner file cites the id, deletes the
  entry file, and marks the index row folded. It changes nothing when a check fails.
- `status` and `check` print `fold: due (N active, threshold T, mode M)` or `fold: not due`.
- Fold mode in `config.json`: `ask` (default) waits for approval; `auto` applies the fold table at
  once. Set it with `init --fold ask|auto`. The trigger block tells agents to act on `fold: due`.
- `status` prints `setup: update` when the repo copy is older than the skill.
- `fold` refuses an owner path with characters the index cannot hold, and an owner that is a
  symlink into the lessons folder. It checks both before it changes anything.
- `check` fails on an id used by two index rows or two entry files. `fold` refuses such an id
  before it changes anything.
- `find` labels a retired lesson `(retired: do not follow)`.
- Index rows may be indented. `new`, `find`, `check`, and `fold` read them the same way.

### Fixed

- CI on Windows. Two kinds of test setup could not run there:
  - a file named `team|rules.md` (Windows forbids `|` in a file name);
  - file symlinks (Windows needs Developer Mode or admin rights).

  The first now skips writing the file on Windows. The symlink tests are skipped where the OS cannot create a
  file symlink. Folder symlinks use junctions, which work on Windows without extra rights.
- CI uses `actions/checkout@v5` and `actions/setup-node@v5`, which run on Node 24.
- The supported Node version is now 22 or later, the versions CI tests. Node 20 reached end of life
  on 2026-04-30, and the `skills` CLI already needs Node 22.20.
- `init`, `new`, and `fold` refuse to write when a file in the lessons folder is a symlink to a
  place outside the repo. Areas refuse `|` and line breaks.
- The repo copy finds its root through the `dir` stored in `config.json` first, so a project inside
  a larger git repo keeps its own root.
- `init` refuses a lessons folder or a target that is a symlink to a place outside the repo, and a
  lessons folder name with characters other than letters, digits, `.`, `_`, `-`, and `/`.
- `README.md` (English) and `README.id.md` (Bahasa Indonesia), with diagrams and badges in `assets/`.
- `tools/build-assets.mjs` (`npm run assets`): builds the diagrams, the badges, and the "Tested in real
  projects" card as SVG files. Logos are in `tools/icons/` with their sources in `SOURCES.md`.
- `SECURITY.md` and `CONTRIBUTING.md`.
- Path guards. The script ignores a trigger block that points outside the repo. `init` writes
  only to `AGENTS.md`, `CLAUDE.md`, and `GEMINI.md`. `config.json` citation roots and folded
  destinations must stay inside the repo.
- Lesson ids continue past `L999`. `new` never writes over an existing lesson file.
- `check` reads index rows with or without spaces around the cells, and reports a broken row.
- `init` keeps every byte of the user text when it adds the trigger block.
- `evals/`: skill-creator test prompts, fixture repos, and a grader script.
