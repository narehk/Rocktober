# Visual Workflow Rule

## Core Principle

**For a visual learner, always provide visual representations.**

When working on anything that has a visual or structural component, default to showing rather than telling. This applies to architecture, UI, data flow, state management, and decision-making.

## Decision Matrix: Which Tool for Which Concept

| Concept Type | Tool | Format |
|-------------|------|--------|
| Architecture overview | Mermaid | `graph TD` or `C4Context` diagram |
| Data flow | Mermaid | `sequenceDiagram` or `flowchart` |
| State machines | Mermaid | `stateDiagram-v2` |
| Entity relationships | Mermaid | `erDiagram` |
| UI layout / page design | pencil.dev or `/prototype --static` | Visual mockup |
| Component interaction | `/prototype` (Level 2) | Running interactive demo |
| Complex feature flow | `/prototype --app` (Level 3) | Multi-page prototype |
| Decision comparison | Markdown table | Side-by-side trade-offs |
| Timeline / roadmap | Mermaid | `gantt` chart |

## When to Use Visual Representations

### Always Visual

These should ALWAYS include a diagram or mockup:
- Architecture decisions (show the components and their relationships)
- UI changes (show before/after or proposed layout)
- Data model changes (show ER diagram)
- Workflow changes (show sequence or flow diagram)
- State management (show state diagram)

### Visual When Helpful

These benefit from visuals but don't always require them:
- API endpoint design (request/response examples may suffice)
- Bug fix explanations (code diff usually sufficient)
- Configuration changes (table comparison)

### Skip Visuals

These don't need diagrams:
- Typo fixes
- Dependency updates
- Documentation corrections
- One-line code changes

## Screenshot Verification (Mandatory for UI Work)

**Every UI change must be verified with screenshots.**

### Workflow

1. **Before**: Capture the current state (if modifying existing UI)
2. **Implement**: Make the change
3. **After**: Capture the new state
4. **Analyze**: Compare before/after with this checklist:
   - Positioning and alignment correct?
   - Dimensions match expectations?
   - Visual appearance matches design?
   - Spacing consistent with design system?
   - Interactive elements functional?
5. **Report**: Show findings to user

### Expert Assignment for UI Work

| UI Task | Primary Expert | Supporting Expert |
|---------|---------------|-------------------|
| New page/layout | expert-frontend | expert-ux |
| Component design | expert-frontend | expert-ux |
| Accessibility fix | expert-ux | expert-frontend |
| Design system update | expert-ux | expert-frontend |
| Animation/interaction | expert-frontend | expert-ux |

## Mermaid Diagram Guidelines

### Keep Diagrams Readable
- Max 10-15 nodes for architecture diagrams
- Use subgraphs to group related components
- Label edges with actions, not just relationships
- Use consistent colors/styles within a diagram

### Examples

**Architecture:**
```mermaid
graph TD
    Client[Browser] --> API[API Server]
    API --> DB[(Database)]
    API --> Cache[Cache]
    API --> Queue[Job Queue]
```

**State Machine:**
```mermaid
stateDiagram-v2
    [*] --> Captured
    Captured --> Shaping: refine
    Shaping --> Ready: ready
    Ready --> InProgress: start
    InProgress --> InReview: review
    InReview --> Done: done
    InReview --> InProgress: changes needed
```

## Integration with Other Rules

- **artifact-first.md** — Visual artifacts ARE the "show me before you build" mechanism
- **work-system.md** — Items in Shaping stage should include relevant diagrams
- **roles-and-governance.md** — Visual artifacts enable the architect to make informed decisions

## Anti-Patterns

**Wall of text instead of diagram**: Describing architecture in prose when a diagram would be clearer

**Diagram without explanation**: Showing a complex diagram with no context or legend

**Over-diagramming**: Creating a Mermaid chart for "rename variable X to Y"

**Stale diagrams**: Implementing something different from what the diagram shows
