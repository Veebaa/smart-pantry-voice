**Working Document**

This document is an engineering discovery report created during the Sage 2.0 migration.

It records the current implementation to support architectural refactoring.

It is not part of the permanent architecture documentation and may be deleted once the relevant migration work is complete.

---

# S1-001 Pantry Capability Discovery

**Backlog Item:** S1-001 – Define Capability Boundaries

**Focus:** Pantry Capability Only

**Date:** August 2, 2026

**Purpose:** Discover all locations where Pantry business logic currently exists without suggesting improvements or refactoring approaches.

---

## Pantry Capability Overview

The Pantry capability manages household food inventory. Users add items they own, categorize them by storage location (fridge, freezer, cupboard, pantry staples), track quantity and expiry dates, and mark items as low stock.

Pantry is the core domain in the application. Nearly all other features depend on pantry state: recipes are suggested based on available ingredients, shopping lists are generated from low-stock items, meal suggestions prioritize available inventory.

**Current Pantry Characteristics:**
- Owned by authenticated user (scoped by userId)
- Categorized by storage location (4 categories)
- Supports quantity tracking (descriptive and numeric)
- Supports expiry date tracking
- Supports low-stock marking
- Supports batch operations (add multiple items)
- Supports undo/redo on all mutations
- Integrates with AI for smart item classification
- Integrates with shopping lists and meal suggestions

---

## Business Responsibilities

Pantry business logic currently handles:

1. **Item Addition**
   - Smart automatic categorization (fridge/freezer/cupboard/pantry_staples)
   - Keyword-based classification (frozen→freezer, tinned→cupboard, fresh→fridge, dried→pantry_staples)
   - Dictionary of 70+ known items with predefined categories
   - Multi-word item recognition (ice cream, corn flakes, baked beans, etc.)
   - Ambiguous item disambiguation (fish, bread, peas without modifiers)
   - Duplicate prevention (item already exists check)
   - Batch item processing (add 3 items in single command)

2. **Item Retrieval**
   - Fetch all items for user
   - Order by addition time (newest first)
   - User isolation (only own items visible)

3. **Item Updates**
   - Update name, category, quantity
   - Update expiry date (with date conversion)
   - Update low-stock threshold
   - Update low-stock flag (is_low)
   - Update current numeric quantity
   - Timestamp tracking (updatedAt)

4. **Item Deletion**
   - Remove from inventory
   - Supports single item deletion
   - User authorization (only owner can delete)

5. **State Tracking**
   - Low stock detection (at threshold or marked manually)
   - Expiry date calculation (days remaining)
   - Expired item detection (negative days)
   - Category-based grouping and display

6. **AI Integration**
   - Send pantry state to AI for meal suggestions
   - Voice command interpretation (add, update, suggest, undo)
   - Low stock item computation for shopping list generation
   - Dietary restriction consideration in meal suggestions
   - Household size consideration in recipe portions

7. **Transaction Management**
   - Undo functionality (reverse additions, deletions, updates)
   - Batch operation grouping (multiple items added together tracked as unit)
   - Action history logging (tracks all mutations with before/after state)

8. **Shopping List Generation**
   - Identify low-stock items from pantry
   - Compute missing ingredients for suggested recipes
   - Combine pantry gaps with user requests into shopping list

---

## Current Implementation Map

### Database Layer

**File:** `shared/schema.ts`

| Table | Responsibility | Fields | Architectural Classification |
|-------|-----------------|--------|------------------------------|
| `pantryItems` | Central pantry data model | id, userId, name, category, quantity, currentQuantity, lowStockThreshold, isLow, expiresAt, addedAt, updatedAt | **Persistence** |
| `action_history` | Audit trail for undo | actionType, entityType, entityId, previousData, newData, actionGroupId, undoneAt, createdAt | **Persistence** |
| `user_settings` | User configuration affecting pantry | userId, dietaryRestrictions[], householdSize, voiceLanguage, voiceAccent, createdAt, updatedAt | **Persistence** (shared with Recipes/Shopping) |

**Database Dependencies:**
- Direct dependency: Drizzle ORM
- Connection pooling via postgres.js client
- Lazy initialization (database not accessed until first request)

---

### API Endpoints

**File:** `server/routes.ts`

#### CRUD Operations

