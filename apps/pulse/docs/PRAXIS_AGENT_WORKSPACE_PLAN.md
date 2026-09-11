# Praxis Agent Workspace — Implementation Plan

Status: implementation in progress; P0–P3 and the P5 baseline are implemented, with P4 semantic-provider verification and P6 output-parity extraction remaining.
Owner: Taz. Intended executor: Luna or the next implementation session.
Source inspection: September 11, 2026.
Scope: replace the Command Center interface with a microphone-driven, multi-agent workspace while reusing the existing command execution backend.

Execution guide: start with the package sequence in section 5, then use [section 8's line-anchored edit instructions](#8-line-anchored-implementation-instructions). Existing-file line numbers are verified snapshot anchors; new files use declaration/statement order.

## 1. Product contract

The user spawns agents. While microphone capture and an agent's automatic listening are enabled, that agent receives the shared finalized speech and decides whether to ignore it, wait for more context, or submit a query. Selecting a panel does not determine which agents can hear the conversation.

Every agent also has a visible editable submission field and a **Submit now** button. Manual submission sends that exact visible text to that agent, bypassing the relevance decision, but not execution limits or existing API checks.

This is not a collection of independent microphone sessions, a compulsory chat-prompt interface, or an autonomous platform rebuild.

Required end state:

- One microphone capture owner and one shared transcript.
- Several explicitly spawned agent sessions, each mapped to an existing worker.
- Independent per-agent listening decisions and results.
- A manual button that works with typed text even without microphone support.
- Existing command progress, deliverables, sources, supervisor review, and actions remain available.
- The new interface replaces the default UI at `/command-center`.
- Existing navigation paths remain searchable through the shared route catalog.
- No changes to the public homepage, production data, deployment settings, permissions, or unrelated CMS features.

“Praxis” is the working design name. It need not rename the public product or URL.

## 2. Verified starting points

Line numbers are inspection anchors, not permanent patch offsets. Find the named symbol again before editing.

| Existing source | Relevant anchor | Consequence |
| --- | --- | --- |
| [Command Center page](../app/command-center/page.tsx) | Lines 1–12, `CommandCenterPage` | Currently mounts `AgentSelectionArena`; this is the eventual replacement boundary. Keep the page a server component and the interactive workspace a client component. |
| [Audio provider](../context/JamieAudioContext.tsx) | Lines 7–57, audio types/context; line 104, `JamieAudioProvider` | Shared provider already owns recognition and microphone lifecycle. Extend it rather than creating recognition per agent. |
| Same audio provider | Line 194, `recognition.onresult` | Final speech enters a private 30-second segment buffer; “pull that up” queues a query with a two-second review delay. Caption text also contains status messages, so it is not a reliable transcript event feed. |
| Same audio provider | Lines 276–323, pending timer, TTS events, context value | Preserve speech-output suppression and cleanup; prevent queued submissions surviving stop/mode changes. |
| [Jamie chat](../components/JamieChat.tsx) | Line 56, `chatApiRoute`; lines 456–461, submitted wake-query effect | The microphone currently feeds Jamie chat through `sendChatMessage`, not the command endpoint. Its single consumed query slot cannot be used as a broadcast queue. |
| [Command arena](../components/command-center/AgentSelectionArena.tsx) | Line 597, `runCommand`; line 634, POST request | Already submits selected worker, command, relay format, and supervisor settings to `/api/commands`. Reuse this contract. |
| Same command arena | `requestSupervisorReview`, `processSupervisorReviews`, `CommandActionPanel`, `buildCommandTraceExport` | Replacement must retain working review, output, action, and evidence features—not just the query form. |
| [Agent run hook](../components/agent-console/useAgentConsoleRun.ts) | `runAgentJob` | Second existing command client; currently owns only one run/result. Do not use a shared global `running` boolean for all new agents. |
| [Stream reader](../components/agent-console/agentConsoleCommandStream.ts) | `readCommandStream`, `parseServerSentEvent` | Reuse progress/result/error parsing, with focused fixes if extraction exposes framing or cancellation gaps. |
| [Command endpoint](../app/api/commands/route.ts) | Lines 22–33, `CommandRequestSchema`; `streamCommandResponse` | Accepts command, selectedWorkerId, relayMode, supervisor, and optional lead/listing/neighborhood IDs. It has no agent-session/history contract. |
| [Worker roster](../lib/command-center/workerRoster.ts) | `intelligenceWorkers` | Existing roles include listing-summary, buyer-intent, follow-up-writer, comp-analysis, neighborhood-explainer, agent-voice, and others. Do not invent unsupported worker IDs. |
| [Intent classifier](../lib/command-center/intentClassifier.ts) | `classifyCommandIntent` | Existing deterministic routing can help with initial relevance rules. Its confidence is a heuristic, not a calibrated probability. Forced worker selection must not be used as proof of relevance. |
| [App layout](../app/layout.tsx) | Lines 231–250, provider composition | Provider already wraps the normal application. Account for mock-mode layouts without nesting another microphone provider. |
| [Route directory](../components/command-center/CommandRouteDirectory.tsx) | Shared route catalog consumer | Keep this as the secondary navigation surface. Do not create a competing list of hard-coded paths. |

### Backend reuse, stated precisely

Reuse `POST /api/commands` for actual work. Keep its request shape and SSE/JSON behavior stable.

Agent IDs and per-agent run IDs can initially live in client state. Build a bounded command string from the assignment, recent relevant transcript, and that agent's own context. Do not send undocumented `agentId` or `history` fields and assume the server stores them.

The backend currently uses shared knowledge/query-memory facilities. Separate UI histories are not private backend memory isolation. Do not claim otherwise.

Semantic “should I act?” decisions need a small decision adapter; they are not already provided by microphone capture. A thin assessment endpoint is allowed if needed, but it must not execute the full command merely to decide whether to execute it.

## 3. Screen design

Desktop arrangement:

```text
Agent Workspace           [Mic off/on] [Pause automation] [Spawn agent]
----------------------------------------------------------------------
Agent rail        Shared conversation           Selected agent
                  Final transcript segments     Assignment and role
Listing summary   Interim caption, separate     Listening/activity state
Listening
                  Editable submission draft     Submitted query
Follow-up writer  [Use recent speech]           Progress
Working           [Submit now → agent name]     Result / Sources / Details
----------------------------------------------------------------------
Needs attention / Completed work              [Browse app paths]
```

Design rules:

1. A calm work surface, readable text, restrained status color. No animation-heavy replacement of the current arena.
2. Agent rail selection changes the visible panel and manual recipient only; all enabled spawned agents still evaluate eligible speech.
3. Each agent owns its own manual draft. Automatic runs never overwrite drafts.
4. “Use recent speech” explicitly copies finalized transcript into a draft. Untouched drafts may follow new finalized speech; once edited, they freeze until the user explicitly refreshes.
5. In manual mode, show the exact outgoing text and agent name. Do not silently submit interim speech.
6. Keep a concise activity entry for every auto submission: trigger excerpt, reason, time, and resulting run.
7. Ignore/wait decisions stay in expandable activity details, not notification popups.
8. Results are visual by default. Optional read-aloud uses the existing TTS events.
9. Mobile has Agents / Conversation / Work tabs. Keep microphone state and pause controls visible; no horizontal page overflow.
10. No agents on first visit. Show **Spawn your first agent** and explain what microphone access enables.
11. Unknown backend stage durations remain unknown. Do not invent percent-complete bars.

## 4. State and defaults

Create small serializable contracts under `lib/agent-workspace/`, with browser resources held in hooks/provider refs.

Suggested types:

- `TranscriptSegment`: sessionId, sequence, id, text, capturedAt, final.
- `AgentSession`: id, workerId, label, assignment, autoListenEnabled, spawnedAtSequence, draftText, draftDirty, transcriptCursor.
- `AgentRun`: id, agentId, triggerId, source (manual/automatic), submittedText, state, progress, response, error, startedAt, finishedAt.
- `AttentionDecision`: agentId, transcriptWindowId, action (ignore/wait/submit), reason, relevantSegmentIds.
- `WorkspaceState`: agentsById, agentOrder, selectedAgentId, runsById, transcript, automationPaused.

Listening state and execution state are separate. An agent may finish a run while automatic listening is paused.

Proposed first-release defaults, kept together in `workspacePolicy.ts` and covered by tests:

| Limit | Initial value / behavior |
| --- | --- |
| Spawned agents | 3; explain the limit rather than silently failing |
| Concurrent commands | 2 globally, 1 per agent |
| Automatic queue | 1 coalesced candidate per agent, not one job per sentence |
| Transcript relevance window | 30 seconds; keep stable segment IDs |
| Decision debounce | 1.5 seconds after new finalized speech; never assess interim tokens |
| Automatic command cooldown | 20 seconds per agent |
| Command budget | At most 4 automatic starts/minute and 20/hour per workspace |
| Semantic assessment budget | At most 6 requests/minute; batch all eligible agents in one assessment |
| Idle behavior | No model request or database polling without new eligible transcript |
| Persistence | Agent settings only; raw transcript/results in memory for this slice |
| Reload/navigation | No promise of continued background execution or restored live jobs |

These are conservative starting settings, not measured optimums. Manual clicks bypass relevance/cooldown but respect concurrency and duplicate protection. Show a busy message rather than building an unlimited manual queue.

Newly spawned/resumed agents hear new segments, not the entire previous conversation replayed automatically. The user can explicitly use prior transcript through manual submission.

## 5. Canonical implementation packages

Complete packages in order. Each package must leave its acceptance tests passing. Do not skip from a static mockup to route replacement.

### P0 — Freeze current behavior and map retained features

Files: existing audio tests, command route/stream tests, arena, and this plan.

Tasks:

1. Record the request body and progress/result/error event shapes from both command clients.
2. List the arena's output formats, source views, trace export, handoff/refinement, supervisor controls, and action handlers.
3. Identify which output subcomponents can be extracted without changing behavior.
4. Add missing characterization tests for the behavior being extracted; do not refactor unrelated chat or API flows.
5. Confirm the normal and mock layout provider boundaries.

Done when: a feature parity checklist exists in this document and every retained feature has an identified destination. No user-facing route changes yet.

P0 feature parity checklist (captured during implementation)

- [x] Command payload contract: `POST /api/commands` sends `command`, `selectedWorkerId`, optional `relayMode`, optional `supervisor`, and optional `context` IDs. The workspace preserves these keys and does not add agent/history fields.
- [x] Command events: stream clients consume `progress`, `result`, and `error` SSE events; JSON responses are accepted when no stream body is present. The workspace uses the shared stream reader.
- [x] Output formats: briefing, slideshow, puppetshow, field-board, and script remain backend relay modes. The workspace renders the deliverable, actions, sources, and trace summary; the legacy arena remains the retained parity reference.
- [x] Retained feature destinations: route directory stays shared; supervisor review, listing review/handoff, refinements, trace export, and action-item handlers remain in `AgentSelectionArena.tsx` until the dedicated P6 extraction; workspace results do not auto-execute action items.
- [x] Provider boundaries: `app/layout.tsx` still composes one `JamieAudioProvider`; normal, tenant, and minimal-chrome layout branches are unchanged. Workspace ownership is a lease on that provider, not a second recognition instance.
- [x] Legacy compatibility: `JamieChat` consumes the legacy submitted wake-query slot only outside workspace ownership; `/agent` and the original arena implementation are not removed.

### P1 — Shared finalized transcript, single capture owner

Modify `context/JamieAudioContext.tsx`, `components/JamieChat.tsx`, and the audio state/lifecycle tests.

Tasks:

1. Expose a bounded finalized-segment feed with stable session/sequence IDs. Keep interim caption separate from submission content.
2. Deduplicate recognition results by recognition generation/result index. Do not deduplicate speech solely by text, since people may intentionally repeat a sentence.
3. Add explicit submission ownership: legacy Jamie wake mode versus workspace mode. Workspace ownership suspends legacy wake-query generation/consumption; it does not create another microphone.
4. Preserve the legacy “pull that up” behavior outside the workspace.
5. On mode change, stop, permission loss, TTS pause, or workspace release, invalidate pending automatic submissions and assessment timers. Late events must check generation/ownership before dispatch.
6. Make microphone controls update the existing preference and provider consistently so a settings effect cannot immediately restart a stopped microphone.
7. Acquire/release workspace ownership on mount/unmount. Ownership and microphone permission remain separate: opening the workspace must not start capture automatically.
8. Maintain TTS suppression. Clear interim speech at the boundary and reject stale finalized callbacks from an earlier capture generation.
9. Display denied/unavailable states with a working typed-input fallback.

Done when: one recognition instance feeds several subscribers; no duplicated Jamie submission; stop prevents delayed submissions; existing legacy wake tests still pass.

### P2 — Agent sessions and manual submission

Create:

- `lib/agent-workspace/types.ts`
- `lib/agent-workspace/workspaceReducer.ts`
- `lib/agent-workspace/workspacePolicy.ts`
- `lib/agent-workspace/buildAgentCommand.ts`
- `components/agent-workspace/useAgentWorkspace.ts`
- `components/agent-workspace/useAgentCommandRun.ts`

Tasks:

1. Spawn independent sessions from the actual worker roster. Initially surface listing-summary, buyer-intent, and follow-up-writer; make remaining supported roles discoverable.
2. Give each instance a UUID, including two instances of the same worker.
3. Keep state updates keyed by agentId AND runId. Switching panels must not reroute a response.
4. Implement `submitToAgent({agentId, text, source, triggerId})` as the only entry to command dispatch.
5. Send the existing payload: command, selectedWorkerId, relayMode, supervisor, and only supported record context.
6. Reuse `readCommandStream` and existing response types. Handle non-OK and non-SSE JSON responses explicitly.
7. Build bounded context from this agent's assignment/history and relevant speech. Reserve room for the user's text within the endpoint's 20,000-character limit. Show a validation error for oversized manual text rather than silently trimming it.
8. Add per-run AbortController and stale-result rejection. Aborting client fetch does not guarantee server computation stops; label this honestly.
9. Keep raw speech out of new persistence/analytics. Existing backend logging behavior is unchanged and must not be described as local-only.
10. Keep conversation history in client state; no new database table or per-agent daemon.

Done when: two agents can submit and receive isolated results, manual text works with the microphone off, and a failed run cannot overwrite another agent's progress.

### P3 — Attention decisions and automatic scheduling

Create:

- `lib/agent-workspace/attentionPolicy.ts`
- `lib/agent-workspace/submissionScheduler.ts`
- `components/agent-workspace/useAgentAttention.ts`

Tasks:

1. Evaluate only finalized speech newer than each agent's cursor and within its active listening session.
2. Gate locally for new content, pause state, cooldown, duplicate trigger, and budgets before any semantic assessment.
3. Implement ignore/wait/submit decisions with a deterministic adapter for development and fixtures. This is rules-based relevance, not an LLM reasoning claim.
4. Use existing intent signals without forcing a worker before classification. Uncertain fragments should wait; generic fallback routing must not make every agent fire.
5. Add the semantic adapter described in P4 before claiming semantic autonomous listening complete.
6. Coalesce new transcript while an agent is busy; reassess the newest eligible window once capacity exists. Do not replay a backlog of stale utterances.
7. Reserve a submission key synchronously before network work: agentId + transcript window/trigger identity + normalized submitted text.
8. Manual submission of the same current speech claims the pending automatic trigger for that agent. If automation already started it, focus that run instead of submitting again.
9. New edited text is a deliberate new request, subject to capacity. Other agents may process the same speech for different assignments.
10. If a queued decision returns after pause, removal, recipient reassignment, microphone stop, or a manual claim, discard it.
11. Count started requests against the budget, including failures; do not retry uncertain POST executions automatically.
12. Implement Pause automation, per-agent pause, and microphone-off behavior. All cancel queued automatic starts; running jobs retain visible state.

Done when: realistic transcripts cause relevant agents to act and unrelated agents to stay quiet, without bursts, duplicate races, or restart loops.

### P4 — Bounded semantic attention adapter

This is the only planned new backend surface, if no existing side-effect-free assessor fits.

Proposed files:

- `lib/agent-workspace/attentionDecisionSchema.ts` — shared validation contracts.
- `lib/agent-workspace/assessAgentAttention.server.ts` — server-only adapter.
- `app/api/commands/attention/route.ts` — bounded assessment only.

Tasks:

1. Accept eligible agent roles/assignments, transcript segment IDs/text, and a window ID. Limit agents, text length, and response size.
2. Return one validated ignore/wait/submit decision per supplied agent with short reasoning and relevant segment IDs.
3. The assessor must not call `runCommandCenterCommand`, retrieve full atlases, write command memory, use tools, or execute application actions.
4. Compose the actual submitted command from selected original transcript segments client-side. Do not allow the assessor to silently invent facts or arbitrary commands.
5. Reuse an existing configured model/provider integration where suitable; inspect installed SDK documentation before implementing calls. No provider migration or new agent framework is required.
6. Preserve the applicable command access pattern for the new endpoint; this is not a permission redesign.
7. Time out assessment and return a visible fallback mode. On missing configuration/malformed output, use conservative rules-based decisions or wait; manual submission remains available.
8. Bound actual assessment calls server-side as well as client-side using existing available request-limit conventions. Do not introduce a database polling loop.
9. Surface whether attention is semantic or rules-based. Show request counts; report token/cost data only if actually available.

Done when: mocked semantic output is validated, unknown agent/segment IDs are rejected, and a real configured-provider smoke test demonstrates assessment without triggering command execution itself. Record an unavailable provider as unverified rather than quietly claiming completion.

### P5 — Build the replacement workspace UI

Create components under `components/agent-workspace/`:

- `AgentWorkspace.tsx`: layout and coordinator.
- `AgentRail.tsx`: selection, states, pause, remove.
- `SpawnAgentDialog.tsx`: role, label, assignment, automatic-listening toggle.
- `WorkspaceMicControls.tsx`: shared microphone state and pause automation.
- `SharedTranscript.tsx`: bounded final transcript plus separate interim caption.
- `AgentComposer.tsx`: per-agent editable draft, use recent speech, Submit now.
- `AgentActivity.tsx`: triggers, waiting/budget reasons, errors, retry.
- `AgentResults.tsx`: reuse extracted result/action/evidence views.

Tasks:

1. Implement the desktop and mobile arrangements from section 3.
2. Use separate list selection and listening controls; do not couple selectedAgentId to transcript fan-out.
3. Preserve scroll position when reading old transcript/results; offer “Jump to latest.”
4. Keep pending manual edits on agent switch and automatic completion.
5. Ask before discarding a nonempty draft on agent removal. Explain the treatment of any in-flight run.
6. Provide keyboard-accessible dialogs/tabs/buttons, clear focus restoration, and restrained live announcements.
7. Add empty, busy, paused, denied, unsupported, assessment-unavailable, error, and budget-exhausted states.
8. Include `CommandRouteDirectory` rather than reimplementing the 113-path catalog.
9. Store optional agent configuration using a versioned, account-scoped preference key; default auto listening off after reload. Do not restore stale running states.

Done when: the complete screen works with mocked audio and real existing command transport; every essential control has a test.

### P6 — Output parity and route cutover

Modify `app/command-center/page.tsx` only after P1–P5 acceptance criteria pass.

Tasks:

1. Extract reusable arena output/rendering functions structurally into shared components as needed. Keep tests covering their contracts.
2. Preserve briefing, slideshow, puppetshow, field-board, script, copy/export, sources, trace inspection, refinements, and worker handoff where currently implemented.
3. Retain supervisor review and existing action handlers as explicit per-run operations. Do not automatically execute action buttons merely because a command was automatically submitted.
4. Mount `AgentWorkspace` as the default Command Center UI; update metadata.
5. During local development a query-controlled legacy view may help comparison. Do not add an extra route or permanently maintain two divergent command systems.
6. Keep `/agent` working with its current preferences and starter jobs. Link it to the replacement workspace; migrating that screen is a separate decision.
7. Update the route catalog's description, not its URL. Preserve route count/README inventory unless actual source routes change.
8. Remove obsolete arena code only after parity is demonstrated and imports are checked.

Done when: `/command-center` defaults to the new workspace, old links still work, and existing non-workspace Jamie/Agent Console behavior remains intact.

### P7 — Verification and documentation

Add focused suites:

- `tests/unit/agent-workspace-state.test.ts`
- `tests/unit/agent-workspace-attention.test.ts`
- `tests/unit/agent-workspace-scheduler.test.ts`
- `tests/unit/agent-workspace-command.test.tsx`
- `tests/unit/agent-workspace-ui.test.tsx`
- `tests/unit/command-attention-route.test.ts`
- `tests/agent-workspace.spec.ts`

Extend rather than replace the existing audio, command contract, stream, route inventory, and Agent Console tests.

Critical scenarios:

1. Two spawned agents hear the same finalized sentence; only the relevant one submits.
2. A later sentence completes an initially incomplete thought.
3. Selecting another agent panel does not change listening subscriptions.
4. Manual click and automatic decision race produces one execution for that agent/trigger.
5. Two instances of one worker keep independent drafts, histories, and responses.
6. A result arrives out of order or after agent removal; no wrong-panel update.
7. Pause, stop, unmount, permission denial, and TTS block delayed submissions.
8. Recognition restart/repeated callbacks do not replay old work.
9. Busy agents coalesce new context; budgets are visible and cannot grow an unbounded queue.
10. Malformed/empty/failed responses and partial stream chunks produce recoverable errors.
11. Legacy wake behavior outside the workspace and `/agent` still function.
12. All retained output formats and explicit action workflows remain reachable.
13. Desktop and 390px mobile layouts have usable controls, no overflow, and keyboard access.
14. Real-browser microphone verification is recorded separately from mocked transcript tests.

Documentation changes at completion:

- Link this plan near the top of the root README; describe the feature as planned until cutover.
- At cutover update Command Center instructions and microphone limitations.
- Document that live listening stops when the workspace is closed and client abort may not cancel server work.
- Record observed provider/browser behavior and test results; do not claim production verification from local fixtures.
- Keep PR/CI status checking and deployment work outside this implementation plan.

## 6. Acceptance walkthrough for Taz

1. Open Command Center: no microphone starts unexpectedly.
2. Spawn Listing Summary and Follow-Up Writer; see two distinct panels.
3. Enable the microphone and both agents' automatic listening.
4. Speak a listing description. Relevant work appears with the triggering words and reason; unrelated agents remain quiet.
5. Say you need a follow-up message. Follow-Up Writer responds using the available conversation context without inventing a recipient or sending anything.
6. Edit the visible text and click Submit now. Confirm that agent receives your exact edits and incoming speech does not overwrite them.
7. Pause one agent; keep speaking. Only enabled agents consider new speech.
8. Pause automation; manually submit text successfully.
9. Turn the microphone off while a decision is pending. No new automatic command starts afterward.
10. Inspect results, sources, formats, supervisor controls, and Browse app paths.
11. Reload: no automatic microphone restart and no false “still working” job.
12. Repeat on mobile and verify typed fallback when speech recognition is unavailable.

## 7. Sequence, estimates, and completion accounting

Working estimate, not a deadline:

| Package | Effort |
| --- | --- |
| P0 contracts/parity map | 1–2 hours |
| P1 transcript ownership | 3–5 hours |
| P2 sessions/manual execution | 3–5 hours |
| P3 scheduler/relevance | 3–5 hours |
| P4 semantic adapter | 2–4 hours |
| P5 workspace UI | 4–6 hours |
| P6 parity/cutover | 3–5 hours |
| P7 verification/docs | 3–5 hours |
| Total | 22–37 hours |

First useful milestone: P0–P2, with manual per-agent execution and the shared transcript.
Autonomous-listening milestone: P3–P4.
Replacement milestone: P5–P7 with retained features verified.

Current completion: P0–P3 and the P5 baseline are implemented. The bounded attention route is rules-based and explicitly does not claim semantic-provider verification. P6 retains the legacy arena behind `/command-center?legacy=1` for comparison while output extraction and full parity remain open; P7 browser verification and final documentation remain open.

Implementation handoff record (September 11, 2026):

1. Changed `JamieAudioContext.tsx`, `JamieChat.tsx`, the shared stream reader, the command-center page/catalog, new `lib/agent-workspace/*`, new `components/agent-workspace/*`, the bounded attention route, and focused unit/browser specs.
2. Implemented: one shared finalized transcript feed, workspace ownership lease, legacy wake suppression in workspace mode, independent spawnable agent sessions, per-agent drafts/runs, bounded manual/automatic command dispatch, rules-based attention, concurrency/cooldown/budget guards, retry/cancel visibility, mobile-aware UI, and versioned account-scoped role preferences.
3. Focused verification passed: 34 unit tests across audio, stream, state, attention, scheduler, command, route, catalog, and UI suites; `npm run lint` passed with two pre-existing warnings; production build completed successfully (the existing `/api/kepler/listings` static-generation diagnostic remained non-fatal).
4. Compatibility notes: semantic attention is not verified against a configured provider; automatic attention therefore displays rules-based mode. Client aborts are labeled as unable to guarantee server cancellation. Full arena output/action/review extraction is still the next P6 package.
5. Next package: P6, beginning with extracting arena result views and per-run action/review handlers before removing the legacy comparison surface.

Deferred deliberately: always-on server agents, cross-device live sessions, scheduling/cron, separate agent databases, raw audio storage, arbitrary plugin installation, new model-provider architecture, redesigning `/agent`, and autonomous production mutations.

Next executable action: P0, then P1. Do not begin by replacing the page or rewriting the backend.

## 8. Line-anchored implementation instructions

This section expands P0–P7 into edit operations. It takes precedence over a less-specific instruction earlier in the plan. Existing source anchors were checked on September 11, 2026. New-file lists specify declaration/statement order, not fabricated source line numbers.

Before each edit, search for the symbol and inspect the surrounding code. Do not apply an old numeric range blindly. Application implementation is still pending: snippets below describe proposed code, not installed functionality.

### 8.1 P0 — Extract the full command contracts before writing the new run hook

**Existing file: `components/command-center/AgentSelectionArena.tsx`**

| Current lines / symbol | Exact edit operation | Preserve |
| --- | --- | --- |
| 37, `RelayMode` | Move the union into new `lib/command-center/clientContracts.ts`; export it and import it back using `import type`. | All five existing relay values. |
| 39–325, `CommandResponse`, `WorkflowTrace`, `CommandProgressEvent` | Move the complete declarations into that same type-only module. Bring their type dependencies with them. | Every optional field, trace branch, listing fact, source, action item, and deliverable field. Do not substitute the smaller Agent Console response type. |
| 326–327, trace-derived aliases | Export only aliases needed by extracted output components; keep other arena-local aliases local. | Derivation from the complete response contract. |
| 1087–1158, `safeJson`, `readCommandStream`, parser/progress helpers | Replace duplicated transport helpers with imports from the shared client transport described below, once both clients pass contract tests. | Existing SSE event names and progress upsert semantics. |
| Imports at top | Import types from the type-only contracts module. | Do not import the filesystem-backed command router into a client component. |

**Existing file: `components/agent-console/agentConsoleConfig.ts`, lines 10 and 27–60**

1. Keep `StarterJob`, preferences, examples, and starter-job data unchanged.
2. Keep compatibility for existing Agent Console fixtures that intentionally provide only its smaller response shape.
3. Introduce a named `AgentConsoleResponse` for that projection, retaining a compatibility export if existing consumers need it.
4. Do not force minimal Agent Console test fixtures to pretend they contain full arena traces.
5. Let the shared stream transport decode an unknown result, then use caller-specific validation/narrowing for the full workspace result versus the smaller console projection.
6. Never resolve the mismatch with `as any` or by deleting richer fields.

**Proposed file: `lib/command-center/commandClient.ts`**

Declaration order:

1. Import browser-safe result/progress types.
2. Define `CommandClientError` with status and a safe display message.
3. Define a small `readErrorBody(response)` helper that tolerates empty or non-JSON error bodies.
4. Export `submitCommand(input, {signal, onProgress})`.
5. Inside it, POST to `/api/commands`, request SSE, and pass `signal`.
6. Check `response.ok` before selecting a response parser.
7. Branch on Content-Type: SSE uses the shared stream reader; JSON uses guarded JSON parsing.
8. Validate the fields that the caller needs before rendering: command ID, worker identity, result/deliverable, and relevant trace structure.
9. Throw a recoverable error for empty JSON, malformed result, SSE error, or a stream ending without a result.
10. Return data; do not mutate React state, select an agent, save history, or trigger another command here.

**Existing file: `components/agent-console/agentConsoleCommandStream.ts`, `readCommandStream`**

- Extract shared parsing into `lib/command-center/commandStream.ts`; keep a compatibility wrapper/re-export for existing imports.
- Keep incremental TextDecoder use; support both LF and CRLF frame separators across chunk boundaries.
- Flush decoder and process a final buffered event at EOF even without a trailing blank line.
- Surface malformed result/error frames rather than silently returning a previous unrelated payload.
- Release the reader lock in `finally`; cancel the reader when abandoning the stream.
- Add an optional abort path without claiming that stopping the client cancels server execution.
- Test this extraction before changing the page component.

**P0 evidence:** snapshot the outgoing payload keys and existing rendered output features. Do not change `app/api/commands/route.ts` or `commandRouter.ts` for this extraction.

### 8.2 P1 — Extend `JamieAudioContext.tsx` in source order

| Current anchor | Code change |
| --- | --- |
| Line 3, React imports | Add only hooks needed by the new implementation. Keep recognition objects, MediaStream, timers, and lease tokens in refs, not serialized state. |
| Line 8, private `TranscriptSegment` | Retain compatibility with `recentTranscript` and its existing fixtures. Define an exported finalized-event type separately or accept the old helper input shape. Do not break all fixtures merely to add session IDs. |
| Lines 12–25, state/actions | Add `finalizedSegments`, `transcriptSessionId`, `latestSequence`, `submissionOwner`, and `submissionEpoch`. Add actions for appended final speech, pruning, ownership changes, and pending-submission invalidation. |
| Lines 47–52, context interface | Expose finalized segments, stable lease acquire/release methods, and explicit workspace microphone methods. Keep start/stop/cancel/consume available to legacy callers. |
| Lines 54–56, constants | Retain the current 30-second legacy wake window and two-second review delay. Put workspace scheduling defaults in its own policy module; do not change legacy timing globally. |
| Lines 59–64, initial state | Initialize an empty feed, sequence zero, no lease, no pending query. Generate IDs in event/effect initialization, not module load or rendering. |
| Lines 66–84, reducer | Append final events immutably, deduplicate event IDs, prune bounded history, and clear pending/submitted legacy queries on ownership invalidation. Keep ordinary status updates distinct from query clearing. |
| Lines 87–94, `recentTranscript` | Keep wake-phrase removal for legacy query assembly. Do not apply it to the raw shared transcript; users should see what was recognized. |
| Lines 104–118, provider refs | Add workspace lease token, explicit workspace capture-enabled ref, per-recognition-start epoch, seen-result keys, monotonic transcript sequence, and submission epoch refs. |
| Line 120, preference synchronization | Replace unconditional preference-to-enabled mirroring with an effective-capture policy: workspace mode uses explicit workspace intent; legacy mode uses its existing preference. |
| Lines 122–126, `refreshCaption` | Keep display-caption updates separate from immutable final events. A caption such as “Search cancelled” must never become agent input. |
| Lines 128–144, `beginRecognition` | Check effective capture intent and current lifecycle generation before restarting. Track a new recognition-run epoch whenever recognition starts; result indexes may restart after onend/start. |
| Lines 146–157, `stop` | Invalidate submission epoch, clear pending legacy query/feed-dispatch timers, stop recognition, release tracks, reset interim speech, and mark capture off. Do not erase already displayed agent results. |
| Lines 159–192, `start` | Snapshot lifecycle generation before awaiting permission. After permission resolves, release tracks if that request is stale, ownership changed, or effective capture was disabled. |
| Line 194, `onresult` guard | Reject callbacks from obsolete recognition objects/runs, disposed provider, disabled capture, and active TTS suppression. |
| Lines 201–204, interim branch | Update caption only. Do not append to the finalized feed, assess relevance, or call a query endpoint. |
| Lines 206–208, final append | Build a unique key from recognition object/run epoch plus result index; skip a duplicate callback. Assign monotonic sequence and a stable event ID, then append to both the legacy buffer and shared final feed as appropriate. |
| Lines 209–217, wake detection | Enter this branch only when submission owner is legacy Jamie. Workspace mode leaves “pull that up” as ordinary transcript content, without queuing a second Jamie request. |
| Lines 269–273, preference effect | Use effective capture intent. A saved legacy preference must not start microphone capture while the workspace is requesting explicit control. |
| Lines 275–280, pending query timer | Capture owner, epoch, and query ID when scheduling. Check all three again inside the callback. Clear the timeout on invalidation and TTS start. |
| Lines 282–289, pruning interval | Prune final events as well as the legacy buffer, preserving monotonic sequence. No model call or database query belongs in this timer. |
| Lines 291–315, TTS lifecycle | Invalidate pending automatic decisions and clear interim text when speech starts. Preserve the existing one-microphone-lease behavior. Do not increment the recognition-object generation unless replacing that object and its callbacks. |
| Lines 317–323, context value | Publish stable callbacks and finalized data. One agent must never consume/remove a segment before other agents see it. |

**Submission ownership contract:**

- `acquireWorkspace(ownerToken)` claims submission ownership, clears any old wake submission, and returns an idempotent release function.
- Release affects ownership only if its token still matches; a Strict Mode cleanup or old component cannot release a newer lease.
- Add route-aware suppression for `/command-center` before the provider's auto-start effect runs. A child mount effect alone is too late to guarantee no initial auto-start.
- A workspace route without an active lease stays capture-disabled. Explicit workspace Start enables it.
- Do not add a second `JamieAudioProvider` inside the workspace.
- On leaving the route, stop workspace-owned capture and queued automation. Restore legacy availability, but do not submit speech buffered during the workspace session.
- If the browser cannot identify whether a final result spans a TTS boundary, discard that ambiguous segment rather than feeding generated speech back into commands. Record any conservative suppression behavior in microphone verification.

### 8.3 P1 — Coordinate legacy Jamie and settings without a global rewrite

**`components/JamieChat.tsx`:**

1. At the `useJamieAudio()` call near line 114, read submission ownership.
2. Near line 445, guard wake auto-start logic when workspace ownership/route suppression is active.
3. Near lines 456–461, return early from the submitted-query effect unless owner is legacy Jamie; retain query ID consumption for that legacy path.
4. Near lines 607–645, label workspace-owned capture as “Microphone managed by Agent Workspace”; do not show controls that restart legacy wake submission concurrently.
5. Keep typed Jamie messages, chat endpoints, existing response rendering, and non-workspace wake behavior unchanged.
6. Do not forward workspace transcripts through `sendChatMessage`; workspace agents call the existing command endpoint through their own submission function.

**`context/ThemeProvider.tsx`:**

- Lines 95–96 already expose wake preference and setter; line 183 defaults false, line 225 restores saved state, and lines 323–326 persist it.
- Keep that preference compatible for legacy Jamie.
- Do not persist the workspace's “currently recording” state through this setter.
- Put workspace capture intent in the audio provider's session refs/state instead. Optional saved agent configuration must restore listening disabled.
- This refines P1's earlier preference instruction: synchronization means respecting separate legacy preference and explicit workspace intent, not turning one persisted boolean into two competing owners.

### 8.4 P2 — New domain files, declaration by declaration

**`lib/agent-workspace/types.ts`:**

1. Import full browser-safe command contracts with `import type`.
2. Declare `SubmissionSource = 'manual' | 'automatic'`.
3. Declare run states: queued, running, complete, failed, cancelled. Keep “listening” outside this union.
4. Declare finalized transcript identity with session ID and sequence.
5. Declare `AgentSession` fields from section 4 plus `relayMode`, `supervisorEnabled`, `assignmentRevision`, and optional supported record context.
6. Add `draftSourceSegmentIds`, `draftRevision`, and `lastSubmittedSegmentIds` so manual/automatic races can be reconciled.
7. Declare `AgentRun` with immutable assignment/worker/input snapshots and backend `commandId` separate from local `id`.
8. Declare `AttentionDecision` with agent ID, assignment revision, window ID, decision, reason, and referenced segment IDs.
9. Declare `SubmitAgentInput` and a discriminated result: started, already-running, busy, invalid, or paused.
10. Declare reducer actions as a discriminated union. Each run-related action includes both agent ID and run ID.
11. Do not put fetch, timers, localStorage, or model imports in this file.

**`lib/agent-workspace/workspacePolicy.ts`:**

1. Export one frozen object containing every numeric default from section 4.
2. Add named input limits: assignment 1,000 characters, manual command maximum 20,000, automatic candidate maximum 12,000, final-feed maximum 200 segments.
3. Add history caps: 20 run summaries per agent and 10 retained full results across the workspace. Eviction removes only terminal runs, never pending/running work.
4. Add a documented display-retention rule; a 30-second relevance window need not erase the currently viewed transcript instantly, but both display and relevance buffers must be bounded.
5. Inject time into logic under test rather than reading Date.now throughout helpers.

**`lib/agent-workspace/workspaceReducer.ts`:**

1. Export `initialWorkspaceState`; create no IDs inside it.
2. Implement SPAWN: validate supported role/capacity, append session, select it.
3. Implement SELECT: change selection only.
4. Implement UPDATE_DRAFT: update only that agent, set dirty, increment draftRevision.
5. Implement USE_TRANSCRIPT: explicit replacement with selected final text and source segment IDs.
6. Implement APPEND_TRANSCRIPT: update untouched drafts only; preserve edited drafts.
7. Implement SET_LISTENING: change eligibility and move cursor on resume so stale speech is not replayed.
8. Implement UPDATE_ASSIGNMENT: increment assignmentRevision and invalidate queued decisions for the previous revision.
9. Implement RUN_STARTED/PROGRESS/RESULT/ERROR/CANCELLED with ID and state guards; ignore late events for deleted/terminal runs.
10. Implement REMOVE_AGENT after UI confirmation; discard its queued candidates and select a remaining agent deterministically.
11. Implement global pause without turning successful results into paused jobs.
12. Export pure selectors for selected agent, active runs, capacity, and attention count.

**`lib/agent-workspace/buildAgentCommand.ts`:**

1. Accept the immutable agent snapshot, visible submission text, relevant final segments, and bounded own-agent history.
2. Keep original submission text intact as a labeled block; omit duplicate transcript context already present in that text.
3. Add assignment and selected record context only when actually available.
4. Add earlier own-agent context only within remaining capacity.
5. Trim oldest optional history first, then optional supporting transcript; never silently truncate the user's visible text.
6. If mandatory assignment plus text exceed the endpoint limit, return a structured length error.
7. Return the existing API fields only; worker ID comes from the frozen agent snapshot.
8. Keep automatic and manual builds identical except for their selected text/context and local provenance.
9. No runtime import of `commandRouter.ts` into the client bundle.

### 8.5 P2/P3 — Exact submission and scheduler order

**`lib/agent-workspace/submissionScheduler.ts`:**

Implement a small scheduler whose mutable reservations live synchronously outside React render state. React state reflects reservations; it must not be the only lock.

For `tryReserve(input)`, execute in this order:

1. Resolve the agent; reject missing/removed agents.
2. Check assignmentRevision and workspace submission epoch.
3. Normalize text for equality checks, preserving the original text for execution.
4. Reject empty text or invalid lengths.
5. Find an existing run/reservation for the same agent and claimed trigger. Return its run ID instead of starting another.
6. For an automatic request, check capture active, auto listening enabled, no TTS, global automation active, cursor freshness, cooldown, and budgets.
7. For either source, check global and per-agent capacity.
8. Reserve agent/run/trigger IDs synchronously before the first await.
9. Charge automatic start counters once execution actually starts, not for an ignored or merely queued candidate.
10. Return the immutable reservation.

Other methods:

- `claimManualTrigger`: cancels a not-yet-started automatic reservation for matching source segments and supersedes a pending assessment. If the same execution already started, select it instead.
- `completeRun`: releases active capacity only for the matching reservation.
- `coalesceCandidate`: replaces the agent's one queued automatic candidate with the newest eligible snapshot.
- `invalidateEpoch`: clears decisions/candidates without pretending in-flight backend work vanished.
- `removeAgent`: drops only that agent's pending work.
- `getBudgetState`: returns counts and reset time for UI explanations.

Do not count a client-cancelled running request as freed backend capacity immediately: keep a conservative slot/cooldown until normal completion is observed or a documented execution timeout expires. Otherwise repeated cancel/spawn actions bypass the concurrency budget.

**`components/agent-workspace/useAgentCommandRun.ts`:**

1. Begin with `'use client'`.
2. Accept scheduler/store callbacks; never close over selectedAgentId as the recipient.
3. Keep AbortControllers in a Map keyed by run ID.
4. In submit, build the request snapshot, reserve, allocate controller, dispatch RUN_STARTED, then invoke shared commandClient.
5. In onProgress, dispatch against the captured agent/run IDs.
6. On response, validate reservation/generation and dispatch result with the backend commandId.
7. On error, distinguish user abort from transport/server failure; preserve submitted text for manual retry.
8. In finally, remove controller and settle reservation according to cancellation policy.
9. On unmount, abort local transports and invalidate epochs. Do not POST retries automatically.
10. Return submit/cancel/retry functions. Retry is an explicit new attempt, with a new run ID and duplicate-risk disclosure after an uncertain network failure.

### 8.6 P3/P4 — Exact attention processing order

**`lib/agent-workspace/attentionPolicy.ts`:**

1. Export `getEligibleWindow(agent, segments, now)`.
2. Reject segments predating the agent's spawn/resume boundary or outside the relevance window.
3. Include enough retained context to complete a waiting thought, but require at least one new segment after the last evaluated cursor.
4. Build a stable window ID from session, agent assignment revision, and ordered segment IDs—not wall-clock render time.
5. Export deterministic `assessWithRules` returning ignore/wait/submit plus reason.
6. Never call `classifyCommandIntent(text, agent.workerId)` to test relevance: that forces the answer. Classify without selection, then compare detected intent to the role's supported triggers.
7. Use a small explicit role-to-intent map for the first supported roles. Unsupported/ambiguous mappings wait rather than firing on generic fallback.
8. Mark deterministic results as rules-based in activity data.
9. Export a final eligibility recheck for use immediately before scheduling execution.

**`components/agent-workspace/useAgentAttention.ts`:**

1. Subscribe to final-segment sequence, agent eligibility/revisions, capture state, and global pause—not caption updates.
2. Debounce only when eligible new final content exists.
3. Snapshot an assessment ID, workspace epoch, eligible agent revisions, and segment IDs.
4. Batch all eligible agents into one assessment; do not make one model call per agent.
5. Abort obsolete assessments when newer speech replaces them; charge requests already sent against the assessment budget.
6. Validate returned IDs/window/revisions before applying any decision.
7. Record ignore/wait silently in expandable details.
8. For submit, assemble text from the returned original segment IDs in their original order; pass it to the shared submit function.
9. Recheck epoch, active capture, assignment, manual claims, and budget immediately before submission.
10. On error, use the documented conservative rules adapter or show waiting; never execute a full command as a fallback assessment.
11. Pause/stop/TTS/unmount clear timers and invalidate asynchronous completions.

**`lib/agent-workspace/attentionDecisionSchema.ts`:**

Declare request schemas before response schemas. Validate maximum 3 agents, unique agent IDs, assignment length, transcript total length, unique segment IDs, known decision enum, and bounded reasons. Then add cross-field validation:

- Every decision references an input agent and the same assignment revision.
- Exactly one decision exists for each assessed agent.
- Every referenced segment belongs to the submitted window.
- Submit requires at least one relevant segment; ignore/wait cannot carry executable text.
- No output command/tool/action field is accepted.

**`app/api/commands/attention/route.ts`:**

Statement order in POST:

1. Parse JSON safely.
2. Validate bounded request schema; return 400 for invalid input.
3. Apply the existing appropriate access/request-limit convention for this endpoint; do not change access for other routes.
4. If required configuration or distributed budget support is unavailable, return an explicit unavailable decision mode rather than silently making unlimited provider calls.
5. Invoke the server-only assessor with a bounded timeout and no tools.
6. Validate response and input/output ID correspondence.
7. Return decisions, assessment ID, and available usage fields only.
8. Catch timeout/provider/validation failures with a safe recoverable response.
9. Do not import command execution, site mutation, or Supabase content repositories.

**`lib/agent-workspace/assessAgentAttention.server.ts`:**

1. Mark the module server-only.
2. Accept a provider-independent validated input and injectable assessment function for tests.
3. Explain ignore/wait/submit and quote transcript as observed conversation, not executable instructions.
4. Ask for structured decisions only; no chain-of-thought or tool use.
5. Bind a currently configured provider using inspected installed SDK APIs. This plan does not prescribe an unverified SDK method or model name.
6. Parse and validate the returned decision object.
7. Return usage only when actually supplied by the provider.
8. Do not make an installation or provider migration part of this task.

### 8.7 P5 — UI files, exact render and event order

| New file | Implement from top to bottom |
| --- | --- |
| `useAgentWorkspace.ts` | Initialize reducer → create stable scheduler → acquire audio lease → expose state/selectors → compose run and attention hooks → invalidate on removal/unmount → return explicit callbacks. Ensure hooks share one scheduler instance. |
| `AgentWorkspace.tsx` | Client directive → imports → controller hook → selected-agent derivation → workspace header → agent rail → transcript/composer → selected result panel → attention/completed footer → shared route directory. Keep selected-agent state above conditional mobile panels. |
| `AgentRail.tsx` | Props → empty state → list of separate selection buttons → independent listening toggles → activity labels → pause/remove controls. Do not nest buttons inside buttons. |
| `SpawnAgentDialog.tsx` | Role selector populated from roster → label → optional assignment → listening toggle → validation → Spawn action. On submit allocate session ID and capture current transcript cursor; never request microphone permission here. |
| `WorkspaceMicControls.tsx` | Visible status label → explicit Start/Stop → global automation pause → unsupported/denied guidance. Start is the only workspace control that requests capture. Stop also invalidates pending automatic submissions. |
| `SharedTranscript.tsx` | Bounded final list keyed by segment ID → separately styled interim caption → jump-to-latest control → selection/use-speech action. Do not use recognition captions as stored transcript. |
| `AgentComposer.tsx` | Recipient label → controlled textarea → dirty/speech-source note → Use recent speech → Submit now button → validation/busy message. Use form onSubmit for mouse and keyboard; snapshot agent ID/text before awaiting. |
| `AgentActivity.tsx` | Current run state → short trigger/reason → queue/cooldown/budget reason → previous terminal runs → expandable ignore/wait details. No independent polling timer per row. |
| `AgentResults.tsx` | Resolve selected run → empty/error/loading case → shared AnswerPanel → output formats → SourcesAndTrace → review/refinement/action controls. Bind handlers to that run's backend commandId, never “the latest result.” |
| `workspacePreferences.ts` | Versioned schema → guarded parse → account-scoped load/save of agent role/label/assignment only → force capture/listening off when restoring → discard invalid versions. In anonymous mode keep settings in memory unless an explicit anonymous-storage policy is chosen. |

Concrete composer behavior:

- Untouched draft follows finalized speech only while that agent is eligible.
- Manual typing increments draftRevision and locks the draft against transcript replacement.
- After Submit now succeeds, retain the exact submitted text until the user clears/replaces it; show the associated run.
- Automatic runs do not clear the manual draft.
- Text from a removed/changed selected panel must not be submitted to a newly selected agent by a stale event handler.
- When an agent is busy, disable Submit now with “This agent is working”; do not discard a typed draft.
- Allow explicit retry of a completed identical request; deduplication protects in-flight/current-trigger races, not a permanent ban on repeated text.

Suggested layout mechanics, scoped to new components:

- Desktop grid: 220px rail, flexible conversation column, flexible work column; each content column uses min-width zero.
- Below 1100px, show the rail plus switchable Conversation/Work content.
- Below 768px, use Agents/Conversation/Work tabs.
- Keep controller hooks mounted above tabs so switching tabs does not stop listening or reset runs.
- Respect reduced motion, visible focus, textarea labels, and dialog focus return.
- Do not alter global styles, root typography, or homepage colors for this workspace.

### 8.8 P6 — Preserve outputs before replacing the page

Extract from `AgentSelectionArena.tsx` in these groups, retaining original props initially:

| Current anchor | Proposed destination |
| --- | --- |
| 1160, `AnswerPanel`; 1241, `CommandProgressRail`; 1269, `RoutingCorrectionPanel` | `components/command-center/results/CommandAnswer.tsx` |
| 1400, `SourcesAndTrace`; 1529, `TraceChip` | `components/command-center/results/CommandSources.tsx` |
| 1538, `DeliverableFrames`; 1554, `RelayPlanPanel` | `components/command-center/results/CommandDeliverables.tsx` |
| 1579, `CommandPostPanel`; 1672, `TahNotePanel` | `components/command-center/results/CommandDetails.tsx` |
| 1733, `ListingReviewPanel`; 1880, `ListingCopyPackage`; 2014, `CanonicalListingHandoff` | `components/command-center/results/CommandListingReview.tsx` |
| 2169–2251, listing transformation helpers | `lib/command-center/listingReviewHelpers.ts` |
| 2322, `buildCommandTraceExport`; 2357 onward, timing/status formatting | `lib/command-center/commandTracePresentation.ts` |

Move small presentation dependencies such as Disclosure/DetailBlock with their actual users, or to a shared result UI module if several files need them. Do not leave a circular import back into AgentSelectionArena.

Handler migration:

1. Inspect `handleActionItem` around line 706 and move its behavior into a per-run controller without changing endpoints/payloads.
2. Bind copy status, action state, review state, and refinement draft to run IDs.
3. Preserve `requestSupervisorReview` at line 782 and `processSupervisorReviews` at line 825. In particular, preserve configured supervisor behavior; do not silently remove automatic review currently tied to the supervisor toggle.
4. Automatic query submission does not imply automatic action-item execution.
5. Preserve rerun/handoff near lines 766–779 with explicit user selection and correctly snapshotted command input.
6. First make the legacy arena use the extracted views. Then make the new workspace use them. Do not delete the original view until both consumers render the expected results.

Cutover exact changes:

- `app/command-center/page.tsx` line 1: replace the arena import with the new workspace import.
- Lines 4–5: update title/description to describe the agent workspace while retaining Sunset Pulse branding.
- Line 9–10, page return: render the client workspace; do not make the page itself a microphone client.
- `lib/navigation/routeCatalog.ts` line 33: retain `/command-center`; update its label/description only if the final UI name changes.
- `app/agent/page.tsx`: no replacement. Preserve its existing workflow.
- `app/layout.tsx`: preserve provider composition; only add route-aware capture support if the provider itself cannot handle it. Do not rewrite layout branches.
- Root README: update the planned-feature sentence to implemented only after P6/P7 are actually complete.
- No changes to `app/page.tsx`, production environment flags, migrations, cron definitions, or existing command request schema.

### 8.9 P7 — Test additions matched to each edit

| Test file | Add these explicit assertions |
| --- | --- |
| Existing `jamie-audio-state.test.ts` | Legacy recentTranscript fixtures still pass; ownership invalidation clears pending/submitted query; display status never enters final feed; pruning does not reset sequence. |
| Existing `jamie-audio-lifecycle.test.tsx` | Extend FakeSpeechRecognition with typed emit helpers for interim/final/repeated result callbacks; two subscribers receive one event each; only one microphone lease exists; saved legacy true does not auto-start workspace capture; release tokens are idempotent; stop during pending getUserMedia releases late tracks. |
| Same lifecycle suite | TTS cancels pending dispatch; old callbacks cannot restart or submit after teardown; recognition restart indexes do not collide with earlier session indexes; workspace speech does not become a Jamie wake submission. |
| New state suite | Two same-role agents have distinct IDs/drafts/results; selection does not change listening; stale result ignored; removal preserves other sessions; restored agents are not marked running/listening. |
| New scheduler suite | Use fake time: 20-second cooldown, 4/minute and 20/hour starts, 2-global/1-agent concurrency, one coalesced queued candidate; manual/automatic same-trigger race sends once; cancel does not instantly bypass capacity. |
| New attention suite | Interim-only input never assesses; generic chatter ignored; incomplete thought waits; new context completes it; forced-worker classification not used as relevance; paused/removed/reassigned agents ignore late semantic responses. |
| New command suite | Assert exact existing endpoint/payload keys; correct worker for each run; out-of-order responses stay isolated; JSON/SSE/empty-body errors; edited manual text remains intact. |
| Existing stream suite | Add LF/CRLF chunk splits, UTF-8 boundary, EOF without delimiter, no-result stream, explicit error event, and reader cleanup. Use both rich arena and smaller console result fixtures. |
| New attention route suite | Invalid JSON/oversize/unknown segment/duplicate agent rejected; timeout/configuration failure recoverable; assessor called once per batch; command executor never called; request budget enforced. |
| New UI suite | Spawn modal keyboard flow, no microphone request from spawn, per-agent Submit now destination, dirty draft preservation, unsupported mic fallback, separate selected/listening states, accessible status/control labels. |
| New browser spec | Seed mocked final events through a test-only fixture enabled only in the existing test environment; verify agent panels/queries/outputs at desktop and 390px. Do not expose an unauthenticated production transcript injection API. |
| Existing route/console suites | Preserve route inventory and legacy Agent Console behavior after shared helper extraction. |

Run each package's focused tests before starting the next package. A final relevant command set from the repository root is:

```powershell
npm run test:unit -- tests/unit/jamie-audio-state.test.ts tests/unit/jamie-audio-lifecycle.test.tsx
npm run test:unit -- tests/unit/agent-workspace-state.test.ts tests/unit/agent-workspace-attention.test.ts tests/unit/agent-workspace-scheduler.test.ts
npm run test:unit -- tests/unit/agent-workspace-command.test.tsx tests/unit/agent-workspace-ui.test.tsx tests/unit/command-attention-route.test.ts
npm run test:unit -- tests/unit/agent-console-command-stream.test.ts tests/unit/command-route-contract.test.ts tests/unit/app-route-catalog.test.ts
npm run lint --workspace=apps/pulse
npm run test:e2e --workspace=apps/pulse -- tests/agent-workspace.spec.ts
git diff --check
```

New test filenames above are planned; they must exist before invoking those commands. Run TypeScript checking from `apps/pulse` and record pre-existing failures separately. Do not delete tests to make the implementation look complete.

### 8.10 Handoff discipline

At the end of each package, record:

1. Files actually changed and which anchors moved.
2. Implemented behavior versus remaining planned behavior.
3. Focused test command and result.
4. Any deliberate compatibility shim or unresolved browser/provider limitation.
5. The next package and its first concrete edit.

This addendum does not authorize implementation beyond the agreed scope. Start with P0 contract extraction/characterization, then P1 microphone ownership; do not begin with a global UI rewrite.
