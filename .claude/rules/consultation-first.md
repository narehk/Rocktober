# Consultation-First Behavioral Rule

## Core Principle

**Phase-dependent consultation.** Consultation behavior adapts to the current development phase. During discovery, Claude discusses and confirms. During build, Claude proceeds autonomously. During review, Claude responds to feedback.

See **`rapid-cycle.md`** for the full phase model.

## Phase Behavior

### Discovery Phase — Consultation Active

Default to discussion, not implementation. When the user describes a problem or asks a question:

1. Explain options and trade-offs
2. Discuss approaches
3. Create visual artifacts (pencil.dev mockups, process maps)
4. Wait for direction before moving to decomposition

| User Says | Claude Should Do |
|-----------|------------------|
| "How can we handle X?" | Discuss options, create artifacts to illustrate |
| "What do you think about this approach?" | Discuss, challenge if asked, propose alternatives |
| "I want to build Y" | Shape requirements, create mockups/process maps, accumulate context |

### Decomposition Phase — Automatic

Claude decomposes approved requirements into ADO work items without per-item approval. The human approved the direction during discovery — decomposition is execution of that approval.

### Build Phase — Full Autonomy

**Claude proceeds without pausing.** No consultation gates. No "should I proceed?" checkpoints.

- Make all technical decisions
- Implement end-to-end
- Auto-update work item status
- Create ADO Constraint items when constraints are found
- Document scope drift with justification
- Scaffold the `/settings` page

**What Claude still communicates during build:**
- Constraints discovered (as ADO Constraint items)
- Scope drift (documented in work items, summarized at completion)

**What Claude does NOT do during build:**
- Ask permission for implementation choices
- Present artifacts for approval
- Pause for consultation on approach
- Wait for feedback between tasks

### Review Phase — Human-Driven

Claude responds to feedback. The human drives this phase:
- Conversational feedback → Claude implements
- Settings page tweaks → Claude reads exported config and implements
- Quiz results → Claude addresses gaps
- All feedback batched into a Change Order per review cycle

### Change Order Phase — Execute

Claude implements tracked change orders without re-asking. The Change Order IS the authorization.

## Slash Commands (Unchanged)

Running a command like `/commit`, `/test`, `/verify` IS explicit authorization in any phase. The user invoked the command — proceed with its defined behavior.

## Escalation Pattern (Discovery Phase Only)

During discovery, the escalation pattern still applies:

1. **User asks question** → Claude explains options, creates visual artifacts
2. **Claude thinks the context mass is sufficient** → Proposes readiness: "I have enough context to build. Here's what I plan to create."
3. **User approves** → Transition to decomposition + build

## Examples

### Correct: Discovery Phase Consultation

**User**: "I want to add a voting system to the app"
**Claude**: "Here are the key design decisions for a voting system:

[Creates pencil.dev mockup showing voting UI]
[Creates process map showing vote flow: submit → validate → tally → announce]

Key questions:
- Single vote per person or ranked choice?
- Real-time results or hidden until deadline?
- How do we handle ties?

Let's shape these requirements before I build."

### Correct: Build Phase Autonomy

**User approved discovery, Claude is building**
**Claude**: *[Implements voting UI, creates ballot logic, builds tally system, scaffolds settings page with vote-deadline and tie-break-method variables, updates ADO work items as each component completes]*

At completion: "MVP delivered. Here's what I built:
- Voting UI with single-choice ballots
- Real-time vote tally (hidden until deadline)
- Tie-break by earliest submission
- Settings page at `/settings` with configurable deadline and tie-break method

Scope drift: I added a 'vote confirmation' toast that wasn't in the requirements — felt necessary for UX. See W-015 for details."

### Correct: Review Phase Response

**User**: "The voting deadline should be configurable per round, not global"
**Claude**: "Got it. I'll capture that in the Change Order for this review cycle along with any other feedback."

### Incorrect: Asking Permission During Build

**Claude**: "I'm about to implement the tally logic. Should I use a simple count or weighted scoring?"
*[Wrong — during build, Claude decides and documents]*

## Anti-Patterns

**Asking permission during build phase**
The whole point of the rapid cycle is that Claude builds autonomously. Don't revert to gate-heavy behavior.

**Skipping discovery consultation**
Discovery is where alignment happens. Don't rush to build without adequate context mass.

**Treating review feedback as requiring re-discovery**
Review feedback is incremental. It becomes a Change Order, not a return to discovery (unless the feedback is fundamentally "wrong direction").

**Offering unsolicited workflow suggestions (AAR #27)**
After completing a task, do NOT suggest next lifecycle steps. Report what was done and stop.

## Long Context Resilience (AAR #16)

As conversation context grows, behavioral drift can occur. During build phase, this manifests as Claude reverting to consultation behavior (asking permission when it shouldn't). During discovery, it manifests as Claude starting to build without approval.

To counteract:
1. **Check the current phase** before each action — "Am I in discovery, build, or review?"
2. **Match behavior to phase** — discovery = consult, build = proceed, review = respond
3. **Phase momentum is not phase change** — a long build phase doesn't transition to review until the MVP is delivered

## Integration with Other Rules

- **rapid-cycle.md** — Defines the phase model this rule follows
- **roles-and-governance.md** — Defines the autonomy model per phase
- **user-interaction.md** — Defines HOW to interact (menus vs conversation)
- **artifact-first.md** — Defines what artifacts to create during discovery
