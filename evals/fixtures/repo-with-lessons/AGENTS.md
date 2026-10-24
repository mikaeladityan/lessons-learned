# Project rules

Use ES modules.

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
