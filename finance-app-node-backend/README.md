# Finance App Backend

A Node.js/Express backend API for the finance app with Plaid integration.

## Features

- Transaction management
- Account management
- Plaid integration for bank connections
- Recurring transaction rules
- Category mappings
- PostgreSQL database support

## Environment Variables

Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL=your_postgresql_connection_string

# Plaid Configuration
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_secret
PLAID_ENV=sandbox

# Server Configuration
PORT=8001
NODE_ENV=production
FRONTEND_URL=https://your-frontend-url.com
```

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables in `.env` file

3. Start the development server:
   ```bash
   npm run dev
   ```

## Production Deployment

The app is configured to run on Render. The main entry point is `src/server.js`.

### Render Deployment

1. Connect your GitHub repository to Render
2. Set the following environment variables in Render:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `PLAID_CLIENT_ID`: Your Plaid client ID
   - `PLAID_SECRET`: Your Plaid secret
   - `PLAID_ENV`: `sandbox` or `production`
   - `NODE_ENV`: `production`
   - `FRONTEND_URL`: Your frontend URL

3. Build Command: `npm install`
4. Start Command: `npm start`

## API Endpoints

- `GET /health` - Health check
- `GET /api/transactions` - Get all transactions
- `POST /api/transactions` - Create transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction
- `GET /api/accounts` - Get all accounts
- `POST /api/plaid/create_link_token` - Create Plaid link token
- `POST /api/plaid/exchange_public_token` - Exchange public token
- `POST /api/plaid/fetch_transactions` - Fetch transactions from Plaid

## Database

The app uses PostgreSQL in production and SQLite for local development. The database connection is configured in `src/models/index.js`. 