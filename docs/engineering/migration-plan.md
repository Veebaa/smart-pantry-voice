# Sage 2.0 Migration Plan

> Historical references to Supabase below describe the implementation that preceded the current PostgreSQL + Drizzle setup. They are not current deployment instructions.

**Version:** 1.0

**Status:** Historical plan (implementation completed; retained as migration history)

**Last Updated:** August 2, 2026

**Scope:** Incremental transformation of the existing Sage codebase from its current mixed-concern architecture to the target Sage 2.0 architecture defined in the Architecture Decision Records.

**Implementation note (25 November 2026):** The active application has already moved from the former Supabase implementation to React + TypeScript + Vite, Express + Node.js, PostgreSQL, Drizzle ORM, and OpenAI integration. This document's Supabase references describe that earlier state and are historical; PostgreSQL with Drizzle is current. npm is the package manager. Configure `DATABASE_URL` and `OPENAI_API_KEY`; apply versioned migrations to a new, empty database with `npm run db:migrate`, and use `npm run db:push` only for local development. Production database provisioning and verification have not been completed.

---

## Purpose

This document describes the incremental migration strategy for moving the existing Sage codebase toward the target Sage 2.0 architecture.

The current application has been built organically over time. Business logic, conversation handling, and interface concerns are intermixed. Persistence logic is embedded throughout the codebase. AI integration is partially established but not fully orchestrated.

The target architecture cleanly separates these concerns through five distinct layers with unidirectional dependencies: Interfaces, Conversation Architecture, Capability Layer, Persistence Boundary, and Infrastructure.

This migration plan provides a structured path to that target without requiring a complete rewrite. The application remains functional after every phase. Risk is minimized through incremental changes. Each phase produces measurable progress toward the target architecture.

---

## Migration Principles

### Preserve Behaviour

Business logic must never change during refactoring. The application should behave identically before and after migration. Changes to behavior belong in separate pull requests from architectural refactoring.

### Refactor Incrementally

Migrate one capability at a time. Migrate one layer at a time. Small changes are reviewable. Small changes are revertible. Small changes reduce risk.

### Keep the Application Working

After every phase, the application should be functional. Users should not experience degraded service. The team should not need to hold releases pending migration completion.

### Prefer Many Small Changes Over One Large Rewrite

A single massive refactoring is high-risk and high-effort. Incremental refactoring spreads work over time, allows parallel development, and minimizes breakage.

### Architecture Drives Implementation

Decisions about folder structure, file organization, and naming conventions follow from architectural principles, not the reverse. When questions arise about where code should go, refer to the Architecture Decision Records.

### Simplicity Wins

Avoid creating intermediate layers or abstractions during migration. The migration itself should not introduce complexity. Only move code, don't reorganize unnecessarily. The target architecture is the goal; intermediate complexity is not.

---

## Current State Assessment

The current Sage codebase exhibits the following characteristics:

### Mixed Concerns

- Business logic is distributed across HTTP route handlers, React components, and utility functions
- Conversation coordination logic is partially embedded in the AI integration layer
- Persistence details (Supabase queries, authentication) are mixed with business logic
- UI state management includes business calculations

### Capabilities Not Yet First-Class

- Capabilities are not formally identified or organized
- No explicit capability registry
- Capabilities are discoverable only by reading code
- Capability contracts are implicit, not explicit

### Partial AI Integration

- AI is invoked from route handlers and React components
- AI integration exists but doesn't yet follow the Orchestrator pattern
- System prompts may contain business logic (implications of ADR-001 violation)
- Hard-coded tool definitions instead of runtime discovery

### Persistence Tightly Integrated

- Database queries scattered throughout application
- Business logic depends on persistence implementation details
- No abstraction layer between business logic and storage
- Persistence technology (Supabase) known throughout codebase

### Current Structure

