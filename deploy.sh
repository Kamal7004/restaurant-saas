#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting Deployment..."

# Pull latest changes
echo "Fetching latest code from GitHub..."
git pull origin main

# Build and restart containers
echo "Building and starting Docker containers..."
docker compose up -d --build

# Prune old images to save space
echo "Cleaning up old Docker images..."
docker image prune -f

echo "✅ Deployment Successful!"
echo "Backend: http://localhost:5000"
echo "Frontend: http://localhost:3000"
