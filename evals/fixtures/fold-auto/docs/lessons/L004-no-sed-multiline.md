# L004 — no sed multiline

Date: 2026-10-23 · Area: shell · Source: execution · Status: active
Keywords: sed, multi-line

## Symptom

The agent hit a problem with no-sed-multiline.

## Cause

The agent assumed the default behavior of no-sed-multiline.

## Rule

For a multi-line edit, use a small script with an exact-match assert instead of sed.

## Guard

none yet

## Evidence

The fix commit.
