#!/bin/bash

# Arguments
GITHUB_TOKEN=$1
DEPLOY_DIR=$2
TAG=$3

if [ -z "$GITHUB_TOKEN" ] || [ -z "$DEPLOY_DIR" ]; then
  echo "Usage: ./deploy.sh <GITHUB_TOKEN> <DEPLOY_DIR> [RELEASE_TAG]"
  exit 1
fi

# Configuration
REPO="Kamal7004/restaurant-saas"
BACKEND_DIR="$DEPLOY_DIR/backend"
FRONTEND_DIR="$DEPLOY_DIR/frontend"

if [ -z "$TAG" ]; then
  echo "⚠️ No tag provided. Fetching latest release..."
  API_URL="https://api.github.com/repos/$REPO/releases/latest"
else
  echo "🚀 Starting deployment for tag: $TAG"
  API_URL="https://api.github.com/repos/$REPO/releases/tags/$TAG"
fi

# Function to fetch download URL using Node.js for JSON parsing
get_asset_url() {
  local asset_name=$1
  curl -s -H "Authorization: token $GITHUB_TOKEN" "$API_URL" | \
  node -e "
    const fs = require('fs');
    const stdin = fs.readFileSync(0, 'utf-8');
    try {
      const release = JSON.parse(stdin);
      const asset = release.assets.find(a => a.name === '$asset_name');
      if (asset) console.log(asset.url);
    } catch (e) {
      // ignore
    }
  "
}

# Create directories if they don't exist
mkdir -p "$BACKEND_DIR"
mkdir -p "$FRONTEND_DIR"

# Get Download URLs
echo "🔍 Fetching release info..."
SERVER_ASSET_URL=$(get_asset_url "server.zip")
CLIENT_ASSET_URL=$(get_asset_url "client.zip")

if [ -z "$SERVER_ASSET_URL" ] || [ -z "$CLIENT_ASSET_URL" ]; then
  echo "❌ Error: Could not find artifacts 'server.zip' or 'client.zip' in the release."
  echo "DEBUG: API_URL=$API_URL"
  exit 1
fi

# Download artifacts
echo "⬇️ Downloading server and client artifacts..."
echo "  - Server Asset URL: $SERVER_ASSET_URL"
curl -L -H "Authorization: token $GITHUB_TOKEN" -H "Accept: application/octet-stream" -o "$DEPLOY_DIR/server.zip" "$SERVER_ASSET_URL"

echo "  - Client Asset URL: $CLIENT_ASSET_URL"
curl -L -H "Authorization: token $GITHUB_TOKEN" -H "Accept: application/octet-stream" -o "$DEPLOY_DIR/client.zip" "$CLIENT_ASSET_URL"

# Deploy Backend
echo "📦 Deploying Backend..."
if [ -d "$BACKEND_DIR" ] && [ -f "$BACKEND_DIR/package.json" ]; then
  echo "  - Backing up current backend..."
  rm -rf "${BACKEND_DIR}_backup"
  mv "$BACKEND_DIR" "${BACKEND_DIR}_backup"
  mkdir -p "$BACKEND_DIR"
fi

if unzip -o "$DEPLOY_DIR/server.zip" -d "$BACKEND_DIR"; then
  echo "✅ Backend deployed successfully."
  rm "$DEPLOY_DIR/server.zip"
else
  echo "❌ Backend deployment failed! Restoring backup..."
  rm -rf "$BACKEND_DIR"
  if [ -d "${BACKEND_DIR}_backup" ]; then
    mv "${BACKEND_DIR}_backup" "$BACKEND_DIR"
  fi
  exit 1
fi

# Deploy Frontend (Client)
echo "📦 Deploying Frontend..."
if [ -d "$FRONTEND_DIR" ]; then
  echo "  - Backing up current frontend..."
  rm -rf "${FRONTEND_DIR}_backup"
  mv "$FRONTEND_DIR" "${FRONTEND_DIR}_backup"
fi

mkdir -p "$FRONTEND_DIR"
if unzip -o "$DEPLOY_DIR/client.zip" -d "$FRONTEND_DIR"; then
  echo "✅ Frontend deployed successfully."
  if [ -d "${FRONTEND_DIR}_backup" ]; then
    echo "  - Removing backup..."
    rm -rf "${FRONTEND_DIR}_backup"
  fi
  rm "$DEPLOY_DIR/client.zip"
else
  echo "❌ Frontend deployment failed! Restoring backup..."
  rm -rf "$FRONTEND_DIR"
  if [ -d "${FRONTEND_DIR}_backup" ]; then
    mv "${FRONTEND_DIR}_backup" "$FRONTEND_DIR"
  fi
  exit 1
fi

# Install Backend Dependencies
echo "🔧 Installing Backend Dependencies..."
if [ -d "$BACKEND_DIR" ] && [ -f "$BACKEND_DIR/package.json" ]; then
  cd "$BACKEND_DIR"
  if npm install --omit=dev; then
    echo "✅ Dependencies installed."
  else
    echo "❌ Dependency installation failed! Restoring backup..."
    cd "$DEPLOY_DIR"
    rm -rf "$BACKEND_DIR"
    if [ -d "${BACKEND_DIR}_backup" ]; then
      mv "${BACKEND_DIR}_backup" "$BACKEND_DIR"
      echo "✅ Restored previous backend version."
    fi
    exit 1
  fi
  cd "$DEPLOY_DIR"
fi

# Manage .env file
if [ -f "$DEPLOY_DIR/.env" ]; then
    echo "📄 Copying .env file to backend..."
    cp "$DEPLOY_DIR/.env" "$BACKEND_DIR/.env"
else
    echo "⚠️ Warning: .env file not found in $DEPLOY_DIR"
    if [ -f "$BACKEND_DIR/.env.example" ]; then
        echo "Creating .env from .env.example..."
        cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
    fi
fi

# Finalize
if [ -d "${BACKEND_DIR}_backup" ]; then
  echo "  - Removing backend backup..."
  rm -rf "${BACKEND_DIR}_backup"
fi

# Restarting Service
echo "🚀 Restarting restaurant-saas service..."
# Note: Ensure the service name matches your systemd configuration
sudo systemctl restart restaurant-saas.service || echo "⚠️ Could not restart service. Please check your systemd configuration."

echo "✅ Deployment Complete!"
