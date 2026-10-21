# FareRide Codex Instructions

FareRide is an Expo Android ride-fare comparison application. Preserve the FareRide brand; do not change Android package identifiers or production API endpoints without explicit approval.

- Scope is `D:\ride\mobile` only. Treat `D:\ride\backend` as read-only and never access `D:\ride\frontend`.
- Preserve all pre-existing modified and untracked files, including APKs. Never reset, clean, stash, commit, push, deploy, or silently repair unrelated changes.
- Run the read-only preflight before implementation. Planning is read-only; implementation requires an explicit file list and approval.
- Verify write capability per file. On `EPERM` for a required file, report the exact path and stop; never bypass, retry with another identity, or change security settings.
- Use scoped `rg` searches and targeted file reads. Avoid full-repository rereads and repeated failed attempts.
- Follow Planner → Implementer → Reviewer → Tester → Reporter. Test only approved, relevant paths first; never claim unrun tests passed.
- Installs, MCP changes, builds, APK/EAS work, deployment, and all Git mutations require explicit approval.
