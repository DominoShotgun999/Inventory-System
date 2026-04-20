# Switch Laptop Guide

This document helps you migrate the Inventory System project from one laptop to another.

## 1. Copy project files

1. On the source laptop:
   - Zip the entire project folder, for example `inventory`.
   - Or use Git to push to remote (recommended):
     ```bash
     git add .
     git commit -m "prepare laptop migration"
     git push origin main
     ```

2. On the target laptop:
   - Clone from remote:
     ```bash
     git clone <your-repo-url>
     cd inventory\inventory
     ```
   - Or unzip the transferred archive into a folder.

## 2. Install dependencies

In a terminal, run:
```powershell
cd inventory\server
npm install
```

## 3. Configure environment variables

1. Copy the sample `.env.example` to `.env` in `inventory/server`:
   ```powershell
   copy .env.example .env
   ```
2. Update the values for your new laptop:
   - `PORT=5000`
   - `MONGODB_URI=mongodb://localhost:27017/inventory-system` (or Atlas URI)
   - `CLIENT_URL=http://localhost:5000`
   - `JWT_SECRET=<secure-string>`
   - `NODE_ENV=development` (for local testing)

## 4. Seed/restore database

- For local database:
  - Ensure MongoDB service is running.
  - Run `node setup.js` to create admin credentials.

- For restored data from another laptop:
  - Export/restore from Mongo dump or use atlas backup.

## 5. Start the app

```powershell
npm start
# or npm run dev
```

Open browser at `http://localhost:5000/inventory`.

## 6. Optional: make it online/offline and official

1. Use a managed MongoDB (Atlas) for production:
   - Update `MONGODB_URI` on both laptops.
2. Use `pm2` or a service manager to run the server.
3. If you need offline mode:
   - Keep local MongoDB on each laptop.
   - Sync manually using backup/fetch APIs.

## 7. Maintenance schedule (recommended)

1. Weekly
   - Check server logs for errors.
   - Verify backups were created.
   - Clear stale sessions or temp files.

2. Monthly
   - Database cleanup:
     - Remove old `Borrowing` records older than 1 year (if policy allows).
     - Archive or delete old `Notification` records older than 6 months.
     - Rebuild indexes if you add new query fields.
   - Optimize MongoDB:
     - `db.collection.reIndex()` for key collections (`items`, `borrowings`, `notifications`).
     - `db.collection.getPlanCache().clear()` to avoid stale query plans after schema changes.

3. Quarterly
   - Validate the `MONGODB_URI` connection and credentials.
   - Test failover/recovery strategy.
   - Review and rotate `JWT_SECRET` and other sensitive keys if required.

4. Before major laptop switch / migration
   - Do full database backup with `mongodump`.
   - Export `.env` and ensure secrets are secure.
   - Verify admin credentials and restore point.

## 8. Verify and test

- Log in as admin after setup.
- Check inventory items, borrowing workflow, notifications, reports.
- Ensure you can connect from browser at `http://<laptop-ip>:5000` (or configured domain).
