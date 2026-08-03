**Working Document**

This document is an engineering analysis created during the Sage 2.0 migration.

It records interactions between capabilities within the current implementation.

It is not part of the permanent architecture documentation and may be deleted once the migration is complete.

---

# Capability Interaction Matrix

**Date:** August 2, 2026

**Purpose:** Analyze how Pantry and Shopping capabilities currently interact and identify shared responsibilities within the existing implementation.

**Scope:** Based solely on S1-001 Pantry Discovery and Shopping Discovery completed discovery reports. No speculation beyond documented findings.

---

## Purpose

The purpose of this analysis is to understand how the Pantry and Shopping capabilities currently interact within the existing codebase. This analysis documents:

- Direct dependencies between capabilities
- Shared database tables and persistence concerns
- Shared business responsibilities
- Shared conversation and orchestration logic
- Shared infrastructure and external dependencies
- Current boundaries and points of integration

Understanding these interactions provides context for future architectural refactoring. Where capabilities currently share responsibilities, future migration work will need to decide whether sharing is intentional and well-designed or a symptom of insufficient separation.

---

## Capability Interaction Matrix

### Pantry → Shopping Dependencies

| Capability | Depends On | Reason | Current Coupling | Architectural Risk |
|-----------|-----------|--------|-----------------|-------------------|
| Pantry | Shopping | No direct dependency. Pantry exists independently. | None (one-directional) | Low |

### Shopping → Pantry Dependencies

| Capability | Depends On | Reason | Current Coupling | Architectural Risk |
|-----------|-----------|--------|-----------------|-------------------|
| Shopping | Pantry | Shopping list composition requires pantry state: low-stock items computed from pantry thresholds and quantities. | Implicit dependency: ShoppingList.tsx reads low-stock pantry state to compose unified list. `/api/pantry-assistant` passes pantry context to AI for computing missing ingredients. | High |

### Pantry ↔ AI Orchestration

| Capability | Depends On | Reason | Current Coupling | Architectural Risk |
|-----------|-----------|--------|-----------------|-------------------|
| Pantry | AI Orchestration | Pantry operations triggered via voice require AI interpretation of user intent. | Tight: `/api/pantry-assistant` endpoint embeds AI orchestration with pantry business logic. System prompt contains pantry categorization rules. | High |

### Shopping ↔ AI Orchestration

| Capability | Depends On | Reason | Current Coupling | Architectural Risk |
|-----------|-----------|--------|-----------------|-------------------|
| Shopping | AI Orchestration | Shopping list operations triggered via voice ("add X to shopping list") require AI interpretation. | Tight: `/api/pantry-assistant` endpoint handles add_to_shopping_list action. Shopping list generation from meal suggestions handled in same endpoint. | High |

### Pantry ↔ Conversation State

| Capability | Depends On | Reason | Current Coupling | Architectural Risk |
|-----------|-----------|--------|-----------------|-------------------|
| Pantry | Conversation State | Clarification flow for ambiguous items requires tracking pending action across turns. | Moderate: lastItem state in React tracks pending pantry additions. Undo state tracked in database action_history. No centralized conversation state management. | High |

### Shopping ↔ Conversation State

| Capability | Depends On | Reason | Current Coupling | Architectural Risk |
|-----------|-----------|--------|-----------------|-------------------|
| Shopping | Conversation State | Shopping additions from AI are coordinated through conversation orchestration endpoint. | Moderate: Shopping actions embedded in `/api/pantry-assistant` endpoint, which manages conversation flow. Undo state tracked in action_history. | High |

---

## Shared Responsibilities

### 1. Action History & Undo

**Current Implementation:**
- Single `action_history` table stores both pantry and shopping operations
- Shared `/api/undo` endpoint handles reversal for both capabilities
- `actionType` field distinguishes 'add_pantry' vs. 'add_shopping' vs. 'delete_shopping'
- `actionGroupId` supports batch undo across both domains

**Responsibility Ownership (Current):**
- Undo logic: Shared in `/api/undo` endpoint (routes.ts, Line 546)
- Action logging: Both capabilities call `logAction()` for each operation
- State reversal: Shared logic that branches on actionType

**Classification:** **Conversation** (cross-domain state coordination)

