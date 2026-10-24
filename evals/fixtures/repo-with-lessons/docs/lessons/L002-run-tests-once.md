# L002 — Run vitest once, not watch

Date: 2026-10-23 · Area: test · Source: execution · Status: active
Keywords: vitest, watch, hang, npm

## Symptom

The agent hit a problem with vitest watch mode.

## Cause

The agent assumed the default behavior of vitest watch mode.

## Rule

Run vitest with 'vitest run'; plain 'vitest' starts watch mode and never exits.

## Guard

none yet

## Evidence

The fix commit.
