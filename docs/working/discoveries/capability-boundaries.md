**Working Document**

This document is an engineering analysis created during the Sage 2.0 migration.

It records interactions between capabilities within the current implementation.

It is not part of the permanent architecture documentation and may be deleted once the migration is complete.

---

# Pantry

## Purpose

The Pantry capability is responsible for managing a user's household food inventory. It is the authoritative source of inventory information within Sage, including what items the user owns, where they are stored, their quantities, expiry information, and stock status.

The Pantry capability maintains inventory state and exposes inventory-related business services to the rest of the application. It does not coordinate conversations, generate recipes, manage shopping lists, or interact directly with AI providers. These responsibilities belong to other capabilities or architectural layers.

---

## Owns

The Pantry capability owns:

- Pantry item lifecycle (create, update, delete)
- Inventory state
- Storage location categorisation
- Item categorisation
- Quantity tracking
- Current quantity values
- Low-stock thresholds
- Low-stock determination
- Expiry date tracking
- Expiry status calculation
- Duplicate item detection
- Inventory validation
- Batch inventory operations

---

## Business Services

The Pantry capability provides the following business services to other capabilities:

- Add pantry item
- Update pantry item
- Remove pantry item
- Retrieve pantry inventory
- Retrieve pantry item by identifier
- Categorise inventory items
- Determine low-stock items
- Determine expiry status
- Search inventory
- Provide current inventory state
- Validate pantry operations

These services describe business behaviour rather than implementation details. They are independent of HTTP, database technology, AI providers, or user interface.

---

## Uses

The Pantry capability depends upon the following capabilities or architectural services:

- Authentication (user identity)
- User Settings (dietary preferences and household context)
- Conversation layer (voice and conversational orchestration)
- AI capability (when intelligent categorisation or meal reasoning is requested)
- Persistence layer
- Undo capability

Pantry consumes these services but does not own their implementation.

---

## Does Not Own

The Pantry capability does **not** own:

- Shopping lists
- Shopping list generation
- Meal planning
- Recipe generation
- Favourite recipes
- Recipe history
- User authentication
- User sessions
- User preferences
- Voice recognition
- Speech synthesis
- AI prompt construction
- AI provider selection
- HTTP routing
- API endpoints
- Database technology
- Conversation management
- Conversation state

---

## Current Coupling

The current implementation shows Pantry coupled to:

- Conversation orchestration through the monolithic `/api/pantry-assistant` endpoint
- Authentication middleware for user isolation
- User Settings for dietary restrictions and household size
- Action History for undo support
- Shopping capability through low-stock item consumption
- AI integration for intelligent categorisation and meal suggestion workflows

These are observations of the current implementation and do not define the intended Sage 2.0 architecture.

---

## Boundary Confidence

**High**

The Pantry capability has a clear and well-defined business responsibility.

Discovery analysis consistently identifies Pantry as the authoritative inventory capability and the primary source of household food state. Other capabilities consume Pantry information but do not alter its ownership boundaries.

The current implementation contains coupling to Conversation orchestration, AI integration, and Undo support; however, these concerns do not change Pantry's business ownership.

## Guiding Principle

The Pantry capability owns inventory.

If another capability needs inventory information, it asks Pantry.

If another capability needs to modify inventory, it asks Pantry.

Inventory business rules must never be duplicated outside the Pantry capability.

---
# Shopping

## Purpose

The Shopping capability is responsible for managing a user's shopping list. It is the authoritative source of manually managed shopping items and their purchase status.

The Shopping capability maintains shopping list state and exposes shopping-related business services to the rest of the application. It does not determine what should be purchased, calculate low-stock items, generate recipes, or coordinate AI conversations. Those responsibilities belong to other capabilities or architectural layers.

---

## Owns

The Shopping capability owns:

- Shopping list item lifecycle (create, update, delete)
- Shopping list state
- Shopping item quantities
- Purchase status (checked / unchecked)
- Manual shopping list management
- Shopping item validation
- Shopping list sharing
- Batch shopping operations

---

## Business Services

The Shopping capability provides the following business services to other capabilities:

- Add shopping item
- Update shopping item
- Remove shopping item
- Retrieve shopping list
- Retrieve shopping item by identifier
- Mark item as purchased
- Mark item as not purchased
- Share shopping list
- Validate shopping operations

