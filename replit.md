# Sage - AI-Powered Pantry Assistant

## Overview
Sage is a voice-enabled pantry management application with AI meal suggestions. Migrated from Lovable/Supabase to Replit fullstack architecture with Express backend and PostgreSQL database.

## Tech Stack
- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Cookie-based sessions
- **AI Integration**: Lovable AI Gateway (Gemini 2.5 Flash) and OpenAI TTS

## Project Structure
```
/server
  - index.ts: Express server setup
  - routes.ts: API endpoints
  - auth.ts: Authentication middleware
  - db.ts: Database connection
  - vite.ts: Vite dev server integration

/client
  - src/: Frontend React application
  - src/components/: UI components
  - src/pages/: Page components
  - src/contexts/: React contexts (UserContext)
  - src/lib/: Utilities (API client)

/shared
  - schema.ts: Shared database schema and types

/db
  - migrations/: SQL migration files
```

## Features
1. **Voice Control**: Add/update pantry items using voice commands
2. **Smart Categorization**: Automatic categorization of items (fridge, freezer, cupboard, pantry)
3. **AI Meal Suggestions**: Personalized meal ideas based on available ingredients
4. **Low Stock Alerts**: Track items running low with customizable thresholds
5. **Shopping Lists**: Auto-generate shopping lists from meal suggestions
6. **Dietary Preferences**: Support for vegetarian, vegan, gluten-free, etc.

## API Endpoints

### Authentication
- POST `/api/auth/signup` - Register new user
- POST `/api/auth/signin` - Login existing user
- POST `/api/auth/signout` - Logout user
- GET `/api/auth/user` - Get current user (requires auth)

### Pantry Items
- GET `/api/pantry-items` - Get all pantry items
- POST `/api/pantry-items` - Add new item
- PATCH `/api/pantry-items/:id` - Update item
- DELETE `/api/pantry-items/:id` - Delete item

### User Settings
- GET `/api/user-settings` - Get user settings
- POST `/api/user-settings` - Update user settings

### Favorite Recipes
- GET `/api/favorite-recipes` - Get favorite recipes
- POST `/api/favorite-recipes` - Add favorite recipe
- DELETE `/api/favorite-recipes/:id` - Delete favorite recipe

### AI Assistant
- POST `/api/pantry-assistant` - Process voice input and get AI response
- POST `/api/openai-tts` - Convert text to speech

## Environment Variables Required
The following API keys are needed for full functionality:

- `LOVABLE_API_KEY` - For AI assistant (Gemini 2.5 Flash via Lovable gateway)
- `OPENAI_API_KEY` - For text-to-speech functionality
- `DATABASE_URL` - PostgreSQL connection string (auto-configured by Replit)

## Security Features
- Bcrypt password hashing (bcryptjs for Replit compatibility)
- Cookie-based session management
- Session revocation on logout
- Input validation with Zod schemas
- Password requirements: min 8 chars, uppercase, lowercase, number
- Protected API endpoints with requireAuth middleware

## Database Schema

### pantry_items
- User's food inventory with categories and quantities
- Low stock tracking with customizable thresholds

### user_settings
- Dietary restrictions, household size
- Voice language and accent preferences

### favorite_recipes
- User's saved meal suggestions

### users
- Email and password authentication

### sessions
- Active user sessions

## Recent Changes (November 26, 2025)
- ✅ Fixed deployment health check timeout with lazy database initialization
- ✅ Server now starts listening immediately before loading routes/database
- ✅ Added /health endpoint for deployment health checks
- ✅ Database connects lazily on first API request (not on module import)
- ✅ Deployment target: Autoscale for stateless web application
- ✅ Updated favicon to sage leaf icon
- ✅ Redesigned logo with integrated sage leaf and gradient colors
- ✅ Added sticky header with "Get Started" button on landing page
- ✅ Created floating voice button accessible from any tab
- ✅ Added empty state guidance for new users with sample commands
- ✅ Added quick manual add dialog for pantry items
- ✅ Added dark mode toggle with localStorage persistence

## Recent Changes (November 25, 2025)
- ✅ Migrated from Supabase to PostgreSQL with Drizzle ORM
- ✅ Replaced Supabase Auth with cookie-based authentication
- ✅ Converted Edge Functions to Express API routes
- ✅ Updated all frontend components to use new API client
- ✅ Fixed security issues: session revocation, PATCH validation, password policy
- ✅ Replaced bcrypt with bcryptjs for Replit compatibility
- ✅ Server running successfully on port 5000
- ✅ Implemented smart item categorization with keyword priority and ambiguity detection
- ✅ Added duplicate prevention for pantry items
- ✅ Classification validates/overrides AI-provided categories
- ✅ Added expiration date tracking with visual alerts
- ✅ Implemented batch voice commands ("add milk, eggs, and butter")
- ✅ Added undo functionality for pantry operations
- ✅ Built recipe history feature with ratings and notes
- ✅ Added "Suggest Meals" button for click-based meal suggestions (alternative to voice)
- ✅ Added "Cook This" button to save selected recipes to history tab

## Deployment Configuration
- **Target**: Autoscale (stateless web application)
- **Build**: `bun run build` (compiles TypeScript to dist/)
- **Run**: `bun run start` (NODE_ENV=production node dist/server/index.js)
- **Port**: 5000 → 80 (external)
- **Health Check**: Both `/` and `/health` respond immediately before routes load
- **Static Files**: Served synchronously at startup (before server.listen)
- **Database**: Connects lazily on first API request

## Next Steps
1. Deploy the application (click Publish button)
2. Request API keys from user if needed (LOVABLE_API_KEY, OPENAI_API_KEY)
3. Test voice assistant functionality
4. Test text-to-speech features

## Development
```bash
# Start development server
bun run dev

# Run database migrations
bun run db:push

# View database in Drizzle Studio
bun run db:studio
```

## Notes
- The voice assistant uses the Lovable AI Gateway (Gemini 2.5 Flash model)
- Text-to-speech uses OpenAI's TTS API
- Browser may cache old code - do a hard refresh (Ctrl+Shift+R) if issues occur
- All API endpoints require authentication except signup/signin
