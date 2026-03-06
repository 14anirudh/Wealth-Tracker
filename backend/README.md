# Portfolio Tracker - Backend

RESTful API for portfolio tracking and management.

## Quick Start

```bash
npm install
npm run dev
```

## Environment Variables

Create a `.env` file:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/portfolio-tracker
NODE_ENV=development
```

## API Documentation

### Health Check
```
GET /api/health
```

### Portfolio Routes

#### Get Current Portfolio
```
GET /api/portfolio/current
Response: Portfolio object
```

#### Get Portfolio History
```
GET /api/portfolio/history
Response: Array of portfolio objects
```

#### Create Portfolio
```
POST /api/portfolio
Body: Portfolio data
Response: Created portfolio
```

#### Update Portfolio
```
PUT /api/portfolio/:id
Body: Updated portfolio data
Response: Updated portfolio
```

#### Delete Portfolio
```
DELETE /api/portfolio/:id
Response: Success message
```

### Returns Routes

#### Get Monthly Returns
```
GET /api/returns?months=12
Query Params:
  - months: Number of months (default: 12)
Response: Array of monthly returns
```

#### Get Returns Summary
```
GET /api/returns/summary
Response: Summary object with totals and category breakdown
```

#### Add Monthly Return
```
POST /api/returns
Body: Monthly return data
Response: Created return entry
```

#### Update Monthly Return
```
PUT /api/returns/:id
Body: Updated return data
Response: Updated return entry
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode with auto-reload
npm run dev

# Run in production mode
npm start
```


