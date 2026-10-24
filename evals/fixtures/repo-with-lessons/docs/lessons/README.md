# Lessons learned

Mistakes and incidents that must not repeat, one rule each. Agents read this index before work starts, and
each rule also moves to the file an agent reads at the moment of the mistake (`lessons-learned` skill → Fold).

Find: `node docs/lessons/lessons.mjs find <keyword> ...`
Check: `node docs/lessons/lessons.mjs check`

A row with status `folded → <file>` has no entry file any more: its rule lives in that file.

## Index

| ID | Date | Area | Rule | Keywords | Status |
|---|---|---|---|---|---|
| L001 | 2026-10-23 | shell | Quote the heredoc delimiter whenever the body holds backticks or a dollar sign. | heredoc, backtick, EOF | active |
| L002 | 2026-10-23 | test | Run vitest with 'vitest run'; plain 'vitest' starts watch mode and never exits. | vitest, watch, hang, npm | active |