```
server/
├── index.ts           (HTTP server, routes mixed with logic)
├── routes.ts          (Route handlers with business logic)
├── auth.ts            (Authentication, partially coupled to persistence)
├── db.ts              (Database client)
├── itemClassifier.ts  (Business logic, depends on HTTP?)
├── validators.ts      (Validation mixed with business rules)
└── security.ts        (Security mixed with HTTP concerns)

client/
├── components/        (UI components, some with business logic)
├── pages/             (Page components with business logic)
├── contexts/          (Application state, mixed concerns)
├── hooks/             (Custom hooks, some with business logic)
└── integrations/      (Third-party integrations)
```

### What Works Well

- Core functionality exists and works
- Database schema supports the business model
- User interface is functional
- Authentication is implemented
- Foundation for voice integration exists
- Test infrastructure exists

### What Needs Refactoring

- Business logic scattered across multiple files and layers
- No clear capability boundaries
- Persistence queries mixed with business logic
- Conversation state management needs centralization
- AI integration needs orchestration pattern
- HTTP routes should contain only routing logic

---

## Target State

The target architecture, defined in ADR-001 through ADR-004, organizes Sage into five layers:

### Layer 1: Interfaces

Voice, chat, web UI, and future interfaces present capabilities to users. Interfaces contain only presentation logic. All business logic is implemented in lower layers.

### Layer 2: Conversation Architecture

Manages conversation state, context building, and flow coordination. Bridges between interfaces and business logic. Independent of any specific AI provider. Implements ADR-003.

### Layer 3: Capability Layer

Implements business capabilities independently. Each capability owns one business function. Capabilities are independently testable, interface-independent, and deterministic. Implements ADR-002.

### Layer 4: Persistence Boundary

Abstracts data storage from business logic. Persistence layer may change without affecting capabilities. Provides query interface matching domain needs. Technology-neutral.

### Layer 5: Infrastructure

Provides external services (AI models, recipe databases, cloud services, logging). Infrastructure never makes business decisions.

### Target Structure

The implementation will gradually evolve toward the architectural boundaries defined in ADR-004.

---

## Migration Phases

### Phase 1: Project Simplification

**Purpose:** Establish clear project structure and remove obstacles to migration.

**Objectives:**
- Create target folder structure
- Identify and document all current capabilities
- Remove dead code
- Consolidate duplicate logic
- Establish clear naming conventions

**Expected Outcome:**
Project structure supports target architecture. Dead code removed. Capabilities identified but not yet refactored.

**Completion Criteria:**
- [ ] Target folder structure exists
- [ ] Capabilities documented
- [ ] Dead code removed
- [ ] Naming conventions established
- [ ] Build and tests passing

**Possible Risks:**
- Moving code without changing behavior could introduce subtle bugs
- **Mitigation**: Comprehensive test suite before moving, small file moves, frequent verification
- Large refactor might break integrations
- **Mitigation**: Maintain backward compatibility in HTTP routes during transition

---

### Phase 2: Capability Foundation

**Purpose:** Extract business logic into independently testable capabilities.

**Objectives:**
- Identify business capabilities (Pantry, Shopping, User, Recipe, etc.)
- Define capability contracts for each
- Create Capability Layer structure
- Migrate business logic from routes and components into capabilities
- Create Capability Registry
- Ensure each capability is independently testable

**Expected Outcome:**
Business logic lives in capability layer. Capabilities follow contracts. Each capability can be tested without HTTP or React.

**Completion Criteria:**
- [ ] All business logic extracted to capabilities
- [ ] Capability Registry functional
- [ ] Each capability independently testable
- [ ] Contracts documented
- [ ] All tests passing

**Possible Risks:**
- Complex business logic may be split across multiple places
- **Mitigation**: Code review to verify single-responsibility principle
- Capabilities may have implicit dependencies
- **Mitigation**: Make dependencies explicit in capability definitions
- Existing code calls capabilities inconsistently
- **Mitigation**: Establish strict patterns for capability invocation

---

### Phase 3: Conversation Architecture

**Purpose:** Centralize conversation state management and establish explicit flow.

**Objectives:**
- Create Conversation Engine structure
- Implement explicit conversation state management
- Build Context Builder
- Migrate from implicit conversation handling to explicit coordination
- Ensure voice and text interfaces follow identical conversation flow
- Test conversation state independently of AI provider

