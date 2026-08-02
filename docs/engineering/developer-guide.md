# Sage Developer Guide

**Version:** 1.0

**Status:** Active

**Last Updated:** August 2, 2026

---

## Purpose

This guide explains how to contribute to Sage while maintaining architectural consistency.

It is not an architecture document. It is practical engineering guidance for developers working on the codebase.

Read this guide before:
- Adding new features
- Modifying existing code
- Refactoring
- Reviewing pull requests

The architecture documents (ADR-001 through ADR-004) define *what* the architecture is. This guide explains *how* to work within it.

---

## Before Writing Code

**Read the Architecture**

Before proposing changes, read:
- The relevant ADR for your feature
- The architectural layer you're working in
- Existing capabilities in that domain

Understand the capability involved and the architectural boundary you're crossing.

**Architectural Escalation**

If you find yourself unable to implement a feature without violating an existing architectural principle, stop.

Do not work around the architecture.

Instead:

- identify the architectural conflict,
- discuss it,
- update the architecture if necessary,
- then continue implementation.

The architecture should evolve intentionally rather than through accidental exceptions.

**Think in Capabilities**

Think about the user's goal rather than the interface they are using.

Ask yourself: "What capability does the user want?" Not "What should I build?" Capabilities are the vocabulary of Sage.

If a capability doesn't exist, it must be created. If it exists, it must be reused.

**Choose Simplicity**

When multiple solutions exist, choose the simplest one that maintains architectural boundaries.

Avoid:
- Unnecessary abstraction layers
- Generic solutions to specific problems
- Patterns from other projects that don't fit here
- "Future-proofing" that complicates today's code

**Prefer Determinism**

Business logic should produce identical results given identical inputs and state.

Avoid:
- Time-dependent behavior (use timestamps)
- Non-deterministic selection algorithms
- State dependencies that change without warning
- LLM-dependent behavior in business logic

**Respect Boundaries**

Each architectural layer owns specific responsibilities. Stay within your layer. Don't reach across boundaries unless absolutely necessary.

---

## Adding a New Capability

Follow this workflow:

### 1. Understand the Business Problem

Before designing, understand what the user needs to accomplish. Understand the user problem and the business domain before designing a solution. Understand the domain.

Vague problems lead to vague capabilities. Clear problems lead to focused capabilities.

### 2. Determine if a New Capability is Needed

Review existing capabilities. Can the problem be solved by combining existing capabilities?

Many "new features" are actually combinations of existing capabilities.

### 3. Define the Capability Contract

Document:
- **Purpose**: One sentence. What does this capability do?
- **Inputs**: Required and optional parameters
- **Outputs**: Success and failure responses
- **Errors**: Named errors with clear meanings
- **Permissions**: Who can invoke this
- **Side Effects**: Any domain events emitted

Write this as a specification, not code. This contract guides implementation.

### 4. Implement Business Behaviour

Implement the capability using the contract you defined.

Keep the implementation focused on business logic. Don't mix persistence details, UI concerns, or AI logic.

### 5. Expose the Capability

Register the capability with the registry so Conversation Architecture can discover it.

Provide metadata:
- Description
- Input/output schemas
- Access control requirements
- Examples

### 6. Create Tests

Test the capability independent of:
- HTTP, gRPC, or other protocols
- React or other UI frameworks
- External AI models
- Persistence implementation

**The capability works correctly or it doesn't. No mocking of business logic.**

### 7. Document Side Effects

If the capability emits domain events, document what events it emits and what subscribers should expect.

---

## Working with Existing Capabilities

### Keep Contracts Stable

Changes to input parameters or output structure should create a new capability version, not modify the existing one.

Backward-compatible additions:
- Add optional input parameters
- Add new outputs
- Add new error types
- Improve error messages

Breaking changes:
- Remove parameters
- Change output structure
- Change error behavior

If a breaking change is unavoidable, introduce a new capability contract rather than silently changing existing behaviour.

### Evolve Gradually

Prefer evolutionary change over revolutionary refactoring.

Small, incremental improvements are easier to review and less likely to introduce bugs.

### Maintain Reusability

When modifying a capability, consider other code that invokes it. Changes affecting callers must be backward-compatible or coordinated.

### Update Tests

When capability behavior changes, update tests to match.

Tests document expected behavior. They must remain consistent with code.

