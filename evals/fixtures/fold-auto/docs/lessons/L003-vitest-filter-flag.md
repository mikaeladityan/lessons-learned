# L003 — vitest filter flag

Date: 2026-10-23 · Area: test · Source: execution · Status: active
Keywords: vitest, grep, filter

## Symptom

The agent hit a problem with vitest-filter-flag.

## Cause

The agent assumed the default behavior of vitest-filter-flag.

## Rule

Filter vitest tests with '-t <name>', not '--grep'.

## Guard

none yet

## Evidence

The fix commit.