**Expected Outcome:**
Conversation state belongs to application. Conversation flow is explicit and traceable. Interfaces are interchangeable. Conversation works identically regardless of AI provider.

**Completion Criteria:**
- [ ] Conversation state centralized
- [ ] Context Builder implemented
- [ ] Conversation Engine implemented
- [ ] Multi-turn conversations work correctly
- [ ] Clarification flow implemented
- [ ] Conversation state persisted
- [ ] Both voice and text follow same flow

**Possible Risks:**
- Conversation state persistence adds database work
- **Mitigation**: Start with in-memory state, add persistence incrementally
- Existing AI integration may require refactoring
- **Mitigation**: Maintain compatibility layer while refactoring
- UI state management may conflict with conversation state
- **Mitigation**: Clear separation: UI state separate from conversation state

---

### Phase 4: Application Boundaries

**Purpose:** Establish clear architectural boundaries and enforce dependency direction.

**Objectives:**
- Establish Interfaces layer structure
- Separate HTTP routing from business logic
- Create HTTP layer that only routes and formats responses
- Separate React components into pure presentation
- Enforce unidirectional dependencies
- Add architecture validation to build process

**Expected Outcome:**
Clear boundaries between layers. Dependencies flow inward. HTTP routes contain only routing logic. React components contain only presentation. Build process enforces boundaries.

**Completion Criteria:**
- [ ] HTTP routes contain only routing logic
- [ ] React components contain only presentation
- [ ] Dependency graph flows inward only
- [ ] No circular dependencies
- [ ] Architecture validation in build process
- [ ] All tests passing
- [ ] Code review checklist includes boundary validation

**Possible Risks:**
- Existing code violates boundaries in subtle ways
- **Mitigation**: Use static analysis to identify violations
- Splitting code between layers may reveal coupling
- **Mitigation**: Address coupling during this phase
- Performance implications of strict boundaries
- **Mitigation**: Benchmark before and after, optimize if needed

---

### Phase 5: Persistence Boundary

**Purpose:** Abstract persistence implementation from business logic.

**Objectives:**
- Create Persistence Boundary layer
- Extract persistence details into adapters
- Establish the Persistence Boundary and migrate persistence concerns behind clearly defined persistence interfaces
- Migrate queries from scattered locations to persistence layer
- Ensure capabilities interact with persistence through abstraction only
- Enable storage technology swapping

**Expected Outcome:**
Persistence implementation hidden. Capabilities interact with abstract persistence interface. Storage technology changeable without affecting business logic.

**Completion Criteria:**
- [ ] Persistence adapters created
- [ ] All queries in persistence layer
- [ ] Capabilities use only persistence interfaces
- [ ] No direct database access from capabilities
- [ ] Persistence layer independently testable
- [ ] All tests passing

**Possible Risks:**
- Over-abstraction of persistence layer
- **Mitigation**: Keep abstractions simple, avoid unnecessary layers
- Performance implications of abstraction
- **Mitigation**: Benchmark queries, optimize if needed
- Transaction handling may become complex
- **Mitigation**: Test transaction boundaries carefully

---

### Phase 6: Infrastructure Separation

**Purpose:** Isolate external services and third-party integrations.

**Objectives:**
- Create Infrastructure layer structure
- Extract external API calls (OpenAI, recipe databases, etc.) into adapters
- Extract configuration management into infrastructure
- Extract logging and monitoring into infrastructure
- Ensure capabilities don't know about specific external services
- Enable provider swapping (e.g., OpenAI → Anthropic)

**Expected Outcome:**
External services abstracted. Capabilities independent of specific providers. Infrastructure provides technical services without making business decisions.

**Completion Criteria:**
- [ ] External API calls abstracted
- [ ] Configuration centralized
- [ ] Logging centralized
- [ ] Capabilities don't reference specific providers
- [ ] AI provider swappable
- [ ] All tests passing