---

## Architectural Rules

### Rule 1: Business Logic Belongs in Capabilities

Business logic is deterministic operations on domain data.

Put business logic inside capabilities. Never inside:
- React components
- HTTP route handlers
- AI prompts
- Infrastructure adapters
- Conversation state managers

### Rule 2: Conversation State Belongs to the Application

Conversation state is application-managed information about the current interaction.

The application maintains this state deterministically. The AI receives it as input but never owns it.

Never:
- Store conversation history inside AI models
- Assume LLM remembers context
- Rely on implicit conversation state

### Rule 3: Interfaces Never Contain Business Logic

Interfaces present capabilities. They don't implement them.

Separate "what to show" (interface) from "how to calculate it" (capability).

When the same logic must appear in multiple interfaces, it belongs in a capability.

### Rule 4: Infrastructure Never Makes Business Decisions

Infrastructure provides services (APIs, storage, logging). It executes what capabilities request.

Never:
- Put business rules inside infrastructure adapters
- Make business decisions in API clients
- Hide business logic in storage queries

### Rule 5: Capabilities Remain Deterministic

Given identical inputs and identical state, a capability always produces the same result.

If a capability produces different results for the same input, it violates determinism. This makes testing impossible and debugging expensive.

### Rule 6: Minimal Coupling Between Capabilities

Capabilities should be independent. When composition is necessary:
- Use direct synchronous calls for immediate results
- Use domain events for asynchronous reactions
- Keep coupling loose and intentional

### Rule 7: No Circular Dependencies

Dependencies flow inward toward business logic. Reverse dependencies violate architecture.

If you need to call an outer layer from an inner layer, reconsider the architecture.

---

## Common Mistakes

### Mistake 1: Business Logic Inside React

```
Problem

A component calculates low-stock thresholds instead of delegating that responsibility to a capability.
```

**Why it's wrong**: Business rule lives in UI. Cannot be tested without React. Cannot be reused from voice. Behavior depends on React lifecycle.

**Solution**: Move logic to capability. Component receives processed data.

---

### Mistake 2: Business Logic Inside Prompts

```
Problem: System prompt contains business logic.

"If quantity < threshold, suggest shopping.
If item expires in < 3 days, alert user.
If user has vegetarian preference, exclude meat recipes."
```

**Why it's wrong**: Business rules implicit in prompt. Cannot be tested independently. Rules change with prompt updates. Different models produce different behavior.

**Solution**: Implement rules as capabilities. AI calls capabilities that apply rules.

---

### Mistake 3: Persistence Containing Business Rules

```
Problem: SQL query implements business logic.

SELECT items WHERE qty < (
  SELECT threshold FROM user_settings WHERE user_id = ?
) AND created_at > NOW() - '30 days'
```

**Why it's wrong**: Business logic hidden in persistence layer. Cannot be tested independently. Cannot be reused from other persistence technologies. Difficult to debug.

**Solution**: Persistence layer provides raw data. Capability computes business logic.

---

### Mistake 4: Duplicate Capabilities

```
Problem: Two teams implement similar functionality.

pantry.getExpiringSoon() and inventory.getExpiring() both compute expiry dates.
```

**Why it's wrong**: Duplicate logic means duplicate bugs. Update one, miss the other. Maintenance nightmare.

**Solution**: Identify single source of truth. Reuse existing capability. If capability is insufficient, extend it rather than duplicate.

---

### Mistake 5: Mixing Conversation with Business

```
Problem: Capability manages conversation flow.

// Inside pantry capability
if (missingQuantity) {
  conversationState.setPendingAction({...})
  return "How much milk?"
}
```

**Why it's wrong**: Capability depends on conversation architecture. Cannot be tested or reused independently.

**Solution**: Capability returns result or error. Conversation architecture decides what to ask.

---

## Code Review Checklist

Before submitting a pull request, verify:

- [ ] **Does this belong in a capability?** If it contains business logic, it should be in a capability.

- [ ] **Is this in the right layer?** Is it in Interface, Conversation, Capability, Persistence, or Infrastructure? Does it belong there?

- [ ] **Does this introduce unnecessary abstraction?** Can the same result be achieved more simply?

- [ ] **Does this violate architectural boundaries?** Can outer layers call inner layers? Can inner layers call outer layers?

