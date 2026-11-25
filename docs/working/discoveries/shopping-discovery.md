**Working Document**

This document is an engineering discovery report created during the Sage 2.0 migration.

It records the current implementation to support architectural refactoring.

It is not part of the permanent architecture documentation and may be deleted once the relevant migration work is complete.

---

# Shopping Capability Discovery

**Date:** August 2, 2026

**Purpose:** Discover all locations where Shopping business logic currently exists.

---

## Shopping Capability Overview

The Shopping capability manages a separate shopping list (items to buy) distinct from the Pantry inventory (items owned). Users can:

- Add items directly to a shopping list (via voice: "add milk to shopping list" or UI: manual entry)
- View all shopping list items
- Mark items as checked off (after purchase)
- Delete items from shopping list
- Undo shopping list operations

The shopping list is automatically populated from:
- **Low-stock pantry items** (items marked as low quantity or below threshold)
- **AI suggestions** (ingredients needed for recommended recipes)
- **User requests** (explicit "add X to shopping list" commands)

Shopping list is composed from multiple sources and displayed as unified list. Sources are deduplicated before display.

---

## Business Responsibilities

Shopping capability currently handles:

1. **Item Addition to Shopping List**
   - Direct addition via POST /api/shopping-list
   - AI-triggered addition via action="add_to_shopping_list" from `/api/pantry-assistant`
   - Batch additions (multiple items in single command)
   - No duplicate prevention (same item can be added multiple times)
   - Item-level quantity tracking (optional quantity field)

2. **Item Retrieval**
   - Fetch all shopping list items for user
   - Order by creation time (newest first)
   - User isolation (only own items visible)
   - Separate from pantry items (different table, different semantics)

3. **Item Updates**
   - Mark items as checked/unchecked (purchased status)
   - Update item name
   - Update item quantity
   - Timestamp tracking not updated (no updatedAt field in schema)

4. **Item Deletion**
   - Remove individual items from shopping list
   - User authorization (only owner can delete)
   - Direct deletion (no soft delete)

5. **List Composition**
   - Compute low-stock pantry items for display
   - Merge with manually-added shopping items
   - Merge with AI-suggested missing ingredients
   - Deduplicate items across sources (by name matching)
   - Display as single unified list

6. **List Sharing**
   - Format shopping list as readable text
   - Native share (if browser supports)
   - WhatsApp share (opens WhatsApp web)
   - Email share (opens email client)
   - Copy to clipboard

7. **AI Integration**
   - Voice command: "add X to shopping list"
   - AI interprets commands and returns action="add_to_shopping_list"
   - Shopping list generation from meal suggestions (computes missing ingredients)
   - Low-stock item computation passed to AI for context

8. **Transaction Management**
   - Undo shopping list additions (delete via action_history)
   - Undo shopping list deletions (restore via action_history)
   - Action logging for all shopping mutations

---

## Current Implementation Map

### Database Layer

**File:** `shared/schema.ts`

| Table | Responsibility | Fields | Classification |
|-------|-----------------|--------|-----------------|
| `shopping_list_items` | Shopping list item storage | id, userId, name, quantity, checked, createdAt | **Persistence** |
| `action_history` | Audit trail for undo | actionType (add_shopping\|delete_shopping), entityType, entityId, previousData, newData, actionGroupId, undoneAt | **Persistence** (shared) |

**Schema Details:**

`shopping_list_items` Table:
- `id` (uuid, primary key): Item identifier
- `userId` (uuid, not null): Owner (scoping key)
- `name` (text, not null): Item name (e.g., "milk", "bread")
- `quantity` (text, nullable): Quantity descriptor (e.g., "2L", "500g")
- `checked` (boolean, default=false): Whether item purchased
- `createdAt` (timestamp, default=now): When added to list

**Related Types:**
- `insertShoppingListItemSchema` (Zod): Validation for new shopping items
- `ShoppingListItem` type: TypeScript type for fully-populated item
- `InsertShoppingListItem` type: TypeScript type for insert operations

**Access Pattern:**
- Always scoped by `userId` (no cross-user reads/writes)
- Ordered by `createdAt DESC` in default query (newest first)

---

### API Endpoints

