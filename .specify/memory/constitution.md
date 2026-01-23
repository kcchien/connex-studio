<!--
SYNC IMPACT REPORT
==================
Version change: 2.0.0 → 2.1.0 (MINOR - new principle added)

Modified principles:
  - Section IV.4 added: "Follow Keep a Changelog Standard"

Added sections:
  - IV.4 Keep a Changelog principle with specific format requirements

Removed sections:
  - None

Templates requiring updates:
  - ✅ All templates remain compatible

Follow-up TODOs: None

Previous changes (v2.0.0):
  - Complete governance restructure from template placeholders
  - 7 principle categories with 16+ sub-principles
==================
-->

# Connex Studio Constitution

> **Philosophy**: All work must be spec-driven, stable, and minimally complex.

## I. Design & Architecture Principles

### 1. Spec-Driven / Intent-Driven Development

Every new feature or change MUST start with a clear specification or design document before writing code.
Every significant module or change MUST trace back to a specific requirement, scenario, or business purpose—not
simply "because we can do it this way."

**Rationale**: Prevents scope creep, ensures alignment with user needs, and creates traceable decision history.

### 2. Single Source of Truth (SSOT)

For configuration and settings, establish one clear SSOT to avoid duplicating information across multiple
files or systems; all reads and writes go through the same layer.

For specifications and principles, apply the same logic: when this project constitution exists, both AI
and humans MUST consult this document first rather than reinventing rules elsewhere.

**Rationale**: Eliminates conflicting sources of information and simplifies maintenance.

### 3. Abstract Interfaces & Extensible Design

For components that will have multiple variants (protocols, external services, algorithms, adapters, etc.),
define stable abstract interfaces or base classes upfront, with concrete implementations acting as plug-ins.

When adding new features, ask: "Will we need more types of this in the future?" If yes, avoid hardcoding
logic in if/else chains—use explicit extension points instead.

**Rationale**: Connex Studio supports multiple protocols (Modbus, MQTT, OPC UA); extensible interfaces
prevent rewriting core logic when adding new protocols.

### 4. Minimum Viable Complexity

When meeting requirements, prefer the "simplest and most maintainable" solution over the "most cutting-edge
or clever" one.

When multiple designs are available, ask:
1. What tangible benefit does this complexity provide?
2. Will someone taking over in a year understand it?
3. If requirements change, which approach is easier to adjust?

**Rationale**: Reduces cognitive load, improves maintainability, and accelerates onboarding.

## II. Data & State Management Principles

### 1. Separate Real-Time State, Configuration, and Historical Data

Clearly distinguish between different data types (runtime state, configuration/indexes, long-term history)
and handle them in separate layers.

During design, answer: "Is this data short-lived or long-lived? Used for real-time decisions or later
analysis?" Choose storage and access strategies accordingly.

**Rationale**: Connex Studio handles real-time polling data, persistent connection configs, and historical
trends—each requires different handling strategies.

### 2. Define Clear Update Flows & Consistency

Any configuration change, config reload, or feature toggle MUST have a clear process: Who updates?
How does it propagate? How are old instances replaced?

Use "centralized manager + getter" patterns (like ConnectionManager singleton) instead of "caching
instances everywhere" to avoid stale references after reloads.

**Rationale**: Electron's multi-process architecture requires explicit coordination between Main and
Renderer processes to maintain consistency.

## III. Quality & Risk Control Principles

### 1. Built-In Quality Checks, Not After-the-Fact Remediation

At the end of each development iteration, include at least one round of automated checks (tests, static
analysis, linting) and fix issues immediately, rather than waiting until pre-release.

When adding new tools or rules, synchronize them into this constitution, README, and dev guides to make
them part of the process, not just personal habits.

**Rationale**: Early detection is cheaper than late-stage remediation.

### 2. Temporary Things Must Be Short-Lived

Debug scripts, spikes, and temporary code MUST be deleted after use; do not let "temporary solutions"
become "permanent technical debt."

Anything marked "write it this way for now, clean up later" MUST have an explicit TODO or task entry,
not just exist in someone's head.

**Rationale**: Prevents accumulation of unmaintainable code paths.

### 3. Risky Operations Require Human Confirmation

Data deletion, infrastructure changes, and cross-system modifications MUST follow a "propose + review +
execute" cadence, not immediate action.

AI and automation tools MUST default to presenting plans and commands for these operations, not executing
them automatically, and MUST clearly label risks.

**Rationale**: Protects against irreversible mistakes in industrial control contexts.

## IV. Collaboration, Documentation & Communication Principles

### 1. Documentation Is as Important as Code

Before and after functional changes, synchronize specs, designs, changelogs, and task tracking so that
"reading documentation reveals current state."

Avoid "knowledge that only exists in someone's head"; document important architectural decisions and
trade-offs.

