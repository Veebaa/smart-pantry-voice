# Sage 2.0 Migration Backlog

**Version:** 1.0

**Status:** Active

**Last Updated:** August 2, 2026

**Purpose:** Engineering backlog identifying architectural work required to migrate the existing Sage codebase toward the target Sage 2.0 architecture. This is NOT a sprint backlog, TODO list, or implementation guide—it is a long-term engineering planning document.

---

# Backlog Philosophy

The backlog intentionally contains only long-lived architectural work.

Implementation details are intentionally omitted.

Implementation plans are created only for the currently selected backlog item and discarded once that work is complete.

This keeps the backlog stable while allowing implementation to evolve.

---

# PHASE 1: Project Simplification

## S1-001: Define Capability Boundaries

**Title:** Identify and document all business capabilities in the codebase

**Description:** Analyze the existing codebase to identify distinct business capabilities (Pantry, Shopping, Recipes, Household, User Settings, etc.). Document what each capability does, what data it owns, and what operations it exposes.

**Why it is required:** The codebase has implicit capabilities embedded in routes and React components. Before refactoring, capabilities must be explicitly defined as first-class architectural components. This provides the vocabulary for all migration phases.

**Related ADR(s):** ADR-002 (Capability Architecture)

**Migration Phase:** Phase 1

**Dependencies:** None (foundational work)

**Priority:** P0 (foundational)

**Status:** Not Started

---

## S1-002: Remove Dead Code

**Title:** Identify and remove unused code, duplicate functions, and obsolete utilities

**Description:** Scan codebase for unused functions, dead code branches, duplicate implementations, and obsolete utilities. Remove safely with version control as backstop.

**Why it is required:** Dead code accumulates confusion and increases migration effort. Clean slate reduces noise and makes refactoring clearer.

**Related ADR(s):** ADR-004 (Application Architecture - clarity principle)

**Migration Phase:** Phase 1

**Dependencies:** S1-001

**Priority:** P1

**Status:** Not Started

---

## S1-003: Establish Architectural Organization

**Title:** Organize codebase to reflect architectural layers

**Description:** Structure code organization to distinguish architectural responsibilities: interfaces, conversation architecture, capabilities, persistence boundary, and infrastructure. Each layer should have clear separation from others.

**Why it is required:** Clear organizational boundaries enable developers to understand where code belongs. Architecture is expressed through code organization.

**Related ADR(s):** ADR-004 (Application Architecture)

**Migration Phase:** Phase 1

**Dependencies:** S1-001

**Priority:** P0

**Status:** Not Started

---

# PHASE 2: Capability Foundation

## C2-001: Extract Pantry Capability

**Title:** Migrate pantry business logic to independent capability

**Description:** Extract pantry management business logic from current codebase and implement as independent capability. Business logic should include all domain operations: item management, quantity tracking, expiry management, low-stock detection.

**Why it is required:** Pantry is the core domain. Extracting it first establishes the capability pattern and validates the architecture. Business logic becomes independently testable and interface-independent.

---

## C2-002: Extract Shopping Capability

**Title:** Migrate shopping list business logic to independent capability

**Description:** Extract shopping list management business logic and implement as independent capability. Business logic should include all domain operations: item management, list generation, state tracking.

**Why it is required:** Second capability validates capability pattern. Different domain than Pantry demonstrates capability independence and composition.

---

## C2-003: Extract Recipe Capability

**Title:** Migrate recipe business logic to independent capability

**Description:** Extract recipe search, filtering, and suggestion business logic and implement as independent capability. Business logic should support recipe discovery, filtering by available ingredients, favorite tracking, and rating.

**Why it is required:** Recipe capability demonstrates capability composition (calls other capabilities to access inventory state). Validates multi-capability interaction patterns.

---

## C2-004: Extract User Settings Capability

**Title:** Migrate user settings business logic to independent capability

**Description:** Extract user preferences and settings business logic and implement as independent capability. Business logic should manage user configuration: dietary preferences, household settings, notification preferences, voice settings.

**Why it is required:** User settings are foundational for conversation context. Must be independently testable and accessible to other capabilities.

---

## C2-005: Extract Auth Capability

**Title:** Migrate authentication business logic to independent capability

**Description:** Extract authentication and session management business logic and implement as independent capability. Business logic should handle user registration, authentication, session management, and authorization checks.

**Why it is required:** Authentication crosses multiple architectural layers. Extracting it validates boundary crossing patterns and ensures authorization logic is centralized and testable.

