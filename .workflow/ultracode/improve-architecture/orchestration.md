# Orchestration — Improve Codebase Architecture

## Parent critical path
1. Spawn 4 read-only explorer subagents (parallel, background).
2. Wait for all 4 to complete.
3. Read each result file; integrate.
4. Spot-check claims against source.
5. Write `integration.md` + `final-report.md` (the deliverable plan).
6. Report to user.

## Packets & owners
| Packet | Owner | Profile | Scope |
| --- | --- | --- | --- |
| A | subagent (background) | subagent_explore | lib/ tide-engine duplication |
| B | subagent (background) | subagent_explore | lib/ data services + org overlap + taxonomy |
| C | subagent (background) | subagent_explore | components/ dedup clusters |
| D | subagent (background) | subagent_explore | hygiene + tests + config |

## Agents to spawn
4 background `subagent_explore` agents, launched in one message (parallel).

## Delegation count / waves / fallback
- Count: 4 sidecar agents (within the ≤5 default cap).
- Waves: 1 exploration wave. No write wave (read-only audit).
- Fallback: if any agent fails or returns thin evidence, parent re-runs that
  packet as an isolated parent-session pass.

## Wait points
Block on all 4 agents after spawning (their output is the integration input).

## Verification order
1. Completeness: every packet returned a result file with evidence.
2. Consistency: reconcile B's taxonomy with A's canonical picks.
3. Spot-check: 3 dead + 3 canonical claims verified via grep.
4. No-edits check: read-only profile guarantees; confirm no file mtime changes.

## Fallback if delegation unavailable
Native `run_subagent` is available (delegated mode permitted). Not needed.
