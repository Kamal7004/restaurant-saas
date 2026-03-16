# The Golden Fork — Restaurant SaaS

A modern, QR-code based restaurant ordering platform built with Next.js, Express, and Socket.io.

## 🚀 Features

- **Digital Menu**: Interactive and dynamic menu display.
- **QR-Code Ordering**: Scan-to-order functionality for seamless customer experience.
- **Admin Dashboard**: Comprehensive management of restaurants, menus, and tables.
- **Live Kitchen View**: Real-time order updates via Socket.io.
- **Secure Auth**: JWT-based authentication for admins and users.

## 🛠️ Architecture

### [Backend](./backend)
- **Framework**: Express.js
- **Database**: SQLite (via better-sqlite3)
- **Real-time**: Socket.io
- **Security**: Helmet, Rate Limiting, CORS configuration.
- **Optimization**: Gzip compression, Morgan logging.

### [Frontend](./frontend)
- **Framework**: Next.js 16 (App Router)
- **UI**: Tailwind CSS
- **State**: React Hooks & Context
- **Real-time**: Socket.io-client

## 📦 Getting Started

### Prerequisites
- Node.js (v18+)
- npm or yarn

### Installation

1. **Clone the repo**:
   ```bash
   git clone https://github.com/Kamal7004/restaurant-saas.git
   cd restaurant-saas
   ```

2. **Setup Backend**:
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your credentials
   npm run start
   ```

3. **Setup Frontend**:
   ```bash
   cd ../frontend
   npm install
   cp .env.example .env.local
   # Edit .env.local with your API URLs
   npm run dev
   ```

## 📄 License
MIT License
