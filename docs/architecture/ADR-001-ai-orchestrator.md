# ADR-001: The AI is an Orchestrator, Never Business Logic

**Status:** Approved

**Date:** August 2, 2026

**Author:** Architecture Team

**Supersedes:** N/A

**Superseded by:** N/A

---

## Context

### The Problem

Many AI-powered applications suffer from a fundamental architectural flaw: **placing business logic inside the AI layer**.

This manifests in several ways:

#### Problem 1: Business Rules in Prompts

```
❌ WRONG APPROACH
System prompt contains rules:
"If user says 'I used milk', reduce milk quantity by 0.5L.
If quantity drops below 1L, add to shopping list.
If item expires tomorrow, send notification."

This embeds business logic in text.
```

**Consequences:**
- Rules become implicit, spread across multiple prompts
- Impossible to test business logic independently
- Rules change when you update the model
- Different models produce different business behavior
- Rules are invisible to code review

#### Problem 2: Hallucinated Business Decisions

```
❌ WRONG APPROACH
User: "Plan my dinners for the week"

LLM responds:
"I'll check your pantry, analyze your dietary preferences, look at 
expiry dates, generate recipe suggestions, auto-add ingredients to 
your shopping list, and create a meal plan."

What if:
- The user has no dietary restrictions defined?
- The LLM adds 47 recipes (user only wants 5)?
- The LLM invents shopping items not in the database?
- The LLM suggests recipes that require ingredients that don't exist?
- The LLM forgets to check user preferences and suggests dairy-heavy 
  meals to a vegan?
```

**Consequences:**
- LLM makes decisions that violate business rules
- LLM creates data that is inconsistent with system state
- LLM generates side effects the application doesn't expect
- Impossible to audit or reverse LLM decisions
- Users get different results with different models or prompts

#### Problem 3: Testing Nightmare

```
❌ WRONG APPROACH
To test "if item expires tomorrow, notify the user":
- Mock the LLM
- Hope the mock returns the expected decision
- Hope the mock doesn't hallucinate
- Can't isolate business logic from AI behavior
- Can't test without expensive API calls
```

**Consequences:**
- Business logic cannot be unit tested
- Must use expensive integration tests with real LLM
- Tests are flaky and non-deterministic
- Debugging is impossible—did the LLM fail or the business logic?
- CI/CD pipeline becomes slow and expensive

#### Problem 4: Impossible Debugging

```
❌ WRONG APPROACH
User reports: "The system added wrong items to my shopping list"

Where is the bug?
- LLM misunderstood the user?
- Prompt wasn't clear?
- LLM hallucinated?
- Business logic for adding items is wrong?
- Database constraint was violated?

With business logic inside LLM, debugging chain is:
Prompt → LLM → Parsing → Application → Database

Each step is non-deterministic.
Same input might produce different output.
```

**Consequences:**
- Cannot reproduce bugs consistently
- Cannot add regression tests
- Fixing bugs requires changing prompts, not fixing code
- Issues mysteriously reappear after model updates

#### Problem 5: Vendor Lock-In

```
❌ WRONG APPROACH
If business rules live in OpenAI prompts:
- Switching to Anthropic requires rewriting all prompts
- Switching to local models requires complete prompt re-engineering
- Business logic becomes tightly coupled to LLM vendor
- Impossible to swap models for cost/performance reasons
```

**Consequences:**
- Locked into single AI vendor
- Cannot optimize costs by choosing appropriate models for each task
- Cannot run offline or in private environments
- Major refactor required to switch providers

#### Problem 6: Unmaintainable Complexity

```
❌ WRONG APPROACH
Year 1: Simple prompt with basic rules
Year 2: Add dietary restrictions, allergies
Year 3: Add meal planning, nutritional analysis
Year 4: Add budget constraints, shopping optimization
Year 5: Prompt is 10,000 tokens, incomprehensible, and fragile

What's the rule for shopping list generation?
Look through 5 different prompts.
Hope they're consistent.
Debug by adjusting prompt wording.
```

**Consequences:**
- Prompts become unmaintainable
- Rules conflict in subtle ways
- New developers cannot understand the system
- Every change to rules requires careful prompt engineering
- Technical debt accumulates rapidly

---

## Decision

**Sage adopts the Orchestrator Pattern for AI integration.**

### The AI Responsibility

The AI is responsible for:

