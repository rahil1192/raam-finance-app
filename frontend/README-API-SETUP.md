# API Configuration Guide

This guide explains how to set up different API URLs for different environments in your React Native app.

## Current Setup

The app uses `react-native-dotenv` to manage environment variables. The API configuration is in `frontend/config/api.js`.

## How to Set Up Different URLs

### Option 1: Environment Variables (Recommended)

1. **Create a `.env` file** in the `frontend` directory:
```bash
# API URLs for Finance App
API_URL_DEV=http://192.168.2.19:8001
API_URL_PROD=https://raam-finance-app.onrender.com

# Environment
NODE_ENV=development
```

2. **The app will automatically use the correct URL** based on:
   - `__DEV__` flag (true in development, false in production)
   - Environment variables `API_URL_DEV` and `API_URL_PROD`

### Option 2: Manual Configuration

You can manually change the URLs in `frontend/config/api.js`:

```javascript
// For development (local server)
const determineApiUrl = () => {
  if (__DEV__) {
    return 'http://192.168.2.19:8001'; // Your local server
  }
  return 'https://raam-finance-app.onrender.com'; // Your deployed server
};
```

### Option 3: Multiple Environments

For more complex setups, you can add more environments:

```javascript
const determineApiUrl = () => {
  if (__DEV__) {
    if (API_URL_DEV) return API_URL_DEV;
    return 'http://192.168.2.19:8001';
  }
  
  if (API_URL_PROD) return API_URL_PROD;
  if (API_URL_STAGING) return API_URL_STAGING;
  
  return 'https://raam-finance-app.onrender.com';
};
```

## Why the Previous Setup Didn't Work

1. **Missing `.env` file**: The environment variables were undefined
2. **Fallback to development URL**: When env vars are undefined, it used the dev URL
3. **No environment detection**: The app couldn't determine which URL to use

## Current Behavior

The updated configuration now:

1. **Checks environment variables first** (if `.env` file exists)
2. **Falls back to hardcoded URLs** if env vars are missing
3. **Uses development URL in dev mode** (`__DEV__` is true)
4. **Uses production URL in production mode** (`__DEV__` is false)
5. **Provides detailed logging** to show which URL is being used

## Testing Different URLs

To test with different URLs:

1. **Local development**: Start your local server and the app will use it
2. **Deployed backend**: The app will use the deployed URL by default
3. **Custom URL**: Add it to the `.env` file or modify the config

## Debug Information

The app logs which URL it's using:
```
🔧 Environment variables loaded:
🔧 Using development URL from env: http://192.168.2.19:8001
🔧 Using fallback production URL
```

This helps you understand which URL the app is actually using. 