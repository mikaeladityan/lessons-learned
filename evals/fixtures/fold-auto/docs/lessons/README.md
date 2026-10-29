# Lessons learned

Mistakes and incidents that must not repeat, one rule each. Agents read this index before work starts, and
each rule also moves to the file an agent reads at the moment of the mistake (`lessons-learned` skill → Fold).

Find: `node docs/lessons/lessons.mjs find <keyword> ...`
Check: `node docs/lessons/lessons.mjs check`

A row with status `folded → <file>` has no entry file any more: its rule lives in that file.

## Index

| ID | Date | Area | Rule | Keywords | Status |
|---|---|---|---|---|---|
| L001 | 2026-10-23 | shell | Quote the heredoc delimiter whenever the body holds backticks or a dollar sign. | heredoc, backtick | active |
| L002 | 2026-10-23 | test | Run vitest with 'vitest run'; plain 'vitest' starts watch mode and never exits. | vitest, watch | active |
| L003 | 2026-10-23 | test | Filter vitest tests with '-t <name>', not '--grep'. | vitest, grep, filter | active |
| L004 | 2026-10-23 | shell | For a multi-line edit, use a small script with an exact-match assert instead of sed. | sed, multi-line | active |
| L005 | 2026-10-23 | shell | On macOS, pass an empty suffix to sed -i: sed -i '' 's/a/b/' file. | sed, macOS | active |
| L006 | 2026-10-23 | shell | Wait for a file with one until loop, never a chain of sleep calls. | sleep, wait | active |
| L007 | 2026-10-23 | code | Write the .js extension in every relative ESM import. | ESM, import, extension | active |
| L008 | 2026-10-23 | code | Use named exports only; default exports break the barrel re-exports. | export, default | active |
| L009 | 2026-10-23 | tooling | Add every new env key to .env.example in the same change. | env, dotenv | active |
| L010 | 2026-10-23 | tooling | Commit package-lock.json with every dependency change. | lockfile, npm | active |
| L011 | 2026-10-23 | review | In a review prompt, name every source file a claim must match. | review, prompt | active |
| L012 | 2026-10-23 | review | Treat a BLOCKED review with zero findings as unread, and run it again. | review, BLOCKED | active |
| L013 | 2026-10-23 | process | Write the failing test before the fix, and see it fail. | TDD, test first | active |
| L014 | 2026-10-23 | process | Map every business rule to a test name in the plan. | plan, business rule | active |
| L015 | 2026-10-23 | docs | Update CHANGELOG.md in the same change as the code. | changelog, docs | active |
| L016 | 2026-10-23 | security | Never log a token, a password, or a full request body. | secret, log, token | active |
