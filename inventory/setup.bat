@echo off
chcp 65001 >nul
cls

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║        Inventory System - Quick Start Setup               ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

cd server

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

echo 🔍 Checking Node.js installation...
node --version

echo.
echo 📦 Installing dependencies...
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo ⚙️  Setting up environment...
if not exist .env (
    echo Creating .env file from .env.example...
    copy .env.example .env >nul
    echo ✅ Created .env file. Please update with your MongoDB URI.
) else (
    echo ✅ .env file already exists.
)

echo.
echo 👤 Creating admin user...
echo.
call node setup.js

echo.
echo 📊 Loading sample data...
call node loadSampleData.js

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                    Setup Complete!                        ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo 🚀 To start the server, run:
echo.
echo    npm start          (Production)
echo    npm run dev        (Development with auto-reload)
echo.
echo 📍 Access the system at:
echo.
echo    http://localhost:5000/inventory
echo.
echo Features:
echo   ✅ Admin Login: Username/Password authentication
echo   ✅ Client Scanner: QR code scanning for item borrowing
echo   ✅ Live Updates: Socket.IO real-time data sync
echo   ✅ Notifications: Admin notifications for returns
echo   ✅ Reports: Generate PDF/Excel/DOCX reports
echo.
pause