- **Understanding Intent**: Parsing user utterance to extract meaning
- **Asking Clarifying Questions**: When intent is ambiguous
- **Selecting Capabilities**: Choosing which application service to invoke
- **Presenting Results**: Formatting responses naturally for the user
- **Maintaining Conversation**: Tracking dialogue flow and context

### The AI is NOT Responsible For

- **Business Rules**: Validation, constraints, or domain logic
- **Calculations**: Financial, inventory, or nutritional math
- **Persistence**: Creating, updating, or deleting data
- **Authorization**: Determining what users can do
- **Workflows**: Multi-step processes or orchestration
- **Data Consistency**: Ensuring data integrity
- **Side Effects**: Notifications, emails, events (services do this)
- **Inventory Decisions**: What to suggest, what to remove, what to calculate

### Deterministic Business Behaviour

Application services must be deterministic.

Given identical inputs and identical application state, the same business outcome should always occur regardless of which AI model is being used.

The AI may vary the wording of its responses, but it must never change business outcomes.

This guarantees that business behaviour remains:

- testable
- reproducible
- auditable
- independent of AI vendors

### Architectural Flow

```
┌─────────────────┐
│  User Input     │
│  (voice/text)   │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ Context Builder │
└────────┬────────┘
         |
         ↓
┌──────────────────────────┐
│  Conversation Router     │
│  • Session management    │
│  • Context extraction    │
└────────┬─────────────────┘
         │
         ↓
┌────────────────────────────────────┐
│  AI Conversation Engine            │
│  • Loads context                   │
│  • Builds system prompt            │
│  • Invokes LLM                     │
│  • LLM detects intent              │
│  • LLM selects capability          │
│  • Validates capability invocation │
└────────┬───────────────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│  Capability Invocation Handler   │
│  • Maps AI tool to service       │
│  • Validates parameters          │
│  • Checks user authorization     │
└────────┬─────────────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│  Application Service             │
│  (PantryService, etc.)           │
│  • Applies business rules        │
│  • Validates data                │
│  • Updates domain model          │
│  • Persists to database          │
│  • Emits events                  │
└────────┬─────────────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│  Event Subscribers               │
│  • Notification service reacts   │
│  • Search index updates          │
│  • Audit log records             │
└────────┬─────────────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│  Response Generation             │
│  • LLM reads operation result    │
│  • Generates natural response    │
└────────┬─────────────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│  Output Formatting               │
│  • Text for chat                 │
│  • Audio for voice               │
│  • Structured data for UI        │
└────────┬─────────────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│  User Receives Response          │
│  (voice/text/visual)             │
└──────────────────────────────────┘
```

### Context Builder

Before the AI is invoked, the application constructs the conversation context.

The Context Builder is responsible for assembling only the information required for the current interaction.

Examples include:

- user preferences
- pantry state
- shopping list
- current conversation state
- previous unresolved questions

The AI never queries arbitrary application state directly.

Instead, it receives a curated context supplied by the application.

### Domain Events

Application services may emit domain events where doing so improves separation of concerns or enables asynchronous processing.

Simple synchronous interactions should remain direct service calls.

Sage favours the simplest architecture that satisfies the requirements and does not introduce event-driven complexity unless it provides a clear benefit.

---

## Capability Invocation

### How AI Discovers Capabilities

Capabilities are **not hardcoded in prompts**. Instead:

1. **Capability Registration**: Each application service registers itself with the AI layer
2. **Capability Definition**: Services expose capabilities as structured tool definitions
3. **Dynamic Discovery**: AI receives list of available capabilities at request time
4. **Capability Validation**: Capability layer validates capability invocations before execution
5. **Fail-Safe**: If LLM requests invalid tool, system rejects it gracefully

### Capability Definition Example

```typescript
// Pantry service exposes these capabilities

{
  name: "pantry.addItem",
  description: "Add a new item to the pantry",
  parameters: {
    name: { type: "string", description: "Item name" },
    quantity: { type: "number", description: "Quantity" },
    unit: { type: "enum", values: ["g", "kg", "ml", "l", "count"] },
    category: { type: "enum", values: ["fridge", "freezer", "cupboard", "pantry"] },
    expiresAt: { type: "date", description: "Expiration date (optional)" }
  },
  requiredFields: ["name", "quantity", "unit"],
  executeFn: async (params) => { /* business logic */ }
}
```

### Why Capabilities Are Registered