| Endpoint | Method | Responsibility | Current Location | Dependencies | Classification |
|----------|--------|-----------------|------------------|--------------|-----------------|
| `/api/pantry-items` | GET | Fetch all pantry items | Line 194 | requireAuth | **Interface** |
| `/api/pantry-items` | POST | Create new pantry item | Line 205 | requireAuth, insertPantryItemSchema, classifyItem() | **Conversation** (coordinates AI + business + persistence) |
| `/api/pantry-items/:id` | PATCH | Update existing item | Line 218 | requireAuth, updateSchema | **Conversation** |
| `/api/pantry-items/:id` | DELETE | Remove item | Line 258 | requireAuth | **Interface** |

#### AI Orchestration

| Endpoint | Method | Responsibility | Current Location | Key Functions | Classification |
|----------|--------|-----------------|------------------|----------------|-----------------|
| `/api/pantry-assistant` | POST | Main voice command processor | Line 651 | classifyItem(), formatClarificationQuestion(), logAction(), OpenAI API | **Conversation** (core orchestration with embedded business logic) |

**Responsibility Details for `/api/pantry-assistant`:**
- Input parameters: voiceInput, dietaryRestrictions, householdSize, recipeFilters, lastItem, userAnswer, pending_item
- Processes: Handles pending items with user clarification, applies smart classification, queries current pantry state, builds AI system prompt, calls OpenAI GPT-4o-mini, parses structured response, normalizes variations, logs action for undo, computes shopping list updates
- Output: Sage action object (action type: add_item|update_item|ask|none|suggest_meals|generate_shopping_list|add_to_shopping_list|undo, payload with items/suggestions/pending status, natural language response)
- Side effects: Database inserts (adds items), database queries (fetches pantry), external API call (OpenAI), action logging

#### Undo/History Operations

| Endpoint | Method | Responsibility | Current Location | Dependencies | Classification |
|----------|--------|-----------------|------------------|--------------|-----------------|
| `/api/action-history` | GET | Fetch undo-able actions | Line 527 | requireAuth | **Interface** |
| `/api/undo` | POST | Reverse last action(s) | Line 546 | requireAuth, logAction() | **Conversation** (coordinates reversal with business logic) |

**Undo Logic Details:**
- Retrieves most recent undone action
- Supports batch undo (all actions grouped by actionGroupId reversed together)
- Reverses by restoring previousData or deleting newly-added entities
- Handles both pantry and shopping list item reversals
- Marks action as undone via undoneAt timestamp

---

### Business Logic & Utilities

**File:** `server/itemClassifier.ts`

| Function | Responsibility | Returns | Architectural Classification |
|----------|-----------------|---------|------------------------------|
| `classifyItem(itemName: string)` | Intelligent automatic categorization | `{ category, isAmbiguous, possibleCategories, reason }` | **Capability** (pure business logic) |
| `formatClarificationQuestion(itemName, categories)` | Generate user-friendly disambiguation prompts | string | **Conversation** (formatting for user) |
| `getClassificationForAI()` | Generate system prompt rules for AI | string | **Conversation** (AI integration) |

**Classification Data:**
- `SINGLE_WORD_ITEMS`: 70+ known items (cheese→fridge, eggs→fridge, pasta→pantry_staples, etc.)
- `MULTI_WORD_ITEMS`: 40+ phrases (ice cream→freezer, baked beans→cupboard, coconut milk→cupboard, etc.)
- `AMBIGUOUS_BASE_ITEMS`: Items requiring user input (fish, bread, peas, milk type)
- `CATEGORY_KEYWORDS`: Keywords mapping (frozen→freezer, tinned→cupboard, fresh→fridge, dried→pantry_staples)

**Classification Algorithm Priority:**
1. Multi-word exact match (highest priority)
2. Keyword detection (frozen, tinned, fresh, dried)
3. Single-word dictionary lookup
4. Ambiguous classification (returns isAmbiguous=true)
5. Unknown item (returns category=null)

---

**File:** `server/validators.ts`

| Validator | Responsibility | Architectural Classification |
|-----------|-----------------|------------------------------|
| `insertPantryItemSchema` | Zod schema for new item creation | **Interface** (input validation) |
| `updatePantryItemSchema` (implied) | Zod schema for item updates | **Interface** (input validation) |

---

**File:** `server/auth.ts`