**Possible Risks:**
- Infrastructure changes may be frequent
- **Mitigation**: Version infrastructure interfaces, maintain backward compatibility
- External services may fail, requiring error handling
- **Mitigation**: Ensure error handling in infrastructure adapters
- Configuration complexity may increase
- **Mitigation**: Keep configuration simple and documented

---

### Phase 7: Testing & Validation

**Purpose:** Verify the migration is complete and architecture is enforced.

**Objectives:**
- Add comprehensive test coverage
- Add architecture validation tests
- Verify all layers are independently testable
- Add integration tests that verify layer interactions
- Document test strategy
- Ensure team understands testing patterns
- Performance testing before and after

**Expected Outcome:**
High test coverage. Architecture enforced by tests. Team confident in code quality.

**Completion Criteria:**
- [ ] Test coverage above 80%
- [ ] Architecture validation tests in place
- [ ] No architectural violations detected
- [ ] Integration tests pass
- [ ] Performance acceptable
- [ ] Developer Guide validated against implementation
- [ ] Documentation complete

**Possible Risks:**
- Testing may reveal unexpected coupling
- **Mitigation**: Fix issues during this phase
- Performance regression from abstraction layers
- **Mitigation**: Profile and optimize during this phase
- Testing infrastructure may be insufficient
- **Mitigation**: Invest in test tooling

---

## Working Rules During Migration

### Rule 1: Don't Mix Features and Refactoring

Pull requests should do one thing: add a feature OR refactor, never both. Feature PR is easier to review. Refactoring PR is easier to review. Mixed PR is unclear which change introduced a bug.

### Rule 2: Keep Pull Requests Small

Each PR should be reviewable in one sitting. Prefer many small PRs over one giant PR. Small PRs get reviewed faster. Small PRs are less likely to have issues. Small PRs are easier to revert if needed.

### Rule 3: Update Documentation Alongside Code

When code moves, documentation moves too. ADRs don't change—they're authoritative. But migration guide, folder structure docs, and README should reflect current state.

### Rule 4: Remove Dead Code Promptly

When old code becomes unnecessary, delete it immediately. Dead code accumulates and creates confusion. Don't keep "just in case"—use version control.

### Rule 5: Maintain Backward Compatibility Where Practical

If existing code calls the interface you're refactoring, maintain compatibility during transition. Example: Keep HTTP routes working while refactoring behind them. Avoid breaking changes for downstream users.

### Rule 6: Keep Architecture Consistent

Every new piece of code should follow target architecture patterns. Don't create temporary workarounds that violate architecture. Temporary becomes permanent. Better to do it right once.

### Rule 7: Verify Tests Pass After Every Change

CI/CD pipeline should run after every commit. Tests should pass. If tests fail, fix before moving forward. Never merge with failing tests.

### Rule 8: Code Review Includes Architecture Check

Reviewers should verify changes respect architectural boundaries. Use architecture-specific checklist from Developer Guide. When in doubt, ask.

---

## Decision Checkpoints

At the completion of each migration phase:

- verify the application still functions correctly,
- confirm architectural boundaries have improved,
- update documentation if necessary,
- remove obsolete code,
- commit the completed phase before continuing.

Migration should proceed only after each phase reaches a stable state.

---

## Measuring Progress

Track progress using these objective metrics:

### Capabilities Migrated

**Metric:** Number of business capabilities extracted to Capability Layer

Track: 0/10 → 10/10 capabilities independent

Example milestones:
- [ ] Pantry capability extracted (add, update, delete items)
- [ ] Shopping capability extracted (manage shopping list)
- [ ] Recipe capability extracted (search and filter)
- [ ] User capability extracted (preferences, settings)
- [ ] Conversation capability extracted (state management)
- [ ] Voice capability extracted (transcription, synthesis)
- [ ] Household capability extracted (member management)
- [ ] Auth capability extracted (login, permissions)
- [ ] Notification capability extracted (alerts, emails)
- [ ] Search capability extracted (indexing, queries)

### Business Logic Extracted

**Metric:** Percentage of business logic in Capability Layer vs. scattered

Target: 95%+ business logic in capabilities, <5% elsewhere

