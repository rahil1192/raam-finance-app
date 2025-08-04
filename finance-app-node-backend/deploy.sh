#!/bin/bash

# Finance App Backend Deployment Script for Render

echo "🚀 Starting deployment..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found. Make sure environment variables are set in Render."
fi

# Start the application
echo "🚀 Starting the application..."
npm start 