**File:** `server/routes.ts`

#### CRUD Operations

| Endpoint | Method | Responsibility | Current Location | Dependencies | Classification |
|----------|--------|-----------------|------------------|--------------|-----------------|
| `/api/shopping-list` | GET | Fetch all shopping items | Line 375 | requireAuth | **Interface** |
| `/api/shopping-list` | POST | Create new shopping item | Line 385 | requireAuth, input validation | **Interface** |
| `/api/shopping-list/:id` | PATCH | Update shopping item | Line 400 | requireAuth, partial update | **Interface** |
| `/api/shopping-list/:id` | DELETE | Remove shopping item | Line 415 | requireAuth | **Interface** |

**Endpoint Details:**

GET /api/shopping-list (Line 375):
- Query: SELECT * FROM shopping_list_items WHERE userId = req.user.id ORDER BY createdAt DESC
- Returns: Array of ShoppingListItem objects
- Error handling: 500 on database error

POST /api/shopping-list (Line 385):
- Input: { name (required), quantity (optional) }
- Validation: Checks name is not null, returns 400 if missing
- Operation: INSERT into shopping_list_items, returns new item
- Error handling: 500 on database error

PATCH /api/shopping-list/:id (Line 400):
- Input: { checked (optional), name (optional), quantity (optional) }
- Behavior: Only updates provided fields
- Query: UPDATE shopping_list_items SET ... WHERE id = :id AND userId = req.user.id
- Returns: Updated item object

DELETE /api/shopping-list/:id (Line 415):
- Input: Path parameter :id
- Operation: DELETE FROM shopping_list_items WHERE id = :id AND userId = req.user.id
- Returns: { success: true }

#### AI Orchestration

| Endpoint | Method | Action | Responsibility | Location | Classification |
|----------|--------|--------|-----------------|----------|-----------------|
| `/api/pantry-assistant` | POST | add_to_shopping_list | Insert items directly to shopping list | Line 1099 | **Conversation** |

**add_to_shopping_list Handling (Line 1099):**
- Triggered when AI returns action="add_to_shopping_list"
- Input: sageResponse.payload.items array
- Operation: For each item, INSERT into shopping_list_items
- Logs action: For each insert, logAction() called with 'add_shopping' type
- Returns: sageResponse with action and spoken confirmation

#### Undo Operations

Undo handling for shopping items integrated into `/api/undo` endpoint (shared with Pantry):
- Detects action.actionType = 'add_shopping' and entityType = 'shopping_list_item'
- Operation: DELETE from shopping_list_items (to undo add)
- For delete undo: Would restore from previousData (not shown in current code)

---

### Business Logic & Utilities

**File:** `server/validators.ts`

| Validator | Responsibility | Architectural Classification |
|-----------|-----------------|------------------------------|
| `shoppingListItemSchema` | Zod schema for shopping item input validation (itemName, quantity, unit, checked) | **Interface** (input validation) |

**Schema Structure:**
```typescript
{
  itemName: string (required, via itemNameSchema)
  quantity: string (optional, via quantitySchema)
  unit: enum (optional, via unitSchema)
  checked: boolean (default false)
}
```

---

### Frontend Components

**File:** `client/src/pages/Index.tsx` (Main Orchestrator)

| State Variable | Responsibility | Type | Classification |
|-----------------|-----------------|------|-----------------|
| `shoppingListItems` | Current shopping list state | `ShoppingListItem[]` | **Conversation** (application-managed state) |

| Function | Responsibility | API Endpoint Called | Classification |
|----------|-----------------|-------------------|-----------------|
| `fetchShoppingListItems()` | Load current shopping list | GET `/api/shopping-list` | **Interface** (HTTP data fetching) |

**fetchShoppingListItems() Details (Line 334):**
- Makes GET request to `/api/shopping-list`
- Parses response into ShoppingListItem[]
- Updates component state: setShoppingListItems(data)
- Returns data for caller use
- Called on: component mount (useEffect), after pantry operations, after AI responses, every 5-second poll interval

**State Integration:**
- Shopping list state exists alongside pantry state
- Both fetched independently
- Both updated on 5-second polling interval
- Both refreshed after voice command processing