**Rationale**: Enables asynchronous collaboration and reduces bus factor.

### 2. Comments & Documentation Focus on "Why" and "Context"

For clear code, extra comments are unnecessary; when writing comments, explain "why this was done,"
"what problem this design solves," and "which alternatives were rejected."

The goal of documentation and comments is to help "future self / colleagues / AI assistants" understand
design context without asking the original author.

**Rationale**: Self-documenting code handles "what"; comments and docs handle "why."

### 3. Clear, Specific Changelogs & Task Tracking

Document significant changes in changelogs, including: what changed, which files were modified, and
impact on users or systems.

Task tracking (tasks/issues) MUST reflect actual progress: update when completing work, not just at
the "start" when writing todos.

**Rationale**: Provides audit trail and enables progress visibility.

### 4. Follow "Keep a Changelog" Standard

All changelog entries MUST follow the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format:

- Maintain `docs/CHANGELOG.md` as the single changelog file
- Use standard section headers: Added, Changed, Deprecated, Removed, Fixed, Security
- Group changes by type, not by commit or date
- Write entries for humans, not machines
- Update changelog at the end of each development iteration, not just at release time
- Link version headers to repository comparison URLs

**Rationale**: Standardized changelog format improves readability and enables automated tooling.

## V. Universal Behavioral Guidelines for AI Assistants & Agents

### 1. Respect This Constitution

This `CONSTITUTION.md` takes precedence over global AI rules. AI assistants MUST read this document
first before taking action on this project.

**Rationale**: Project-specific context is more relevant than generic guidelines.

### 2. Default to "Propose First, Then Execute"

For large changes or risky operations (refactoring, deletion, infrastructure adjustments), AI MUST:
- Present a brief plan or options
- Explain pros/cons and impact scope
- Wait for human confirmation before generating concrete patches or commands

**Rationale**: Aligns with Quality Principle III.3 on risky operations.

### 3. Make It Easy for Future Collaborators

Generated code, documentation, commit messages, and task updates MUST enable people taking over later
to "work without asking many questions"—this is the core value of AI collaboration.

**Rationale**: AI should augment team capability, not create dependencies on specific individuals.

## VI. Safety & Execution Rules

### 1. Terminal & File Operations

AI assistants MUST NOT automatically execute shell commands without explicit human approval.

For potentially destructive or high-impact commands (involving `rm`, `sudo`, containers, or infrastructure):
- Show the full command
- Briefly explain risks
- Request explicit confirmation before execution

Limit file operations to the active workspace or human-specified paths; avoid scanning home directories
or system folders without permission.

**Rationale**: Industrial software development requires extra caution with system-level operations.

### 2. IP & Confidentiality

Generated code and documentation MUST respect project IP boundaries.

Avoid copying or leaking sensitive configuration, credentials, or private keys; surface warnings if
such patterns are detected.

**Rationale**: Protects proprietary implementations and prevents security incidents.

## VII. Language & Interaction Style

### 1. Language Strategy

- High-level principles and constitutions: English (en-US)
- Project-specific documentation, comments, and commit messages: Follow project conventions (often
  Traditional Chinese zh-TW for this team)

**Rationale**: Balances international accessibility with team preferences.

### 2. Comment Quality

Focus on design intent and domain context, not line-by-line code translation.

If code is self-explanatory and consistent with existing patterns, additional comments are unnecessary.

**Rationale**: Reduces noise; signal-to-noise ratio matters.

### 3. AI Assistant Obligations Summary

- Always honor this `CONSTITUTION.md`; this document takes precedence
- Default to safe, review-friendly workflows: propose plans, show diffs or patches, and ask for
  confirmation before making large or irreversible changes
- When uncertain about trade-offs (performance vs. clarity, flexibility vs. stability), ask clarifying
  questions or present concise options with pros/cons tied back to these principles

**Rationale**: Establishes clear behavioral expectations for AI-assisted development.

## Governance

### Amendment Procedure

1. **Proposal**: Any team member (human or AI) may propose amendments with rationale
2. **Review**: Changes require documentation of what changed and why
3. **Migration**: Breaking changes to principles require a migration plan for existing work
4. **Versioning**: Follow semantic versioning (see below)

### Versioning Policy

- **MAJOR**: Backward-incompatible governance/principle removals or redefinitions
- **MINOR**: New principle/section added or materially expanded guidance
- **PATCH**: Clarifications, wording, typo fixes, non-semantic refinements

### Compliance Review

- All PRs/reviews MUST verify compliance with this constitution
- Complexity MUST be justified per Principle I.4
- Use `.specify/` templates for runtime development guidance

**Version**: 2.1.0 | **Ratified**: 2025-01-23 | **Last Amended**: 2025-01-23