These services describe business behaviour rather than implementation details. They are independent of HTTP, database technology, AI providers, or user interface.

---

## Uses

The Shopping capability depends upon the following capabilities or architectural services:

- Authentication (user identity)
- Pantry (inventory state and low-stock items)
- User Settings (indirectly through meal planning workflows)
- Conversation layer (voice and conversational orchestration)
- AI capability (when shopping items originate from conversational requests)
- Persistence layer
- Undo capability

Shopping consumes these services but does not own their implementation.

---

## Does Not Own

The Shopping capability does **not** own:

- Pantry inventory
- Inventory quantities
- Low-stock calculation
- Item categorisation
- Meal planning
- Recipe generation
- Missing ingredient calculation
- User authentication
- User sessions
- User preferences
- Voice recognition
- Speech synthesis
- AI prompt construction
- AI provider selection
- HTTP routing
- API endpoints
- Database technology
- Conversation management
- Conversation state

---

## Current Coupling

The current implementation shows Shopping coupled to:

- Pantry capability for low-stock item consumption
- Conversation orchestration through the monolithic `/api/pantry-assistant` endpoint
- Authentication middleware for user isolation
- User Settings through meal suggestion workflows
- Action History for undo support
- AI integration for conversational shopping operations
- Presentation-layer shopping list composition and deduplication

These are observations of the current implementation and do not define the intended Sage 2.0 architecture.

---

## Boundary Confidence

**High**

The Shopping capability has a well-defined business responsibility centred on managing shopping list state.

The discovery analysis shows that the current implementation contains significant coupling to Pantry, Conversation orchestration, AI integration, and presentation-layer composition. However, these concerns support the Shopping capability rather than defining its ownership.

The Shopping capability is the authoritative owner of shopping list data but not of the business decisions that determine what belongs on the shopping list.

---

## Guiding Principle

The Shopping capability owns shopping list state.

If another capability needs to add, update, remove, or retrieve shopping items, it asks the Shopping capability.

Business decisions about **what should be purchased** belong to the originating capability. Shopping simply records and manages the resulting shopping list.

Shopping business rules must never be duplicated outside the Shopping capability.

# Authentication

## Purpose

The Authentication capability is responsible for establishing and maintaining user identity within Sage. It is the authoritative owner of authentication, session management, and access control.

The Authentication capability verifies user credentials, manages authenticated sessions, and provides authenticated identity to the rest of the application. It does not manage user preferences, pantry data, shopping lists, recipes, or conversational behaviour.

---

## Owns

The Authentication capability owns:

- User registration
- User login
- User logout
- Session creation
- Session validation
- Session expiry
- Session termination
- Password verification
- Password hashing
- Authentication tokens
- Access control
- Identity verification

---

## Business Services

The Authentication capability provides the following business services:

- Register user
- Authenticate user
- Terminate session
- Validate session
- Retrieve authenticated identity
- Verify credentials
- Authorise protected operations

These services describe authentication behaviour independently of HTTP, cookies, or database implementation.

---

## Uses

The Authentication capability depends upon:

- Persistence layer
- Cryptographic services
- User capability
- HTTP interface (current implementation)
- Session storage

Authentication consumes these services but does not own their implementation.

---

## Does Not Own

The Authentication capability does **not** own:

- User preferences
- User settings
- Pantry
- Shopping
- Recipes
- Meal planning
- Conversation state
- Voice recognition
- Speech synthesis
- AI providers
- HTTP routing
- Database technology

---

## Current Coupling

The current implementation shows Authentication coupled to:

- HTTP routes
- Express middleware
- Cookie management
- Session persistence
- User settings initialization
- Protected API endpoints

These are observations of the current implementation and do not define the intended Sage 2.0 architecture.

---

## Boundary Confidence

**High**

Authentication has a clearly defined responsibility centred on user identity and access control.

The discovery analysis shows implementation coupling to HTTP transport and middleware, but these concerns do not alter Authentication's ownership boundaries.

---

## Guiding Principle

Authentication owns identity.

If another capability needs to know who the current user is, it asks Authentication.

Authentication never owns business data belonging to another capability.

# Users

## Purpose

The User capability is responsible for managing information about a user beyond authentication. It is the authoritative owner of user profile information, application preferences, and personal settings used throughout Sage.

