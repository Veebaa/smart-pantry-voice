# ADR-004: Application Architecture

**Status:** Approved

**Date:** August 2, 2026

**Author:** Architecture Team

**Supersedes:** N/A

**Superseded by:** N/A

**Related:** ADR-001, ADR-002, ADR-003

---

## Context

Conversational applications mixing concerns become difficult to maintain. When business logic lives inside React components, HTTP routes, and AI prompts—spread across these layers—the system becomes fragile:

- **Impossible to test** business logic without complex mocks
- **Difficult to debug** when unclear which layer owns a decision
- **Hard to change** interfaces without affecting business logic
- **Tight coupling** to specific frameworks and technologies
- **Reduced reusability** of business logic

Sage requires clear architectural boundaries so that:
- Business logic remains independent of UI, AI, and infrastructure
- Responsibilities are obvious and enforced
- Dependencies flow in one direction
- Any layer can be replaced without affecting others

---

## Decision

**Sage is organized into distinct architectural layers, each with clear responsibilities.**

Dependencies flow inward—outer layers depend on inner layers, never the reverse. Each layer owns one concern. Clear boundaries enforce separation.

This organization enables:
- **Parallel development**: Multiple layers developed independently
- **Easy testing**: Each layer testable in isolation
- **Framework independence**: Layers don't depend on specific technologies
- **Maintainability**: Responsibilities clear and enforced
- **Extensibility**: New capabilities added without modifying existing layers

---

## Architectural Principles

### Principle 1: Separation of Concerns

Each layer owns one concern. UI layer handles presentation. Capability layer handles business logic. Persistence layer handles data storage. No layer mixes concerns. Clear boundaries make code easy to understand.

### Principle 2: Single Responsibility

A component or layer should have one reason to change. If multiple reasons exist, split into separate components. When business logic changes, only capability layer changes. When UI changes, only interface layer changes.

### Principle 3: Business Logic Independent of Interfaces

Business logic works identically whether called from voice, text, buttons, or API. The interface layer presents capabilities, never contains them. Moving to a new interface requires zero business logic changes.

### Principle 4: Business Logic Independent of Infrastructure

Business logic doesn't know about databases, external APIs, or cloud providers. These details belong in infrastructure adapters. Swapping from PostgreSQL to another database requires zero business logic changes.

### Principle 5: Explicit Dependencies

Layers explicitly depend on the layers they use. No implicit dependencies. No hidden frameworks. Dependencies visible and traceable.

### Principle 6: Simplicity Over Abstraction

Avoid unnecessary abstraction layers. Use the simplest approach that maintains clear boundaries. One good boundary is better than three mediocre ones.

### Principle 7: Unidirectional Dependencies

Dependencies flow inward toward business logic. Interfaces depend on Conversation Architecture. Conversation depends on Capabilities. Capabilities depend on Persistence. Never the reverse.

### Principle 8: Framework Independence

No layer depends on specific UI frameworks, ORMs, or providers. Business logic remains independent of frameworks, providers and storage technologies.

---

## Architectural Layers

```
                                  ┌────────────────────────────────────────┐
                                  │         Interfaces                     │
                                  │   (Voice, Text, Chat, Buttons)         │
                                  └────────────────────────────────────────┘
                                            ↓ depends on
                                  ┌────────────────────────────────────────┐
                                  │    Conversation Architecture           │
                                  │  (State, Context, Flow, Coordination)  │
                                  └────────────────────────────────────────┘
                                            ↓ depends on
                                  ┌────────────────────────────────────────┐
                                  │     Capability Layer                   │
                                  │   (Business Logic, Capabilities)       │
                                  └────────────────────────────────────────┘
                             ↓ depends on                                ↓ depends on
      ┌────────────────────────────────────────┐                ┌────────────────────────────────────────┐
      │    Persistence Boundary                │                │      Infrastructure                    │
      │  (Data Access, Storage Adapters)       │                │  (AI, APIs, Cloud, Logging, Config)    │
      └────────────────────────────────────────┘                └────────────────────────────────────────┘
      
```

