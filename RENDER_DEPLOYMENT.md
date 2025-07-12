# Deploy to Render.com - Step by Step Guide

## 🚀 Quick Deployment to Render

### Step 1: Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub (recommended) or email
3. Verify your email

### Step 2: Connect Your GitHub Repository
1. In Render dashboard, click "New +"
2. Select "Web Service"
3. Connect your GitHub account
4. Select your `finance-app` repository

### Step 3: Configure the Web Service
1. **Name:** `raam-finance-backend`
2. **Environment:** `Python 3`
3. **Build Command:** `pip install -r backend/requirements.txt`
4. **Start Command:** `cd backend && gunicorn api_server:api -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT`
5. **Plan:** `Free`

### Step 4: Add Environment Variables
Click "Environment" tab and add:
- `PLAID_CLIENT_ID` = your_plaid_client_id
- `PLAID_SECRET` = your_plaid_secret
- `PLAID_ENV` = sandbox
- `ENVIRONMENT` = production

### Step 5: Create PostgreSQL Database
1. Go back to dashboard
2. Click "New +" → "PostgreSQL"
3. **Name:** `raam-finance-db`
4. **Plan:** `Free`
5. **Database:** `raamfinance`
6. **User:** `raamfinance`

### Step 6: Link Database to Web Service
1. Go to your web service
2. Click "Environment" tab
3. Add environment variable:
   - `DATABASE_URL` = (copy from PostgreSQL service)

### Step 7: Deploy
1. Click "Create Web Service"
2. Wait for build to complete (5-10 minutes)
3. Your app will be available at: `https://raam-finance-backend.onrender.com`

## 🔧 Alternative: Use render.yaml (Recommended)

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Add Render configuration"
git push origin main
```

### Step 2: Deploy via render.yaml
1. Go to [render.com](https://render.com)
2. Click "New +" → "Blueprint"
3. Connect your GitHub repository
4. Render will automatically detect `render.yaml`
5. Add your Plaid credentials when prompted
6. Click "Apply"

## 📱 Update Frontend Configuration

After deployment, update these files with your Render URL:

### 1. `frontend/config/api.js`
```javascript
production: {
  baseURL: 'https://raam-finance-backend.onrender.com',
  timeout: 15000,
}
```

### 2. `frontend/screens/HomeScreen.js`
Replace all instances of the placeholder URL with your actual Render URL.

## 🎯 Render Free Tier Benefits

- ✅ **No sleep mode** (always running)
- ✅ **PostgreSQL included** (no extra cost)
- ✅ **Custom domains** (with SSL)
- ✅ **750 hours/month** (more than enough)
- ✅ **Automatic deploys** from GitHub
- ✅ **No payment info required**

## 🔍 Troubleshooting

### Build Fails
- Check the build logs in Render dashboard
- Ensure all dependencies are in `requirements.txt`
- Verify Python version compatibility

### Database Connection Issues
- Check that `DATABASE_URL` is set correctly
- Ensure PostgreSQL service is running
- Verify database credentials

### App Not Starting
- Check the logs in Render dashboard
- Verify the start command is correct
- Ensure all environment variables are set

## 🎉 Next Steps

1. **Test your backend API:**
   ```bash
   curl https://raam-finance-backend.onrender.com/api/transactions
   ```

2. **Build mobile apps:**
   ```bash
   cd frontend
   eas build --platform android --profile production
   eas build --platform ios --profile production
   ```

3. **Install and test on devices**

## 💰 Cost
- **Render Free Tier:** $0/month
- **PostgreSQL:** Included in free tier
- **Total:** $0/month

Your finance app will be running 24/7 with no sleep mode and a proper PostgreSQL database! 