**Architectural Implication:**
- Undo is a cross-cutting concern that spans both capabilities
- Current implementation creates tight coupling: Pantry and Shopping must coordinate through shared action history
- Undo represents shared responsibility not well-isolated to either capability

---

### 2. User Isolation & Scoping

**Current Implementation:**
- Both capabilities implement identical user isolation pattern: `WHERE userId = req.user.id`
- Both use same authentication middleware: `requireAuth`
- Both enforce user ownership at API boundary

**Responsibility Ownership (Current):**
- Authorization: Duplicated at both capability endpoints
- User context: Loaded from session/auth middleware
- Scoping logic: Identical WHERE clauses in both capabilities

**Classification:** **Interface** (HTTP transport layer)

**Architectural Implication:**
- Authorization is partially duplicated but this duplication is natural at API boundary
- Both capabilities should enforce authorization at capability level (not just HTTP layer)
- Current authorization is at interface layer; should migrate to capability layer

---

### 3. AI-Driven Action Orchestration

**Current Implementation:**
- Single `/api/pantry-assistant` endpoint interprets all voice commands
- Handles actions: add_item (pantry), update_item (pantry), add_to_shopping_list (shopping), suggest_meals, generate_shopping_list, etc.
- Routes actions to appropriate database operations and responses

**Responsibility Ownership (Current):**
- Command interpretation: AI (via OpenAI GPT-4o-mini)
- Action routing: Embedded in `/api/pantry-assistant` endpoint
- Business execution: Directly in endpoint for both capabilities
- Response generation: AI generates natural language response

**Classification:** **Conversation** (orchestration) **+** **Interface** (HTTP transport)

**Architectural Implication:**
- Conversation orchestration is not separated from business logic
- Single monolithic endpoint mixes concerns: AI interaction, action dispatch, persistence, response formatting
- This is the highest-coupling point in the current system

---

### 4. Context Building for AI

**Current Implementation:**
- `/api/pantry-assistant` endpoint assembles context before AI invocation
- Context includes: current pantry state, user settings (dietary restrictions, household size), conversation history, recent actions
- Same context used for both pantry and shopping decision-making
- Pantry state is mandatory; shopping list state is implicit in pantry context

**Responsibility Ownership (Current):**
- Context assembly: In `/api/pantry-assistant` endpoint
- Pantry context: Loaded from database query
- User settings: Loaded from user_settings table
- Conversation history: Loaded from client-side state
- Shopping context: Implicit (computed from low-stock pantry items)

**Classification:** **Conversation** (context building)

**Architectural Implication:**
- Context building treats pantry as primary domain; shopping as derived
- Shopping context is not independently constructed; it's computed from pantry state
- This asymmetry suggests shopping is currently a secondary concern

---

### 5. List Composition & Deduplication

**Current Implementation:**
- Shopping list displays merged from three sources:
  1. Low-stock pantry items (computed from pantry quantities and thresholds)
  2. Manually-added shopping items (from shopping_list_items table)
  3. AI-suggested missing ingredients (from meal suggestions in AI response)
- Composition happens in React component (ShoppingList.tsx)
- Deduplication by name matching (case-insensitive)
- No deduplication at persistence layer

**Responsibility Ownership (Current):**
- Source 1 (low-stock): Pantry capability reads pantry state, filters by threshold
- Source 2 (manual): Shopping capability (simple table read)
- Source 3 (AI-suggested): Conversation/AI layer (computed from meal suggestions)
- Composition logic: React component (presentation layer)
- Deduplication: React component

**Classification:** **Conversation** (composition of multiple concerns)

**Architectural Implication:**
- List composition is a cross-cutting concern that spans both capabilities plus AI
- Currently handled in presentation layer (React), not at business or persistence layer
- This means UI cannot display a true "shopping list" without knowledge of both pantry and shopping domains
- Composition logic is fragile and hard to test

---

### 6. Meal Suggestion Pipeline

**Current Implementation:**
- Triggered by: AI action suggestion_meals or user request "what should I cook?"
- Process: `/api/pantry-assistant` endpoint orchestrates
- Steps:
  1. Load pantry items (available ingredients)
  2. Load user settings (dietary restrictions, household size)
  3. Call OpenAI with current inventory context
  4. AI returns meal suggestions with:
     - Recipe name and description
     - Ingredients available in pantry
     - Ingredients needed (missing)
  5. Compute shopping list from missing ingredients
  6. Return suggestions to UI

