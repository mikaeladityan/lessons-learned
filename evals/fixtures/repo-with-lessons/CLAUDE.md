<!-- lessons-learned:start -->
## Lessons learned

This repo records agent mistakes as lessons in `docs/lessons/` so they do not repeat.

- Before you start a task, run `node docs/lessons/lessons.mjs find <keywords>` and read every hit.
- After an error, a blocked or retried command, a failed check, or a user correction, record a lesson before the next task: use the `lessons-learned` skill, or run `node docs/lessons/lessons.mjs new` and fill the five sections.
- End every task with `Lessons: L0NN | none — <reason>`, after `node docs/lessons/lessons.mjs check` passes.
- Gate commits on it: `node docs/lessons/lessons.mjs check && git commit ...`.
<!-- lessons-learned:end -->
