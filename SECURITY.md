# Security Best Practices & Implementation

This document outlines the security measures implemented in the Sage Kitchen Assistant application.

## Table of Contents
1. [Authentication & Authorization](#authentication--authorization)
2. [Input Validation](#input-validation)
3. [Database Security](#database-security)
4. [API Security](#api-security)
5. [XSS Prevention](#xss-prevention)
6. [Secure Coding Practices](#secure-coding-practices)
7. [Configuration](#configuration)

---

## Authentication & Authorization

### ✅ Implemented Security Measures

1. **Strong Password Requirements**
   - Minimum 8 characters
   - Must contain uppercase, lowercase, and numbers
   - Maximum 128 characters to prevent buffer overflow attacks
   - Validated using Zod schema before submission

2. **Email Validation**
   - RFC-compliant email validation
   - XSS pattern detection and rejection
   - Maximum length limit (255 chars)
   - Case-insensitive, trimmed input

3. **Secure Session Management**
   - emailRedirectTo properly configured for auth flows
   - JWT verification enabled on all protected edge functions
   - Session state properly managed via Supabase

4. **Error Handling**
   - Generic error messages to prevent user enumeration
   - No exposure of whether email exists during login
   - Graceful handling of duplicate registrations

### 🔴 Required Manual Configuration

**CRITICAL**: Enable leaked password protection in Supabase:
1. Go to Lovable Cloud backend (click "View Backend" button)
2. Navigate to Authentication → Policies
3. Enable "Password Protection Against Leaked Passwords"
4. This prevents users from using passwords found in data breaches

---

## Input Validation

### ✅ Implemented Validation Schemas

All user inputs are validated using Zod schemas defined in `src/lib/validation.ts`:

1. **Authentication Input** (`authSchema`)
   - Email: Valid format, XSS pattern detection
   - Password: Strength requirements, length limits

2. **Settings Input** (`settingsSchema`)
   - Household size: Integer between 1-20
   - Dietary restrictions: Whitelisted values only
   - Voice settings: Validated language/accent codes

3. **Voice Input** (`voiceInputSchema`)
   - Length limit: 500 characters
   - XSS pattern detection
   - Script injection prevention

4. **Pantry Items** (`pantryItemSchema`)
   - Name: XSS validation, length limits
   - Category: Whitelisted enum values
   - Quantities: Non-negative, maximum limits

### Security Functions

```typescript
sanitizeHtml(html: string): string
// Encodes HTML entities to prevent XSS

sanitizeText(text: string): string
// Removes dangerous patterns from text content
```

---

## Database Security

### ✅ Row Level Security (RLS)

All tables have RLS enabled with proper policies:

- **pantry_items**: Users can only access their own items
- **user_settings**: Users can only modify their own settings
- **favorite_recipes**: Users can only access their own favorites

### ✅ Secure Queries

- All database operations use Supabase client (protected against SQL injection)
- User IDs properly validated before queries
- Error messages don't expose database structure

### ✅ Data Validation

- Database triggers validate data integrity
- Check constraints on categories and quantities
- Foreign key constraints properly configured

---

## API Security

### ✅ Edge Function Security

1. **JWT Verification**
   - All edge functions require valid JWT tokens
   - Configured in `supabase/config.toml`
   
2. **CORS Configuration**
   - Properly configured CORS headers
   - OPTIONS requests handled correctly

3. **API Key Management**
   - All API keys stored as Supabase secrets
   - Never exposed in client code
   - LOVABLE_API_KEY auto-provisioned
   - OPENAI_API_KEY securely stored

4. **Rate Limiting**
   - Lovable AI rate limits properly handled
   - 429 and 402 errors caught and displayed to users

5. **Input Validation in Edge Functions**
   - Item data validated before database insertion
   - Empty/invalid items rejected
   - User authentication checked

### ✅ Logging Security

- **Production**: Minimal logging, no sensitive data
- **Development**: Detailed logging for debugging
- User input NOT logged to prevent sensitive data exposure
- Only log counts, statuses, and action types

---

## XSS Prevention

### ✅ Implemented Measures

1. **No dangerouslySetInnerHTML**
   - Only used in chart component with controlled data
   - All user/AI content rendered as text

2. **Content Sanitization**
   - AI-generated recipe content treated as untrusted
   - React automatically escapes text content
   - Additional sanitization functions available

3. **Input Filtering**
   - All forms validate for XSS patterns
   - Voice input screened for dangerous content
   - Settings inputs validated against whitelists

---

## Secure Coding Practices

### ✅ Implemented Best Practices

1. **Error Handling**
   - Try-catch blocks on all async operations
   - Generic error messages for security issues
   - Detailed errors only in development mode

2. **Type Safety**
   - TypeScript strict mode enabled
   - Zod schemas for runtime validation
   - Proper typing on all data structures

3. **Secrets Management**
   - All secrets in Supabase secrets manager
   - Environment variables properly configured
   - No hardcoded credentials

4. **Dependency Security**
   - Dependencies kept up to date
   - Only trusted packages installed
   - Regular security audits recommended

---

## Configuration

### Required Settings

#### Supabase Auth Configuration
✅ **Auto-confirm Email Signups**: Enabled (for development)
⚠️ **Leaked Password Protection**: MUST BE ENABLED (see above)

#### Edge Function Configuration
```toml
# supabase/config.toml

[functions.pantry-assistant]
verify_jwt = true

[functions.elevenlabs-tts]
verify_jwt = true
```

#### Environment Variables
```
VITE_SUPABASE_URL=<auto-configured>
VITE_SUPABASE_PUBLISHABLE_KEY=<auto-configured>
```

---

## Security Checklist

Use this checklist when deploying to production:

### Pre-Deployment
- [ ] Enable leaked password protection in Supabase
- [ ] Review all RLS policies
- [ ] Audit all user inputs for validation
- [ ] Test authentication flows
- [ ] Verify all secrets are properly configured
- [ ] Check edge function JWT verification

### Post-Deployment
- [ ] Monitor edge function logs for suspicious activity
- [ ] Review database access patterns
- [ ] Test for XSS vulnerabilities
- [ ] Verify rate limiting works correctly
- [ ] Check error handling doesn't expose sensitive info

### Ongoing
- [ ] Regular dependency updates
- [ ] Security audit of new features
- [ ] Monitor Supabase security advisories
- [ ] Review and update RLS policies as needed

---

## Reporting Security Issues

If you discover a security vulnerability:
1. Do NOT open a public issue
2. Contact the development team privately
3. Provide details of the vulnerability
4. Allow time for a patch before disclosure

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security](https://supabase.com/docs/guides/auth)
- [React Security Best Practices](https://reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml)

---

**Last Updated**: 2025-11-19
**Security Review**: Required for all new features
