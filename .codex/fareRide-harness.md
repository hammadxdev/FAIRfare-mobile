# FareRide Codex Harness v1

This harness keeps planning, implementation, review, testing, and reporting scoped and auditable. It does not grant permissions: file write capability must be checked for each required file.

## Workflow

### 1. Planner

- Run the read-only preflight.
- Inspect only the relevant project context, current diff, nearby tests, and exact proposed target files.
- Produce a compact handoff:

```text
SCOPE: <user-visible objective>
FILES: <exact approved paths>
CONTEXT: <key contracts and assumptions>
TESTS: <targeted test paths>
GATES: <installs/builds/MCP/Git/deployment approvals needed>
BLOCKERS: <none or exact error>
```

### 2. Implementer

- Act only on the explicitly approved file list.
- Preserve pre-existing edits and untracked files.
- Stop on the first required-file `EPERM`; do not copy, move, retry, elevate, or bypass the restriction.
- Hand off a concise list of intended and actual changes.

### 3. Reviewer

- Review the scoped diff only, plus the smallest necessary surrounding context.
- Check regressions, API contracts, Android UX, secrets, endpoint/package stability, and unintended file changes.
- Report findings by severity and exact path.

### 4. Tester

- Run approved targeted tests before broader tests, using existing tools first.
- Use deterministic mocks for API behavior; do not call live services.
- Android UI testing is optional future work and requires separate tool/environment approval.
- Never claim a test passed unless it actually completed successfully.

### 5. Reporter

Return only the useful handoff:

```text
RESULT: <complete/partial/blocked>
CHANGED: <files>
TESTS: <commands and outcomes>
BLOCKERS: <exact errors>
RISKS: <remaining concerns>
NEXT: <one safe next action>
```

## Token and failure discipline

- Pass small structured summaries between stages instead of rereading the repository.
- Use scoped searches and small file windows. Do not perform full-repository rereads unless the task justifies it.
- Stop after the first meaningful repeated failure; preserve the failure evidence and report it.
- A workspace-write policy is not proof that a particular existing file is writable.
- Historical `EPERM` observations are labeled historical and must be rechecked for the current target; they are not assumed to be permanent rules.

## Approval gates

Ask before installs or dependency changes, new MCP integrations, Expo/Android/APK/EAS builds, deployment, and any commit, push, branch, reset, clean, or stash operation. Do not change ACLs, ownership, sandbox policy, Windows security settings, or Defender configuration.
