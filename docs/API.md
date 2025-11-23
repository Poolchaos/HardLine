# HardLine API Documentation

**Base URL:** `http://localhost:3000/api`

All routes (except auth) require JWT authentication via `Authorization: Bearer <token>` header.

---

## Authentication

### Register User
- **POST** `/auth/register`
- **Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "SecurePassword123",
    "name": "John Doe",
    "payday": 25
  }
  ```
- **Response:** `{ token, user }`

### Login
- **POST** `/auth/login`
- **Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "SecurePassword123"
  }
  ```
- **Response:** `{ token, user }`

### Get Current User
- **GET** `/auth/me`
- **Response:** `{ user }`

### Logout
- **POST** `/auth/logout`
- **Response:** `{ message }`

---

## Budget & Dashboard

### Get Dashboard
- **GET** `/budget/dashboard?month=YYYY-MM`
- **Query:** `month` (optional, defaults to current month)
- **Response:**
  ```json
  {
    "totalIncome": 20000,
    "totalSpent": 5000,
    "fixedExpenses": 8500,
    "availableBalance": 6500,
    "daysUntilPayday": 10
  }
  ```

---

## Transactions

### Get All Transactions
- **GET** `/transactions?month=YYYY-MM`
- **Query:** `month` (optional)
- **Response:** Array of transactions

### Create Transaction
- **POST** `/transactions`
- **Body (Income):**
  ```json
  {
    "type": "income",
    "amount": 20000,
    "description": "Salary",
    "incomeSource": "Salary",
    "date": "2025-11-23"
  }
  ```
- **Body (Expense):**
  ```json
  {
    "type": "expense",
    "amount": 500,
    "description": "Groceries",
    "category": "Food",
    "date": "2025-11-23"
  }
  ```

### Update Transaction
- **PATCH** `/transactions/:id`
- **Body:** Same as create (partial updates allowed)

### Delete Transaction
- **DELETE** `/transactions/:id`

**Categories:** `Essential`, `Discretionary`, `WorkAI`, `Startup`, `Food`, `Entertainment`  
**Income Sources:** `Salary`, `Sister`, `SideProject`, `Other`

---

## Debit Orders

### Get All Debit Orders
- **GET** `/debit-orders`
- **Response:** Array of debit orders

### Create Debit Order
- **POST** `/debit-orders`
- **Body:**
  ```json
  {
    "name": "Rent",
    "amount": 8500,
    "debitDate": 1,
    "priority": "critical",
    "description": "Monthly rent"
  }
  ```

**Priorities:** `critical`, `important`, `optional`  
**Statuses:** `active`, `paused`, `cancelled`

### Update Debit Order
- **PATCH** `/debit-orders/:id`

### Pause Debit Order
- **POST** `/debit-orders/:id/pause`
- Sets `status: 'paused'` and `autoDebit: false`

### Resume Debit Order
- **POST** `/debit-orders/:id/resume`
- Sets `status: 'active'` and `autoDebit: true`

### Cancel Debit Order
- **POST** `/debit-orders/:id/cancel`
- Sets `status: 'cancelled'` and `autoDebit: false`

### Delete Debit Order
- **DELETE** `/debit-orders/:id`

---

## Monthly Stats

### Get Current Month Stats
- **GET** `/stats/current`
- **Response:**
  ```json
  {
    "year": 2025,
    "month": 10,
    "totalIncome": 20000,
    "totalExpenses": 5000,
    "totalDebitOrders": 8500,
    "savings": 6500,
    "savingsRate": 32.5,
    "categoryBreakdown": {
      "Food": 2000,
      "Entertainment": 500,
      "Essential": 1500,
      ...
    },
    "transactionCount": 25,
    "avgDailySpending": 166.67,
    "shoppingStats": {
      "totalItems": 15,
      "totalSpent": 2500,
      "uniqueItems": 8,
      "topItems": [...]
    }
  }
  ```

### Get Specific Month Stats
- **GET** `/stats/monthly/:year/:month`
- **Params:** `year` (2020-2100), `month` (0-11)

### Get Stats History
- **GET** `/stats/history?months=6`
- **Query:** `months` (1-24, default: 6)
- **Response:** Array of monthly stats (oldest to newest)