---

## C2-006: Establish Capability Registry

**Title:** Implement capability discovery mechanism

**Description:** Establish runtime capability registration and discovery system. Capabilities should register themselves at startup, exposing metadata: purpose, inputs, outputs, error types, permissions. Registry should provide capability lookup and invocation validation.

**Why it is required:** ADR-002 requires capabilities to be discoverable at runtime rather than hard-coded. Registry enables AI to discover available capabilities without modification when new capabilities are added.

---

## C2-007: Create Capability Contracts

**Title:** Document explicit capability contracts

**Description:** For each capability, establish explicit contract specification: purpose, input parameters (required and optional), output structure, error types, permissions, side effects.

**Why it is required:** Explicit contracts prevent implicit assumptions and enable future evolution. Contracts become the interface between capabilities, interfaces, and conversation logic.

---

# PHASE 3: Conversation Architecture

## CA3-001: Create Conversation State Management

**Title:** Implement application-managed conversation state

**Description:** Establish explicit conversation state management within the application layer. Conversation state should track current interaction context: message history, current focus, pending actions, clarification requests, user and session information.

**Why it is required:** ADR-003 requires conversation state to belong to application layer, not AI provider. State must be deterministic, persistent, and independent of any specific LLM implementation.

---

## CA3-002: Create Context Builder

**Title:** Implement context assembly for AI interpretation

**Description:** Establish mechanism for assembling conversation context from application state. Context should be curated to include only relevant information for current interaction: user preferences, relevant domain state, conversation history, pending actions, available capabilities.

**Why it is required:** ADR-003 requires application to provide bounded context to AI. AI should not directly query arbitrary application state. Context must be deliberately assembled and minimal.

---

## CA3-003: Establish Conversation Engine

**Title:** Implement conversation orchestration layer

**Description:** Establish conversation engine that coordinates interaction flow: receives user input, assembles context, invokes AI with available capabilities, coordinates capability execution, updates conversation state with results, generates appropriate response. Engine must be independent of transport mechanism (HTTP, WebSocket, voice).

**Why it is required:** ADR-003 requires explicit conversation orchestration independent of any specific interface. Conversation logic currently mixed with HTTP routing. Engine enables multiple interfaces to share identical interaction logic.

---

## CA3-004: Implement Explicit Clarification Flow

**Title:** Move clarification from implicit to explicit

**Description:** Establish deterministic clarification flow where application explicitly requests missing information rather than relying on AI inference. When capability requires information not provided by user, application should generate domain-appropriate clarification question, track pending action, and resume when user provides answer.

**Why it is required:** ADR-003 requires clarification to be deterministic and independent of AI provider. Implicit AI-based clarification may differ between models. Explicit application-driven clarification ensures consistent behavior.

---

## CA3-005: Separate Conversation from Interface Transport

**Title:** Extract conversation logic from interface layer

**Description:** Interface handlers (HTTP routes, voice endpoints, etc.) should become thin adapters that extract user input, invoke conversation engine, format response for interface, and return to user. All business logic and conversation coordination moves to conversation engine layer.

**Why it is required:** ADR-004 requires clear separation between interface transport mechanism and business coordination. Currently mixed in routes. Separation enables multiple interfaces to share identical coordination logic.

---

# PHASE 4: Application Boundaries

## AB4-001: Establish HTTP Interface Layer

**Title:** Implement HTTP as a presentation interface

**Description:** Organize HTTP endpoint handlers to contain only interface concerns: input extraction, response formatting, HTTP-specific error mapping. All business logic should be delegated to conversation engine or capabilities. Handlers should be stateless and focused solely on HTTP protocol mechanics.

**Why it is required:** ADR-004 requires interfaces to contain only presentation logic. Currently HTTP routes contain business logic, mixing concerns. Clear separation enables multiple interfaces to share business logic.

---

## AB4-002: Establish React Interface Layer

**Title:** Implement React components as presentation layer

**Description:** Organize React components to contain only rendering logic and interface state (UI theme, layout, animation). No business calculations, no authorization checks, no persistence queries. All state comes from props or API calls. Business logic remains in server capabilities.

**Why it is required:** ADR-004 requires interfaces to contain only presentation logic. Currently React components contain business logic. Clear separation enables business logic evolution without UI changes.

---

## AB4-003: Enforce Unidirectional Dependencies

**Title:** Implement architectural constraint validation

