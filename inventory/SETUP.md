# 📦 Inventory System - Quick Setup Guide

## Prerequisites
- Node.js (download from nodejs.org)
- MongoDB Atlas account (FREE - at mongodb.com/cloud/atlas)
- Git installed

---

## 🚀 Installation (3 Steps)

### Step 1: Install Dependencies
```bash
cd inventory/server
npm install
```

### Step 2: Create .env File
In `inventory/server/`, create `.env`:
```
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/inventory-system
JWT_SECRET=your-secret-key-here
NODE_ENV=development
```

**Get MongoDB URI:**
1. Go to https://www.mongodb.com/cloud/atlas
2. Create free cluster
3. Click "Connect" → "Connect your application"
4. Copy the connection string
5. Replace `username:password` with your actual credentials

### Step 3: Start Server
```bash
npm start
```

Server runs at: **http://localhost:5000**

---

## 🌐 Access the System

| Page | URL |
|------|-----|
| **Home** | http://localhost:5000/inventory |
| **Borrow Items** | http://localhost:5000/inventory/borrow |
| **QR Scanner** | http://localhost:5000/inventory/scan |
| **Admin Login** | http://localhost:5000/inventory/admin |
| **Dashboard** | http://localhost:5000/inventory/dashboard |

---

## 🔐 First Time Setup

### Create Admin User
```bash
node setup.js
```
Follow prompts to create admin account.

### Load Sample Data (Optional)
```bash
node loadSampleData.js
```
Adds 8 test items with QR codes.

---

## 🚀 Deploy to Replit (Free & Public)

1. Push code to GitHub
2. Go to https://replit.com
3. Click "Import from GitHub"
4. Paste: `https://github.com/YOUR-USERNAME/Inventory-System.git`
5. Add secrets (🔒 icon):
   - `MONGODB_URI` = Your MongoDB connection string
   - `JWT_SECRET` = Any random string
6. Terminal: `cd inventory/server && npm install && npm start`
7. Your public URL will appear at top right! 🌍

---

## 📱 Main Features

✅ **QR Code Scanning** - Borrowers scan items with phone camera  
✅ **Item Borrowing** - Track who borrowed what and when  
✅ **Admin Dashboard** - Manage inventory and borrowing records  
✅ **Real-time Updates** - See changes instantly  
✅ **Mobile Friendly** - Works on any device  

---

## ❓ Troubleshooting

**Server won't start?**
- Check MongoDB connection string in `.env`
- Make sure Node.js is installed
- Try: `npm install` again

**QR Scanner not working?**
- Allow camera permission in browser
- Check browser console for errors (F12)

**Can't access admin dashboard?**
- Make sure you ran `node setup.js` first
- Use credentials you created

---

## 📚 More Help

- Check browser console (F12) for errors
- See Replit console for server logs
- All API endpoints in `server/routes/`
