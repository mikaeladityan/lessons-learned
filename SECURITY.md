# Security policy

## What this project does with your files

`lessons.mjs` reads and writes only inside your repo:

- the lessons folder (default `docs/lessons/`);
- `AGENTS.md`, `CLAUDE.md`, and `GEMINI.md`, only between the `<!-- lessons-learned:start -->` and
  `<!-- lessons-learned:end -->` markers.

It refuses a lessons folder, a target, a citation root, or a folded destination outside the repo.
`audit` never opens a citation root or file whose real path is outside the repo, so a symlink cannot
widen what it reads.

Lessons are committed. `check` fails when a lesson holds a token shaped like a GitHub, AWS, OpenAI,
Anthropic, or Slack credential, or a private key header, in a lesson file or the index. No command prints the token: output is redacted. If it
fires, remove the token and rotate it: it may already be in git history.
It makes no network calls and runs no other programs.

## Reporting a vulnerability

Please do not open a public issue for a security problem. Use
[GitHub private vulnerability reporting](https://github.com/mikaeladityan/lessons-learned/security/advisories/new)
instead. Include the steps to reproduce and the version (`node docs/lessons/lessons.mjs status`).