Measure by reviewing:
- Routes and handlers: Should have <5 lines of business logic
- React components: Should have 0 lines of business logic
- Utilities: Should be pure functions, no state

### Conversation State Migrated

**Metric:** Conversation state managed in Conversation Architecture vs. AI provider

Target: 100% of conversation state in application

Track:
- Message history: Application-managed
- Context variables: Application-managed
- Pending actions: Application-managed
- Clarification requests: Application-managed
- Session metadata: Application-managed

### Legacy Code Removed

**Metric:** Lines of non-migrated legacy code

Target: 0 legacy code paths remaining

Track:
- Old-style routes still using mixed concerns
- Old-style components with business logic
- Duplicate capability implementations
- Obsolete utility functions

### Architectural Violations Reduced

**Metric:** Number of detected architectural violations

Target: 0 violations

Track violations of:
- Unidirectional dependencies
- Business logic outside Capability Layer
- Conversation state outside Conversation Architecture
- Persistence details inside capabilities

Use static analysis tools to detect.

### Test Coverage

**Metric:** Code coverage percentage

Target: 80%+ overall, 95%+ for Capability Layer

### Phase Completion

**Metric:** Phases completed

- [ ] Phase 1 complete: 0/7
- [ ] Phase 2 complete: 1/7
- [ ] Phase 3 complete: 2/7
- [ ] Phase 4 complete: 3/7
- [ ] Phase 5 complete: 4/7
- [ ] Phase 6 complete: 5/7
- [ ] Phase 7 complete: 6/7
- [ ] Migration complete: 7/7

---

## Completion Criteria

Migration is complete when:

### Architecture Fully Adopted

- All business logic resides in Capability Layer
- All conversation coordination resides in Conversation Architecture
- All presentation logic resides in Interfaces Layer
- All persistence queries resides in Persistence Boundary
- All external services reside in Infrastructure
- Zero violations of unidirectional dependency rule

### All Layers Independently Testable

- Capabilities tested without HTTP or React
- Conversation tested without AI provider
- Interfaces tested without backend
- Persistence tested with mock storage
- Infrastructure tested with mock services

### Full Test Coverage

- Comprehensive automated test coverage appropriate to the application's complexity.
- All architectural layers have integration tests
- No flaky tests

### Documentation Complete

- Architecture documents reflect current state
- Developer Guide updated with real examples
- All capabilities documented with contracts
- Migration guide documents what changed and why

### Team Fully Trained

- New developers can understand system in one day
- Team members can identify architectural violations
- Pull request reviews verify architectural consistency
- Code review checklist includes architecture items

### Performance maintained or improved

- Application responsiveness unchanged
- API latency within acceptable bounds
- Database queries optimized
- No memory leaks from abstraction layers

### Backwards Compatibility Maintained

- Existing HTTP API unchanged (or deprecated with notice)
- Existing user workflows unchanged
- No data loss
- Existing integrations still work

---

## Summary

The migration from current Sage toward Sage 2.0 architecture is an incremental journey through seven phases:

1. **Simplification**: Structure and clarity
2. **Capability Foundation**: Business logic extraction
3. **Conversation Architecture**: State and flow
4. **Application Boundaries**: Layer enforcement
5. **Persistence Boundary**: Storage abstraction
6. **Infrastructure Separation**: External service abstraction
7. **Testing & Validation**: Verification and coverage

Each phase is achievable incrementally. Each phase maintains a functional application. Each phase produces measurable progress. Each phase can be reviewed and validated independently.

**The migration is not a rewrite. It is a careful refactoring of existing working code into cleaner architectural patterns.** Every line of code should continue working after migration. Every feature should remain available. Every behavior should remain identical.

**The goal is not to replace the application. The goal is to make it sustainable for the next several years of growth.**

When migration is complete:
- New developers understand the system quickly
- New features are added with confidence
- Changes to one capability don't break others
- The entire system is independently testable
- The architecture remains understandable regardless of scale
- The codebase is a pleasure to maintain

That is the prize worth the effort of migration.