**Caller in `handleVoiceInput()` (Line 334):**
- After AI response processed: calls fetchShoppingListItems()
- After Sage response spoken: calls fetchShoppingListItems()
- On undo: calls fetchShoppingListItems()
- Effect: Shopping list updates automatically after any action

---

**File:** `client/src/components/ShoppingList.tsx`

| Responsibility | Business Logic | Architectural Classification |
|-----------------|-----------------|------------------------------|
| Display shopping list | Renders items from props | **Interface** (presentation) |
| Sharing functionality | Multiple share methods (native, WhatsApp, email, clipboard) | **Interface** |
| Item deletion | DELETE /api/shopping-list/{id} for DB-backed items | **Interface** |
| List composition | Merges low-stock items + manually added items + AI suggestions | **Conversation** (composition logic) |

**Component Props:**
- `items: string[]` — Array of item names to display
- `shoppingListItems?: ShoppingListItem[]` — DB-backed items for deletion
- `onRefresh?: () => Promise<void>` — Callback to refresh after deletion

**Display Logic:**
- Renders `items` array as badges
- For each badge: checks if item exists in `shoppingListItems` (DB-backed)
- If DB-backed: shows delete button
- If not DB-backed: shows info tooltip ("This item is from low stock - update the pantry item instead")

**Deletion Logic (handleDeleteItem):**
- Finds item in shoppingListItems by name matching (case-insensitive)
- If found: calls DELETE /api/shopping-list/{id}
- If found: calls onRefresh callback to update display
- If not found: shows toast "This item is from low stock..."

**Sharing Functionality:**
- `formatShoppingList()`: Converts array to numbered list text
- `handleShare()`: Uses navigator.share API (native share)
- `handleWhatsAppShare()`: Opens https://wa.me/?text={encoded_list}
- `handleEmailShare()`: Opens mailto: with subject and body
- `handleCopyToClipboard()`: Copies formatted list to clipboard

---

### Client Utilities

**File:** `client/src/lib/api.ts`

| Responsibility | Pantry-specific Methods | Architectural Classification |
|-----------------|-------------------------|------------------------------|
| Shopping API namespace | (implicit in generic apiRequest) | **Interface** (HTTP protocol) |

Shopping list uses generic `apiRequest()` wrapper without dedicated namespace object in API client.

---

### Settings/Configuration

**File:** `client/src/components/SettingsDialog.tsx`

| Setting | Affects Shopping? | Responsibility | Architectural Classification |
|---------|-----------------|-----------------|------------------------------|
| Dietary Restrictions | Yes (indirectly through meal suggestions) | Passed to AI for recipe filtering, which determines ingredients needed | **Conversation** (user context) |
| Household Size | Yes (indirectly through meal suggestions) | Affects recipe portion sizes, determines quantity of ingredients needed | **Conversation** (user context) |

---

## Database Ownership

### Primary Shopping Table: `shopping_list_items`

**Purpose:** Central storage for items user needs to buy

**Fields:**
- `id` (uuid, primary key): Unique item identifier
- `userId` (uuid, not null): Owner (scoping key)
- `name` (text, not null): Item name (e.g., "milk", "eggs")
- `quantity` (text, nullable): Item quantity (e.g., "2L", "dozen")
- `checked` (boolean, default=false): Purchase status
- `createdAt` (timestamp, default=now): When added to list

**Related Schema Objects:**
- `insertShoppingListItemSchema` (Zod): Validation for new items
- `ShoppingListItem` type: TypeScript type for fully-populated item
- `InsertShoppingListItem` type: TypeScript type for insert operations

**Access Pattern:**
- Always scoped by `userId` (no cross-user reads/writes)
- Ordered by `createdAt DESC` in default query (newest first)
- No CASCADE deletes
- No soft delete (hard delete only)

**Distinct from Pantry:**
- `pantry_items`: Items user owns, stored in home
- `shopping_list_items`: Items user needs to buy

---

### Secondary Shopping Table: `action_history`

**Purpose:** Audit trail for undo/redo functionality (shared with Pantry)

**Shopping-specific Fields:**
- `actionType = 'add_shopping' | 'delete_shopping'`: Shopping operation type
- `entityType = 'shopping_list_item'`: Entity type for shopping
- Other fields: entityId, userId, previousData, newData, actionGroupId, undoneAt, createdAt

