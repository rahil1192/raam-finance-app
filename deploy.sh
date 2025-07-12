#!/bin/bash

# Finance App Deployment Script
# This script helps deploy the finance app to Heroku

set -e  # Exit on any error

echo "🚀 Starting Finance App Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "backend/requirements.txt" ] || [ ! -f "frontend/package.json" ]; then
    print_error "Please run this script from the root of the finance-app directory"
    exit 1
fi

# Check if Heroku CLI is installed
if ! command -v heroku &> /dev/null; then
    print_error "Heroku CLI is not installed. Please install it first:"
    echo "https://devcenter.heroku.com/articles/heroku-cli"
    exit 1
fi

# Check if user is logged into Heroku
if ! heroku auth:whoami &> /dev/null; then
    print_warning "You are not logged into Heroku. Please login:"
    heroku login
fi

# Get app name from user
read -p "Enter your Heroku app name (or press Enter to create a new one): " APP_NAME

if [ -z "$APP_NAME" ]; then
    print_status "Creating new Heroku app..."
    APP_NAME=$(heroku create --json | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
    print_status "Created app: $APP_NAME"
else
    # Check if app exists
    if ! heroku apps:info --app "$APP_NAME" &> /dev/null; then
        print_error "App '$APP_NAME' does not exist or you don't have access to it"
        exit 1
    fi
fi

print_status "Using Heroku app: $APP_NAME"

# Check if git repository exists
if [ ! -d ".git" ]; then
    print_status "Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit for deployment"
fi

# Add Heroku remote if not already added
if ! git remote get-url heroku &> /dev/null; then
    print_status "Adding Heroku remote..."
    heroku git:remote -a "$APP_NAME"
fi

# Set buildpack
print_status "Setting Python buildpack..."
heroku buildpacks:set heroku/python --app "$APP_NAME"

# Prompt for environment variables
print_status "Setting up environment variables..."

read -p "Enter your Plaid Client ID: " PLAID_CLIENT_ID
read -s -p "Enter your Plaid Secret: " PLAID_SECRET
echo
read -p "Enter Plaid Environment (sandbox/development/production) [sandbox]: " PLAID_ENV
PLAID_ENV=${PLAID_ENV:-sandbox}

# Generate a random secret key
SECRET_KEY=$(openssl rand -hex 32)

# Set environment variables
print_status "Setting environment variables on Heroku..."
heroku config:set PLAID_CLIENT_ID="$PLAID_CLIENT_ID" --app "$APP_NAME"
heroku config:set PLAID_SECRET="$PLAID_SECRET" --app "$APP_NAME"
heroku config:set PLAID_ENV="$PLAID_ENV" --app "$APP_NAME"
heroku config:set SECRET_KEY="$SECRET_KEY" --app "$APP_NAME"
heroku config:set ENVIRONMENT="production" --app "$APP_NAME"

# Add PostgreSQL addon for persistent data
print_status "Adding PostgreSQL database..."
heroku addons:create heroku-postgresql:mini --app "$APP_NAME"

# Deploy to Heroku
print_status "Deploying to Heroku..."
git add .
git commit -m "Deploy to Heroku" || true
git push heroku main

# Check if deployment was successful
if [ $? -eq 0 ]; then
    print_status "Deployment successful!"
    print_status "Your backend is now available at: https://$APP_NAME.herokuapp.com"
    
    # Update frontend configuration
    print_status "Updating frontend configuration..."
    sed -i.bak "s|https://your-app-name.herokuapp.com|https://$APP_NAME.herokuapp.com|g" frontend/config/api.js
    sed -i.bak "s|https://your-app-name.herokuapp.com|https://$APP_NAME.herokuapp.com|g" frontend/screens/HomeScreen.js
    
    print_status "Frontend configuration updated!"
    print_status "Next steps:"
    echo "1. Build your mobile apps with EAS:"
    echo "   cd frontend"
    echo "   eas build --platform android --profile production"
    echo "   eas build --platform ios --profile production"
    echo ""
    echo "2. Install the apps on your devices"
    echo "3. Test all features to ensure everything works"
    
else
    print_error "Deployment failed. Check the logs with: heroku logs --tail --app $APP_NAME"
    exit 1
fi

print_status "🎉 Deployment complete!" 