**Responsibility Ownership (Current):**
- Pantry read: Pantry capability (database read)
- User settings: User capability (database read)
- Recipe data: External (hardcoded in prompts or stored somewhere?)
- Meal suggestion AI: AI layer (via OpenAI)
- Shopping computation: Implicit in meal suggestion response
- Response formatting: Conversation layer

**Classification:** **Conversation** (orchestration across Pantry, User, Recipes, and AI)

**Architectural Implication:**
- Meal suggestions represent tight orchestration of multiple domains
- Shopping list is implicitly generated as byproduct of meal suggestions
- No explicit "recipe suggestion" or "nutrition" capability yet
- Shopping is deeply entangled in meal suggestion flow

---

### 7. Low-Stock Detection & Notification

**Current Implementation:**
- Low-stock items identified in two places:
  1. Pantry capability: `isLow` flag on pantry_items or `currentQuantity <= lowStockThreshold`
  2. Shopping list composition: Filters pantry items by low-stock criteria for display

- Current handling:
  - Pantry tracks `isLow` flag (boolean) and `lowStockThreshold` (number)
  - Shopping list fetches low-stock items to include in display
  - No explicit notification (no alerts or reminders documented)

**Responsibility Ownership (Current):**
- Low-stock rule: Pantry capability (owns definition of "low")
- Low-stock detection: Shared between Pantry (on update) and Shopping (on display)
- Notification: Not yet implemented (identified as future concern)

**Classification:** **Capability** (Pantry owns low-stock logic, Shopping reads it)

**Architectural Implication:**
- Low-stock is a legitimate dependency from Shopping to Pantry
- Shopping needs to know pantry thresholds to display appropriately
- This is natural capability dependency, not problematic coupling

---

### 8. Transaction & Batch Operations

**Current Implementation:**
- Single voice command may result in multiple database operations (e.g., "add milk, eggs, bread")
- Operations grouped by `actionGroupId` in action_history
- Batch undo supported: all operations in group reversed together
- No explicit transaction management (each operation assumed atomic)

**Responsibility Ownership (Current):**
- Batch grouping: Conversation layer (creates actionGroupId)
- Persistence: Individual inserts (not wrapped in transaction)
- Undo: Shared `/api/undo` endpoint

**Classification:** **Conversation** (handles multi-step operations)

**Architectural Implication:**
- Batch operations are coordinated at conversation level, not persistence level
- No transactional guarantees (if some operations fail, others remain incomplete)
- This is acceptable for current scale but becomes problematic with concurrent operations

---

### 9. Voice Command Interpretation

**Current Implementation:**
- All voice commands (pantry, shopping, recipes, undo) routed to `/api/pantry-assistant`
- Single system prompt instructs AI on all available operations
- AI distinguishes intent: add to pantry vs. add to shopping vs. suggest meals vs. undo
- Same AI call handles both capabilities

**Responsibility Ownership (Current):**
- Command parsing: AI (via OpenAI)
- Intent detection: AI (through system prompt)
- Action routing: HTTP endpoint in routes.ts

**Classification:** **Conversation** (orchestration)

**Architectural Implication:**
- Voice input is a unified interface to multiple capabilities
- No separation of concerns at voice layer
- Both Pantry and Shopping logic mixed in single endpoint
- This represents the highest integration point

---

### 10. Conversation State Fragmentation

**Current Implementation:**
- Conversation state split across multiple places:
  1. React state: `lastItem`, `sageResponse`, `recipeFilters`, `pendingItem`
  2. Database: `action_history` (implicit state for undo)
  3. HTTP request/response: Passed in each request
  4. AI context: Loaded fresh on each request

- No centralized conversation state management
- No explicit pending action tracking (except for clarification flow)
- Each interface (voice, chat) must manage state independently

**Responsibility Ownership (Current):**
- Client state: React component (Index.tsx)
- Persistent state: action_history table (shared)
- Session state: implicit in database userId scoping

**Classification:** **Conversation** (state fragmentation)

**Architectural Implication:**
- Conversation state is not managed as first-class concern
- Pending actions tracked implicitly through `lastItem` variable
- Undo functionality depends on action_history, creating two separate state management approaches
- This makes multi-turn conversations fragile and difficult to test