**Usage in Shopping:**
- Records every add/delete on shopping_list_items
- Used by undo flow to restore previousData
- Supports batch undo via actionGroupId

---

### Shared Configuration Table: `user_settings`

**Purpose:** User preferences (affects shopping indirectly)

**Shopping-relevant Fields:**
- `dietaryRestrictions` (text[], default=[]): Dietary filters affecting recipe suggestions
- `householdSize` (integer, default=2): Affects recipe portions and ingredient quantities

**Connection to Shopping:**
- Affects AI meal suggestions
- Affects ingredient computation for shopping list
- Not shopping-specific, but impacts shopping list generation

---

## External Dependencies

### External Services

| Service | Endpoint | Shopping Usage | Classification |
|---------|----------|-----------------|-----------------|
| OpenAI API | /v1/chat/completions | AI command interpretation ("add X to shopping list") | **Infrastructure** |

**Configuration:** Environment variable `OPENAI_API_KEY`

**Model:** `gpt-4o-mini`

**Prompting:** System prompt includes shopping list operations, meal suggestions that generate shopping needs

---

### Browser APIs

| API | Shopping Usage | Classification |
|-----|-----------------|-----------------|
| navigator.share() | Native sharing of shopping list | **Interface** |
| Clipboard API | Copy shopping list to clipboard | **Interface** |

---

### Required Environment Configuration

| Variable | Required? | Used For | Classification |
|----------|-----------|----------|-----------------|
| `OPENAI_API_KEY` | Yes | AI command processing | **Infrastructure** |
| `DATABASE_URL` | Yes | PostgreSQL connection | **Infrastructure** |

---

### Implicit Dependencies

| Dependency | Type | Shopping Impact |
|------------|------|-----------------|
| `zod` library | npm package | Input validation |
| `drizzle-orm` | npm package | Database queries |
| `postgres.js` | npm package | Database connection |

---

## Interactions with Other Domains

### Shopping ↔ Pantry

**Data Flow from Pantry to Shopping:**
- Low-stock detection: Pantry filters items where `isLow=true` or `currentQuantity <= lowStockThreshold`
- These items displayed in shopping list UI
- User can delete from shopping (removes from DB-backed list only, not from pantry)
- Undo shopping deletion restores from shopping list (separate from pantry restoration)

**Current Location:** `ShoppingList.tsx` component receives low-stock items as `items` prop

