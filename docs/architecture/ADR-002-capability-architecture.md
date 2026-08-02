# ADR-002: Capability Architecture

**Status:** Approved

**Date:** August 2, 2026

**Author:** Architecture Team

**Supersedes:** N/A

**Superseded by:** N/A

**Related:** ADR-001 (AI is an Orchestrator)

---

## Context

Without a formal capability model, AI-native applications become difficult to maintain and extend. Business logic scattered across prompts, hard-coded AI logic, and tight coupling between AI and features make systems fragile.

Sage requires:
- **Clear boundaries** between AI orchestration and business logic
- **Stable interfaces** that capabilities expose to the conversation engine
- **Pluggable architecture** so new features don't require modifying existing code
- **Deterministic behavior** independent of AI implementation

A capability model solves this by establishing capabilities as first-class architectural components that the AI can discover and invoke.

---

## Decision

### What is a Capability?

A **Capability** is a first-class architectural component representing a single business function.

Capabilities are:
- **Independently testable**: Business logic functions without AI, HTTP, or React
- **Interface-independent**: Accessible via voice, chat, buttons, or future interfaces
- **Deterministic**: Same inputs produce identical outputs
- **Explicit**: Clear contract for inputs, outputs, errors, and permissions
- **Reusable**: Other capabilities can invoke them

### Capabilities as Primary Building Block

Sage organizes around capabilities, not pages. Each capability encodes one business operation and can be independently tested, evolved and maintained. The Conversation Engine orchestrates capabilities. Interfaces consume them. This inversion enables:

- **Pluggable architecture**: New capabilities added without modifying existing code
- **Clear ownership**: Each capability owns its domain
- **Parallel development**: Multiple capabilities developed independently
- **Easy evolution**: Features added as new capabilities

---

## Capability Principles

Every capability must follow these principles to maintain clear boundaries and independent testability.

### Principle 1: Single Responsibility

Each capability owns exactly one business function. `pantry.addItem()` adds to inventory—it does not update shopping lists. `shopping.removeItem()` removes from lists—it does not update pantry. This clarity enables focused testing and isolated changes.

### Principle 2: Explicit Contract

Capability contract specifies:
- **Purpose**: What this capability does
- **Inputs**: Required and optional parameters
- **Outputs**: Success and failure responses
- **Errors**: Named errors with clear meanings
- **Permissions**: Who can invoke this capability
- **Side effects**: Any asynchronous reactions

Breaking changes to contract (removing inputs, changing outputs) should create a new capability version rather than silently change behavior.

### Principle 3: No Knowledge of AI

Capabilities never reference LLM, prompts, or AI concepts. They work identically whether called from voice, chat, buttons, or future integrations. This decoupling ensures business logic remains testable without invoking external AI services.

### Principle 4: No Knowledge of HTTP, UI, or Presentation

Capabilities never reference status codes, React components, routing, or rendering. They return structured data. Callers decide what to do with results. This independence enables capabilities to be called from multiple interfaces without duplication.

### Principle 5: Deterministic Behavior

Same inputs always produce same outputs. No randomness, no dependency on external state (except timestamps for audit). This determinism makes behavior testable, auditable, and reproducible.

### Principle 6: Explicit Inputs and Outputs

All inputs are passed explicitly—no implicit context or state. All outputs are structured and complete. Callers always know exactly what happened, what errors occurred, and what side effects were emitted.

### Principle 7: Authorization at Capability Boundary

Permission checks happen inside capabilities, not in HTTP routes or AI layers. Capabilities return UnauthorizedAccess errors when permissions are insufficient. This ensures authorization logic lives in one place.

---

## Capability Lifecycle

Capabilities follow a consistent lifecycle from discovery through execution.

**Discovery**: Conversation Engine loads Capability Registry at startup. Registry returns all available capabilities with their metadata (purpose, inputs, outputs, permissions).

**Validation**: System verifies capabilities are well-formed: schema defined, inputs and outputs specified, no duplicate names, access control configured.

**Invocation**: During conversation, AI detects user intent and selects appropriate capability. Conversation Engine validates: user has permission, parameters present and valid, no suspicious patterns.

**Execution**: Capability implements business logic, validates inputs, applies authorization, updates persistence, handles errors gracefully.

**Result**: Capability returns structured result with success/failure, data, and any emitted events.

**Composition**: If capability emits events, other capabilities may listen and react asynchronously. Otherwise, result returned directly to caller.

**Completion**: Conversation Engine receives result and formats response for user.

---

## Capability Contract

Every capability exposes a public contract specifying:

- **Purpose**: Clear, single-sentence description of what it does
- **Inputs**: Required and optional parameters, validation rules
- **Outputs**: Success and failure responses, complete result structure
- **Errors**: Named error types with clear meanings and suggestions
- **Permissions**: Who can invoke, authorization rules
- **Side Effects**: Domain events emitted, documented reactions

Explicit contracts enable reasoning about system behavior: when a contract changes, all affected callers are immediately visible. Changes that add optional inputs or improve error messages are backward-compatible. Changes that remove inputs or alter output structure should create new capability versions rather than break existing callers.

Explicit contracts are the foundation of maintainability. Without them, understanding a change's impact requires searching through all code that calls the capability.

---

## Capability Registry

The Capability Registry is a runtime registry where capabilities are registered, discovered, and made available to the Conversation Engine.

**Why Registration Instead of Hard-Coding:**

Hard-coded approach requires modifying the Conversation Engine to add new capabilities. Registered approach allows new capabilities to be added without modifying any existing code.

**How Discovery Works:**

At startup, Conversation Engine queries the registry for all available capabilities. Registry returns metadata: identifier, description, input/output schemas, access control. Conversation Engine builds AI tool definitions from these schemas. AI can now select appropriate capabilities during conversation.

This design enables:
- **Pluggable capabilities**: New features added without modifying Conversation Engine
- **Dynamic enablement**: Capabilities can be enabled/disabled by configuration  
- **Future AI model swapping**: Different AI providers consume same capability definitions
- **Vendor neutrality**: Architecture remains independent of specific AI provider

---

## Capability Categories

Sage capabilities are organized into logical domains.

**Core Capabilities:**
- Conversation (state management, context building)
- Voice (transcription, synthesis, audio handling)

**Domain Capabilities:**
- Pantry (add, update, delete, search, expire tracking, low stock)
- Shopping (add, remove, auto-generate, organize)
- Recipes (search, filter by availability, save, rate)
- Household (member management, permissions, sharing)
- User Preferences (settings, dietary restrictions, notifications)

**Future Capabilities:**
- Meal Planning (generate plans, nutritional balance)
- Nutrition (track intake, analyze macros)
- Barcode Scanning (product resolution)
- Smart Appliances (device integration)

Grouping by domain improves maintainability by making capability ownership clear and enabling discovery of related capabilities.

---

## Capability Composition

Capabilities collaborate through direct interaction or event-driven patterns.

**Direct Interaction (Preferred Default):**
When one capability needs immediate results from another, it calls it directly. Synchronous, atomic, result known immediately. Example: RecipeService queries PantryService for available items before suggesting recipes.

**Event-Driven (When Beneficial):**
When side effects are asynchronous and multiple subscribers should react independently, emit domain events. Other capabilities subscribe and react. Loose coupling, eventual consistency. Example: PantryService emits ItemQuantityUpdated; ShoppingService listens and removes items at 0 quantity.

**Simplicity First:**
Follow the "Simplicity Wins" principle. Use direct interaction by default. Use event-driven only when loose coupling or asynchronous processing provides clear architectural benefit. Avoid over-engineering simple operations through unnecessary event chains.

---

## Capability Boundaries

### What Belongs Inside a Capability

- **Business logic**: Rules, calculations, validations
- **Validation**: Input verification, constraint enforcement
- **Authorization**: Permission checks and access control
- **Persistence interaction**: Capabilities interact with the persistence boundary to query and update business data. The underlying persistence technology remains an implementation detail.
- **Domain events**: Reactions to state changes

### What Never Belongs Inside a Capability

- **HTTP details**: Status codes, request/response formatting
- **UI concerns**: React components, routing, styling
- **AI prompts**: System messages, LLM-specific logic
- **Database implementation**: Raw SQL, ORM specifics
- **Conversation state**: Chat history, context variables
- **Infrastructure**: Cloudflare Workers configuration, deployment

Capabilities own business behavior. Callers own how results are used. This separation ensures capabilities remain testable, reusable, and independent of specific implementations.

---

## Capability Discovery

The Conversation Engine never hard-codes which capabilities exist or what they do. Instead, it queries the registry at runtime.

Registry discovery process:
1. Conversation Engine asks registry: "What capabilities exist for this user?"
2. Registry filters by permissions, enabled status, rate limits
3. Registry returns capability metadata: id, description, input/output schemas, access control
4. Conversation Engine translates to AI provider schema
5. AI can now select appropriate capabilities based on user intent

This design supports future model swapping: different AI providers can understand the same capability definitions. Business logic and capability definitions remain constant while only the AI provider changes.

