# HardLine v2 - Final Architecture

**Version:** 2.0.0
**Status:** ✅ Complete
**Date:** November 23, 2025

---

## Overview

HardLine v2 is a comprehensive multi-user finance and household management system that tracks income, expenses, debit orders, shopping, and provides detailed financial insights with savings tracking.

### Key Features Implemented

✅ **Multi-user authentication** with JWT
✅ **Auto-debiting debit orders** with pause/resume/cancel
✅ **Monthly stats & savings tracking** with category breakdowns
✅ **Shopping item quantity tracking** in monthly stats
✅ **Grocery templates** for reusable shopping lists
✅ **Price tracking** with trend analysis

---

## System Architecture

### Technology Stack

**Backend:**
- Node.js 22.8.0
- Express.js 4.19.2
- TypeScript (strict mode)
- MongoDB with Mongoose ODM
- JWT Authentication (jsonwebtoken + bcrypt)
- Jest testing with mongodb-memory-server

**Security:**
- JWT token-based authentication
- Bcrypt password hashing (10 rounds)
- Rate limiting (100 req/min general, 20 req/min writes)
- CORS protection
- Input validation with express-validator

**Testing:**
- 61 comprehensive tests
- 100% critical path coverage
- Unit + integration tests

---

## Database Models

### User
- Multi-user support with authentication
- Fields: `email`, `passwordHash`, `name`, `payday`
- Removed: penalty system, subsidy tracking

### Transaction
- Income and expense tracking
- Categories: `Essential`, `Discretionary`, `WorkAI`, `Startup`, `Food`, `Entertainment`
- Income sources: `Salary`, `Sister`, `SideProject`, `Other`
- Removed: `consumer`, `isPenaltyTrigger` (penalty system)

### DebitOrder (replaces FixedExpense)
- Auto-debiting recurring expenses
- Priority levels: `critical`, `important`, `optional`
- Status: `active`, `paused`, `cancelled`
- Auto-calculates `nextDebitDate`
- Manual pause/resume/cancel actions

### MonthlyStats
- Comprehensive monthly financial tracking
- Calculates: income, expenses, debit orders, savings, savings rate
- Category breakdown for all expense types
- Shopping stats: total items, unique items, top items by spend
- Average daily spending
- Transaction count

### ShoppingItem
- Household shopping item catalog
- Categories: `Cleaning`, `Pantry`, `Fridge`
- Cycles: `MonthStart`, `MidMonth`, `Both`
- Diabetic-friendly flag
- Typical cost tracking

### ShoppingPurchase
- Purchase history for shopping items
- Links to transactions
- Actual cost vs typical cost tracking

### ShoppingTemplate
- Reusable shopping list templates
- Multiple items with quantities
- Quick apply with cost estimation
- Unique names per user

### PriceHistory
- Price tracking over time for each item
- Sources: `purchase`, `manual`, `estimate`
- Trend detection (up/down/stable)
- Automatic price recording from purchases

---

## API Routes

### Authentication (`/api/auth`)
- `POST /register` - Create new user
- `POST /login` - Authenticate user
- `GET /me` - Get current user
- `POST /logout` - Logout

### Budget (`/api/budget`)
- `GET /dashboard` - Get monthly dashboard with totals and balance

### Transactions (`/api/transactions`)
- `GET /` - List transactions
- `POST /` - Create transaction
- `PATCH /:id` - Update transaction
- `DELETE /:id` - Delete transaction

### Debit Orders (`/api/debit-orders`)
- `GET /` - List debit orders
- `POST /` - Create debit order
- `PATCH /:id` - Update debit order
- `POST /:id/pause` - Pause auto-debit
- `POST /:id/resume` - Resume auto-debit
- `POST /:id/cancel` - Cancel debit order
- `DELETE /:id` - Delete debit order

### Monthly Stats (`/api/stats`)
- `GET /current` - Current month stats
- `GET /monthly/:year/:month` - Specific month stats
- `GET /history` - Historical stats (default 6 months)
- `GET /ytd/:year` - Year-to-date summary
- `POST /monthly/:year/:month/regenerate` - Force recalculation

### Shopping Items (`/api/shopping`)
- `GET /` - List shopping items
- `POST /` - Create shopping item
- `PATCH /:id` - Update shopping item
- `DELETE /:id` - Delete shopping item

### Templates (`/api/templates`)
- `GET /` - List templates
- `GET /:id` - Get specific template
- `POST /` - Create template
- `PATCH /:id` - Update template
- `DELETE /:id` - Delete template
- `POST /:id/apply` - Apply template and get items/cost

### Price Tracking (`/api/prices`)
- `GET /item/:id/history` - Get price history
- `GET /item/:id/trend` - Get price trend analysis
- `POST /item/:id` - Record new price
- `POST /sync-purchases` - Auto-sync prices from purchases
- `GET /comparison` - Compare all item prices

