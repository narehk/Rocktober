# Dependency Philosophy

## Core Principle

**Vanilla first. Every dependency must earn its place.**

Claude defaults to vanilla HTML, CSS, and JavaScript for all new work. Dependencies are not added because they're "best practice" or "industry standard" — they're added only when they genuinely solve a problem that vanilla cannot solve safely or practically.

This principle applies universally — to new MVPs built from scratch AND to work within existing codebases.

## Why This Matters

**Claude doesn't need frameworks for the reasons humans do.** The traditional case for React/Vue/Angular is about human team productivity:
- Component reuse across a large team → Claude builds components directly
- Hiring pool (everyone knows React) → Claude knows everything equally
- Pre-built UI ecosystem → Claude writes UI directly
- Convention enforcement → Claude follows project rules

What frameworks cost:
- **Build tooling** — webpack, vite, bundler configs that break and need maintenance
- **Dependency chains** — transitive dependencies that introduce vulnerabilities and conflicts
- **Version churn** — breaking changes between major versions, migration guides, deprecated APIs
- **Documentation conflicts** — framework docs compete with and often contradict platform docs
- **Runtime overhead** — 100-300KB of framework code before your app loads
- **Debugging opacity** — source maps, virtual DOM diffing, framework-specific error messages

What vanilla gives:
- **Zero build step** — serve files directly, no toolchain
- **Zero dependency updates** — no Dependabot, no breaking changes from upstream
- **Stable documentation** — MDN is authoritative, stable, and comprehensive
- **View Source works** — debuggable by anyone, no source maps needed
- **Platform longevity** — vanilla APIs are supported forever by browsers

## The Dependency Justification Test

Before adding ANY dependency, apply this test:

```
1. Can Claude write this from scratch using platform APIs?
   ├─ Yes, safely → Use vanilla. No dependency.
   └─ No, or with security risk →
      2. Does the dependency solve a problem that would be:
         - Dangerous to implement (crypto, auth)
         - Impractical to replicate (binary formats, vendor protocols)
         - Contractually required (vendor SDK)
         ├─ Yes → Dependency is justified. Document why.
         └─ No → Use vanilla. The "convenience" isn't worth the cost.
```

## Dependency Categories

### Never Use (unless user explicitly requests)

| Category | Examples | Why Not |
|----------|----------|---------|
| UI frameworks | React, Vue, Angular, Svelte | Claude builds UI directly in vanilla. No team coordination benefit. |
| CSS frameworks | Tailwind, Bootstrap, Material UI | Claude writes CSS directly. Custom properties handle theming. |
| Build tools | webpack, vite, esbuild, rollup | Serve static files. Use ES modules natively. |
| Utility libraries | lodash, underscore, ramda | Native JS has `Array.prototype` methods, `structuredClone`, `Object.entries`, etc. |
| Date libraries | moment, dayjs | `Intl.DateTimeFormat` and `Date` handle most cases. |
| HTTP clients | axios, got, superagent | `fetch()` is native and sufficient. |
| State management | Redux, Zustand, MobX | Read data, render DOM. No client-side state framework needed. |
| Animation libraries | framer-motion, anime.js, GSAP | CSS animations and `Web Animations API` handle most cases. |

### Justified (use when needed)

| Category | Examples | When Justified |
|----------|----------|---------------|
| Security/crypto | bcrypt, jose, crypto libraries | Never roll your own crypto. Always use audited implementations. |
| Vendor API SDKs | Stripe SDK, AWS SDK, Spotify SDK | When the vendor controls the API contract and the SDK handles auth/signing. Can use raw `fetch` if the SDK adds more complexity than it saves. |
| Binary formats | pdf-lib, sharp, ffmpeg | Complex binary protocols that are impractical to implement from scratch. |
| Database drivers | pg, mysql2, better-sqlite3 | Protocol-level implementations that must be correct. |
| Server frameworks | Express, Hono, Cloudflare Workers SDK | Lightweight server scaffolding where writing a raw HTTP handler is impractical. Prefer the lightest option. |

### Always Fine (not "dependencies" in the problematic sense)

| Category | Examples | Why Fine |
|----------|----------|---------|
| CDN-hosted fonts | Google Fonts, Adobe Fonts | No build dependency. `<link>` tag. Graceful fallback. |
| CDN-hosted icons | Font Awesome CDN, Material Icons | Same — `<link>` tag, no build dependency. |
| Browser APIs | Web Components, Web Animations, Intersection Observer | Part of the platform. Zero dependency. |
| ES Modules (native) | `import` / `export` via `<script type="module">` | Browser-native, no bundler needed. |

## Web Components — The Vanilla Component Model

When component encapsulation is needed, use **Web Components** (Custom Elements + Shadow DOM + Templates). They're part of the platform:

```javascript
class MyComponent extends HTMLElement {
  connectedCallback() {
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `<style>...</style><div>...</div>`;
  }
}
customElements.define('my-component', MyComponent);
```

This gives you:
- Encapsulated styles (Shadow DOM)
- Reusable components (`<my-component>`)
- Lifecycle hooks (`connectedCallback`, `disconnectedCallback`)
- Attribute observation (`attributeChangedCallback`)
- Zero dependencies

## In Existing Codebases

When working in a codebase that already uses a framework:

1. **Don't add MORE framework-specific patterns** when vanilla alternatives exist
2. **Don't introduce additional frameworks** on top of existing ones
3. **When extending functionality**, prefer vanilla implementations alongside the existing framework over adding another dependency
4. **Suggest simplification** when you notice framework code that vanilla could replace — but don't refactor without approval (this is a discovery-phase conversation)

## How to Document a Justified Dependency

When a dependency passes the justification test, document it in the work item:

```markdown
## Dependency Added: [package-name]

**Why vanilla won't work**: [specific technical reason]
**What it does**: [one-line description]
**Risk assessment**: [maintenance burden, update frequency, alternative if abandoned]
**Size impact**: [bundle size added]
```

## Integration with Other Rules

- **rapid-cycle.md** — During build phase, Claude follows this rule autonomously. No need to ask permission to avoid a dependency.
- **tech-stack.md** — Project-specific tech stack rules may allow or disallow specific technologies. This rule provides the default philosophy.
- **roles-and-governance.md** — During discovery, if a dependency decision is contentious, discuss it. During build, Claude follows this philosophy and documents decisions.

## Anti-Patterns

**"Everyone uses React"**
Industry popularity is not a justification. Claude doesn't hire React developers.

**"There's a library for that"**
Having a library available doesn't mean you need it. 10 lines of vanilla JS is better than a 50KB dependency.

**"It's faster to develop with"**
Faster for human teams, maybe. Claude writes vanilla JS at the same speed as framework code. The long-term maintenance cost of the dependency exceeds any short-term development speed gain.

**"Best practice says..."**
Best practices are heuristics for human teams. Claude's constraints are different. Evaluate on merit, not convention.

**"We might need it later"**
Don't add dependencies speculatively. Add them when the need is concrete. Removing a dependency is harder than adding one.

**"It's just a small utility"**
Small utilities have transitive dependencies. `is-odd` depends on `is-number`. The dependency tree grows silently.