**Distinction:** Shopping list items from low stock are not DB-backed (can't delete, only view)

---

### Shopping ↔ Recipes

**Data Flow from Recipes to Shopping:**
- AI suggests meals based on available pantry ingredients
- For each suggested recipe, AI computes `ingredients_needed` (missing from pantry)
- Missing ingredients passed to shopping list composition
- Shopping list displays: low stock items + missing ingredients + manually added items

**Current Location:** `MealSuggestions.tsx` component, shopping list composition in `ShoppingList.tsx`

**Mechanism:** AI response includes `payload.meal_suggestions[].ingredients_needed` array

---

### Shopping ↔ User Settings

**Settings Affecting Shopping:**
- `dietaryRestrictions`: Filters which recipes are suggested, affects ingredients in shopping list
- `householdSize`: Affects recipe portions, affects ingredient quantities

**Current Location:** Settings passed to `/api/pantry-assistant` for meal suggestion computation

---

### Shopping ↔ Conversation/AI

**Voice Command Handling:**
- Command: "add milk to shopping list"
- AI interprets: action="add_to_shopping_list"
- Payload: `{ items: [{ name: "milk", quantity: null }] }`
- Server handler: INSERT into shopping_list_items
- Action logged: 'add_shopping' for undo support
- Response: "Added milk to your shopping list"

**System Prompt Instructions:** Explicitly instructs AI on "add X to shopping list" vs. "add X" (pantry) distinction

---

### Shopping ↔ Undo/History

**Undo Support:**
- All shopping additions logged to action_history with actionType='add_shopping'
- All shopping deletions logged to action_history with actionType='delete_shopping'
- Undo flow: GET latest action, DELETE from shopping_list_items (for adds), INSERT back (for deletes)
- Batch undo supported via actionGroupId (multiple items added together undone together)

---

## Observations

### Architectural Observations

1. **Shopping list is composed from multiple sources**: Low-stock pantry items, manually-added items, and AI-suggested ingredients are merged and deduplicated in the UI component, not at persistence layer.

2. **Shopping business logic distributed across multiple files**: Item CRUD in routes.ts, composition logic in ShoppingList.tsx, state management in Index.tsx. No unified shopping service.

3. **Shopping is tightly coupled to AI orchestration**: The "/api/pantry-assistant" endpoint contains shopping list action handling (add_to_shopping_list), mixing conversation logic with shopping business operations.

4. **Shopping list shares action history with Pantry**: Both use same action_history table with different actionType values (add_shopping, delete_shopping). Undo handles both pantry and shopping in single endpoint.

5. **Deletion logic distinguishes DB-backed vs. computed items**: UI shows delete button only for DB-backed items. Low-stock items cannot be deleted directly (must update pantry instead). This distinction exists in component logic, not at API layer.

6. **No duplicate prevention**: Same item can be added to shopping list multiple times. Deduplication exists only in UI display when composing sources (merges low-stock + manual + AI suggestions).

7. **Polling enables multi-device sync**: Shopping list fetched every 5 seconds alongside pantry items. Changes from other devices appear automatically.

8. **Sharing is platform-aware**: Component detects navigator.share support and offers native sharing. Falls back to manual alternatives (WhatsApp, email, clipboard).

### Current Coupling Observations

1. **Tight HTTP-Business Coupling**: Routes directly query database via Drizzle ORM. No abstraction between transport and logic.

2. **Tight Conversation-Shopping Coupling**: AI action handling embedded in routes, mixing transport and business concerns.

3. **Tight Composition-UI Coupling**: List composition (merging sources, deduplication) happens in React component, not at data/service layer.

4. **Tight Pantry-Shopping Coupling**: Low-stock computation happens in pantry context, shopping list must know about pantry to display correctly.

5. **Tight Undo-Shopping Coupling**: Shopping mutations shared action history with pantry, making undo a cross-domain concern.

### Technology Observations

1. **Database**: PostgreSQL via the Express backend and Drizzle ORM. Supabase references elsewhere in this discovery are historical.
2. **Validation**: Zod schemas for API inputs
3. **Frontend**: React with TypeScript, useState for state management
4. **Polling**: 5-second interval on shopping list fetch
5. **Error Handling**: Try-catch in routes, toast notifications in UI
6. **Authentication**: Session tokens, scoped queries by userId
7. **Sharing**: Multiple strategies (native, WhatsApp, email, clipboard)

### Data Flow Observations

**Write Flow (Manual Addition):**
- User enters item name → POST /api/shopping-list → Database insert → Component refetch → Display updated

**Write Flow (AI-Triggered Addition):**
- User voice command → `/api/pantry-assistant` → AI returns add_to_shopping_list → INSERT → logAction → Response back to UI

**Read Flow:**
- App loads → fetchShoppingListItems() → Display → Poll every 5s for updates

**Delete Flow:**
- User clicks delete button → DELETE /api/shopping-list/{id} → Database delete → Refresh display

**Undo Flow:**
- User says "undo" → POST /api/undo → Fetch latest action → Restore previousData → Database update → Refresh

---

## Summary

Shopping business logic is currently **embedded in HTTP routes and React components** with **no unified shopping service**. Responsibilities span API routing, database access, AI integration, list composition, and UI rendering. The shopping list is treated as a separate concern from pantry items but is tightly integrated with pantry data (low-stock items), recipe data (missing ingredients), and undo functionality (shared action history).

The most isolated behavior is individual CRUD operations via API endpoints. The most coupled behavior is the shopping list composition (merging multiple sources) in React component and the add_to_shopping_list action handling in the `/api/pantry-assistant` monolithic endpoint.

Shopping's current architecture makes it difficult to extract as an independent capability due to tight coupling with pantry (low-stock computation), recipes (missing ingredients), and conversation/AI (action handling embedded in pantry-assistant endpoint).
