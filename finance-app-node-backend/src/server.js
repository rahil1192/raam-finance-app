const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const cron = require('node-cron');
const fetch = require('node-fetch'); // Add fetch for keep-alive functionality
require('dotenv').config();

// Debug logging for environment variables
console.log('Environment variables check:');
console.log('PLAID_CLIENT_ID:', process.env.PLAID_CLIENT_ID ? 'SET' : 'NOT SET');
console.log('PLAID_SECRET:', process.env.PLAID_SECRET ? 'SET' : 'NOT SET');
console.log('PLAID_ENV:', process.env.PLAID_ENV);
console.log('NODE_ENV:', process.env.NODE_ENV);

// Import routes
const transactionRoutes = require('./routes/transactions');
const accountRoutes = require('./routes/accounts');
const plaidRoutes = require('./routes/plaid');
const recurringRoutes = require('./routes/recurring');
const categoryRoutes = require('./routes/categories');
const adminRoutes = require('./routes/admin');

// Import database initialization
const { initDatabase } = require('./models');

const app = express();
const PORT = process.env.PORT || 8001;

// Trust proxy configuration for Render deployment
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Trust proxy for accurate IP detection
  trustProxy: true,
});
app.use('/api/', limiter);

// Compression middleware
app.use(compression());

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:19006',
    'exp://localhost:19000',
    'https://raam-finance-app.onrender.com',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'PLAID-CLIENT-ID', 'PLAID-SECRET']
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Keep-alive function to prevent server from sleeping
const keepAlive = async () => {
  try {
    const response = await fetch(`https://raam-finance-app.onrender.com/health`);
    console.log(`🔄 Keep-alive ping: ${response.status} - ${new Date().toISOString()}`);
  } catch (error) {
    console.error('❌ Keep-alive ping failed:', error.message);
  }
};

// Alternative keep-alive: Log activity to keep the process busy
const logActivity = () => {
  console.log(`💓 Server heartbeat: ${new Date().toISOString()} - Server is active`);
};

// Keep-alive endpoint that can be called externally
app.get('/keep-alive', (req, res) => {
  console.log(`🔗 Keep-alive endpoint called: ${new Date().toISOString()}`);
  res.json({
    status: 'ALIVE',
    timestamp: new Date().toISOString(),
    message: 'Server is awake and running'
  });
});

// Schedule keep-alive ping every 14 minutes (to stay under Render's 15-minute limit)
// This ensures the server stays awake on Render's free tier
cron.schedule('*/14 * * * *', () => {
  console.log('⏰ Executing keep-alive ping...');
  keepAlive();
  logActivity();
}, {
  scheduled: true,
  timezone: "UTC"
});

// Also ping immediately when server starts
setTimeout(() => {
  console.log('🚀 Initial keep-alive ping...');
  keepAlive();
  logActivity();
}, 5000); // Wait 5 seconds after server starts

// API routes
app.use('/api/transactions', transactionRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/plaid', plaidRoutes);
app.use('/api/recurring', recurringRoutes);
app.use('/api/category_mappings', categoryRoutes);
app.use('/api/admin', adminRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: err.message
    });
  }
  
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Database Validation Error',
      message: err.message
    });
  }
  
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: 'The requested resource was not found'
  });
});

// Start server function
async function startServer() {
  try {
    // Initialize database
    const dbInitialized = await initDatabase();
    if (!dbInitialized) {
      console.error('❌ Failed to initialize database. Exiting...');
      process.exit(1);
    }
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`🌐 Server accessible at: http://0.0.0.0:${PORT}/health`);
        console.log('\n📋 Available endpoints:');
        console.log('  GET  /health - Health check');
        console.log('  GET  /api/transactions - Get all transactions');
        console.log('  POST /api/transactions - Create transaction');
        console.log('  PUT  /api/transactions/:id - Update transaction');
        console.log('  DELETE /api/transactions/:id - Delete transaction');
        console.log('  GET  /api/accounts - Get all accounts');
        console.log('  POST /api/plaid/create_link_token - Create Plaid link token');
        console.log('  POST /api/plaid/exchange_public_token - Exchange public token');
        console.log('  POST /api/plaid/fetch_transactions - Fetch transactions from Plaid');
        console.log('  GET  /api/recurring/rules - Get recurring rules');
        console.log('  GET  /api/category_mappings - Get category mappings');
        console.log('  GET  /api/admin/stats - Get system statistics');
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start the server
startServer();

module.exports = app; 