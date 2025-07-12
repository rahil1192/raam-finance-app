@echo off
setlocal enabledelayedexpansion

echo 🚀 Starting Finance App Deployment...

REM Check if we're in the right directory
if not exist "backend\requirements.txt" (
    echo [ERROR] Please run this script from the root of the finance-app directory
    pause
    exit /b 1
)

if not exist "frontend\package.json" (
    echo [ERROR] Please run this script from the root of the finance-app directory
    pause
    exit /b 1
)

REM Check if Heroku CLI is installed
heroku --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Heroku CLI is not installed. Please install it first:
    echo https://devcenter.heroku.com/articles/heroku-cli
    pause
    exit /b 1
)

REM Check if user is logged into Heroku
heroku auth:whoami >nul 2>&1
if errorlevel 1 (
    echo [WARNING] You are not logged into Heroku. Please login:
    heroku login
)

REM Get app name from user
set /p APP_NAME="Enter your Heroku app name (or press Enter to create a new one): "

if "%APP_NAME%"=="" (
    echo [INFO] Creating new Heroku app...
    for /f "tokens=*" %%i in ('heroku create --json ^| findstr "name"') do (
        set APP_NAME=%%i
        set APP_NAME=!APP_NAME:"name":"=!
        set APP_NAME=!APP_NAME:"=!
        set APP_NAME=!APP_NAME:,=!
    )
    echo [INFO] Created app: !APP_NAME!
) else (
    REM Check if app exists
    heroku apps:info --app "%APP_NAME%" >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] App '%APP_NAME%' does not exist or you don't have access to it
        pause
        exit /b 1
    )
)

echo [INFO] Using Heroku app: %APP_NAME%

REM Check if git repository exists
if not exist ".git" (
    echo [INFO] Initializing git repository...
    git init
    git add .
    git commit -m "Initial commit for deployment"
)

REM Add Heroku remote if not already added
git remote get-url heroku >nul 2>&1
if errorlevel 1 (
    echo [INFO] Adding Heroku remote...
    heroku git:remote -a "%APP_NAME%"
)

REM Set buildpack
echo [INFO] Setting Python buildpack...
heroku buildpacks:set heroku/python --app "%APP_NAME%"

REM Prompt for environment variables
echo [INFO] Setting up environment variables...

set /p PLAID_CLIENT_ID="Enter your Plaid Client ID: "
set /p PLAID_SECRET="Enter your Plaid Secret: "
set /p PLAID_ENV="Enter Plaid Environment (sandbox/development/production) [sandbox]: "

if "%PLAID_ENV%"=="" set PLAID_ENV=sandbox

REM Generate a random secret key (simplified for Windows)
set SECRET_KEY=your-secret-key-here-change-this-in-production

REM Set environment variables
echo [INFO] Setting environment variables on Heroku...
heroku config:set PLAID_CLIENT_ID="%PLAID_CLIENT_ID%" --app "%APP_NAME%"
heroku config:set PLAID_SECRET="%PLAID_SECRET%" --app "%APP_NAME%"
heroku config:set PLAID_ENV="%PLAID_ENV%" --app "%APP_NAME%"
heroku config:set SECRET_KEY="%SECRET_KEY%" --app "%APP_NAME%"
heroku config:set ENVIRONMENT="production" --app "%APP_NAME%"

REM Add PostgreSQL addon for persistent data
echo [INFO] Adding PostgreSQL database...
heroku addons:create heroku-postgresql:mini --app "%APP_NAME%"

REM Deploy to Heroku
echo [INFO] Deploying to Heroku...
git add .
git commit -m "Deploy to Heroku" 2>nul || echo [INFO] No changes to commit
git push heroku main

REM Check if deployment was successful
if errorlevel 0 (
    echo [INFO] Deployment successful!
    echo [INFO] Your backend is now available at: https://%APP_NAME%.herokuapp.com
    
    REM Update frontend configuration
    echo [INFO] Updating frontend configuration...
    
    REM Create backup files
    copy "frontend\config\api.js" "frontend\config\api.js.bak"
    copy "frontend\screens\HomeScreen.js" "frontend\screens\HomeScreen.js.bak"
    
    REM Update the URLs (this is a simplified approach)
    echo [INFO] Please manually update the following files with your Heroku URL:
    echo   - frontend\config\api.js
    echo   - frontend\screens\HomeScreen.js
    echo Replace "https://your-app-name.herokuapp.com" with "https://%APP_NAME%.herokuapp.com"
    
    echo.
    echo [INFO] Next steps:
    echo 1. Build your mobile apps with EAS:
    echo    cd frontend
    echo    eas build --platform android --profile production
    echo    eas build --platform ios --profile production
    echo.
    echo 2. Install the apps on your devices
    echo 3. Test all features to ensure everything works
    
) else (
    echo [ERROR] Deployment failed. Check the logs with: heroku logs --tail --app %APP_NAME%
    pause
    exit /b 1
)

echo [INFO] 🎉 Deployment complete!
pause 