### Layer 1: Interfaces

**Purpose**: Enable users to interact with Sage through various channels.

**Responsibilities**:
- Present capabilities to users (voice, text, buttons, forms)
- Capture user input
- Display responses
- Format output for specific interface
- Handle interface-specific concerns (audio, chat bubbles, buttons)

**What Belongs Here**:
- UI components and rendering
- Interface-specific state (theme, layout)
- Input capture and validation
- Output formatting for display

**What Never Belongs Here**:
- Business logic
- Persistence
- External API calls
- Conversation coordination
- Capability implementation

### Layer 2: Conversation Architecture

**Purpose**: Manage conversational flow independently of any interface or AI provider.

**Responsibilities**:
- Maintain conversation state
- Build context for AI interpretation
- Coordinate conversation progression
- Request clarification when needed
- Handle multi-turn interactions
- Update state after capability execution

**What Belongs Here**:
- Conversation state and history
- Context building
- Clarification logic
- Conversation flow coordination
- Pending action tracking
- Interface abstraction (voice and text treated identically)

**What Never Belongs Here**:
- Business rules
- Database queries
- Presentation logic
- AI implementation
- Capability execution

### Layer 3: Capability Layer

**Purpose**: Implement business functions independently of how they're invoked.

**Responsibilities**:
- Execute business logic
- Validate business rules
- Perform calculations
- Check authorization
- Update domain models
- Emit domain events

**What Belongs Here**:
- Business rules and logic
- Validation and constraints
- Authorization checks
- Domain calculations
- Capability contracts and definitions
- Capability composition

**What Never Belongs Here**:
- UI concerns
- HTTP status codes
- Persistence implementation
- Infrastructure calls
- AI prompts or logic
- Conversation state

### Layer 4: Persistence Boundary

**Purpose**: Provide reliable data storage abstraction.

**Responsibilities**:
- Load data from storage
- Save data to storage
- Query data by criteria
- Handle transactions
- Adapt between domain models and storage format

**What Belongs Here**:
- Data access logic
- Storage adapters
- Query abstraction
- Transaction management
- Data mapping

**What Never Belongs Here**:
- Business rules
- Conversation logic
- Interface concerns
- External API calls
- Infrastructure configuration

The Persistence Boundary defines the architectural contract for storing and retrieving business data. The underlying storage implementation is intentionally hidden from higher layers.

### Layer 5: Infrastructure

**Purpose**: Provide external services and platform capabilities.

**Responsibilities**:
- Connect to external APIs (AI providers, recipe databases)
- Manage cloud services (storage, functions)
- Handle logging and monitoring
- Manage configuration
- Manage secrets and environment setup

**What Belongs Here**:
- External API clients
- Cloud service adapters
- Logging infrastructure
- Configuration management
- Observability tools
- Error reporting

**What Never Belongs Here**:
- Business logic
- Conversation state
- UI implementation
- Data access logic

---

## Dependency Rules

### Allowed Dependencies

```
Interfaces → Conversation Architecture ✓
Conversation Architecture → Capability Layer ✓
Capability Layer → Persistence Boundary ✓
Persistence Boundary → Infrastructure ✓
```

Each layer may depend on layers below it. Example: Conversation may call Capabilities. Capabilities may load data from Persistence.

### Forbidden Dependencies

```
Infrastructure → Capability Layer ✗
Persistence Boundary → Conversation Architecture ✗
Capability Layer → Interfaces ✗
Interfaces → Capability Layer ✗
```

Inner layers must never depend on outer layers. Example: Capability never calls HTTP routes. Persistence never knows about Conversation.

### Peer Layer Communication

Layers at the same level may communicate:
- Communication between peer components should be kept simple and explicit.
- Multiple interfaces may share same Conversation Architecture

---

## Persistence Boundary

The Persistence Boundary abstracts data storage from business logic.

**Architectural Responsibility**:
- Translate between domain concepts and storage format
- Provide query interface matching domain needs
- Handle transaction and consistency concerns
- Enable storage implementation swapping