**Testability**:
```typescript
// Can test capability without AI
const result = await pantryService.addItem({
  name: "milk",
  quantity: 1,
  unit: "l"
})
expect(result.id).toBeDefined()
```

**Auditability**:
```
All tool invocations are logged:
[timestamp] user_123 called: pantry.addItem
[input] {name: "milk", ...}
[output] {id: "item_456", ...}
[success] true
```

**Swappable AI**:
```
Can replace OpenAI with:
- Anthropic Claude
- Local Ollama
- Azure OpenAI
- Future models

Same capabilities work with all models.
```
### Capability Contracts

Capabilities are first-class architectural components.

The AI never knows how a capability is implemented.

Instead, each capability exposes a stable contract describing:

- its purpose
- required parameters
- expected outputs
- possible errors

Internal implementation may evolve without affecting AI behaviour.

This separation ensures that conversation logic remains stable while business logic can continue to improve independently.

### Why AI Never Accesses Databases Directly

```
❌ WRONG
Tool definition:
{
  name: "queryDatabase",
  execute: async (sql) => {
    return await db.query(sql)
  }
}

Risk: LLM generates arbitrary SQL, bypasses all validation

✅ RIGHT
Tool definition:
{
  name: "pantry.getExpiringSoon",
  execute: async () => {
    return await pantryService.getExpiringSoon()
  }
}

Guarantee: Only safe, predefined queries executed
```

---

## Benefits

### 1. Testing

**Before (Business Logic in AI)**:
```
Test suite is expensive and flaky:
- Mock entire LLM
- Mock API responses
- Tests are non-deterministic
- Takes seconds per test
- Cannot isolate business logic
```

**After (AI as Orchestrator)**:
```
Test suite is fast and reliable:
- Test business logic directly: < 1ms per test
- Mock external services only
- Tests are deterministic
- Can run 10,000 tests in under 1 second
- Business logic is isolated and testable
```

### 2. Maintainability

**Before**:
```
To understand how pantry updates work:
- Read prompt
- Infer business rules from examples
- Check where LLM decisions happen
- Search codebase for side effects
- Hope the prompt and code are consistent
```

**After**:
```
To understand how pantry updates work:
- Open: features/pantry/services/PantryService.ts
- Read: updateItemQuantity() method
- See: all business logic explicitly
- Follow: emitted events
- Trace: all side effects
- Add: new business rules with confidence
```

### 3. Security

**Before**:
```
LLM might:
- Create user confusion by inventing data
- Bypass authorization checks
- Generate side effects user doesn't expect
- Create audit trail inconsistencies
```

**After**:
```
AI can only invoke registered capabilities.
Each capability:
- Validates authorization
- Enforces business rules
- Updates audit logs
- Emits predictable events
- Fails safe if inputs are invalid
```

### 4. Future Model Replacement

**Before**:
```
To switch from OpenAI to Anthropic:
- Rewrite all prompts for Claude's format
- Test that rules still apply correctly
- Risk: Business logic behavior changes
- Expensive and risky undertaking
```

**After**:
```
To switch from OpenAI to Anthropic:
- Update LLM client configuration
- Capabilities remain identical
- Business logic unchanged
- Simple configuration change
```

### 5. Future Capability Expansion

**Before**:
```
To add meal planning:
- Update system prompts
- Adjust rules in prompt text
- Hope new rules don't conflict with old ones
- Test by running conversations
- Difficult to isolate impact
```

**After**:
```
To add meal planning:
- Create: features/mealplanning/services/MealPlanningService.ts
- Register: capabilities in service
- Test: business logic independently
- Deploy: feature with confidence
- No changes to existing code
```

---

## Trade-offs

### Trade-off 1: More Application Code

**Before (AI in charge)**:
```
Prompt (200 lines) contains business rules
Less code overall
```

**After (Orchestrator pattern)**:
```
Service classes (500 lines) contain business rules
More application code to maintain
```

**Justification**: Explicit code is better than implicit rules. Code is testable, debuggable, and maintainable. Prompts are not.

### Trade-off 2: Tool Registration Overhead

**Before**:
```
Just use the LLM directly
No registration or schema management
```

**After**:
```
Must define Capability Definitions
Must register capabilities
Must validate tool calls
Small overhead per capability
```

**Justification**: This overhead provides safety, auditability, and future flexibility. Worth the cost.