The User capability maintains user-specific context for other capabilities but does not authenticate users or manage active sessions.

---

## Owns

The User capability owns:

- User profile
- User preferences
- Dietary restrictions
- Household size
- Interaction preferences
- Application settings
- User configuration
- User context

---

## Business Services

The User capability provides the following business services:

- Retrieve user profile
- Update user profile
- Retrieve user settings
- Update user settings
- Retrieve dietary preferences
- Retrieve household information
- Retrieve interaction preferences
- Validate user settings

These services describe business behaviour independently of persistence or transport technology.

---

## Uses

The User capability depends upon:

- Authentication (authenticated identity)
- Persistence layer

The User capability consumes authenticated identity but does not authenticate users itself.

---

## Does Not Own

The User capability does **not** own:

- Authentication
- Sessions
- Passwords
- Pantry inventory
- Shopping lists
- Recipes
- Meal planning
- Conversation management
- Voice recognition
- Speech synthesis
- AI providers
- HTTP routing
- Database technology

---

## Current Coupling

The current implementation shows the User capability coupled to:

- Authentication for user identity
- AI context building
- Meal suggestion workflows
- Pantry operations
- Shopping workflows

These are observations of the current implementation and do not define the intended Sage 2.0 architecture.

---

## Boundary Confidence

**High**

The User capability has a clear responsibility centred on user-specific preferences and application configuration.

The discovery analysis shows these settings are consumed by several capabilities, but ownership remains clearly within the User capability.

---

## Guiding Principle

The User capability owns user context.

If another capability requires user preferences or configuration, it asks the User capability.

Business rules relating to user preferences must never be duplicated outside the User capability.

# Conversation

## Purpose

The Conversation capability is responsible for orchestrating interactions between the user and the rest of the Sage platform.

It interprets user intent, coordinates business capabilities, manages conversational state, and produces coherent responses.

Conversation owns the flow of interactions but does not own the business data managed by other capabilities.

---

## Owns

The Conversation capability owns:

- Conversation orchestration
- Intent routing
- Multi-turn conversation state
- Clarification workflows
- Response coordination
- Context assembly
- Capability orchestration
- Conversation history
- Conversation session state
- AI interaction workflow

---

## Business Services

The Conversation capability provides the following business services:

- Interpret user intent
- Route requests to capabilities
- Coordinate multiple capabilities
- Manage conversational state
- Manage clarification flows
- Assemble conversational context
- Generate user-facing responses
- Coordinate multi-step operations

These services describe orchestration behaviour independently of HTTP, AI providers, or user interface technology.

---

## Uses

The Conversation capability depends upon:

- Authentication
- Users
- Pantry
- Shopping
- AI capability
- Persistence layer

Conversation coordinates these capabilities but does not own them.

---

## Does Not Own

The Conversation capability does **not** own:

- Pantry inventory
- Shopping lists
- User preferences
- Authentication
- Sessions
- Business rules
- Database persistence
- HTTP routing
- AI provider implementation
- Speech recognition
- Speech synthesis

Conversation owns orchestration, not business behaviour.

---

## Current Coupling

The current implementation shows Conversation coupled to:

- Monolithic `/api/pantry-assistant` endpoint
- Pantry business logic
- Shopping business logic
- AI provider integration
- User Settings
- Action History
- Client-side conversation state

These observations describe the current implementation only.

---

## Boundary Confidence

**Medium–High**

Conversation has a clear architectural responsibility, but its implementation is currently distributed across routing, AI integration, and client state.

The discovery work consistently identifies Conversation as the orchestration layer connecting the platform's business capabilities.

---

## Guiding Principle

Conversation coordinates.

Conversation asks capabilities to perform work.

Conversation never performs another capability's business rules itself.

If a business decision belongs to Pantry, Shopping, Authentication, or Users, Conversation delegates that decision rather than implementing it.

## Future Capability Candidates

The current implementation contains recipe-related functionality
(favourite recipes, recipe history and AI meal suggestions).

At present these behaviours do not constitute an independent
business capability and are therefore considered part of
Conversation workflows.

If recipe management expands to include persistent recipe
ownership, search, editing, collections or sharing,
a dedicated Recipes capability should be introduced.