**Implementation Neutral**:
This architecture does not mandate Repository pattern, ORM, or any specific technology. Any implementation satisfying these responsibilities is valid:
- Direct queries with parameterization
- Repository abstraction
- Query builders
- Stored procedures

**What Must Remain True**:
- Business logic never writes SQL directly
- Business logic never knows storage technology
- Storage implementation changes don't affect business logic
- Query failures return domain-appropriate errors

---

## Infrastructure Boundary

Infrastructure provides technical services that are consumed where appropriate by higher architectural layers.

**Services Provided**:
- **External APIs**: AI providers, recipe databases, nutrition services
- **Cloud Services**: Storage, functions, messaging
- **Observability**: Logging, metrics, tracing, error reporting
- **Configuration**: Secrets, environment setup, feature flags

**Architectural Constraint**:
Infrastructure adapts between Sage domain models and external services. Infrastructure never makes business decisions. Example: Infrastructure calls OpenAI API, but Conversation Architecture decides whether to use response, and Capability decides how to apply result.

---

## Cross-Cutting Concerns

Some responsibilities span multiple layers: security, logging, error handling, and configuration.

### Security

- **Boundaries**: Enforced within Capability layer (authorization)
- **Interfaces**: May validate user identity
- **Conversation**: Tracks which user is conversing
- **Infrastructure**: Manages secrets and credentials

### Logging and Observability

- **Boundaries**: Each layer logs its concerns without knowledge of others
- **Conversation**: Logs conversation progression
- **Capability**: Logs business operations and decisions
- **Persistence**: Logs data access patterns
- **Infrastructure**: Aggregates and routes logs

### Error Handling

- **Boundaries**: Each layer handles its domain-specific errors
- **Capability**: Returns domain errors (ItemNotFound, InvalidQuantity)
- **Conversation**: Asks clarification for domain errors
- **Interface**: Displays user-friendly messages
- **Infrastructure**: Alerts developers for system errors

### Configuration

- **Infrastructure**: Loads configuration
- **Other layers**: Receive configuration via dependency, never fetch directly
- **Result**: Configuration changes don't require code changes

---

## Boundary Violations

**Violation 1: Business Logic in React Components**

```
❌ Business logic in interface:
const [items, setItems] = useState([])
useEffect(() => {
  // Calculate low stock threshold
  const threshold = userSettings.householdSize * 2
  // Load items and filter
  loadItems().then(items => {
    const lowStock = items.filter(i => i.qty < threshold)
    setItems(lowStock)
  })
}, [])
```

**Why it violates**: Business logic lives in interface. Cannot be tested without React. Cannot be reused from voice. Behavior depends on React lifecycle.

**Fix**: Move logic to Capability layer. Interface calls capability, receives data.

---

**Violation 2: Business Logic in HTTP Routes**

```
❌ Business logic in route handler:
app.post('/api/items', (req, res) => {
  // Check if user is authorized
  if (!req.user) return res.status(401).json({error: 'Unauthorized'})
  
  // Validate input
  if (!req.body.name) return res.status(400).json({error: 'Name required'})
  
  // Business logic: check low stock threshold
  const threshold = req.body.householdSize * 2
  
  // Update database
  db.insert(...)
  
  res.json({success: true})
})
```

**Why it violates**: HTTP route contains business logic. Cannot be tested without HTTP. Cannot be called from voice. Behavior depends on HTTP framework.

**Fix**: Move to Capability layer. HTTP route calls capability, formats response.

---

**Violation 3: AI Directly Updating Persistence**

```
❌ AI with direct database access:
const result = await ai.chat({
  system: "You are a pantry assistant. When user adds item, execute this SQL: INSERT INTO pantry...",
  messages: conversation
})
```

**Why it violates**: AI layer knows about business rules and database. AI makes persistence decisions. Cannot be tested independently. Mixing ADR-001 (AI orchestrator) with persistence.

**Fix**: AI calls Capability. Capability updates persistence.

---

**Violation 4: Infrastructure Making Business Decisions**

