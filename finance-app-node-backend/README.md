# Finance App Backend

A Node.js backend API for the finance app with Plaid integration.

## Features

- Transaction management
- Account management with Plaid integration
- Recurring transaction rules
- Category management
- Admin statistics

## Keep-Alive System

This server includes a keep-alive system to prevent it from sleeping on Render's free tier:

### Built-in Keep-Alive
- **Internal Cron Job**: Runs every 14 minutes to ping the server
- **Activity Logging**: Logs server activity to keep the process busy
- **Health Endpoint**: `/health` - Basic health check
- **Keep-Alive Endpoint**: `/keep-alive` - Dedicated keep-alive endpoint

### External Keep-Alive Options

#### Option 1: Local Cron Job
```bash
# Add to your crontab (runs every 10 minutes)
*/10 * * * * cd /path/to/finance-app-node-backend && npm run keep-alive
```

#### Option 2: External Services
- **UptimeRobot**: Set up monitoring at `https://raam-finance-app.onrender.com/keep-alive`
- **cron-job.org**: Free service to ping your server
- **GitHub Actions**: Create a workflow to ping your server

#### Option 3: Manual Testing
```bash
# Test the keep-alive endpoint
curl https://raam-finance-app.onrender.com/keep-alive

# Run the keep-alive script locally
npm run keep-alive
```

### Keep-Alive Endpoints
- `GET /health` - Basic health check
- `GET /keep-alive` - Keep-alive endpoint with detailed response

## Installation

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
FRONTEND_URL=https://raam-finance-app.onrender.com
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

The app is deployed on Render at: **https://raam-finance-app.onrender.com**

### Render Deployment

1. Connect your GitHub repository to Render
2. Set the following environment variables in Render:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `PLAID_CLIENT_ID`: Your Plaid client ID
   - `PLAID_SECRET`: Your Plaid secret
   - `PLAID_ENV`: `sandbox` or `production`
   - `NODE_ENV`: `production`
   - `FRONTEND_URL`: `https://raam-finance-app.onrender.com`

3. Build Command: `npm install`
4. Start Command: `npm start`

## API Endpoints

Base URL: `https://raam-finance-app.onrender.com`

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