| Responsibility | Functions | Architectural Classification |
|-----------------|-----------|------------------------------|
| User isolation for pantry operations | `requireAuth` middleware | **Interface** (HTTP middleware) |
| User identification | Validates session token | **Interface** |

**Pantry-specific usage:** All pantry endpoints require `requireAuth` middleware. All database queries include `WHERE userId = req.user!.id` to prevent cross-user data leakage.

---

**File:** `server/security.ts`

| Responsibility | Functions | Applied to Pantry? | Classification |
|-----------------|-----------|-------------------|-----------------|
| Rate limiting | `createRateLimiter()` | Applied to auth endpoints (protects session creation) | **Infrastructure** |
| Secure cookies | `getSecureCookieOptions()` | Applied to session cookies | **Infrastructure** |
| CSRF tokens | `createCsrfToken()` | Applied to session management | **Infrastructure** |
| Security event logging | `logSecurityEvent()` | Applied to failed auth attempts | **Infrastructure** |

---

### Frontend Components

**File:** `client/src/pages/Index.tsx` (Main Orchestrator)

| State Variable | Responsibility | Type | Architectural Classification |
|-----------------|-----------------|------|------------------------------|
| `pantryItems` | Current inventory state | `PantryItem[]` | **Conversation** (application-managed state) |
| `lastItem` | Pending item awaiting category | `string \| null` | **Conversation** (tracks clarification flow) |
| `sageResponse` | Last AI response | `SageResponse` | **Conversation** (result of last interaction) |
| `recipeFilters` | Active meal preferences | `RecipeFilter[]` | **Conversation** (context for future operations) |

| Function | Responsibility | API Endpoint Called | Architectural Classification |
|----------|-----------------|-------------------|------------------------------|
| `fetchPantryItems()` | Load current inventory | GET `/api/pantry-items` | **Interface** (HTTP data fetching) |
| `handleVoiceInput(transcript)` | Main voice command flow | POST `/api/pantry-assistant` | **Conversation** (orchestrates everything) |
| `handleUndo()` | Reverse last action | POST `/api/undo` | **Conversation** (coordinates undo) |

**handleVoiceInput() Flow (Lines 169-370):**
1. Validates transcript via `voiceInputSchema`
2. Calls `api.pantryAssistant()` with transcript, settings, current pantry
3. Receives action object from AI
4. Handles different action types (add_item, ask, suggest_meals, etc.)
5. For pending items: stores lastItem, displays clarification alert, waits for user answer
6. For successful actions: logs action for undo, refreshes pantry state
7. Speaks response via TTS
8. Auto-opens microphone for next command
9. Shows toast notifications for feedback

---

**File:** `client/src/components/PantryInventory.tsx`

| Responsibility | Business Logic | Architectural Classification |
|-----------------|-----------------|------------------------------|
| Display pantry items | Groups by category, calculates expiry status, determines low-stock visual | **Interface** (presentation only) |
| Expiry calculation | `getExpiryStatus()` computes days until expiry | **Capability** (date math, business rule) |
| Category icons/labels | Maps category enum to display | **Interface** |
| Item deletion UI | Provides delete button, calls onDelete callback | **Interface** |

**Expiry Logic:**
- Expired: daysLeft < 0, shows "Expired" badge
- Today: daysLeft === 0, shows "Expires today" 
- Critical: daysLeft <= 2, shows destructive variant
- Warning: daysLeft <= 7, shows secondary variant
- Normal: daysLeft > 7, shows outline with date

---

**File:** `client/src/components/VoiceInput.tsx`

| Responsibility | Business Logic | Architectural Classification |
|-----------------|-----------------|------------------------------|
| Capture speech | Uses Web Speech API | **Interface** (input mechanism) |
| Validate transcript | Checks length, sanitizes via `voiceInputSchema` | **Interface** (input validation) |
| Error handling | Handles browser compatibility, microphone errors | **Interface** |

---

**File:** `client/src/components/QuickAddDialog.tsx`

| Responsibility | API Call | Architectural Classification |
|-----------------|----------|------------------------------|
| Manual item addition | POST `/api/pantry-items` | **Interface** (alternative to voice) |

---

**File:** `client/src/components/ShoppingList.tsx`

