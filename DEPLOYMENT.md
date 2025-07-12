# Finance App Deployment Guide

This guide will help you deploy your finance app so you and your wife can use it together across Android and iOS devices.

## Prerequisites

1. **GitHub Account** - For code hosting
2. **Heroku Account** - For backend deployment (free tier available)
3. **Expo Account** - For mobile app builds
4. **Plaid Account** - For bank integration (already configured)

## Step 1: Backend Deployment (Heroku)

### 1.1 Prepare Backend for Deployment

1. **Create a new GitHub repository** and push your code:
```bash
cd finance-app
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/finance-app.git
git push -u origin main
```

2. **Create Heroku App**:
```bash
# Install Heroku CLI if you haven't already
# Download from: https://devcenter.heroku.com/articles/heroku-cli

# Login to Heroku
heroku login

# Create a new Heroku app
heroku create your-finance-app-name

# Add Python buildpack
heroku buildpacks:set heroku/python
```

3. **Set Environment Variables**:
```bash
# Set your Plaid credentials
heroku config:set PLAID_CLIENT_ID=your_plaid_client_id
heroku config:set PLAID_SECRET=your_plaid_secret
heroku config:set PLAID_ENV=sandbox

# Set a secret key for security
heroku config:set SECRET_KEY=your_random_secret_key_here

# Set environment
heroku config:set ENVIRONMENT=production
```

4. **Deploy to Heroku**:
```bash
git add .
git commit -m "Prepare for deployment"
git push heroku main
```

5. **Verify Deployment**:
```bash
# Check if the app is running
heroku open

# View logs if there are issues
heroku logs --tail
```

### 1.2 Get Your Production URL

After successful deployment, your app will be available at:
```
https://your-finance-app-name.herokuapp.com
```

## Step 2: Frontend Configuration

### 2.1 Update API Configuration

1. **Update the production URL** in `frontend/config/api.js`:
```javascript
production: {
  baseURL: 'https://your-finance-app-name.herokuapp.com', // Replace with your actual URL
  timeout: 15000,
}
```

2. **Update HomeScreen.js** with your production URL:
```javascript
// Replace 'https://your-app-name.herokuapp.com' with your actual URL
const response = await fetch(`${__DEV__ ? 'http://192.168.2.19:8001' : 'https://your-finance-app-name.herokuapp.com'}/api/transactions`)
```

### 2.2 Build Mobile Apps

1. **Install EAS CLI**:
```bash
npm install -g @expo/eas-cli
```

2. **Login to Expo**:
```bash
eas login
```

3. **Configure EAS Build** (already done in your `eas.json`)

4. **Build for Android**:
```bash
cd frontend
eas build --platform android --profile production
```

5. **Build for iOS**:
```bash
eas build --platform ios --profile production
```

6. **Submit to App Stores** (Optional):
```bash
# For Android (Google Play Store)
eas submit --platform android

# For iOS (App Store)
eas submit --platform ios
```

## Step 3: Alternative - Self-Hosted VPS

If you prefer to host on your own server:

### 3.1 VPS Setup (Ubuntu/DigitalOcean)

1. **Create a VPS** (DigitalOcean, Linode, or AWS EC2)
2. **SSH into your server**:
```bash
ssh root@your-server-ip
```

3. **Install dependencies**:
```bash
# Update system
apt update && apt upgrade -y

# Install Python, Node.js, and other dependencies
apt install python3 python3-pip python3-venv nginx git -y

# Install Node.js for PM2
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install nodejs -y
```

4. **Deploy Backend**:
```bash
# Clone your repository
git clone https://github.com/YOUR_USERNAME/finance-app.git
cd finance-app/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export PLAID_CLIENT_ID=your_plaid_client_id
export PLAID_SECRET=your_plaid_secret
export PLAID_ENV=sandbox
export SECRET_KEY=your_secret_key

# Run the server
python run.py
```

5. **Set up Nginx**:
```bash
# Create nginx configuration
sudo nano /etc/nginx/sites-available/finance-app

# Add this configuration:
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Enable the site
sudo ln -s /etc/nginx/sites-available/finance-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

6. **Set up SSL with Let's Encrypt**:
```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d your-domain.com
```

## Step 4: Testing and Verification

### 4.1 Test Backend API

1. **Test your deployed API**:
```bash
curl https://your-finance-app-name.herokuapp.com/api/transactions
```

2. **Check CORS settings** - Make sure your backend allows requests from your mobile app

### 4.2 Test Mobile Apps

1. **Install the built apps** on your devices
2. **Test all features**:
   - Transaction viewing
   - Account linking
   - Net worth tracking
   - Category management

## Step 5: Data Synchronization

### 5.1 Database Considerations

- **Heroku**: Uses ephemeral filesystem, so SQLite data will be lost on restarts
- **Solution**: Use PostgreSQL addon for persistent data
```bash
heroku addons:create heroku-postgresql:mini
```

### 5.2 Update Database Configuration

Update your `models.py` to use PostgreSQL in production:
```python
import os

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL or "sqlite:///./finance_tracker.db")
```

## Troubleshooting

### Common Issues

1. **CORS Errors**: Make sure your backend allows requests from your mobile app domain
2. **Database Connection**: Ensure your database URL is correctly configured
3. **Plaid Integration**: Verify your Plaid credentials are set correctly
4. **Build Failures**: Check the build logs for missing dependencies

### Useful Commands

```bash
# Check Heroku logs
heroku logs --tail

# Restart Heroku app
heroku restart

# Check environment variables
heroku config

# Scale your app (if needed)
heroku ps:scale web=1
```

## Security Considerations

1. **Environment Variables**: Never commit sensitive data to your repository
2. **HTTPS**: Always use HTTPS in production
3. **API Keys**: Rotate your Plaid API keys regularly
4. **Database**: Use strong passwords and restrict access

## Cost Estimation

- **Heroku**: Free tier available (with limitations)
- **Expo**: Free for basic builds
- **Plaid**: Free tier available
- **Domain**: ~$10-15/year (optional)

## Next Steps

1. **Monitor your app** for performance and errors
2. **Set up automated backups** for your database
3. **Implement user authentication** if needed
4. **Add push notifications** for important financial events
5. **Consider implementing real-time sync** for better user experience

## Support

If you encounter issues:
1. Check the logs: `heroku logs --tail`
2. Verify environment variables: `heroku config`
3. Test API endpoints directly
4. Check Expo build logs for mobile app issues

Your finance app should now be accessible to both you and your wife across Android and iOS devices! 