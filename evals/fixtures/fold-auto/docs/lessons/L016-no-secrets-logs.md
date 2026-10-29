# L016 — no secrets logs

Date: 2026-10-23 · Area: security · Source: execution · Status: active
Keywords: secret, log, token

## Symptom

The agent hit a problem with no-secrets-logs.

## Cause

The agent assumed the default behavior of no-secrets-logs.

## Rule

Never log a token, a password, or a full request body.

## Guard

none yet

## Evidence

The fix commit.