---

## Shared Persistence

### Shared Tables

| Table | Capabilities Using | Usage |
|-------|-------------------|-------|
| `action_history` | Pantry + Shopping | Audit trail for both, supports undo across domains |
| `user_settings` | Pantry + Shopping | User preferences affecting meal suggestions, which drive shopping |

### Shared Fields/Patterns

| Pattern | Capabilities Using | Current Implementation |
|---------|-------------------|------------------------|
| `userId` scoping | All | `WHERE userId = req.user.id` in all queries |
| Timestamps | All | `createdAt`, `updatedAt` on all tables |
| UUID primary keys | All | Consistent primary key strategy |

### Separate Tables (Correctly Isolated)

| Table | Capability | Rationale |
|-------|-----------|-----------|
| `pantry_items` | Pantry | Items user owns, stored at home |
| `shopping_list_items` | Shopping | Items user needs to buy |

---

## Shared Infrastructure

### AI Integration

| Aspect | Capabilities Using | Current Implementation |
|--------|-------------------|------------------------|
| OpenAI API client | Pantry + Shopping + Recipes + Conversation | Single endpoint `/api/pantry-assistant` calls OpenAI once per request |
| System prompt | All voice-driven capabilities | Single prompt with rules for all operations |
| Structured output | All | OpenAI tool_choice used for action selection |
| Model | All | `gpt-4o-mini` for cost efficiency |
| Environment variable | All | `OPENAI_API_KEY` |

### Database

| Aspect | Capabilities Using | Current Implementation |
|--------|-------------------|------------------------|
| PostgreSQL (Supabase) | All | Single database for all tables |
| Drizzle ORM | All | Shared ORM for all queries |
| Connection pooling | All | `postgres.js` client with connection pool |

### Authentication

| Aspect | Capabilities Using | Current Implementation |
|--------|-------------------|------------------------|
| Session tokens | All | Stored in secure cookies |
| User identification | All | `req.user!.id` in all endpoints |
| Auth middleware | All | `requireAuth` in all protected routes |

### Validation

| Aspect | Capabilities Using | Current Implementation |
|--------|-------------------|------------------------|
| Zod schemas | All | Input validation for all API endpoints |
| Schema definitions | Pantry + Shopping | Separate schemas per capability |

---

## Shared Conversation Logic

### Shared Endpoints

| Endpoint | Responsibilities | Capabilities Involved |
|----------|------------------|----------------------|
| `/api/pantry-assistant` | Intent detection, action routing, business logic, response generation | Pantry, Shopping, Recipes, Conversation |
| `/api/undo` | Undo coordination | Pantry + Shopping (cross-domain) |

### Shared Patterns

| Pattern | Implementation | Capabilities |
|---------|-----------------|--------------|
| Voice input validation | Client-side schema validation + server-side schema validation | All voice operations |
| Action logging | Automatic logging on every mutation | Pantry + Shopping |
| Response formatting | Natural language via AI + UI presentation | All |

---

## Observations

### 1. High Integration at Conversation Layer

**Finding:** All high-level orchestration happens in the single `/api/pantry-assistant` endpoint. This endpoint handles voice input interpretation, action dispatching, business logic execution, AI invocation, and response generation.

**Current Reality:** Pantry and Shopping are not independent; they are sub-operations within a larger conversation orchestration system.

**Implication:** Until conversation orchestration is separated into its own layer, Pantry and Shopping cannot be independently understood or modified.

---

### 2. Asymmetric Dependency: Shopping Depends on Pantry

**Finding:** Shopping list composition depends on pantry state (low-stock items), but Pantry does not depend on Shopping in current operation. The dependency flows one direction: Shopping → Pantry.

**Current Reality:**
- Pantry operations work correctly without Shopping (you can manage inventory without shopping list)
- Shopping operations require Pantry context (computing low-stock items, computing missing ingredients for meal suggestions)
- Pantry is the primary domain; Shopping is a derived concern

**Implication:** Shopping is not a peer capability to Pantry. It is a secondary concern that serves Pantry and Recipes.

---

### 3. Shared Responsibility for Action History

**Finding:** Both Pantry and Shopping use the same `action_history` table and `/api/undo` endpoint. They are both trackable, reversible operations within the same transaction system.

