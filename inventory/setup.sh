#!/bin/bash
# Quick Start Script for Inventory System

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║        Inventory System - Quick Start Setup               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

cd server

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if MongoDB is running
echo "🔍 Checking MongoDB connection..."
# This is a basic check, you may need to adjust based on your setup

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "⚙️  Setting up environment..."
if [ ! -f .env ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo "✅ Created .env file. Please update with your MongoDB URI."
else
    echo "✅ .env file already exists."
fi

echo ""
echo "👤 Creating admin user..."
node setup.js

echo ""
echo "📊 Loading sample data..."
node loadSampleData.js

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    Setup Complete!                        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "🚀 To start the server, run:"
echo "   npm start          (Production)"
echo "   npm run dev        (Development with auto-reload)"
echo ""
echo "📍 Access the system at:"
echo "   http://localhost:5000/inventory"
echo ""
echo "Features:"
echo "  ✅ Admin Login: Username/Password authentication"
echo "  ✅ Client Scanner: QR code scanning for item borrowing"
echo "  ✅ Live Updates: Socket.IO real-time data sync"
echo "  ✅ Notifications: Admin notifications for returns"
echo "  ✅ Reports: Generate PDF/Excel/DOCX reports"
echo ""