| Responsibility | Sources | Architectural Classification |
|-----------------|---------|------------------------------|
| Display shopping list | Low-stock items + explicitly added items + AI suggestions | **Conversation** (composes multiple sources) |
| Sharing | Native share, WhatsApp, email, copy to clipboard | **Interface** |
| Item deletion | Removes from DB (only if DB-backed) | **Interface** |

**Shopping List Composition:**
- Low-stock pantry items (pantry quantity <= threshold)
- Items explicitly added to shopping list (separate table)
- AI-generated suggestions from meal proposals
- Deduplication when same item appears in multiple sources

---

**File:** `client/src/components/MealSuggestions.tsx`

| Responsibility | Data Source | Architectural Classification |
|-----------------|-------------|------------------------------|
| Display meal suggestions | AI-generated from `/api/pantry-assistant` | **Conversation** (presents AI output) |
| Show ingredient breakdown | ingredients_available vs. ingredients_needed | **Conversation** |
| Save to favorites | POST `/api/favorite-recipes` | **Interface** |
| Add to history | POST `/api/recipe-history` | **Interface** |

---

**File:** `client/src/components/ExpiryDateDialog.tsx` & `ItemThresholdDialog.tsx`

| Responsibility | API Call | Architectural Classification |
|-----------------|----------|------------------------------|
| Set expiry date | PATCH `/api/pantry-items/:id` with expiresAt | **Interface** (input for business rule) |
| Set low-stock threshold | PATCH `/api/pantry-items/:id` with lowStockThreshold | **Interface** (input for business rule) |

---

### Client Utilities

**File:** `client/src/lib/api.ts`

| Responsibility | Pantry-specific Methods | Architectural Classification |
|-----------------|-------------------------|------------------------------|
| HTTP request wrapper | `apiRequest()`, `internalApiRequest()` | **Interface** (HTTP protocol) |
| Pantry API namespace | `api.pantryItems.getAll()`, `.create()`, `.update()`, `.delete()` | **Interface** |
| AI endpoint wrapper | `api.pantryAssistant()` | **Conversation** |

---

**File:** `client/src/lib/validation.ts`

| Validator | Responsibility | Architectural Classification |
|-----------|-----------------|------------------------------|
| `pantryItemSchema` | Client-side validation before sending to API | **Interface** (input validation) |
| `voiceInputSchema` | Sanitizes voice transcript (prevents injection) | **Interface** (input validation) |

---

**File:** `client/src/hooks/useVoiceOutput.ts`

| Hook | Responsibility | Architectural Classification |
|------|-----------------|------------------------------|
| `useVoiceOutput()` | Wrapper around text-to-speech API | **Interface** (output mechanism) |

---

**File:** `client/src/contexts/UserContext.tsx`

| Responsibility | Affecting Pantry? | Architectural Classification |
|-----------------|------------------|------------------------------|
| User auth state | Yes (userId scopes all pantry queries) | **Conversation** (application state) |

---

### Settings/Configuration

**File:** `client/src/components/SettingsDialog.tsx`

| Setting | Affects Pantry? | Responsibility | Architectural Classification |
|---------|-----------------|-----------------|------------------------------|
| Dietary Restrictions | Yes | Passed to AI for meal suggestions | **Conversation** (user context) |
| Household Size | Yes | Passed to AI for recipe portions | **Conversation** (user context) |
| Voice Language | No (global TTS setting) | Voice output language | **Interface** |
| Voice Accent | No (global TTS setting) | Voice output accent | **Interface** |

---

## Database Ownership

### Primary Pantry Table: `pantry_items`

**Purpose:** Central storage for household inventory

**Fields:**
- `id` (uuid, primary key): Unique item identifier
- `userId` (uuid, not null): Owner (scoping key)
- `name` (text, not null): Item name (e.g., "milk", "chicken")
- `category` (text enum, not null): Storage location (fridge|freezer|cupboard|pantry_staples)
- `quantity` (text, nullable): Descriptive quantity (e.g., "1L", "500g", "a carton")
- `currentQuantity` (float, nullable): Numeric quantity for tracking
- `lowStockThreshold` (float, nullable): Threshold for low-stock alert
- `isLow` (boolean, default=false): Manually marked low-stock flag
- `expiresAt` (timestamp, nullable): When item expires
- `addedAt` (timestamp, default=now): When added to inventory
- `updatedAt` (timestamp, default=now): Last modification time

