# Finance App Node.js Backend

A production-ready Node.js backend for the Finance App, built with Express.js and Sequelize ORM. This backend provides all the functionality needed to support the React Native frontend, including Plaid integration, transaction management, and financial analytics.

## 🚀 Features

- **Transaction Management**: CRUD operations for financial transactions
- **Plaid Integration**: Secure bank account connection and transaction sync
- **Account Management**: Multi-account support with balance tracking
- **Recurring Transactions**: Automatic detection and management of recurring payments
- **Category Management**: Custom category mappings for better organization
- **Admin Functions**: System administration and data management tools

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Plaid account and API credentials
- PostgreSQL (optional, SQLite is used by default)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   cd finance-app-node-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   # Server Configuration
   PORT=8001
   NODE_ENV=development
   
   # Database Configuration
   DATABASE_URL=sqlite://./finance_tracker.db
   
   # Plaid Configuration
   PLAID_CLIENT_ID=your_plaid_client_id
   PLAID_SECRET=your_plaid_secret
   PLAID_ENV=sandbox
   
   # Security
   JWT_SECRET=your_jwt_secret_key_here
   ```

4. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## 🗄️ Database Setup

The application uses Sequelize ORM and supports both SQLite (default) and PostgreSQL.

### SQLite (Default)
- No additional setup required
- Database file will be created automatically at `./finance_tracker.db`

### PostgreSQL
1. Install PostgreSQL
2. Create a database
3. Update `DATABASE_URL` in `.env`:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/finance_app
   ```

## 🔌 Plaid Integration

1. **Get Plaid Credentials**
   - Sign up at [Plaid Dashboard](https://dashboard.plaid.com/)
   - Create a new app
   - Copy your Client ID and Secret

2. **Configure Environment**
   ```env
   PLAID_CLIENT_ID=your_client_id
   PLAID_SECRET=your_secret
   PLAID_ENV=sandbox  # or development, production
   ```

3. **Test Integration**
   ```bash
   curl -X POST http://localhost:8001/api/plaid/create_link_token
   ```

## 📱 API Endpoints

### Health Check
- `GET /health` - Server health status

### Transactions
- `GET /api/transactions` - Get all transactions
- `POST /api/transactions` - Create new transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction
- `POST /api/transactions/:id/category` - Update transaction category
- `POST /api/transactions/:id/type` - Switch transaction type
- `GET /api/transactions/summary` - Get transaction summary

### Accounts
- `GET /api/accounts` - Get all accounts
- `DELETE /api/accounts/:id` - Delete account
- `PUT /api/accounts/:id` - Update account
- `GET /api/accounts/summary` - Get account summary

### Plaid Integration
- `POST /api/plaid/create_link_token` - Create Plaid link token
- `POST /api/plaid/exchange_public_token` - Exchange public token
- `POST /api/plaid/fetch_transactions` - Fetch transactions from Plaid
- `GET /api/plaid/items` - Get all Plaid items
- `POST /api/plaid/sync_transactions` - Sync transactions
- `GET /api/plaid/last_refresh` - Get last refresh times

### Recurring Transactions
- `GET /api/recurring/rules` - Get recurring rules
- `POST /api/recurring/rules` - Create recurring rule
- `PUT /api/recurring/rules/:id` - Update recurring rule
- `DELETE /api/recurring/rules/:id` - Delete recurring rule
- `GET /api/recurring/patterns` - Get recurring patterns
- `POST /api/recurring/apply_rules` - Apply recurring rules

### Category Mappings
- `GET /api/category_mappings` - Get category mappings
- `POST /api/category_mappings` - Create/update mapping
- `DELETE /api/category_mappings` - Delete mapping
- `POST /api/category_mappings/backfill` - Backfill categories
- `GET /api/category_mappings/stats` - Get category stats

### Admin
- `GET /api/admin/stats` - Get system statistics
- `POST /api/admin/clear_db` - Clear all data
- `DELETE /api/admin/transactions/all` - Delete all transactions
- `POST /api/admin/trigger_update` - Trigger Plaid update

## 🔧 Development

### Project Structure
```
finance-app-node-backend/
├── models/                 # Database models
│   ├── index.js           # Database configuration
│   ├── Transaction.js     # Transaction model
│   ├── Account.js         # Account model
│   ├── PlaidItem.js       # Plaid item model
│   ├── CategoryMapping.js # Category mapping model
│   └── RecurringRule.js   # Recurring rule model
├── routes/                # API routes
│   ├── transactions.js    # Transaction endpoints
│   ├── accounts.js        # Account endpoints
│   ├── plaid.js          # Plaid integration
│   ├── recurring.js      # Recurring transaction endpoints
│   ├── categories.js     # Category mapping endpoints
│   └── admin.js          # Admin endpoints
├── server.js             # Main server file
├── package.json          # Dependencies
├── env.example           # Environment variables example
└── README.md            # This file
```

### Running in Development
```bash
npm run dev
```

### Running Tests
```bash
npm test
```

### Database Migrations
The application uses Sequelize's auto-sync feature. For production, consider using migrations:

```bash
npx sequelize-cli db:migrate
```

## 🚀 Deployment

### Environment Variables for Production
```env
NODE_ENV=production
PORT=8001
DATABASE_URL=postgresql://username:password@host:5432/database
PLAID_CLIENT_ID=your_production_client_id
PLAID_SECRET=your_production_secret
PLAID_ENV=production
JWT_SECRET=your_secure_jwt_secret
FRONTEND_URL=https://your-frontend-domain.com
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 8001
CMD ["npm", "start"]
```

### PM2 Deployment
```bash
npm install -g pm2
pm2 start server.js --name "finance-backend"
pm2 save
pm2 startup
```

## 🔒 Security Features

- **Helmet.js**: Security headers
- **Rate Limiting**: API rate limiting
- **CORS**: Cross-origin resource sharing
- **Input Validation**: Request validation
- **Error Handling**: Comprehensive error handling
- **SQL Injection Protection**: Sequelize ORM protection

## 📊 Monitoring

### Health Check
```bash
curl http://localhost:8001/health
```

### System Stats
```bash
curl http://localhost:8001/api/admin/stats
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For support, please open an issue in the repository or contact the development team.

---

**Note**: This backend is designed to work seamlessly with the React Native frontend. Make sure to update the frontend's API configuration to point to this backend's URL. 