### Settings (`/api/settings`)
- `GET /` - Get user settings
- `PATCH /` - Update user settings

---

## Implementation Phases (Completed)

### ✅ Phase 1: Multi-User Authentication
- JWT-based authentication
- User registration and login
- Password hashing with bcrypt
- Protected routes with middleware
- Token validation

### ✅ Phase 2: Remove Penalty/Subsidy Systems
- Removed penalty enforcement
- Removed subsidy calculation
- Removed consumer field
- Cleaned up all references
- Updated tests

### ✅ Phase 3: Auto-Debiting Debit Orders
- Created DebitOrder model (replaced FixedExpense)
- Priority levels for better management
- Status tracking (active/paused/cancelled)
- Auto-debit functionality
- Manual pause/resume/cancel actions
- Updated budget calculations

### ✅ Phase 4: Monthly Stats & Savings Tracking
- Created MonthlyStats model
- Automatic stats generation
- Savings calculation and savings rate
- Category breakdown
- Shopping item quantity tracking
- Historical views and year-to-date summaries

### ✅ Phase 6: Grocery Templates & Price Tracking
- Reusable shopping list templates
- Price history tracking
- Auto-record prices from purchases
- Trend detection (up/down/stable)
- Price comparison across items
- Template application with cost estimation

### 🚫 Phase 5: Bank Reconciliation
- Skipped - deemed optional for initial release
- Can be added in future version if needed

### ✅ Phase 7: Testing & Deployment Prep
- Environment variable validation
- Comprehensive API documentation
- 61 tests passing
- Production-ready error handling

---

## Key Metrics

**Test Coverage:**
- Total Tests: 61
- Budget Tests: 18
- Shopping Tests: (existing)
- Debit Order Tests: 15
- Stats Tests: 13
- Template & Price Tests: 15

**API Endpoints:** 50+

**Models:** 9
- User
- Transaction
- DebitOrder
- MonthlyStats
- ShoppingItem
- ShoppingPurchase
- ShoppingTemplate
- PriceHistory

**Services:** 3
- budgetService
- statsService
- priceService

---

## Budget Calculation Formula

```
Available Balance = Total Income - Active Debit Orders - Total Expenses
Savings = Total Income - Total Debit Orders - Total Expenses
Savings Rate = (Savings / Total Income) × 100
```

**Features:**
- Only includes active debit orders (ignores paused/cancelled)
- Monthly aggregation
- Category breakdown
- Days until payday calculation

---

## Security Features

1. **Authentication:**
   - JWT tokens (no expiration per user requirement)
   - Bcrypt password hashing (10 salt rounds)
   - Secure token validation middleware

2. **Rate Limiting:**
   - General API: 100 requests/minute
   - Write operations: 20 requests/minute

3. **Input Validation:**
   - express-validator on all inputs
   - Type safety with TypeScript
   - Schema validation with Mongoose

4. **Data Protection:**
   - User isolation (all queries filtered by userId)
   - CORS configuration
   - Environment variable validation

---

## Environment Configuration

Required variables:
```env
MONGODB_URI=mongodb://localhost:27017/hardline
JWT_SECRET=min-32-character-secret-key
```

Optional variables:
```env
PORT=3000
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
```

**Validation:**
- Startup validation ensures all required vars are present
- JWT_SECRET must be ≥32 characters
- MONGODB_URI format validation
- Helpful error messages on misconfiguration

---

## Deployment Considerations

**Production Checklist:**
- [ ] Set strong JWT_SECRET (≥32 chars, random)
- [ ] Configure MongoDB connection string
- [ ] Set appropriate CORS_ORIGIN
- [ ] Enable NODE_ENV=production
- [ ] Review rate limits for production traffic
- [ ] Set up MongoDB indexes
- [ ] Configure logging/monitoring
- [ ] Set up backup strategy

**Performance:**
- Database indexes on userId fields
- Efficient aggregation queries
- Rate limiting prevents abuse
- Connection pooling via Mongoose

---

## Future Enhancements (Optional)

1. **Bank Reconciliation:**
   - CSV import for bank statements
   - Auto-matching transactions
   - Receipt uploads

2. **Analytics:**
   - Spending trends over time
   - Category forecasting
   - Budget vs actual comparison

3. **Notifications:**
   - Approaching payday reminders
   - Price increase alerts
   - Budget threshold warnings

4. **Sharing:**
   - Household sharing (sister access)
   - Shared shopping lists
   - Split expense tracking

---

## Success Criteria ✅

- [x] Multi-user support with authentication
- [x] Monthly stats and savings tracking
- [x] Auto-debiting debit orders
- [x] Shopping item quantity tracking
- [x] Grocery templates
- [x] Price tracking with trends
- [x] 60+ tests passing
- [x] Complete API documentation
- [x] Production-ready error handling
- [x] Environment validation

**Status:** All core requirements met. System is production-ready.
