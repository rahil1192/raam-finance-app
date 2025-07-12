# Quick Start: Deploy Your Finance App

Get your finance app running in the cloud so you and your wife can use it together!

## 🚀 Quick Deployment (Recommended)

### Step 1: Prepare Your Environment

1. **Install Heroku CLI**:
   - Download from: https://devcenter.heroku.com/articles/heroku-cli
   - Or install via: `winget install --id=Heroku.HerokuCLI`

2. **Install EAS CLI** (for mobile app builds):
   ```bash
   npm install -g @expo/eas-cli
   ```

3. **Login to services**:
   ```bash
   heroku login
   eas login
   ```

### Step 2: Deploy Backend

**Option A: Use the automated script (Windows)**
```bash
deploy.bat
```

**Option B: Manual deployment**
```bash
# Create Heroku app
heroku create your-finance-app-name

# Set environment variables
heroku config:set PLAID_CLIENT_ID=your_plaid_client_id
heroku config:set PLAID_SECRET=your_plaid_secret
heroku config:set PLAID_ENV=sandbox
heroku config:set SECRET_KEY=your_random_secret_key

# Add PostgreSQL database
heroku addons:create heroku-postgresql:mini

# Deploy
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

### Step 3: Update Frontend Configuration

After deployment, update these files with your Heroku URL:

1. **`frontend/config/api.js`**:
   ```javascript
   production: {
     baseURL: 'https://your-finance-app-name.herokuapp.com',
     timeout: 15000,
   }
   ```

2. **`frontend/screens/HomeScreen.js`**:
   Replace all instances of `https://your-app-name.herokuapp.com` with your actual URL.

### Step 4: Build Mobile Apps

```bash
cd frontend

# Build for Android
eas build --platform android --profile production

# Build for iOS
eas build --platform ios --profile production
```

### Step 5: Install and Test

1. **Download the built apps** from the EAS build links
2. **Install on your devices**:
   - Android: Download and install the APK
   - iOS: Install via TestFlight or direct download
3. **Test all features** to ensure everything works

## 🔧 Troubleshooting

### Common Issues

**Backend deployment fails**:
```bash
heroku logs --tail
```

**Mobile app can't connect to backend**:
- Check that your Heroku URL is correct in the frontend config
- Verify the backend is running: `heroku ps`

**Plaid integration issues**:
- Ensure your Plaid credentials are correct
- Check that you're using the right environment (sandbox/development/production)

### Useful Commands

```bash
# Check Heroku app status
heroku ps

# View logs
heroku logs --tail

# Restart app
heroku restart

# Check environment variables
heroku config

# Open app in browser
heroku open
```

## 📱 App Store Deployment (Optional)

### Google Play Store (Android)
```bash
cd frontend
eas submit --platform android
```

### App Store (iOS)
```bash
cd frontend
eas submit --platform ios
```

## 💰 Cost Estimation

- **Heroku**: Free tier available (with limitations)
- **Expo**: Free for basic builds
- **Plaid**: Free tier available
- **Total**: $0-20/month depending on usage

## 🔒 Security Notes

1. **Never commit sensitive data** to your repository
2. **Use environment variables** for all secrets
3. **Rotate your Plaid API keys** regularly
4. **Enable HTTPS** (automatic with Heroku)

## 🎉 You're Done!

Your finance app is now deployed and accessible to both you and your wife across Android and iOS devices. The data will be synchronized through your cloud backend.

## Need Help?

1. Check the logs: `heroku logs --tail`
2. Verify your configuration
3. Test API endpoints directly
4. Check Expo build logs for mobile app issues

Happy budgeting! 💰 