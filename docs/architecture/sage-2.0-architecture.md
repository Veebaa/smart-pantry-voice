# Sage 2.0 Architecture

**Version:** 2.0 (Draft)

**Status:** Living Document

**Last Updated:** 2 August 2026

---

# Purpose

This document defines the architectural vision, engineering principles, and long-term direction of Sage.

It is intentionally technology-independent wherever possible.

Frameworks, libraries and cloud providers may change over time.

The architecture should not.

This document is the authoritative source for architectural decisions.

If implementation differs from this document, the implementation should be considered technical debt until it is reconciled.

Future contributors and AI assistants must use this document as the primary source of architectural truth before making structural changes.

---

# Vision

Sage is an AI-powered conversational kitchen assistant.

It helps households manage food naturally through conversation rather than traditional software interfaces.

Users should not need to think about forms, buttons or menus.

Instead they should be able to speak naturally.

Examples:

"I bought milk."

"What can I cook tonight?"

"Add eggs to the shopping list."

"I'm making spaghetti."

The application understands intent, performs the appropriate business capability, and responds naturally.

The AI is the interface.

The application remains responsible for the business logic.

---

# Long-Term Goals

Sage should become:

- AI-first
- Conversation-first
- Conversation-first, with voice as a first-class interface.
- Cloud-native
- Secure by default
- Highly testable
- Easy to understand
- Easy to extend
- Pleasant to maintain

The architecture should remain understandable by a single developer while supporting future growth.

Complexity should only exist when it provides clear long-term value.

---

# Core Philosophy

The architecture is built around five ideas.

## 1. AI is an Orchestrator

The AI never contains business logic.

The AI understands user intent.

The AI chooses the correct capability.

The AI explains results.

The AI never updates databases.

The AI never performs calculations.

The AI never applies business rules.

Instead, it invokes application capabilities.

---

## 2. Business Logic is Independent

Business logic must never depend on:

- React
- Voice
- HTTP
- Cloudflare
- OpenAI
- Browser APIs

Business logic should be executable from:

- Voice
- Chat
- Buttons
- Mobile applications
- Future APIs
- Automated workflows

without modification.

---

## 3. Interfaces are Replaceable

Voice is simply an interface.

Chat is simply an interface.

The web application is simply an interface.

Future mobile applications are simply interfaces.

Replacing an interface should not require changes to business logic.

---

## 4. Capabilities are the Centre of the System

Sage is not organised around pages.

It is organised around capabilities.

Examples include:

- Pantry Management
- Shopping Management
- Recipe Discovery
- Meal Suggestions
- Household Settings
- Inventory Tracking
- Expiry Tracking
- Nutrition
- Conversation

Capabilities expose services.

Interfaces consume capabilities.

---

## 5. Simplicity Wins

Every new abstraction must justify its existence.

Avoid unnecessary layers.

Avoid unnecessary frameworks.

Avoid clever solutions.

Prefer code that is obvious over code that is technically impressive.

---

# Architectural Principles

Every architectural decision should satisfy the following principles.

## Principle 1

The frontend contains presentation logic only.

---

## Principle 2

HTTP routes contain transport logic only.

---

## Principle 3

Business services contain business behaviour.

---

## Principle 4

Persistence stores data.

It does not contain business rules.

---

## Principle 5

AI understands intent.

Application services perform work.

---

## Principle 6

Conversation state belongs to the application.

It never belongs exclusively to the LLM.

---

## Principle 7

Every capability should be independently testable.

---

## Principle 8

Every capability should be independently deployable in the future.

Even if today they are deployed together.

---

# The Two-Year Rule

Every architectural decision must answer one question.

> Will this still feel like the correct decision in two years?

If the answer is no, reconsider the decision.

The objective is not perfection.

The objective is longevity.

---

# Technology Principles

Technology choices exist to support the architecture.

The architecture must never depend on a specific framework.

Current preferred technologies include:

Frontend

- React
- TypeScript

Backend

- Cloudflare Workers

Hosting

- Cloudflare Pages

Database

- PostgreSQL
- Supabase

Storage

- Cloudflare R2 (if required)

AI

- OpenAI APIs

These technologies may change over time without changing the architecture.

---

# Future Documents

This document defines the overall architecture.

More detailed Architecture Decision Records (ADRs) will expand individual topics including:

- AI orchestration
- Capability model
- Conversation engine
- Cloud architecture
- Deployment
- Testing
- Security
- Data model
- Migration strategy

These ADRs inherit the principles defined in this document.

---

# Success Criteria

Sage succeeds when:

- New capabilities are easy to add.
- Existing capabilities are easy to understand.
- Business logic is independent of interfaces.
- AI orchestration remains simple.
- The architecture remains understandable by a new developer within one day.
- The codebase remains maintainable over many years.

This document should evolve as Sage evolves.

It should always describe the architecture that Sage is becoming, not merely the code that currently exists.