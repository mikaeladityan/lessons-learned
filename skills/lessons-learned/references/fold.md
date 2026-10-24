# Fold: move lessons into their owner files, then delete them

A lesson file is a story. The agent that is about to repeat the mistake does not read stories. It
reads the file it is working in: the instruction file, the skill step, the test. The fold puts
each rule there and removes the lesson file, so the lessons folder stays short enough to read.

## When

- `lessons.mjs status` or `check` prints `fold: due (N active, threshold T, mode M)`.
- Or the user asks.

## Mode

`config.json` holds the mode. The user chooses it at setup (`init --fold ask|auto`).

| Mode | What you do |
|---|---|
| `ask` (default) | Build the fold table. Show it. Stop until the user approves. |
| `auto` | Build the fold table. Show it. Apply it in the same turn. Keep a lesson when its owner is unclear. |

Fold in its own change (recommended branch: `docs/lessons-fold-YYYY-MM-DD`), never inside a
feature or bugfix change. A fold edits rules that every later task obeys, so it deserves its own
review.

## Steps

1. **Run `lessons.mjs audit`.** It prints each active lesson, its guard, and the files that already
   cite its id. It searches the `citationRoots` in `config.json`.
2. **Read each entry file, then decide one of three:**

   | Decision | When |
   |---|---|
   | **Fold** | One owner file is clear, and the work that produced the lesson is finished. |
   | **Keep** | Its branch or review is still open, or no owner file fits yet. |
   | **Retire** | The tool or the rule changed, and the lesson is now wrong. See SKILL.md → Retire. |

3. **Find the owner: the file the agent reads at the moment of the mistake.**

   | Area | Typical owner |
   |---|---|
   | `code`, `security` | The skill or rules document for that layer. Else a "Code" section in `AGENTS.md` / `CLAUDE.md`. |
   | `test` | The testing skill or testing document. Else a "Tests" section in the instruction file. |
   | `review` | The review prompt or review checklist. |
   | `process`, `docs` | The workflow document or the phase skill (plan, execute, finish). |
   | `shell`, `tooling` | The skill that runs the command. Else a "Shell" section in the instruction file. |
   | custom areas | The document that owns that part of the stack. |

   A rule that a lint, a test, or a CI grep can enforce is better there than in prose. Still write
   one line in a document that cites the id, so `check` can trace it.
4. **Group the lessons by owner.**
   - Merge two lessons that say the same thing into one rule.
   - Write the rule as a command line of the owner file, with a short reason. The line must stand
     alone.
   - Compare the new line with the lesson rule word by word, and keep every condition. "In the
     same commit", "before the first edit", and "only on CI" are easy to lose. A rule without its
     condition is a different rule.
   - Count the words: at most 20 for an instruction.
5. **Show the fold table to the user.** In mode `ask`, stop for approval. Delete nothing before
   approval. In mode `auto`, go on to step 6.

   | Lesson | Decision | Owner file → section | New or changed line |
   |---|---|---|---|
   | L004 | Fold | `AGENTS.md` → Shell | Quote the heredoc delimiter when the body holds backticks or `$`. (L004) |
   | L007 | Keep | — | Its review is still open. |

6. **For each folded lesson:**
   1. Write the line into the owner file. End it with the lesson id, for example `(L004)`.
   2. Run `lessons.mjs fold L004 --to AGENTS.md`. It checks that the owner file cites the id. Then
      it deletes the entry file and sets the index row to `folded → AGENTS.md`. It refuses, and
      changes nothing, when the owner file does not cite the id.
7. **Run `lessons.mjs check && git commit ...`.** `fold` already ran the check once. Run it again
   with the commit, so a later edit cannot slip through.
8. **Optional:** if your team uses a second reviewer (a human, or another model), send the fold
   change to it. It changes rules that every later task follows.

## Why the row stays

- `new` never reuses an id. A folded id given out again would make old references point at the
  wrong rule.
- Old citations in reviews, plans, and commit messages still resolve through the index.
- `find` prints `→ read <owner file>` for a folded hit, so a search still lands on the rule.

Do not rewrite historical records to remove an id.
