#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting Deployment..."

# Pull latest changes
echo "Fetching latest code from GitHub..."
git pull origin main

# Pull latest changes
echo "Fetching latest code from GitHub..."
git pull origin main

echo "⚠️ Note: Docker has been removed. Please ensure your Node.js processes are restarted manually."
echo "Backend: npm install && npm run start (in ./backend)"
echo "Frontend: npm install && npm run build (in ./frontend)"

echo "✅ Deployment Scripts Updated!"
echo "Backend: http://localhost:5000"
echo "Frontend: http://localhost:3000"
