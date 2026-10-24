# Contributing

Thanks for helping. Keep changes small and focused.

## Setup

You need Node 22 or later. There is nothing to install.

```bash
npm test         # all tests
npm run check    # syntax check of the script
```

## Rules for a change

- Write the failing test first. Then make it pass.
- Keep `lessons.mjs` one file of plain JavaScript with zero dependencies.
- When you change `lessons.mjs`, bump `VERSION` and the `package.json` version together.
  `tests/repo.test.mjs` fails until they match.
- After a version bump, copy the script into `evals/fixtures/*/docs/lessons/`.
- When you change the trigger block, update `references/agent-files.md`. A test compares the two.
- Write docs in short sentences: at most 20 words for an instruction, 25 for a description.
- Update `CHANGELOG.md`.
- To change a diagram or a badge, edit `tools/build-assets.mjs`. Then run `npm run assets`.

## Skill text

`SKILL.md` and `references/` are read by many agents and models. Test a change to them with the
prompts in `evals/evals.json` before you open a pull request.
