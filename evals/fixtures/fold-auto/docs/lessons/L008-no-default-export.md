# L008 — no default export

Date: 2026-10-23 · Area: code · Source: execution · Status: active
Keywords: export, default

## Symptom

The agent hit a problem with no-default-export.

## Cause

The agent assumed the default behavior of no-default-export.

## Rule

Use named exports only; default exports break the barrel re-exports.

## Guard

none yet

## Evidence

The fix commit.
