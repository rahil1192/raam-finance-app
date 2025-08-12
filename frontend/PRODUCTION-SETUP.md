# Production Setup Guide

This guide explains how to set up your app for production builds and different environments.

## Current Issue

When running `expo start` locally, the app is always in development mode (`__DEV__` is true). To test production behavior, you need to build the app.

## Option 1: Build Production APK/IPA (Recommended)

### Step 1: Install EAS CLI
```bash
npm install -g eas-cli
```

### Step 2: Login to Expo
```bash
eas login
```

### Step 3: Configure EAS Build
The `eas.json` file is already configured with different profiles:

- **development**: For local development testing
- **preview**: For internal testing builds
- **production**: For production releases

### Step 4: Build Different Versions

**Important**: All build commands must be run from the `frontend` directory!

#### Development Build (for testing with local server):
```bash
cd frontend
eas build --profile development --platform android
```

#### Preview Build (for testing with deployed backend):
```bash
cd frontend
eas build --profile preview --platform android
```

#### Production Build (for app store):
```bash
cd frontend
eas build --profile production --platform android
```

## Option 2: Environment-Based Configuration

### For Local Development:
Create `.env` file in `frontend` directory:
```bash
# API URLs for Finance App
API_URL_DEV=http://192.168.2.19:8001
API_URL_PROD=https://raam-finance-app.onrender.com

# Environment
NODE_ENV=development
```

### For Production Builds:
The environment variables are set in `eas.json`:
```json
{
  "build": {
    "production": {
      "env": {
        "NODE_ENV": "production",
        "API_URL_DEV": "https://raam-finance-app.onrender.com",
        "API_URL_PROD": "https://raam-finance-app.onrender.com"
      }
    }
  }
}
```

## Option 3: Manual Environment Switching

You can manually switch environments by modifying the API config:

### For Development (local server):
```javascript
// In frontend/config/api.js
const determineApiUrl = () => {
  if (__DEV__) {
    return 'http://192.168.2.19:8001'; // Local server
  }
  return 'https://raam-finance-app.onrender.com'; // Deployed backend
};
```

### For Production (deployed backend):
```javascript
// In frontend/config/api.js
const determineApiUrl = () => {
  return 'https://raam-finance-app.onrender.com'; // Always use deployed backend
};
```

## Environment Detection Logic

The app now detects environments using:

1. **`__DEV__` flag**: True when running `expo start`
2. **`NODE_ENV`**: Set by EAS build profiles
3. **Environment variables**: From `.env` file or EAS build

### Development Mode:
- `__DEV__` = true
- `NODE_ENV` = development
- Uses `API_URL_DEV` if available

### Production Mode:
- `__DEV__` = false (in production builds)
- `NODE_ENV` = production
- Uses `API_URL_PROD` if available

## Testing Different Environments

### Local Development:
```bash
# Start local backend
cd finance-app-node-backend
npm start

# Start Expo (development mode)
cd frontend
expo start
```

### Production Build Testing:
```bash
# Build preview version
eas build --profile preview --platform android

# Install on device and test
```

### Production Release:
```bash
# Build production version
eas build --profile production --platform android

# Submit to app store
eas submit --platform android
```

## Debug Information

The app logs which environment it's using:
```
🔧 Environment variables loaded:
🔧 __DEV__: false
🔧 NODE_ENV: production
🔧 Is production build: true
🔧 Using production URL from env: https://raam-finance-app.onrender.com
```

## Quick Commands

```bash
# Navigate to frontend directory first
cd frontend

# Development build (local server)
eas build --profile development --platform android

# Preview build (deployed backend)
eas build --profile preview --platform android

# Production build (app store)
eas build --profile production --platform android

# Submit to app store
eas submit --platform android
```

## Troubleshooting

### If build fails:
1. Check that you're logged into Expo: `eas login`
2. Verify EAS configuration: `eas build:configure`
3. Check build logs in Expo dashboard

### If wrong environment is detected:
1. Check the console logs for environment detection
2. Verify EAS build profile configuration
3. Ensure environment variables are set correctly 