**Current Reality:**
- User can undo in any order: "undo" reverses the most recent action regardless of domain
- Batch undo supported: multiple items added in single command undone together
- Cross-domain implications: undoing a shopping add doesn't affect pantry state, and vice versa

**Implication:** Undo is a cross-cutting concern that spans both capabilities. It represents shared responsibility not well-isolated to either domain.

---

### 4. Meal Suggestions as Integration Point

**Finding:** Meal suggestions orchestrate Pantry (available ingredients), Shopping (missing ingredients), User Settings (dietary preferences), and Recipes (recipe database). This is the most integration-heavy operation in the system.

**Current Reality:**
- Triggered by: user request "what can I cook?" or AI decides to suggest
- Input: Pantry state + User settings
- Output: Meal suggestions with ingredients breakdown + shopping list computation
- Implementation: Embedded in `/api/pantry-assistant` endpoint

**Implication:** Meal suggestions represent the "glue" that binds multiple domains together. They cannot be understood without understanding their orchestration role.

---

### 5. List Composition is a Presentation Concern

**Finding:** Shopping list is displayed by merging three data sources (low-stock pantry items, manual shopping items, AI-suggested ingredients) in the React component. This composition happens in the presentation layer, not at the business layer.

**Current Reality:**
- ShoppingList.tsx component receives items from multiple sources
- Deduplication happens in component logic
- Different sources have different delete semantics (DB-backed can be deleted, computed cannot)

**Implication:** Business logic for list composition is scattered across the presentation layer. This makes it difficult to test and difficult to understand. Shopping list is not a stable data structure; it is computed on-demand by the UI.

---

### 6. Conversation State is Fragmented

**Finding:** Conversation state is split across three mechanisms: React state (temporary), database (persistent but not conversation-specific), and HTTP requests (transient).

**Current Reality:**
- Pending items tracked in React: `lastItem` variable
- Action history tracked in database: `action_history` table
- Conversation metadata not persisted anywhere
- Multi-turn interactions reconstructed from pieces rather than from unified state

**Implication:** Conversation state management is not treated as a first-class concern. This makes multi-turn interactions fragile and difficult to implement reliably.

---

### 7. User Settings Create Implicit Coupling

**Finding:** Both Pantry and Shopping depend on `user_settings` table for dietary restrictions and household size. These settings affect meal suggestions, which in turn affect the shopping list that gets generated.

**Current Reality:**
- User settings loaded once per request
- Settings passed to AI for recipe filtering and portion calculation
- No explicit binding between settings and capabilities

**Implication:** User Settings represent another integration point. Both Pantry and Shopping are context-dependent (not just data-dependent) on User Settings.

---

### 8. AI Context Building is Centralized

**Finding:** Context assembly for AI happens once per `/api/pantry-assistant` request. All available information loaded: pantry, settings, conversation history, recent actions.

**Current Reality:**
- Context built fresh on every request (no caching)
- Context includes all information potentially relevant to any voice command
- Shopping list context is implicit (computed from pantry state)

**Implication:** AI integration is not modular. You cannot call AI for Pantry operations without also loading Shopping context (implicitly). This creates unnecessary coupling.

---

### 9. Pantry and Shopping Share Similar Patterns

**Finding:** Both Pantry and Shopping implement identical CRUD patterns:
- GET all items (scoped by userId)
- POST create item
- PATCH update item
- DELETE remove item
- POST create via `/api/pantry-assistant` (AI-driven)

**Current Reality:**
- Endpoints are duplicated (one set for Pantry CRUD, one set for Shopping CRUD)
- Logic is similar but not shared (separate endpoint implementations)
- No abstraction for CRUD pattern

**Implication:** Both capabilities follow identical patterns. Future abstraction could reduce duplication, but current separation is actually healthy (keeps concerns separate).

---

### 10. No Explicit Capability Registry

**Finding:** Capabilities are not discoverable. Conversation Engine knows about available operations only through hardcoded system prompt and endpoint handlers.

**Current Reality:**
- Available operations enumerated in system prompt
- No capability registration mechanism
- No capability metadata exposed to AI
- Adding new capability requires modifying prompt and endpoint