- [ ] **Is the behavior deterministic?** Given the same input and state, does it always produce the same result?

- [ ] **Is this capability reusable?** Can it be called from voice, chat, buttons, or future interfaces?

- [ ] **Does this duplicate existing functionality?** Is there an existing capability that does this?

- [ ] **Is the contract stable?** Does changing this capability require changes to callers? Is the contract backward-compatible?

- [ ] **Are tests independent of framework?** Can the logic be tested without React, HTTP, or AI?

- [ ] **Is persistence abstracted?** Does the code know about databases, or does it use a persistence boundary?

- [ ] **Are external services abstracted?** Does the code know about specific APIs, or does it use infrastructure adapters?

- [ ] **Is error handling domain-appropriate?** Are errors named in business terms, not framework terms?

---

## Refactoring Guidelines

### Refactor When It Improves

**Reduce Duplication**

If the same logic appears in multiple places, move it to a shared capability.

**Improve Readability**

If code is difficult to understand, improve it. Clarity is worth the refactoring.

**Simplify Complexity**

If a component or capability is doing too much, split it into smaller pieces.

**Preserve Architectural Boundaries**

If refactoring would blur layers, stop. Architectural boundaries are more important than perfect code organization.

### Don't Refactor For

- **Following trends**: Just because microservices or event-driven everything is popular doesn't mean Sage needs it.
- **Future-proofing**: Build for today's needs. Tomorrow's needs will be different anyway.
- **Personal preference**: Code consistency matters more than individual style.
- **Frameworks**: Don't refactor to use the latest hot library unless it clearly improves the code.

### How to Refactor Safely

1. **Preserve behavior**: Changes to existing code should not change what it does, only how it does it.
2. **Test first**: Have passing tests before refactoring. Refactor. Verify tests still pass.
3. **Small steps**: Refactor one small piece at a time. Large refactorings are error-prone.
4. **Avoid mixing**: Don't mix refactoring with feature development. One pull request, one purpose.

---

## Working with AI

The AI layer is one component of the system. Understand its role.

### What the AI Does

- **Understands intent**: Interprets what the user is trying to accomplish
- **Selects capabilities**: Chooses which capability matches the intent
- **Explains results**: Generates natural language responses

### What the AI Doesn't Do

- **Contain business logic**: Rules and calculations belong in capabilities
- **Manage conversation state**: The application manages this deterministically
- **Make authorization decisions**: Capabilities enforce permissions
- **Update persistence**: Capabilities perform database operations
- **Decide which capabilities to invoke**: The Conversation Engine makes this decision

### Think of AI as a Service

The AI is a service the application uses. It's not the "center" of the system. Business capabilities are.

You can replace the AI provider (OpenAI → Anthropic → local model) without changing business logic.

You can remove the AI entirely and still have a working application (slower, but functional).

If you find yourself thinking "the AI should..." about something, reconsider. That responsibility probably belongs elsewhere.

---

## Philosophy

### Simplicity

Sage values simplicity. The most elegant solution is often the simplest one.

When facing complexity, ask: "Can this be simpler?" More often than not, the answer is yes.

### Maintainability

Code is read far more often than written. Optimize for understanding.

Clarity of intent matters more than brevity of expression.

Names should explain purpose. Organization should reveal structure. Comments should explain "why," not "what."

### Consistency

Consistency across the codebase matters. It makes code predictable.

Follow established patterns. If you find yourself inventing a new pattern, stop and reconsider.

### Long-Term Thinking

Code written today will be maintained for years. Make decisions with that in mind.

Technical debt compounds. Small inconsistencies become large problems.

### Readable Code

The code should tell a story. Reading it should feel like reading documentation.

If you struggle to name a variable, the variable's purpose might not be clear.

If a function is hard to explain, it might be doing too much.

### Consistent Architecture

The architecture is not a constraint. It's a guide.

It guides decisions. It prevents mistakes. It enables teams to work in parallel.

When you find yourself fighting the architecture, pause. The architecture is usually right. Reconsider the approach.

---

## Closing

**The AI understands intent. The application understands truth.**

Your job is to implement truth—the business logic that defines what Sage does and why it matters.

Keep the application clear. Keep responsibilities separate. Keep boundaries respected.

In two years, you'll be grateful to yourself for the choices you make today.

Write code that future developers will thank you for.
