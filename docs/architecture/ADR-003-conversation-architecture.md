# ADR-003: Conversation Architecture

**Status:** Approved

**Date:** August 2, 2026

**Author:** Architecture Team

**Supersedes:** N/A

**Superseded by:** N/A

**Related:** ADR-001 (AI is an Orchestrator), ADR-002 (Capability Architecture)

---

## Context

Many conversational AI applications rely entirely on the LLM's memory for context. This creates problems:

- **Inconsistent state**: Same user input produces different results depending on prompt length, model behavior, or chat history
- **Lost context**: Browser refresh, reconnection, or model update loses all conversation history
- **Poor follow-ups**: Application cannot reliably ask clarifying questions because context management is implicit
- **Hallucinated assumptions**: LLM invents context not provided by user or application
- **Interface coupling**: Voice and text conversations behave differently because context handling differs

Conversational applications require explicit conversation management. The application must own conversation state deterministically, independent of LLM memory.

---

## Decision

**Conversation state belongs to the application, not the LLM.**

The AI interprets conversation: understanding intent, selecting capabilities, explaining results. The application manages conversation: maintaining state, building context, coordinating flow, requesting clarification.

This separation enables:
- **Consistent behavior** across interfaces (voice, text, future)
- **Persistent conversations** that survive reconnections
- **Deterministic clarification** questions
- **Testable coordination** independent of AI provider
- **Reliable context** that doesn't depend on LLM memory

---

## Conversation Principles

### Principle 1: Conversation State is Application State

Conversation exists in the application, not in the LLM. The application maintains authoritative conversation history, context, and pending actions. The LLM receives this state as input but never owns it.

### Principle 2: Conversation Survives Model Replacement

Switching from OpenAI to Anthropic to a local model should not affect conversation history, context, or flow. Conversation state remains identical regardless of which AI provider processes utterances.

### Principle 3: Conversation State is Persistent

Conversation state should be persisted where appropriate to support recovery from browser refresh, network interruption, or session timeout. The persistence strategy may vary depending on the conversation type and operational requirements.

### Principle 4: Conversation is Interface-Independent

Voice conversations and text conversations follow identical logic. Web, mobile, and voice assistants share the same conversation coordination. Interface is a presentation layer, not a decision layer.

### Principle 5: Clarification is Application-Driven

When information is missing, the application explicitly requests clarification. Clarification questions are not inferred from LLM behavior—they are deterministically generated based on application needs.

### Principle 6: Conversation Flow is Explicit

The application explicitly manages: where the conversation is in its flow, what's pending, what's been resolved. Conversation progression is traceable and auditable, not implicit in prompt wording.

### Principle 7: Conversation State Includes Pending Actions

When a user provides incomplete input, the application stores the pending action and awaits completion. Example: user says "add milk" (quantity missing), application stores this pending action and requests clarification.

### Principle 8: Conversation Never Contains Business Logic

Conversation coordinates capabilities. It does not contain business rules, validation, or persistence logic. Those belong in capabilities.

---

## Conversation Lifecycle

```
User Input
    ↓
Context Builder assembles application state
    ↓
AI interprets: understands intent
    ↓
Capability Registry: identifies applicable capability
    ↓
Capability Invocation: executes business logic
    ↓
Conversation State updates with result
    ↓
Response Generation: AI formats natural language
    ↓
User receives output
```

Each stage is distinct. Context flows inward (application → AI). Results flow outward (capability → application → user). Conversation state is updated after capability execution, not before.

---

## Context Builder

The Context Builder is responsible for assembling all information the AI needs to interpret the current utterance.

### Purpose

Provide the AI with complete, accurate application state so it can make correct decisions without hallucinating context.

### Responsibilities

- **Assemble conversation history**: Recent exchange of messages (with configurable window size)
- **Load user state**: User preferences, dietary restrictions, language settings
- **Load current inventory**: Relevant pantry information for recipe suggestions, low stock alerts. Context Builder assembles only the information required for the current interaction. It should minimise unnecessary context in order to improve performance, reduce AI cost, and avoid irrelevant information influencing capability selection.
- **Track pending actions**: Incomplete operations awaiting user input
- **Provide recent context**: What happened in the last few interactions
- **Load capability registry**: What the AI can currently invoke
- **Load user permissions**: What this user is authorized to do

### What It Must Never Include

- **Business rules**: "If low stock < threshold, suggest shopping" belongs in Pantry capability, not context
- **Database implementation details**: Raw queries, ORM specifics, schema information
- **Processed results**: Only raw state; let AI interpret what it means
- **Hallucinated assumptions**: Never assume missing context; request clarification instead
- **Sensitive data not relevant to request**: Social Security numbers, medical history unless explicitly needed
- **Implementation artifacts**: Internal IDs, cache keys, debugging information

---

## Conversation State

### Definition

Conversation State is the application's record of the current conversation. It includes:

- **Message history**: User and assistant messages, with timestamps and metadata
- **Current context**: What the user and application are discussing
- **Pending actions**: Operations awaiting user input or capability results
- **Clarification requests**: Outstanding questions from the application
- **Conversation metadata**: Conversation metadata relevant to managing the conversation.
- **Recent capability results**: Last few operations and their outcomes

### Why It Belongs to the Application

- **Deterministic**: Same state always produces same results (unlike LLM memory)
- **Auditable**: Every decision traceable to specific context
- **Persistent**: Survives reconnection and model replacement
- **Testable**: Can be verified and reproduced
- **Controllable**: Application decides what to remember and forget