**Related Schema Objects:**
- `insertPantryItemSchema` (Zod): Validation for new items (omits id, addedAt, updatedAt)
- `PantryItem` type: TypeScript type for fully-populated item
- `InsertPantryItem` type: TypeScript type for insert operations

**Access Pattern:**
- Always scoped by `userId` (no cross-user reads/writes)
- Ordered by `addedAt DESC` in default query (newest first)
- No CASCADE deletes (orphaned records don't affect related tables)

---

### Secondary Pantry Table: `action_history`

**Purpose:** Audit trail for undo/redo functionality

**Fields:**
- `id` (uuid, primary key): Action identifier
- `userId` (uuid, not null): Action performer
- `actionType` (text enum, not null): add_item|delete_item|update_item|add_shopping|delete_shopping
- `entityType` (text enum, not null): pantry_item|shopping_list_item
- `entityId` (uuid, not null): Reference to affected record
- `previousData` (jsonb, nullable): State before action (for undo)
- `newData` (jsonb, nullable): State after action
- `actionGroupId` (uuid, nullable): Groups batch operations together
- `undoneAt` (timestamp, nullable): When action was undone (null=active, set=undone)
- `createdAt` (timestamp, default=now): When action occurred

**Usage in Pantry:**
- Records every add/delete/update on pantry_items
- Used by undo flow to restore previousData
- Supports batch undo via actionGroupId (all items added together undone together)
- Retention: Keeps history indefinitely (no pruning specified)

---

### Shared Configuration Table: `user_settings`

**Purpose:** User preferences that affect pantry operations

**Fields (Pantry-relevant):**
- `userId` (uuid, not null, unique): User owner
- `dietaryRestrictions` (text[], default=[]): Dietary filters (e.g., ["vegan", "gluten_free"])
- `householdSize` (integer, default=2): Affects recipe portions and shopping suggestions
- `voiceLanguage` (text, default="en"): Speech recognition language
- `voiceAccent` (text, default="en-US"): TTS voice variant

**Database Relationship:**
- One-to-one with users table (unique userId constraint)
- Loaded on every `/api/pantry-assistant` call
- Passed to AI for meal suggestions

---

### Composition Tables (Not Pantry-Specific, But Referenced)

**File:** `shared/schema.ts` (same file as pantry tables)

| Table | Pantry Interaction | Responsibility |
|-------|-------------------|-----------------|
| `shopping_list_items` | Composed with low-stock pantry items | Items to buy (separate from inventory) |
| `favorite_recipes` | Referenced in meal suggestions | Recipes user has saved |
| `recipe_history` | Records recipe usage | Which recipes have been cooked |
| `users` | Contains user auth | User accounts |
| `sessions` | Auth tokens | User sessions |

---

## External Dependencies

### External Services

| Service | Endpoint Called | Pantry Usage | Classification |
|---------|-----------------|-------------|-----------------|
| OpenAI API | POST https://api.openai.com/v1/chat/completions | AI command interpretation and meal suggestions | **Infrastructure** |

**Configuration:** Environment variable `OPENAI_API_KEY` (required for `/api/pantry-assistant`)

**Model:** `gpt-4o-mini` (via POST with tool_choice structured output)

**Prompting:** System prompt includes pantry state, user settings, categorization rules, command patterns, current inventory

**Cost Factor:** Called on every voice command (potentially expensive at scale)

---

### Legacy/Backup Infrastructure

**Supabase Edge Function:** `supabase/functions/pantry-assistant/index.ts`

| Service | Model | Status | Pantry Usage |
|---------|-------|--------|-------------|
| Lovable AI Gateway | Google Gemini 2.5 Flash | Legacy (not active in main flow) | Similar AI orchestration to main endpoint |

---

### Required Environment Configuration

| Variable | Required? | Used For | Classification |
|----------|-----------|----------|-----------------|
| `OPENAI_API_KEY` | Yes | AI command processing | **Infrastructure** |
| `DATABASE_URL` | Yes | PostgreSQL connection | **Infrastructure** |
| `NODE_ENV` | Yes | Production vs. development | **Infrastructure** |

---

### Implicit Dependencies

| Dependency | Type | Pantry Impact |
|------------|------|---------------|
| `date-fns` library | npm package | Expiry date calculations, formatting |
| `zod` library | npm package | Input validation |
| `drizzle-orm` | npm package | Database queries |
| `postgres.js` | npm package | Database connection pooling |
| Web Speech API | Browser API | Voice capture (client-side) |
| Web Audio API | Browser API | Text-to-speech playback (client-side) |
| localStorage | Browser API | Session token storage |

---

## Observations

### Architectural Observations

1. **Pantry business logic is distributed across multiple files**: Smart categorization lives in `itemClassifier.ts`, API operations in `routes.ts`, UI display in `PantryInventory.tsx`, and coordination in `pages/Index.tsx`. There is no single "Pantry service" or capability module.

2. **AI integration is tightly coupled to routing layer**: The `/api/pantry-assistant` endpoint (in `routes.ts`) directly contains AI orchestration logic, command interpretation, database queries, and action logging. This endpoint is a monolith combining interface transport, business logic, conversation coordination, and infrastructure calls.

3. **Pantry business logic exists in HTTP routes**: CRUD endpoints (`POST /api/pantry-items`, `PATCH /api/pantry-items/:id`) contain database operations directly. There is no abstraction layer between routes and persistence.

4. **Conversation state is partially distributed**: Pending item tracking is split between `lastItem` in React state (`pages/Index.tsx`) and action history in database. There is no centralized conversation state management.

5. **React components contain business logic**: `PantryInventory.tsx` contains expiry calculation logic (`getExpiryStatus()`). `Index.tsx` contains command interpretation logic in `handleVoiceInput()`.

6. **Smart categorization is independent**: Item classification logic in `itemClassifier.ts` is well-separated and testable, representing the most isolated business behavior currently.

7. **Pantry depends on user settings**: Every operation passes `dietaryRestrictions` and `householdSize` to AI, creating implicit dependency. Changing user settings affects pantry behavior.

8. **Undo implementation requires action logging**: Every mutation is logged to `action_history` table with before/after state. Batch operations grouped with `actionGroupId` for atomic undo.

9. **Shopping list is composed from multiple sources**: Low-stock pantry items, explicitly-added shopping items, and AI suggestions are merged and deduplicated in display layer, not at data layer.

10. **Pantry polling enables multi-device sync**: Client polls every 5 seconds (`setInterval` in `Index.tsx`), allowing changes from other devices to appear automatically. No real-time subscription exists.

### Current Coupling Observations

1. **Tight HTTP-Business Coupling**: Routes directly query database and call AI. No abstraction between transport and logic.

2. **Tight AI-Pantry Coupling**: Smart categorization rules are embedded in system prompt. Changing classification logic requires prompt updates.

3. **Tight Persistence-Route Coupling**: Database queries use Drizzle ORM directly in route handlers. No adapter pattern or repository abstraction.

4. **Partial Conversation-Business Coupling**: Some conversation state stored in React (lastItem), some in database (action_history), no unified approach.

5. **UI-Business Coupling**: React components contain business calculations (expiry status, low stock detection via state filtering).

### Technology Observations

1. **Database**: PostgreSQL via Supabase with Drizzle ORM
2. **Validation**: Zod schemas for all API inputs
3. **AI**: OpenAI GPT-4o-mini with structured tool output
4. **Frontend**: React with TypeScript, no state management library (useState only)
5. **Polling**: 5-second interval on pantryItems
6. **Error Handling**: Try-catch blocks in routes, toast notifications in UI
7. **Authentication**: Session tokens in cookies, scoped queries by userId

### Data Flow Observations

1. **Write Flow**: User voice → browser → `/api/pantry-assistant` → AI → action determination → database insert → action log → response back to UI
2. **Read Flow**: App loads → fetch pantry items → display → poll every 5s for updates
3. **Delete Flow**: User deletes item → HTTP DELETE → database delete → refresh display
4. **Undo Flow**: User says "undo" → fetch latest action → restore previousData → database update

---

## Summary

Pantry business logic is currently **embedded throughout the application** with **no unified capability abstraction**. Responsibilities span HTTP routing, database access, AI integration, React components, and utility functions. While individual pieces like smart categorization are well-isolated, the overall Pantry behavior is scattered and tightly coupled to HTTP transport, AI implementation, and React rendering.

The most isolated behavior is smart item categorization in `itemClassifier.ts`. The most coupled behavior is the `/api/pantry-assistant` endpoint, which combines transport, orchestration, business logic, persistence, and infrastructure in a single function.
