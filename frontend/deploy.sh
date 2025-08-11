#!/bin/bash

# Deployment script for FECS Admin Dashboard to VPS
# This script should be run on your VPS

echo "🚀 Starting FECS Admin Dashboard deployment..."

# Set production environment
export NODE_ENV=production

# Copy production environment file
if [ -f .env.production ]; then
    cp .env.production .env
    echo "✅ Production environment variables loaded"
else
    echo "⚠️ No .env.production file found, using default .env"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production=false

# Build the application
echo "🏗️ Building application..."
npm run build

# Start the application
echo "🎯 Starting application..."
npm run preview -- --host 0.0.0.0 --port 3006

echo "✅ Deployment complete!"
echo "🌐 Application should be accessible at: http://your-server-ip:3006"
