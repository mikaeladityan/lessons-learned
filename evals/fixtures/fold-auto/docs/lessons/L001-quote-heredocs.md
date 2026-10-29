# L001 — quote heredocs

Date: 2026-10-23 · Area: shell · Source: execution · Status: active
Keywords: heredoc, backtick

## Symptom

The agent hit a problem with quote-heredocs.

## Cause

The agent assumed the default behavior of quote-heredocs.

## Rule

Quote the heredoc delimiter whenever the body holds backticks or a dollar sign.

## Guard

none yet

## Evidence

The fix commit.