**Implication:** Conversation Engine is tightly coupled to specific capabilities. As more capabilities are added, monolithic endpoint will become unmaintainable.

---

## Emerging Capability Boundaries

Based on current discovery, the following capability boundaries are emerging:

### Pantry Capability

**Currently Owns:**
- Item storage (pantry_items table)
- Quantity tracking (current quantity, thresholds)
- Expiry tracking (expiresAt field)
- Low-stock detection (isLow flag and threshold comparison)
- Smart item classification (categorization to fridge/freezer/cupboard/pantry)
- CRUD operations on inventory items
- Undo support (via action_history)

**Currently Depends On:**
- User Settings (dietary restrictions, household size) — for AI context
- Conversation/AI orchestration (via `/api/pantry-assistant` endpoint)
- Action History (for undo)
- Authentication (for user isolation)

**Shared Responsibility (Ownership Unclear):**
- Meal suggestion orchestration (Pantry provides ingredient list, but orchestration happens at Conversation level)
- Low-stock notification (Shopping needs this data, but Pantry computes it)

---

### Shopping Capability

**Currently Owns:**
- Shopping list item storage (shopping_list_items table)
- Item check-off tracking (checked flag)
- Manual item addition
- Shopping list CRUD operations
- Undo support (via action_history)
- Sharing functionality (native share, WhatsApp, email, clipboard)

**Currently Depends On:**
- Pantry Capability (low-stock items for list composition)
- Conversation/AI orchestration (via `/api/pantry-assistant` endpoint for AI-driven additions)
- Recipes Capability (missing ingredients from meal suggestions)
- User Settings (via meal suggestion pipeline)
- Action History (for undo)
- Authentication (for user isolation)

**Shared Responsibility (Ownership Unclear):**
- List composition (merges Pantry low-stock, Shopping items, Recipe ingredients)
- Shopping list generation from meal suggestions
- Undo coordination (shared with Pantry via single `/api/undo` endpoint)

---

### Conversation/AI Orchestration (Not Yet Isolated as Capability)

**Currently Handles:**
- Voice command interpretation
- Intent detection
- Action routing (to Pantry, Shopping, Recipes, etc.)
- Response generation (natural language)
- Context assembly
- Business logic for action execution

**Problems with Current Implementation:**
- Business logic mixed with orchestration
- No separation of concerns
- Monolithic `/api/pantry-assistant` endpoint
- Difficult to test, modify, or extend

---

## Summary

**Current State (Documented):**
- Pantry and Shopping capabilities exist but are not truly independent
- Conversation orchestration is not separated from business logic
- Both capabilities are tightly coupled to a single monolithic endpoint
- Shopping depends on Pantry for low-stock computation
- Both depend on Action History for undo
- Both depend on User Settings implicitly via meal suggestions
- Conversation state is fragmented across multiple mechanisms

**Clear Dependencies:**
- Shopping → Pantry (for low-stock items)
- Pantry → Conversation/AI (for voice command handling)
- Shopping → Conversation/AI (for AI-driven additions)

**Unclear Ownership:**
- Undo/Action History (shared responsibility, not cleanly isolated)
- List Composition (spans multiple layers: Pantry, Shopping, Recipes, Presentation)
- Meal Suggestion Orchestration (spans Pantry, Shopping, Recipes, User Settings, AI)

---

## Conclusion

Based on the completed Pantry Discovery (S1-001) and Shopping Discovery reports, the current Sage implementation shows:

1. **Pantry and Shopping are not independent**: They share infrastructure, conversation layer, action history, and user settings.

2. **Shopping is a secondary domain**: It depends on Pantry for context and serves as a derived concern (computing what needs to be bought based on what is owned).

3. **Conversation orchestration is not yet a capability**: Voice command handling, AI integration, and action routing are embedded in a monolithic endpoint rather than organized as a discrete architectural layer.

4. **Shared responsibilities are not well-isolated**: Undo, list composition, and meal suggestion orchestration span multiple domains without clear ownership.

5. **Current implementation is functional but fragile**: It works for simple operations but will become difficult to maintain as more capabilities are added without architectural refactoring.

The migration toward Sage 2.0 architecture should focus on separating Conversation orchestration as a first-class layer, then extracting Pantry and Shopping as independent capabilities, and finally clarifying ownership of cross-cutting concerns.