### Trade-off 3: More Explicit Interfaces

**Before**:
```
Prompt is implicit contract between AI and code
```

**After**:
```
Capability schema is explicit contract
Must be kept up to date
```

**Justification**: Explicit is better than implicit. Explicit interfaces enable automation, documentation, and safety.

### Trade-off 4: Reduced LLM Autonomy

**Before**:
```
LLM can make arbitrary decisions
Can be creative and flexible
```

**After**:
```
LLM can only invoke registered capabilities
Constrained to predefined operations
```

**Justification**: Constraint improves reliability. LLM is better at understanding intent than making business decisions. Creativity in response phrasing, not in data decisions.

---

## Consequences

This decision affects every aspect of Sage's future development.

### Immediate Consequences

1. **All Features Must Expose Capabilities**: 
   - Not: "How will the AI handle meal planning?"
   - But: "What capabilities should MealPlanningService expose?"

2. **All Business Logic Lives in Services**:
   - Not: "Add rules to the prompt"
   - But: "Add validation to the service"

3. **All Authorization Happens in Services**:
   - Not: "Tell the AI to check permissions"
   - But: "Service validates access before acting"

4. **All Persistence Happens in Services**:
   - Not: "LLM generates SQL"
   - But: "Application services interact with the persistence layer through a persistence adapter or database abstraction."

    Repository abstractions should only be introduced where they provide clear value.

    Simplicity should always be preferred over unnecessary abstraction.

5. **All Side Effects Are Events**:
   - Not: "LLM decides to send notification"
   - But: "Service emits event, listeners react"

### Future Feature Implications

#### Recipe Discovery Feature
```
NOT: "AI analyzes pantry and generates recipes"

BUT:
- RecipeService.findByAvailableIngredients()
  (Returns recipes where 80% of ingredients are in stock)
- RecipeService.filterByDietaryRestrictions()
  (Returns recipes matching user preferences)
- AI calls these capabilities, presents results
```

#### Meal Planning Feature
```
NOT: "AI plans the week's meals"

BUT:
- MealPlanService.generateMealPlan()
  (Pure business logic: scheduling, variety, balance)
- MealPlanService.autoGenerateShoppingList()
  (Invokes ShoppingService, respects business rules)
- AI calls these capabilities, explains the plan
```

#### Nutrition Tracking Feature
```
NOT: "AI calculates nutrition"

BUT:
- NutritionService.calculateMacros()
  (Pure calculation, auditable, testable)
- NutritionService.trackDaily()
  (Persists nutrition data)
- AI presents results naturally
```

#### Barcode Scanning Feature
```
NOT: "AI identifies item from barcode"

BUT:
- BarcodeService.resolveItem()
  (Calls item database, returns best match)
- PantryService.addScannedItem()
  (Receives resolved item, adds to inventory)
- AI confirms the action, asks for quantity if needed
```

#### Multi-Household Sharing Feature
```
NOT: "AI manages multiple households"

BUT:
- HouseholdService.getMembers()
  (Lists authorized members)
- PantryService.addItemForHousehold()
  (Validates user can edit household)
- AI asks: "Which household should I add this to?"
- AI invokes capability with selected household
```

#### Wearable Integration Feature
```
NOT: "AI reads wearable data"

BUT:
- WearableService.syncStepCount()
  (Receives data, persists, emits events)
- ActivityService.suggestRecipes()
  (High activity day → more caloric recipes)
- AI uses suggestions naturally in conversation
```

---

## Examples

### Example 1: "I used half the milk"

```
User (voice): "I used half the milk"
↓
Speech Recognition: "I used half the milk"
↓
AI Intent Detection: 
  intent: "UpdateQuantity"
  entity: "milk"
  delta: -0.5
↓
AI Capability Selection:
  tool: "pantry.updateQuantity"
  parameters: {itemId: "item_123", delta: -0.5}
↓
Authorization Check:
  user_123 owns item_123 ✓
↓
PantryService.updateQuantity(itemId, -0.5):
  1. Load item: {name: "milk", quantity: 1.0, unit: "l"}
  2. Validate: newQuantity = 1.0 - 0.5 = 0.5 ✓ (>= 0)
  3. Apply business rule: if < threshold, mark isLow = true
  4. Update item: {quantity: 0.5, isLow: true}
  5. Persist to database
  6. Emit event: ItemQuantityUpdated {itemId, previous: 1.0, current: 0.5}
↓
Event Subscribers React:
  • ShoppingService.onItemQuantityUpdated():
    Item is low, check if it's on shopping list
    If not, add it automatically
  • NotificationService.onItemQuantityUpdated():
    Item is now low stock, should I notify?
  • RecipeService.onItemQuantityUpdated():
    Available ingredients changed, refresh suggestions
↓
AI Response Generation:
  AI sees: {success: true, item: {...}, isLow: true}
  AI generates: "I've updated your milk to 0.5 liters. 
                 It's getting low—should I add it to your shopping list?"
↓
User receives: Natural spoken response + suggestion

Key Point: AI never decided to add to shopping list.
Business logic decided (via business rule).
AI only presented the result naturally.
```

