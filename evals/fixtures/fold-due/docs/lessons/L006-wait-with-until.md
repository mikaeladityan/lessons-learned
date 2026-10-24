# L006 — wait with until

Date: 2026-10-23 · Area: shell · Source: execution · Status: active
Keywords: sleep, wait

## Symptom

The agent hit a problem with wait-with-until.

## Cause

The agent assumed the default behavior of wait-with-until.

## Rule

Wait for a file with one until loop, never a chain of sleep calls.

## Guard

none yet

## Evidence

The fix commit.