### What It Deliberately Does NOT Store

- **Conversation interpretation**: Which intent was detected (computed fresh each turn)
- **LLM-specific metadata**: Tokens, embeddings, attention weights
- **Transient processing state**: Temporary variables during execution
- **Future predictions**: Guesses about what user will say next
- **Full conversation history** (in most cases): Configurable window to bound memory

### Reliability Benefit

Because Conversation State is deterministic application state, not LLM memory, the same user input with the same state always produces the same result. This enables testing, debugging, and reproducibility. Bugs become deterministic and fixable, not mysteriously intermittent.

---

## Clarification

When a capability requires information the user hasn't provided, clarification is explicit and application-driven.

### Example Flow

```
User: "Add milk"

Context Builder notes: quantity is missing for pantry.addItem

Application determines: This is incomplete, needs clarification

Conversation State records: Pending action {type: "add_item", name: "milk"}

Application requests: "How much milk? (e.g., 1L, 500ml, a carton)"

Conversation State waits

User: "Two litres"

Conversation resumes: Application retrieves pending action, adds missing quantity

Pending action completes
```

Clarification questions are generated by the application because the application understands what information is required to execute a capability successfully.

The application, not the AI, decides what information is required and what questions to ask. This ensures:
- **Consistent questions** across conversations and interfaces
- **Clear progression** through multi-step operations
- **No hallucination** of missing context
- **Testable flow** independent of LLM behavior

---

## Conversation Boundaries

### Conversation Architecture Owns

- **Conversation State**: Maintains authoritative record of conversation
- **Context Building**: Assembles information for AI interpretation
- **Conversation Flow**: Manages progression through multi-turn exchanges
- **Clarification Requests**: Explicitly asks for missing information
- **Capability Coordination**: Selects and invokes appropriate capabilities
- **Response Coordination**: Ensures response is appropriate for interface (voice, text, etc.)

### Conversation Architecture Never Owns

- **Business rules**: "Item expires after 30 days" (Pantry capability owns this)
- **Database logic**: Queries, persistence, schema (Persistence layer owns this)
- **Capability implementation**: How capabilities execute (Capability owns this)
- **Presentation**: UI rendering, layout, styling (Frontend owns this)
- **AI interpretation**: Intent detection, tool selection (AI layer owns this)
- **Authorization**: Who can invoke what (Capability owns this)

Clear boundaries prevent confusion. When questions arise—"Who decides if user can delete items?"—the answer is unambiguous: Capability owns authorization, Conversation only coordinates.

---

## Relationship to Previous ADRs

```
ADR-001: AI is an Orchestrator
    ├─ AI understands intent
    ├─ AI selects capabilities
    └─ AI explains results
         ↓
         │
    ADR-003: Conversation Architecture
    ├─ Manages conversation state
    ├─ Builds context for AI
    ├─ Coordinates capabilities
    └─ Handles clarification
         ↓
         │
    ADR-002: Capability Architecture
    ├─ Business logic independent
    ├─ Explicit contract
    └─ Deterministic execution
```

**Flow:**
1. AI (ADR-001) interprets user input
2. Conversation (ADR-003) manages context and flow
3. Capabilities (ADR-002) execute business logic
4. Conversation (ADR-003) updates state with results
5. AI (ADR-001) generates response

Each layer has distinct responsibility. Together they form complete system: AI understands what user wants, Conversation coordinates how to fulfill it, Capabilities execute the work.

---

## Trade-Offs

### Trade-Off 1: More Application Code

Managing conversation state explicitly requires code the LLM might handle implicitly through memory. However, explicit code is testable, debuggable, and doesn't suffer from hallucinations.

### Trade-Off 2: Context Management Overhead

Building context for each turn adds latency and computation. However, this overhead is predictable and scalable, unlike unpredictable LLM memory issues.

### Trade-Off 3: Clarification Questions Are Explicit

Clarification questions must be designed and maintained. However, they become consistent, testable, and controllable—not dependent on LLM behavior.

### Trade-Off 4: State Persistence Complexity

Persisting conversation state requires database design and migration strategy. However, persistence enables resumable conversations and deterministic behavior.

---

## Consequences

### Every Interface Must Use Conversation Architecture

Voice, text, buttons, and future interfaces all feed through identical Conversation Architecture. This ensures consistent behavior and shared context.

### Every Capability Integration Must Respect Conversation Flow

Capabilities return results; Conversation Architecture updates state and decides next step. Capabilities never directly manipulate conversation state.

### Conversation State Enables Testing

Entire conversations can be replayed with identical state, producing identical results. This enables regression testing and debugging impossible with LLM-only memory.

### Multiple Sessions Share Architecture

Same conversation pattern handles: single user, household members, shared contexts. Architecture scales by changing what context is loaded, not by changing conversation logic.

---

## Summary

Conversation Architecture is the coordinating layer that brings together AI orchestration (ADR-001) and business capabilities (ADR-002).

The application manages conversation state deterministically. The AI interprets conversation. Capabilities execute business logic. Conversation Architecture coordinates between them.

**Architectural Statement:**

> "Conversation state is application state. The AI interprets conversation. The application manages conversation flow. Together they produce consistent, testable, interface-independent behavior that survives model replacement and network interruption."

This principle ensures Sage conversations remain reliable, auditable, and independent of any specific AI provider's memory behavior.
