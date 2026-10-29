# L002 — vitest run not watch

Date: 2026-10-23 · Area: test · Source: execution · Status: active
Keywords: vitest, watch

## Symptom

The agent hit a problem with vitest-run-not-watch.

## Cause

The agent assumed the default behavior of vitest-run-not-watch.

## Rule

Run vitest with 'vitest run'; plain 'vitest' starts watch mode and never exits.

## Guard

none yet

## Evidence

The fix commit.