**Description:** Establish static analysis to verify unidirectional dependency flow: interfaces depend on lower layers, conversation depends on capabilities and infrastructure, capabilities depend on persistence and infrastructure only. No circular dependencies or reverse dependencies permitted.

**Why it is required:** ADR-004 requires unidirectional dependencies as architectural constraint. Manual verification insufficient. Build process must enforce rules automatically.

---

## AB4-004: Create Centralized Error Handling

**Title:** Establish domain-appropriate error semantics

**Description:** Establish consistent error handling across layers with domain-appropriate error types. Domain errors should communicate business meaning (ItemNotFound, InvalidQuantity, UnauthorizedAccess). Errors must be mapped appropriately at layer boundaries without leaking implementation details.

**Why it is required:** Currently error handling is scattered across codebase. Centralized approach improves clarity and prevents implementation leakage across boundaries.

---

## AB4-005: Implement Cross-Cutting Concerns

**Title:** Centralize logging, metrics, and observability

**Description:** Establish infrastructure for cross-cutting concerns: structured logging, metrics collection, request tracing, error reporting. These concerns should be accessible to all layers without contaminating business logic.

**Why it is required:** Cross-cutting concerns currently scattered. Centralization improves system observability and maintainability without mixing concerns.

---

# PHASE 5: Persistence Boundary

## PB5-001: Establish Persistence Adapters

**Title:** Abstract data access behind domain-specific interfaces

**Description:** For each domain (Pantry, Shopping, User, etc.), establish adapter interface that encapsulates data access operations. Adapters should provide query interface matching domain semantics rather than exposing storage technology details.

**Why it is required:** ADR-004 requires persistence to be abstracted from capabilities. Adapters enable storage technology swapping and reduce coupling between business logic and storage implementation.

---

## PB5-002: Implement Persistence Boundary

**Title:** Establish abstraction layer for data operations

**Description:** Create unified persistence interface that coordinates adapter access, manages transactions, provides query operations matching domain needs, and handles error translation. Capabilities should interact only with persistence boundary, never directly with storage.

**Why it is required:** ADR-004 requires clear persistence boundary. Boundary enables infrastructure independence and simplifies multi-step transactions.

---

## PB5-003: Persist Conversation State

**Title:** Add persistence to conversation state management

**Description:** Extend persistence layer to support conversation state storage: message history, pending actions, clarification requests, session metadata. Enable conversation recovery from session interruption or client reconnection.

**Why it is required:** ADR-003 requires conversation state to be persistent and recoverable. In-memory state is insufficient for production reliability.

---

## PB5-004: Implement Transaction Management

**Title:** Add transaction semantics to multi-step operations

**Description:** Ensure multi-step operations maintain consistency: atomic updates, rollback on failure, consistent final state. Transactions should be managed at persistence boundary rather than scattered across capabilities.

**Why it is required:** Data consistency requires transaction support. Centralizing at persistence boundary simplifies capability implementation and reduces error-prone distributed logic.

---

# PHASE 6: Infrastructure Separation

## IS6-001: Isolate AI Provider Integration

**Title:** Abstract AI provider behind infrastructure interface

**Description:** Establish infrastructure adapter that encapsulates AI provider specifics. Conversation engine should invoke AI through standardized interface rather than knowing provider-specific details. Adapter should handle API communication, error handling, response parsing.

**Why it is required:** ADR-001 requires AI to be pluggable and architecture-neutral. Currently provider-specific logic is scattered. Adapter enables provider swapping without affecting business logic.

---

## IS6-002: Extract External API Integration

**Title:** Abstract third-party service integrations behind infrastructure adapters

**Description:** Establish infrastructure adapters for each external service (recipe databases, nutrition services, etc.). Adapters encapsulate API communication and error handling. Capabilities call adapters, not external services directly.

**Why it is required:** ADR-004 requires infrastructure to be abstracted. Adapters enable service provider swapping and isolation of external dependencies.

---

## IS6-003: Centralize Configuration Management

**Title:** Establish configuration and secrets management

**Description:** Create centralized management for all external configuration: environment variables, feature flags, API credentials, deployment-specific settings. Other layers should receive configuration via dependency injection rather than fetching directly.

**Why it is required:** ADR-004 requires infrastructure to own configuration. Centralization enables environment-specific behavior without code changes.

---

## IS6-004: Implement Logging Infrastructure

**Title:** Establish centralized logging infrastructure

**Description:** Create centralized logging system accessible throughout application. Logging should be structured, support multiple severity levels, and provide correlation mechanisms for request tracing.

