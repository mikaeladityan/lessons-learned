# Security policy

## What this project does with your files

`lessons.mjs` reads and writes only inside your repo:

- the lessons folder (default `docs/lessons/`);
- `AGENTS.md`, `CLAUDE.md`, and `GEMINI.md`, only between the `<!-- lessons-learned:start -->` and
  `<!-- lessons-learned:end -->` markers.

It refuses a lessons folder, a target, a citation root, or a folded destination outside the repo.
It makes no network calls and runs no other programs.

## Reporting a vulnerability

Please do not open a public issue for a security problem. Use
[GitHub private vulnerability reporting](https://github.com/mikaeladityan/lessons-learned/security/advisories/new)
instead. Include the steps to reproduce and the version (`node docs/lessons/lessons.mjs status`).