### Example 2: "Plan dinners for this week"

```
User (chat): "Plan dinners for this week"
↓
AI Intent Detection:
  intent: "MealPlanRequest"
  duration: "week"
↓
AI Context Loading:
  • User preferences: {vegetarian: true, servingSize: 2}
  • Household members: [user_123, user_123_spouse]
  • Pantry inventory: [apple, carrot, spinach, pasta, ...]
  • Low stock items: [milk, eggs]
  • Recent meals: [spaghetti, salad, ...]
↓
AI Capability Selection:
  tool: "mealplanning.generateMealPlan"
  parameters: {
    days: 7,
    servingSize: 2,
    preferences: {vegetarian: true},
    excludeRecent: ["spaghetti", "salad"]
  }
↓
Authorization Check:
  user_123 can generate meal plans ✓
↓
MealPlanService.generateMealPlan():
  1. Fetch recipes matching criteria:
     • RecipeService.searchByPreferences()
     • Returns: 47 recipes available
  2. Apply business logic: Select 7 recipes with:
     • Variety (don't repeat cuisines)
     • Nutritional balance (mix of light/heavy)
     • Ingredient overlap (reduce shopping list bloat)
     • Availability (80% ingredients in stock)
  3. Build shopping list:
     • MealPlanService.autoGenerateShoppingList()
     • For each selected recipe, fetch required ingredients
     • Aggregate: "need milk, chicken, tomatoes, ..."
     • Filter: Remove items already in stock
  4. Validate: Each recipe is achievable
  5. Return: {
       meals: [
         {day: "Monday", recipe: {...}},
         ...
       ],
       shoppingList: [...],
       estimatedCost: 45.00,
       preparationTime: "avg 30 min per meal"
     }
↓
Event Subscribers React:
  • NotificationService.onMealPlanCreated():
    Send notification: "Your meal plan is ready"
  • ShoppingService.onMealPlanCreated():
    Log recommended shopping items (user can review)
↓
AI Response Generation:
  AI sees: {success: true, meals: [...], shoppingList: [...]}
  AI generates: "I've planned seven vegetarian dinners for you.
                 Based on what you have, you'll need to buy:
                 milk, chicken, tomatoes, and basil.
                 Estimated cost: $45. Would you like me to add
                 these to your shopping list?"
↓
User receives: Conversational meal plan with options to act

Key Points:
- AI never performed calculation (MealPlanService did)
- AI never decided which recipes (business logic did)
- AI never decided shopping list (MealPlanService did)
- AI only presented the result naturally
- User can accept/reject the plan
- All decisions are auditable and testable
```

---
> **The AI understands intent. The application understands truth.**

## Summary

**The Orchestrator Pattern separates concerns clearly:**

| Responsibility | Who | Why |
|---|---|---|
| Understanding intent | AI | LLM is excellent at NLP |
| Making decisions | Business Logic | Code is testable, auditable, maintainable |
| Executing work | Application Services | Services own capabilities |
| Storing data | Persistence Layer | Database is single source of truth |
| Responding naturally | AI | LLM excels at language generation |

This pattern enables:

- **Testability**: Business logic tested independently of AI
- **Debuggability**: Issues isolated to specific layer
- **Maintainability**: Code is explicit, not hidden in prompts
- **Flexibility**: Can swap AI models without changing business logic
- **Scalability**: Each feature self-contained and independently deployable
- **Auditability**: All decisions logged and traceable
- **Security**: AI invokes only registered, validated capabilities

**The AI remains in charge of the conversation. The application remains in charge of the business.**

This is the fundamental architectural principle of Sage 2.0.