**Why it is required:** Observability requires centralized logging. Centralization improves debugging and monitoring capabilities.

---

## IS6-005: Implement Observability Stack

**Title:** Add metrics, tracing, and monitoring capabilities

**Description:** Establish observability infrastructure: metrics collection (request counts, latencies, error rates), distributed tracing (request flow visualization), monitoring (anomaly detection and alerting).

**Why it is required:** Production systems require observability for understanding behavior and diagnosing issues. Infrastructure provides visibility without contaminating business logic.

---

# PHASE 7: Testing & Validation

## TV7-001: Implement Capability Unit Tests

**Title:** Add unit test coverage for all capabilities

**Description:** Establish unit tests for each capability: verify business logic independently, use test doubles for dependencies, test error cases and edge cases, verify authorization and validation. Tests should require no external services or infrastructure.

**Why it is required:** Capabilities must be independently testable. Unit tests verify business logic correctness without infrastructure dependencies.

---

## TV7-002: Implement Conversation Integration Tests

**Title:** Add integration tests for conversation flows

**Description:** Establish integration tests covering conversation interactions: single-turn interactions, multi-turn exchanges with clarification, error handling, state persistence, session recovery.

**Why it is required:** ADR-003 requires conversation state to be deterministic and testable. Integration tests verify conversation logic works correctly end-to-end.

---

## TV7-003: Implement API Contract Tests

**Title:** Verify interface contracts are maintained

**Description:** Establish tests that verify HTTP interface contracts: request schemas, response schemas, status codes, error responses, backward compatibility. Tests ensure interface changes are deliberate and breaking changes are detected.

**Why it is required:** ADR-004 requires interfaces to respect contracts. Tests prevent accidental breaking changes and maintain API stability.

---

## TV7-004: Add Architecture Validation Tests

**Title:** Verify architectural constraints are enforced

**Description:** Establish tests that verify architectural rules: dependencies flow inward only, circular dependencies are absent, business logic is not in interface or infrastructure layers, capabilities do not reference HTTP or framework-specific concerns.

**Why it is required:** ADR-004 requires unidirectional dependencies and layer separation. Automated tests catch architectural violations early.

---

## TV7-005: Implement End-to-End Test Suite

**Title:** Add tests for complete user workflows

**Description:** Establish end-to-end tests covering realistic user scenarios: add pantry items and receive meal suggestions, multi-step workflows with clarification, error recovery, multiple interface types where applicable.

**Why it is required:** End-to-end tests verify system works correctly as integrated whole. Catch interaction issues between layers.

---

## TV7-006: Performance Benchmarking

**Title:** Establish performance baselines and regression detection

**Description:** Establish baseline performance metrics: capability execution time, API response latency, database query performance, resource usage. Create mechanisms to detect performance regressions during development.

**Why it is required:** Refactoring may introduce performance regressions. Benchmarking prevents unexpected degradation and enables informed optimization decisions.

---

# WORKING FROM THE BACKLOG

This backlog is the permanent engineering planning document for Sage 2.0 migration.

The backlog describes **what needs to be achieved** at the architectural level. It does not prescribe **how** it will be achieved.

## Implementation Process

When beginning work on the next backlog item:

1. **Select Next Item**: Identify the next backlog item ready for work (all dependencies satisfied)
2. **Create Implementation Plan**: Create temporary implementation plan for that specific item only. This plan describes technology choices, code organization, and specific tasks. The plan is temporary—it lives only for the duration of that item's implementation.
3. **Complete Item**: Implement, test, and validate the backlog item according to its implementation plan
4. **Commit and Review**: Commit changes, include backlog item ID in commit message, submit for review
5. **Update Backlog**: Mark item complete, delete temporary implementation plan
6. **Select Next Item**: Repeat

Only one backlog item should be actively implemented at a time.

---

# USAGE

This backlog is the authoritative source of architectural work required for migration.

When questions arise about what should be done next:
1. Check the backlog for next ready item
2. Review related ADRs for architectural guidance
3. Review Developer Guide for implementation patterns
4. Create implementation plan for current item

When questions arise during implementation:
1. Check which ADR applies
2. Refer to architecture documents for guidance
3. Check related backlog items for context
4. Apply Developer Guide patterns

When architecture questions arise:
1. Check relevant ADR
2. Check glossary for terminology
3. Refer to ADR trade-offs for decision context
4. Document any architectural clarifications as they emerge
