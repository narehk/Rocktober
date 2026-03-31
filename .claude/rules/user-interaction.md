# User Interaction Patterns

This document defines consistent patterns for how Claude Code skills and commands interact with users.

## Core Principle

**Use the right interaction pattern for the type of decision needed — and the current phase.**

**Note**: This document defines HOW to interact with users during tasks. For WHEN to take action vs discuss, see **`consultation-first.md`**. For phase-dependent behavior, see **`rapid-cycle.md`**.

## Phase-Dependent Interaction

Interaction patterns shift based on the current development phase (see `rapid-cycle.md`):

| Phase | Primary Pattern | Guidance |
|-------|----------------|----------|
| **Discovery** | AskUserQuestion + Conversational | Shape requirements, get direction, create visual artifacts |
| **Build** | **Procedural** | Minimize questions. Make decisions. Document rationale. |
| **Review** | Conversational | Respond to human feedback. Settings page + conversation. |
| **Change Orders** | Procedural | Implement tracked changes without re-asking. |

### Build Phase — Minimize Questions

During the build phase, Claude operates with full autonomy. Interaction rules:
- **Do not ask** implementation questions — make the decision and document it
- **Do not present** choices — pick the best option and proceed
- **Do not pause** for approval — build end-to-end
- **Do document** decisions in work items for review phase visibility

### Discovery Phase — Full Interaction

During discovery, all interaction patterns are available. Use the decision framework below to choose the right one.

## Decision Framework

| Pattern | When to Use | Examples |
|---------|-------------|----------|
| **AskUserQuestion** | Finite options (2-4 choices), binary decisions, category selection | Category selection, type selection, approach selection during discovery |
| **Conversational** | Open-ended text needed, complex discussions, context-dependent options, expert consultations | Architecture discussions, requirement clarification, design reviews |
| **Procedural (no questions)** | Fully automated tasks, read-only analysis, batch operations, **entire build phase** | `/commit`, `/review`, `/test`, code analysis, build phase implementation |

## When to Use AskUserQuestion

### Ideal Use Cases
- **Binary decisions**: Yes/No, Proceed/Cancel, Accept/Reject
- **Category selection**: Pick from 2-4 predefined categories
- **Type selection**: Feature/Enhancement/Fix/Tool
- **Approval gates**: Checkpoint before continuing
- **Approach selection**: Choose between 2-4 implementation strategies

### Characteristics
- **Closed set**: All options are known in advance
- **Mutually exclusive**: User picks one (or multiSelect for compatible options)
- **Clear outcomes**: Each choice has well-defined next steps
- **Quick decision**: User doesn't need to type custom text

## When to Use Conversational Questions

### Ideal Use Cases
- **Open-ended text**: User needs to describe something in their own words
- **Complex discussions**: Multiple rounds of clarification needed
- **Context-dependent**: Options vary based on codebase state
- **Expert consultation**: Deep domain expertise with flexible dialogue

### Characteristics
- **Open set**: Answers can't be enumerated in advance
- **Nuanced**: Requires explanation, not just a choice
- **Iterative**: May lead to follow-up questions
- **Exploratory**: Discovery-oriented rather than decision-oriented

## When to Avoid Questions Entirely

### Procedural Commands
- **Automation**: Task has clear single path (e.g., `/commit`, `/pr`)
- **Analysis**: Read-only operations that report findings (e.g., `/review`, `/simplify`)
- **CLI arguments**: Options provided via command flags (e.g., `/test --backend`)

### Characteristics
- **Deterministic**: No user input needed to proceed
- **Non-interactive**: Designed to run autonomously
- **Batch-friendly**: Can be scripted or chained

## AskUserQuestion Best Practices

### Structure
```javascript
{
  questions: [{
    question: "Clear, specific question ending with ?",
    header: "Short label (max 12 chars)",
    options: [
      { label: "Concise (1-5 words)", description: "What happens if chosen" },
      { label: "Action verb preferred", description: "Explain trade-offs" }
    ],
    multiSelect: false  // true only if options are non-exclusive
  }]
}
```

### Guidelines
- **2-4 options**: Too few is binary (consider yes/no), too many is overwhelming
- **Clear labels**: Actionable, scannable, consistent voice
- **Helpful descriptions**: Explain consequences, not just restate the label
- **First option recommended**: Put default/recommended choice first, mark "(Recommended)"
- **Question clarity**: Make the decision clear without reading descriptions
- **Header brevity**: Use for visual grouping, keep under 12 chars

## Conversational Question Best Practices

### When Questions Are Complex
- **Break down**: Ask one aspect at a time
- **Provide context**: Explain why you're asking
- **Offer examples**: Show what kind of answer helps
- **Be specific**: "What authentication method?" not "What should we do?"

### Expert Consultation Pattern
Expert skills should use conversational questions because:
- Domain expertise requires nuanced discussion
- Context varies significantly between invocations
- Solutions emerge through dialogue, not menu selection
- Users need to explain constraints, requirements, preferences

## Skill-Specific Patterns

### Commands (`/work`, `/commit`, etc.)
- Use **AskUserQuestion** for: Category selection, type selection, binary confirmations
- Use **procedural** for: Automated tasks like commit message generation, PR creation
- Use **conversational** for: Complex refinement discussions (delegate to skills)

### Expert Skills (`expert-*`)
- Primarily **conversational**: Deep domain discussions
- Occasionally **AskUserQuestion**: Approach selection (2-4 strategies), phase approval gates
- Avoid **procedural**: Experts guide, they don't automate

### Utility Skills (`code-review`, `research`, `verify-app`)
- Primarily **procedural**: Execute and report
- Rarely **conversational**: Only if findings require user interpretation
- Avoid **AskUserQuestion**: These are analysis tools, not decision tools

## Decision Tree

```
What phase am I in?
├─ Build → Procedural (just do it, document decisions)
├─ Change Orders → Procedural (implement tracked changes)
└─ Discovery or Review →
    Need user input?
    ├─ No → Procedural (just do it)
    └─ Yes → What kind?
        ├─ 2-4 finite options? → AskUserQuestion
        ├─ Open-ended text? → Conversational
        ├─ Complex discussion? → Conversational
        └─ Context-dependent? → Conversational
```

## Anti-Patterns

### Menu for Open-Ended Questions
```javascript
// BAD: Can't enumerate all possible answers
{ question: "What's your project about?", options: [...] }
```

### Conversational for Simple Binary
```
// BAD: Just use AskUserQuestion
"Would you like to proceed? Please type 'yes' or 'no'."
```

### Too Many Menu Options
```javascript
// BAD: Overwhelming, use conversational or search
{ options: [/* 10+ items */] }
```

### Asking When You Shouldn't
```javascript
// BAD: /commit should just generate the message
{ question: "Should I create a commit?", options: ["Yes", "No"] }
// The user already ran /commit, they want a commit!
```

### Asking During Build Phase
```javascript
// BAD: Build phase = full autonomy, no questions
{ question: "Should I use flexbox or grid?", options: ["Flexbox", "Grid"] }
// Pick one, implement it, document the choice in the work item
```
