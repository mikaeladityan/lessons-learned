# Lesson template

`lessons.mjs new` writes this shape. Each section has one job.

```markdown
# L0NN — <Title: the rule in five words or fewer>

Date: YYYY-MM-DD · Area: <area> · Source: <source> · Status: active
Keywords: <words an agent would grep for: the tool, the error text, the rule id>

## Symptom

What was seen, as the agent saw it: the command, the error text, or the reviewer finding.
One to three sentences. Quote the error; do not describe it.

## Cause

The root cause, not the place where the symptom appeared. If the cause is a wrong assumption,
write the assumption.

## Rule

One sentence, command form, at most 20 words. This line goes into a skill, an instruction file,
or a rule table. It must stand alone without the story above.

## Guard

What now stops a repeat, with its location: a test name, a lint, a grep in CI, a skill step, a
line in AGENTS.md. "none yet" is allowed and means the guard is a follow-up.

## Evidence

The commit that fixed it, the review that found it, or the test that proves it.
```

## Worked example

```markdown
# L001 — Quote heredoc delimiters

Date: 2026-10-23 · Area: shell · Source: execution · Status: active
Keywords: heredoc, backtick, EOF, command substitution, shell

## Symptom

A heredoc that wrote a Markdown file ran `npm test` in the middle of the write. The file held
the test output where the text "`npm test`" should be.

## Cause

The delimiter was `<<EOF`, not `<<'EOF'`. With an unquoted delimiter the shell expands
backticks and `$(...)` inside the body.

## Rule

Quote the heredoc delimiter (`<<'EOF'`) whenever the body holds backticks, `$`, or code.

## Guard

A line in `AGENTS.md` under "Shell" cites L001.

## Evidence

The fix commit that rewrote the file with a quoted delimiter.
```

## Writing rules

`check` enforces some of these. The rest keep lessons readable for the next agent, which may be
a different model with less context.

- **Short sentences.** At most 22 words for a description. At most 20 words for the rule.
- **One instruction per sentence.** Two rules are two lessons.
- **The same word for the same thing.** Do not switch between "check", "gate", and "verify" for
  one step.
- **Quote, do not paraphrase.** Copy error text and commands exactly, in backticks.
- **The title is the rule, not the incident.** Write "Quote heredoc delimiters", not "Heredoc
  broke".
- **No private paths, secrets, or person names.**
  - Use repo-relative paths.
  - Use roles: "the reviewer", "the user".
  - `check` warns on `/Users/`, `/home/`, and `C:\Users\`.
  - `check` fails on a token shaped like a credential. Replace it with `<redacted>`, then rotate it.
- **Keywords are what a future agent would search for:** the tool name, a fragment of the error,
  a rule id.
