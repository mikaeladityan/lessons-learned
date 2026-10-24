# L005 — mac sed inplace

Date: 2026-10-23 · Area: shell · Source: execution · Status: active
Keywords: sed, macOS

## Symptom

The agent hit a problem with mac-sed-inplace.

## Cause

The agent assumed the default behavior of mac-sed-inplace.

## Rule

On macOS, pass an empty suffix to sed -i: sed -i '' 's/a/b/' file.

## Guard

none yet

## Evidence

The fix commit.
