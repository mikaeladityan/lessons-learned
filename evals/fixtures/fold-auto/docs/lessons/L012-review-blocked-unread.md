# L012 — review blocked unread

Date: 2026-10-23 · Area: review · Source: execution · Status: active
Keywords: review, BLOCKED

## Symptom

The agent hit a problem with review-blocked-unread.

## Cause

The agent assumed the default behavior of review-blocked-unread.

## Rule

Treat a BLOCKED review with zero findings as unread, and run it again.

## Guard

none yet

## Evidence

The fix commit.
