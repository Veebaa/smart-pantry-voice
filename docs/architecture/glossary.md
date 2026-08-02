# Sage 2.0 Architecture Glossary

**Version:** 1.0

**Status:** Active

**Last Updated:** 2 August 2026

---

# Purpose

This glossary defines the architectural terminology used throughout Sage.

It establishes a common vocabulary for developers, contributors, and AI assistants working on the project.

Architecture Decision Records (ADRs) reference these definitions rather than redefining concepts.

The terminology defined here is considered authoritative for the Sage architecture.

---

# Capability

A **Capability** is a first-class business function exposed by Sage.

Capabilities represent **what Sage can do**, not how it is implemented.

Examples include:

- Manage Pantry
- Generate Meal Suggestions
- Update Shopping List
- Record Inventory Usage
- Analyse Nutrition

Capabilities are:

- deterministic
- independently testable
- interface independent
- AI independent
- reusable

A capability owns business behaviour.

---

# Capability Contract

A **Capability Contract** defines the public interface of a capability.

It describes:

- purpose
- required inputs
- expected outputs
- possible errors
- permissions
- side effects

The contract remains stable even if the internal implementation changes.

---

# Capability Registry

The **Capability Registry** is the catalogue of all capabilities available within Sage.

The Conversation Architecture consults the registry to discover available capabilities.

AI models never hard-code capability knowledge.

New capabilities are added by registering them rather than modifying existing conversation logic.

---

# Capability Invocation

A **Capability Invocation** is the execution of a capability after it has been selected.

Invocation is coordinated by the application.

The AI never performs the business operation itself.

---

# Conversation Architecture

The **Conversation Architecture** manages conversational interactions throughout Sage.

It is responsible for:

- conversation flow
- conversation state
- context building
- clarification
- capability coordination

It does **not** contain business logic.

---

# Conversation Engine

The **Conversation Engine** is the orchestration component within the Conversation Architecture.

It interprets user intent using AI and coordinates the appropriate capability invocation.

It never contains business logic.

---

# Conversation State

**Conversation State** is application-managed information describing the current conversational interaction.

Examples include:

- pending actions
- clarification requests
- active capability
- conversation metadata

Conversation State belongs to the application, never exclusively to the AI model.

---

# Context Builder

The **Context Builder** assembles the information required for the current interaction before invoking AI.

It selects only the information necessary for the current conversation.

Typical context may include:

- relevant pantry information
- user preferences
- conversation state
- recent actions
- active capability

The Context Builder deliberately excludes unnecessary information.

---

# Intent

An **Intent** represents what the user is trying to achieve.

Intent is identified by the Conversation Engine.

Intent determines which capability should be invoked.

Intent itself is not business logic.

---

# Interface

An **Interface** is any mechanism through which a user interacts with Sage.

Examples include:

- Voice
- Chat
- Web interface
- Mobile application
- Future integrations

Interfaces present capabilities.

They never implement them.

---

# Persistence Boundary

The **Persistence Boundary** defines the architectural responsibility for storing and retrieving business data.

It isolates business logic from storage implementation.

The Persistence Boundary does not mandate any specific storage technology or design pattern.

---

# Infrastructure

**Infrastructure** provides technical services used by the application.

Examples include:

- AI providers
- cloud services
- storage services
- logging
- monitoring
- configuration

Infrastructure supplies technical capabilities.

It never owns business decisions.

---

# Domain Event

A **Domain Event** represents something significant that has occurred within the business domain.

Domain events may be emitted by capabilities when asynchronous processing or loose coupling provides a clear architectural benefit.

Domain events are optional.

Simple synchronous interactions remain the preferred default.

---

# Business Logic

**Business Logic** represents the rules and behaviour that define how Sage operates.

Business logic belongs exclusively inside capabilities.

Business logic never belongs inside:

- interfaces
- AI prompts
- infrastructure
- persistence
- conversation state

---

# Deterministic Behaviour

A capability is **deterministic** when identical inputs and identical application state always produce the same business outcome.

AI models may produce different wording.

They must never change business behaviour.

---

# Application Layer

The **Application Layer** is the collection of architectural components that coordinate Sage's operation.

It includes:

- Conversation Architecture
- Capability Layer
- Persistence Boundary
- Infrastructure

Each layer owns one responsibility.

---

# Architectural Boundary

An **Architectural Boundary** separates responsibilities between parts of the system.

Boundaries exist to reduce coupling and improve maintainability.

Architectural boundaries describe responsibilities, not folder structures.

---

# Dependency Direction

Dependencies always flow inward toward business behaviour.

Outer layers may depend on inner layers.

Inner layers must never depend on outer layers.

This rule preserves separation of concerns.

---

# Cross-Cutting Concern

A **Cross-Cutting Concern** affects multiple architectural layers.

Examples include:

- security
- logging
- configuration
- observability
- error handling

Cross-cutting concerns should remain independent of business behaviour.

---

# Simplicity Wins

**Simplicity Wins** is a core architectural principle of Sage.

When multiple valid solutions exist, the simplest solution that satisfies the architectural requirements should be preferred.

Complexity must always have a clear and lasting justification.

---

# Two-Year Rule

Every architectural decision should answer one question:

> **Will this still feel like the correct decision in two years?**

If the answer is no, reconsider the design.

Architecture should optimise for longevity rather than novelty.

---

# Architectural Motto

> **The AI understands intent. The application understands truth.**

# Using This Glossary

All architecture documentation should use the terminology defined in this glossary consistently.

New architectural terms should only be introduced when they describe a genuinely new concept that cannot be expressed using the existing vocabulary.

Maintaining a consistent language is considered part of the Sage architecture.