Capabilities remain vendor-neutral because they're defined independently of any specific LLM format.

---

## Capability Evolution

Capabilities should evolve through additive, backwards-compatible changes whenever possible.

**Backward-Compatible Changes:**
- Add optional input parameters
- Add new outputs to response
- Add new error types
- Improve error messages
- Emit new events

**Breaking Changes:**
- Remove input parameter
- Change output structure
- Change error behavior
- Remove event

When breaking changes are necessary, create a new capability version (e.g., `pantry.addItemV2`) rather than silently changing behavior. This preserves compatibility with existing callers: conversation logic, interfaces, and future integrations continue working while new code gradually migrates to the new version.

This principle ensures Sage can evolve without cascading failures through the architecture.

---

## Trade-Offs

### More Planning Required

Upfront design of capability contracts takes time. However, this planning prevents mistakes: poor contracts are difficult to change later, while good contracts enable parallel development and future evolution.

### Discipline Required

Team must consistently follow the capability pattern. Inconsistency reintroduces the original problems: tight coupling, testing difficulties, and hard-to-understand code. Consistency is the solution.

### Registry Maintenance

Keeping capability registry synchronized with implementation adds overhead. However, registry enables AI discovery, clear documentation, automated validation, and plugin architecture—making it a worthwhile investment in long-term maintainability.

### Additional Documentation

Each capability must document purpose, inputs, outputs, errors, and permissions. However, this documentation is the design. Good design deserves to be written down.

---

## Consequences

### Every Future Feature Must

1. Be organized as capabilities
2. Follow the contract model (clear inputs, outputs, errors, permissions)
3. Be independently testable
4. Emit domain events for side effects (or call other capabilities directly)
5. Have explicit validation and authorization checks
6. Follow the project's engineering standards
7. Be documented with purpose and contract

### Architectural Implications

Repository structure reflects capabilities. Architecture reviews verify capability independence. Code reviews verify contract consistency. Testing verifies isolation. Documentation explains capability purpose.

Team size can scale: each developer owns one or two capabilities with minimal merge conflicts and clear interfaces.

### Future Decision-Making

When someone asks: "Should I add this to the conversation engine?" → "No, add it as a capability."

When someone asks: "Should I put this business rule in the prompt?" → "No, implement it in the capability."

When someone asks: "Can this service call that service directly?" → "If immediate result needed: yes. If side effect: use events."

When someone asks: "How do I add support for new AI model?" → "Update capability discovery, everything else stays the same."

---

## Relationship to ADR-001

ADR-001 and ADR-002 are complementary architectural decisions.

**ADR-001** (AI is Orchestrator) defines what the AI layer does and doesn't do. AI orchestrates, services execute. Business logic must be separate from AI.

**ADR-002** (Capability Architecture) defines how to structure services so orchestration works cleanly. Capabilities are first-class components with explicit contracts.

**Together:** AI discovers capabilities at runtime. AI selects appropriate capability based on intent. Conversation Engine invokes capability. Capability executes business logic. Result returned to AI for response generation.

This separation guarantees:
- AI can be swapped without changing capabilities
- Capabilities can be evolved without changing AI
- New capabilities can be added without modifying existing code
- Testing can isolate each layer

```
User: "I used half the milk"
     ↓
Conversation Engine (routes to AI)
     ↓
AI (understands intent, selects pantry.updateQuantity)
     ↓
Capability Registry (validates capability exists and user has permission)
     ↓
Pantry Capability (executes: validates, authorizes, updates database, emits events)
     ↓
Event Subscribers (ShoppingService, NotificationService react)
     ↓
AI (reads result, generates response)
     ↓
User receives: "Updated milk to 0.5L"
```

---

**Capabilities represent business intent, not technical implementation.**

**They describe what Sage can do, never how it does it.**

---

## Summary

**Core Principle**: Sage is organized around capabilities, not pages or prompts.

**Architectural Statement:**

> "A capability is what Sage can do. The AI orchestrates how to do it. The application services execute it. The persistence stores the result. New capabilities are added by registering them, not by modifying existing code. The architecture remains clear at any scale."

**Key Benefits:**
- **Testability**: Business logic tested independently of AI
- **Maintainability**: Clear, bounded responsibilities
- **Extensibility**: New features added without modifying existing code
- **Replaceability**: AI, interfaces, and implementations can be swapped
- **Scalability**: Architecture supports team growth and feature growth
- **Understandability**: Single developer can understand system in one day

Capabilities are the structural foundation of Sage 2.0. They enable the AI orchestration pattern to work cleanly, make testing practical, and allow sustainable growth over many years.
