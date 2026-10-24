# L001 — Quote heredoc delimiters

Date: 2026-10-23 · Area: shell · Source: execution · Status: active
Keywords: heredoc, backtick, EOF

## Symptom

The agent hit a problem with heredoc quoting.

## Cause

The agent assumed the default behavior of heredoc quoting.

## Rule

Quote the heredoc delimiter whenever the body holds backticks or a dollar sign.

## Guard

none yet

## Evidence

The fix commit.
