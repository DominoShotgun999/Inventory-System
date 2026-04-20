# Inventory System - Setup Guide

## Prerequisites

Before setting up the inventory system, ensure you have the following installed:

### Node.js
1. Download and install Node.js from [nodejs.org](https://nodejs.org/)
2. Choose the LTS (Long Term Support) version
3. During installation, ensure npm is included
4. Verify installation by opening PowerShell and running:
   ```powershell
   node --version
   npm --version
   ```

### MongoDB
The server needs a MongoDB database, but it doesn’t have to be installed locally. Three options are supported:

1. **Local install** (recommended for offline development)
   - Download MongoDB Community Server from [mongodb.com](https://www.mongodb.com/try/download/community)
   - Choose the Windows version and complete the wizard
   - Start the MongoDB service (it usually starts automatically)
   - If it doesn’t start, run `mongod` manually or start the **MongoDB** service from the Windows Services panel.
   - Verify the database is listening on port 27017:
     ```powershell
     netstat -a -n | findstr ":27017"
     ```
   - The server logs will print a message such as `MongoDB connected to mongodb://localhost:27017/inventory-system`. If you see a connection error in the console, it means Mongo wasn’t reachable and the app fell back to in‑memory mode. In that case, start your local MongoDB instance and restart the Node server.

2. **Remote/hosted database**
   - If your MongoDB server is running on the same web host or in the cloud, point the Node app at it.
     You can either provide the full connection URI via `MONGODB_URI` or supply the host and port
     separately with `MONGODB_HOST` and `MONGODB_PORT` (the code will build the URI automatically).
   - Examples:
     ```txt
     # full URI (Atlas, mLab, etc.)
     MONGODB_URI=mongodb+srv://user:pass@cluster0.xyz.mongodb.net/inventory-system

     # or host/port pair if your service is at mongo.example.com:27017
     MONGODB_HOST=mongo.example.com
     MONGODB_PORT=27017
     ```
   - Ensure your machine’s IP (or the server where you run `npm start`) is allowed to connect,
     and that any firewall rules permit traffic on the MongoDB port.

3. **No MongoDB installed?**
   - When neither `MONGODB_URI` nor `MONGODB_HOST` are provided the server defaults to
     `mongodb://localhost:27017/inventory-system` and tries to connect there. This matches the
     original behaviour and avoids confusion if you simply start the app without tweaking `.env`.
   - If that localhost connection attempt fails (e.g. service not running), the app will automatically
     fall back to an **in‑memory MongoDB** using `mongodb-memory-server`.
   - Leaving both variables blank therefore gives you the local database when available, then
     in‑memory as a safety net.
   - In-memory mode is intended for quick testing or when you cannot install Mongo. Data will be lost
     when the process exits.
   - When using the in‑memory mode, a default admin user is seeded automatically with username
     `admin` and password `admin` so you can login immediately.

> ⚠️ Regardless of the method, the Node server must be able to connect to the database for filtering and all CRUD operations to work. The most common reason for “cannot connect” errors is that the MongoDB service is not running on localhost; start the service and restart the server to resolve it.

## Quick Start

### 1. Install Dependencies
```powershell
cd server
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and update with your MongoDB connection:
```powershell
copy .env.example .env
```

Edit `.env`:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/inventory-system
CLIENT_URL=http://localhost:5000
JWT_SECRET=your_secure_jwt_secret_key
NODE_ENV=development
```

### 3. Create Admin User
Run the setup script to create the initial admin user:
```powershell
node setup.js
```

This will prompt you to enter:
- Admin username
- Admin password
- Admin name

### 4. Start the Server
```powershell
npm start
# or for development with auto-reload:
npm run dev
```

The server will run on `http://localhost:5000`

## System Workflow

### For Admin Users
1. Navigate to `http://localhost:5000/inventory`
2. Click "Admin Login"
3. Enter username and password
4. Access the admin dashboard to:
   - Add/edit/delete items
   - **Use the filter fields above each list (ID, name, department, etc.) to narrow results**
   - View all borrowings
   - Generate reports
   - Manage inventory

### For Client/Employee Users
1. Navigate to `http://localhost:5000/inventory`
2. Click "Scan QR Code"
3. Allow camera access
4. Point camera at item's QR code
5. Fill in borrowing details:
   - Full name
   - Employee ID
   - Department
   - Quantity needed
   - Expected return date
   - Purpose and notes

## API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/verify` - Verify token
- `POST /api/auth/create-admin` - Create admin user

### Items (Admin only)
- `GET /api/items` - Get all items. Supports:
  - `?q=searchTerm` (general search across name, category, brand/model, location, serial number)
  - individual filters: `?id=ITEM_ID`, `?name=...`, `?category=...`, `?location=...`, `?serialNumber=...`
- `POST /api/items` - Create item
- `PUT /api/items/:id` - Update item
- `DELETE /api/items/:id` - Delete item

### Borrowing (Public)
- `POST /api/borrowing` - Borrow item
- `GET /api/borrowing` - Get all borrowings. Supports:
  - `?q=searchTerm` (general search across employee name/ID, department, item name)
  - individual filters: `?id=RECORD_ID`, `?employeeName=...`, `?employeeId=...`, `?department=...`, `?item=...` (item name or ID)
- `PUT /api/borrowing/:id/return` - Return item

### QR Code (Public)
- `POST /api/qr/generate` - Generate QR code
- `POST /api/qr/scan` - Scan QR code
- `GET /api/qr/:id` - Get item QR code

### Reports (Admin only)
- `GET /api/reports` - Get all reports
- `POST /api/reports` - Generate report

## Features

✅ Admin authentication with JWT
✅ QR code scanning for items (camera-based)
✅ Employee borrowing system
✅ Items list grouped by category when viewing in admin dashboard
✅ Live inventory updates via Socket.IO
✅ Overdue item tracking
✅ Damage/payment tracking
✅ Notifications system
  - read/unread filtering
  - system alert filtering
  - send notifications as email (SMTP) via checkbox flag in admin UI
✅ Report generation (PDF/Excel/DOCX)
✅ Responsive design for mobile scanning

## Troubleshooting

### Server won't start
- Check MongoDB is running. If you don't have a local database, set `MONGODB_URI` in `.env` to a working remote URI. The app will try to spin up an in‑memory database if no URI is provided, but that may require a recent Node version.
- Verify MongoDB URI in .env is correct and reachable (internet access required for remote hosts).
- Check if port 5000 (or whichever port you use) is already in use. The server now automatically retries the next available port, but existing processes may block startup.
- **PowerShell broken?** Use CMD, Git Bash, or another terminal to run commands instead of PowerShell. You only need:
  ```
  cd server
  npm start      # or npm run dev for auto-reload
  ```
  or run these commands from File Explorer's address bar by typing `cmd`.

> ⚠️ **Filtering and all data operations require a connected database.** If the server cannot connect (either local, remote, or in‑memory), the dashboard will not filter or show data.

### QR scanning not working
- Ensure HTTPS or localhost (camera requires secure context)
- Check browser camera permissions
- Try a different QR code format

### Items not showing after creation
- Refresh the page with Ctrl+F5
- Check browser console for errors
- Verify token is valid

## Database Models

- **User**: Admin users
- **Item**: Inventory items with QR codes
- **Borrowing**: Borrowing records
- **Notification**: System notifications
- **Payment**: Damage/repair fees