```
❌ Infrastructure with business logic:
const scheduleShoppingReminder = async (items) => {
  // Business decision: when to send reminder
  if (items.length > 5) {  // BUSINESS RULE: send if more than 5 items
    await sendNotification(...)
  }
}
```

**Why it violates**: Infrastructure contains business rule about notification triggers. Business logic hidden in infrastructure adapter.

**Fix**: Capability decides whether to trigger notification. Infrastructure only sends.

---

## Relationship to Previous ADRs

```
ADR-001: AI is Orchestrator
├─ Defines: What AI does (understands intent, selects capability)
└─ Belongs in: Conversation Architecture layer

ADR-002: Capability Architecture
├─ Defines: How capabilities are structured
└─ Belongs in: Capability layer

ADR-003: Conversation Architecture
├─ Defines: How conversations are managed
└─ Belongs in: Conversation Architecture layer

ADR-004: Application Architecture (this document)
├─ Defines: How all layers fit together
├─ Defines: Dependencies between layers
└─ Contains: ADR-001, ADR-002, ADR-003 within overall structure
```

**Complete Flow**:
```
Interface captures "add milk"
  ↓
Conversation Architecture builds context
  ↓
AI (ADR-001) interprets intent
  ↓
Capability Layer (ADR-002) executes
  ↓
Persistence Boundary loads/saves data
  ↓
Conversation Architecture (ADR-003) updates state
  ↓
Interface displays result
```

All four ADRs together define complete Sage application architecture.

---

## Trade-Offs

### Trade-Off 1: More Code Structure

Clear boundaries require more organization. Functions group into capabilities. Capabilities group into layers. This structure takes effort.

**Justification**: Structure enables team coordination. A single developer understands entire system by understanding one layer at a time.

### Trade-Off 2: More Explicit Interfaces

Layers communicate through explicit contracts. This requires design and maintenance.

**Justification**: Explicit interfaces enable testing, swapping, and future changes. Changes to one layer don't accidentally break others.

### Trade-Off 3: Cannot Shortcut Through Layers

Tempting to have Interface directly call Persistence. Cannot. Must go through Conversation and Capability.

**Justification**: Shortcuts create technical debt. Unified path through layers ensures consistency. All interfaces behave identically.

### Trade-Off 4: Configuration Must Be Injected

Layers cannot directly access configuration. Must receive it as dependency.

**Justification**: Testability. Layers can be tested with different configurations. No hidden dependencies on global state.

---

## Consequences

### Every New Feature Must Respect Layers

- Business logic goes in Capability layer
- Conversation coordination goes in Conversation Architecture
- User presentation goes in Interface layer
- Data access goes in Persistence Boundary

### Every Layer Is Independently Testable

- Interface tested with mock Conversation Architecture
- Conversation Architecture tested with mock Capabilities
- Capabilities tested with mock Persistence
- No layer requires external services to test

### Interfaces Are Interchangeable

- Adding voice doesn't require changes to business logic
- Adding mobile app doesn't require changes to business logic
- Behavior remains identical across all interfaces

### Teams Can Work in Parallel

- UI team works on Interface layer
- Business team works on Capability layer
- Database team works on Persistence layer
- Integration team coordinates Conversation Architecture

---
**Architectural layers describe responsibilities, not implementation.**

**They define who owns a concern, never where code must be stored.**
---

## Summary

Sage application architecture organizes around clear layers: Interfaces, Conversation Architecture, Capabilities, Persistence, and Infrastructure.

Each layer owns one concern. Dependencies flow inward. Boundaries are enforced. This organization enables parallel development, easy testing, and sustainable growth.

**Architectural Statement:**

> "The application is organized into layers with unidirectional dependencies flowing inward. Interfaces present capabilities. Conversation coordinates interactions. Capabilities implement business logic. Persistence provides data. Infrastructure supplies external services. Each layer can be understood and changed independently. All interfaces—voice, text, and future—share identical underlying logic."

This architecture ensures Sage remains maintainable as it grows from a single feature to a platform of many capabilities, from one interface to many, from one team to many.
