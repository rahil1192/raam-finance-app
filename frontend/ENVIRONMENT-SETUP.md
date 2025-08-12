# Environment Setup Guide

This guide explains how to properly set up environment variables for different environments.

## Current Issue

The app is currently using hardcoded URLs instead of environment variables. To fix this, you need to create a `.env` file.

## Step 1: Create Environment File

Create a file named `.env` in the `frontend` directory with the following content:

```bash
# API URLs for Finance App
API_URL_DEV=http://192.168.2.19:8001
API_URL_PROD=https://raam-finance-app.onrender.com

# Environment
NODE_ENV=development
```

## Step 2: How It Works

The API configuration will now:

1. **Check environment variables first** - If `.env` file exists
2. **Use development URL** when `__DEV__` is true and `API_URL_DEV` is set
3. **Use production URL** when `__DEV__` is false and `API_URL_PROD` is set
4. **Fallback to deployed backend** if environment variables are not set

## Step 3: Testing Different Environments

### For Local Development:
```bash
# Start your local backend server
cd finance-app-node-backend
npm start

# The app will use API_URL_DEV (http://192.168.2.19:8001)
```

### For Production/Deployed:
```bash
# The app will use API_URL_PROD (https://raam-finance-app.onrender.com)
# No local server needed
```

## Step 4: Environment Variable Priority

The app checks URLs in this order:

1. **Environment Variables** (if `.env` file exists)
   - `API_URL_DEV` for development
   - `API_URL_PROD` for production

2. **Fallback URLs** (if no `.env` file)
   - Development: `https://raam-finance-app.onrender.com`
   - Production: `https://raam-finance-app.onrender.com`

## Step 5: Debug Information

The app logs which URL it's using:
```
🔧 Environment variables loaded:
🔧 API_URL_DEV: http://192.168.2.19:8001
🔧 API_URL_PROD: https://raam-finance-app.onrender.com
🔧 __DEV__: true
🔧 Using development URL from env: http://192.168.2.19:8001
```

## Step 6: Multiple Environment Support

For more complex setups, you can add more environments:

```bash
# .env file
API_URL_DEV=http://192.168.2.19:8001
API_URL_STAGING=https://staging-backend.onrender.com
API_URL_PROD=https://raam-finance-app.onrender.com
```

Then update `frontend/config/api.js` to handle staging:

```javascript
if (API_URL_STAGING && API_URL_STAGING !== 'undefined') {
  console.log('🔧 Using staging URL from env:', API_URL_STAGING);
  return API_URL_STAGING;
}
```

## Troubleshooting

### If environment variables are undefined:
1. Check that `.env` file exists in `frontend` directory
2. Restart the React Native app
3. Check that `react-native-dotenv` is properly configured in `babel.config.js`

### If wrong URL is being used:
1. Check the console logs to see which URL is selected
2. Verify the `.env` file has correct URLs
3. Make sure the environment variables are being loaded

## Current Behavior

Without `.env` file:
- Uses deployed backend as fallback
- Works but not environment-based

With `.env` file:
- Uses environment variables
- Truly environment-based
- Can switch between local and deployed backends 