### Get Year-to-Date Summary
- **GET** `/stats/ytd/:year`
- **Response:**
  ```json
  {
    "year": 2025,
    "monthsCovered": 11,
    "totalIncome": 220000,
    "totalExpenses": 55000,
    "totalDebitOrders": 93500,
    "totalSavings": 71500,
    "avgSavingsRate": 32.5,
    "categoryTotals": {...},
    "monthlyStats": [...]
  }
  ```

### Regenerate Month Stats
- **POST** `/stats/monthly/:year/:month/regenerate`
- Forces recalculation of stats for specified month

---

## Shopping Items

### Get All Shopping Items
- **GET** `/shopping`
- **Response:** Array of shopping items

### Create Shopping Item
- **POST** `/shopping`
- **Body:**
  ```json
  {
    "name": "Milk",
    "category": "Fridge",
    "cycle": "Both",
    "typicalCost": 50,
    "isDiabeticFriendly": false
  }
  ```

**Categories:** `Cleaning`, `Pantry`, `Fridge`  
**Cycles:** `MonthStart`, `MidMonth`, `Both`

### Update Shopping Item
- **PATCH** `/shopping/:id`

### Delete Shopping Item
- **DELETE** `/shopping/:id`

---

## Shopping Templates

### Get All Templates
- **GET** `/templates`
- **Response:** Array of templates

### Get Specific Template
- **GET** `/templates/:id`

### Create Template
- **POST** `/templates`
- **Body:**
  ```json
  {
    "name": "Weekly Essentials",
    "description": "Basic weekly shopping",
    "items": [
      { "shoppingItemId": "...", "quantity": 2 },
      { "shoppingItemId": "...", "quantity": 1 }
    ]
  }
  ```

### Update Template
- **PATCH** `/templates/:id`

### Delete Template
- **DELETE** `/templates/:id`

### Apply Template
- **POST** `/templates/:id/apply`
- **Response:**
  ```json
  {
    "template": { "name": "...", "description": "..." },
    "items": [...],
    "totalItems": 5,
    "estimatedCost": 250
  }
  ```

---

## Price Tracking

### Get Price History for Item
- **GET** `/prices/item/:itemId/history?limit=10`
- **Query:** `limit` (1-50, default: 10)
- **Response:** Array of price records (newest first)

### Get Price Trend for Item
- **GET** `/prices/item/:itemId/trend`
- **Response:**
  ```json
  {
    "trend": "up",
    "currentPrice": 55,
    "previousPrice": 50,
    "changePercent": 10,
    "avgPrice": 52.5
  }
  ```

**Trends:** `up` (>5% increase), `down` (<-5% decrease), `stable`, `insufficient_data`

### Record Price for Item
- **POST** `/prices/item/:itemId`
- **Body:**
  ```json
  {
    "price": 52.5,
    "source": "manual",
    "recordedDate": "2025-11-23"
  }
  ```

**Sources:** `purchase`, `manual`, `estimate`

### Sync Prices from Purchases
- **POST** `/prices/sync-purchases`
- **Body (optional):**
  ```json
  {
    "startDate": "2025-10-01",
    "endDate": "2025-11-23"
  }
  ```
- **Response:** `{ message, recordedCount }`

### Get Price Comparison
- **GET** `/prices/comparison`
- **Response:**
  ```json
  [
    {
      "itemId": "...",
      "itemName": "Milk",
      "currentPrice": 55,
      "typicalCost": 50,
      "trend": "up",
      "changePercent": 10
    },
    ...
  ]
  ```

---

## User Settings

### Get User Settings
- **GET** `/settings`

### Update User Settings
- **PATCH** `/settings`
- **Body:**
  ```json
  {
    "name": "John Doe",
    "payday": 25
  }
  ```

---

## Rate Limits

- **General API:** 100 requests/minute
- **Write Operations:** 20 requests/minute
- **Authentication:** Default rate limiting

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

**Common Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `404` - Not Found
- `409` - Conflict (duplicate entry)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

---

## Development

**Environment Variables (.env):**
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/hardline
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
```

**Start Server:**
```bash
npm run dev
```

**Run Tests:**
```bash
npm test
```

**All Tests:** 61 passing
