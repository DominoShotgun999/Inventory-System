const Borrowing = require('../models/Borrowing');
const Item = require('../models/Item');
const Notification = require('../models/Notification');
const User = require('../models/User');
const emailService = require('../utils/emailService');
const moment = require('moment');
const { Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow, WidthType, BorderStyle } = require('docx');
// in-memory fallback stores
const inMemory = global.inMemory || { items: [], borrowings: [], notifications: [] };

async function sendBorrowNotificationEmail(borrowing, notification) {
  if (!borrowing || !borrowing.employeeId || !notification) return;

  try {
    const user = await User.findOne({ employeeId: borrowing.employeeId });
    if (!user || !user.email) {
      return;
    }

    const to = user.email;
    const subject = `[Inventory Alert] ${notification.title}`;
    const text = `${notification.message}\n\nType: ${notification.type}\nPriority: ${notification.priority}`;

    await emailService.sendEmail({ to, subject, text });
    console.log(`Notification email sent to ${to}`);
  } catch (err) {
    console.error('Error sending notification email', err.message || err);
  }
}


// Create borrowing record
exports.borrowItem = async (req, res) => {
  try {
    const { itemId, employeeName, employeeId, email, department, expectedReturnDate, quantity, purpose, notes } = req.body;

    // Check if user is banned
    const user = await User.findOne({ email });
    if (user && user.isBanned) {
      return res.status(403).json({ error: 'You are banned from borrowing items. Contact administrator.' });
    }

    // Prevent borrowing when the borrower already has active (unreturned) items
    if (global.useMemory) {
      const activeBorrowings = inMemory.borrowings.filter(b => b.employeeId === employeeId && ['borrowed', 'overdue'].includes(b.status));
      if (activeBorrowings.length > 0) {
        return res.status(400).json({ error: 'You must return all borrowed items before borrowing again.' });
      }
    } else {
      const activeBorrowings = await Borrowing.find({ employeeId, status: { $in: ['borrowed', 'overdue'] } });
      if (activeBorrowings.length > 0) {
        return res.status(400).json({ error: 'You must return all borrowed items before borrowing again.' });
      }
    }

    // Check item availability
    let item;
    if (global.useMemory) {
      item = inMemory.items.find(i => i._id === itemId);
    } else {
      item = await Item.findById(itemId);
    }
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.quantity < quantity) return res.status(400).json({ error: 'Insufficient quantity' });

    // Check if item requires supervisor approval
    const requiresApproval = item.requiresSupervisorApproval;
    const isApproved = !requiresApproval || (req.user && (req.user.role === 'admin' || req.user.role === 'supervisor'));

    // create borrowing record
    if (global.useMemory) {
      const newBorrow = {
        _id: (inMemory.borrowings.length + 1).toString(),
        itemId,
        employeeName,
        employeeId,
        email,
        department,
        expectedReturnDate,
        quantity,
        purpose,
        notes,
        borrowDate: new Date(),
        status: 'borrowed'
      };
      inMemory.borrowings.push(newBorrow);
      // update item
      item.quantity -= quantity;
      item.status = item.quantity === 0 ? 'borrowed' : 'available';
      // no database save

      req.app.locals.io.emit('item-borrowed', { borrowing: newBorrow, item });
      return res.status(201).json(newBorrow);
    }

    const borrowing = new Borrowing({
      itemId,
      employeeName,
      employeeId,
      email,
      department,
      expectedReturnDate,
      quantity,
      purpose,
      notes,
      supervisorApproved: isApproved,
      approvedBy: isApproved ? req.user.userId : null
    });

    // Update item quantity
    item.quantity -= quantity;
    item.status = item.quantity === 0 ? 'borrowed' : 'available';

    await borrowing.save();
    await item.save();

    // Emit event for live update
    req.app.locals.io.emit('item-borrowed', { borrowing, item });

    res.status(201).json(borrowing);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Return item
exports.returnItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { actualReturnDate, damageStatus, damageNotes } = req.body;

    let borrowing;
    if (global.useMemory) {
      borrowing = inMemory.borrowings.find(b => b._id === id);
    } else {
      borrowing = await Borrowing.findById(id);
    }
    if (!borrowing) return res.status(404).json({ error: 'Borrowing record not found' });

    let item;
    if (global.useMemory) {
      item = inMemory.items.find(i => i._id === borrowing.itemId);
    } else {
      item = await Item.findById(borrowing.itemId);
    }
    if (!item) return res.status(404).json({ error: 'Item not found' });

    // Check if overdue
    const isOverdue = new Date() > new Date(borrowing.expectedReturnDate);

    // Update borrowing record
    borrowing.actualReturnDate = actualReturnDate || new Date();
    borrowing.status = damageStatus === 'damaged' ? 'damaged' : (isOverdue ? 'overdue' : 'returned');

    // Update item quantity
    item.quantity += borrowing.quantity;
    if (damageStatus === 'damaged') {
      item.condition = 'poor';
      item.status = 'damaged';
    } else {
      item.status = 'available';
    }

    // Ban user if damaged or overdue
    if (damageStatus === 'damaged' || isOverdue) {
      const user = await User.findOne({ email: borrowing.email });
      if (user) {
        user.isBanned = true;
        await user.save();
      }
    }

    if (!global.useMemory) {
      await borrowing.save();
      await item.save();

      // Create notification
      const notification = new Notification({
        type: 'item-returned',
        title: `${item.name} returned`,
        message: `${borrowing.employeeName} returned ${borrowing.quantity} unit(s) of ${item.name}`,
        relatedId: borrowing._id,
        priority: damageStatus === 'damaged' ? 'high' : 'medium'
      });
      await notification.save();

      // send email (if user has email)
      await sendBorrowNotificationEmail(borrowing, notification);

      req.app.locals.io.emit('item-returned', { borrowing, item, notification });
      res.json({ borrowing, notification });
    } else {
      // memory path: create simple notification object
      const notification = {
        _id: (inMemory.notifications.length + 1).toString(),
        type: 'item-returned',
        title: `${item.name} returned`,
        message: `${borrowing.employeeName} returned ${borrowing.quantity} unit(s) of ${item.name}`,
        relatedId: borrowing._id,
        priority: damageStatus === 'damaged' ? 'high' : 'medium',
        date: new Date()
      };
      inMemory.notifications.push(notification);
      req.app.locals.io.emit('item-returned', { borrowing, item, notification });
      res.json({ borrowing, notification });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all borrowing records (optional query params to filter by employeeName, employeeId, email, department, item, id or q)
exports.getAllBorrowings = async (req, res) => {
  try {
    console.log('getAllBorrowings query:', req.query);
    const { q, employeeName, employeeId, email, department, item, id } = req.query;

    if (global.useMemory) {
      // filter over inMemory.borrowings
      let results = inMemory.borrowings.slice();
      if (id) {
        results = results.filter(b => b._id === id);
      } else {
        if (employeeName) {
          const re = new RegExp(employeeName, 'i');
          results = results.filter(b => re.test(b.employeeName));
        }
        if (employeeId) {
          const re = new RegExp(employeeId, 'i');
          results = results.filter(b => re.test(b.employeeId));
        }
        if (email) {
          const re = new RegExp(email, 'i');
          results = results.filter(b => re.test(b.email));
        }
        if (department) {
          const re = new RegExp(department, 'i');
          results = results.filter(b => re.test(b.department));
        }
        if (item) {
          const re = new RegExp(item, 'i');
          const matchingItems = inMemory.items.filter(i => re.test(i.name)).map(i => i._id);
          if (matchingItems.length) {
            results = results.filter(b => matchingItems.includes(b.itemId));
          } else if (/^[0-9a-fA-F]+$/.test(item)) {
            results = results.filter(b => b.itemId === item);
          }
        }
      }
      if (q) {
        const re = new RegExp(q, 'i');
        results = results.filter(b =>
          re.test(b.employeeName) ||
          re.test(b.employeeId) ||
          re.test(b.email) ||
          re.test(b.department) ||
          (inMemory.items.find(i => i._id === b.itemId && re.test(i.name)))
        );
      }
      // populate item reference
      results = results.map(b => ({
        ...b,
        itemId: inMemory.items.find(i => i._id === b.itemId)
      }));
      results.sort((a, b) => new Date(b.borrowDate) - new Date(a.borrowDate));
      return res.json(results);
    }

    let filter = {};
    if (id) {
      // override everything else
      filter._id = id;
    } else {
      if (employeeName) {
        filter.employeeName = new RegExp(employeeName, 'i');
      }
      if (employeeId || email) {
        filter.$or = [];
        if (employeeId) {
          filter.$or.push({ employeeId: new RegExp(employeeId, 'i') });
        }
        if (email) {
          filter.$or.push({ email: new RegExp(email, 'i') });
        }
      }
      if (department) {
        filter.department = new RegExp(department, 'i');
      }
      if (item) {
        // look up matching item ids
        const regex = new RegExp(item, 'i');
        const itemMatches = await Item.find({ name: regex }).select('_id');
        if (itemMatches.length) {
          filter.itemId = { $in: itemMatches.map(i => i._id) };
        } else {
          // if item looks like an id, try matching directly
          if (item.match(/^[0-9a-fA-F]{24}$/)) {
            filter.itemId = item;
          }
        }
      }
    }

    if (q) {
      const regex = new RegExp(q, 'i');
      const orClauses = [
        { employeeName: regex },
        { employeeId: regex },
        { email: regex },
        { department: regex }
      ];
      const itemMatches = await Item.find({ name: regex }).select('_id');
      if (itemMatches.length) {
        orClauses.push({ itemId: { $in: itemMatches.map(i => i._id) } });
      }
      if (filter.$or) {
        filter.$or = filter.$or.concat(orClauses);
      } else {
        filter.$or = orClauses;
      }
    }

    console.log('borrowing filter built:', JSON.stringify(filter));
    const borrowings = await Borrowing.find(filter)
      .populate('itemId')
      .sort({ borrowDate: -1 });
    res.json(borrowings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update borrowing record (e.g., expected return date, notes)
exports.updateBorrowing = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    let borrowing;
    if (global.useMemory) {
      borrowing = inMemory.borrowings.find(b => b._id === id);
      if (!borrowing) return res.status(404).json({ error: 'Borrowing record not found' });

      const allowed = ['expectedReturnDate', 'notes', 'purpose', 'department', 'employeeName', 'employeeId'];
      allowed.forEach(field => {
        if (updates[field] !== undefined) borrowing[field] = updates[field];
      });

      return res.json({ success: true, borrowing });
    }

    borrowing = await Borrowing.findById(id);
    if (!borrowing) return res.status(404).json({ error: 'Borrowing record not found' });

    const allowed = ['expectedReturnDate', 'notes', 'purpose', 'department', 'employeeName', 'employeeId'];
    allowed.forEach(field => {
      if (updates[field] !== undefined) borrowing[field] = updates[field];
    });

    await borrowing.save();
    res.json({ success: true, borrowing });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get public borrowing records (active borrowings for survey)
exports.getPublicBorrowings = async (req, res) => {
  try {
    if (global.useMemory) {
      let results = inMemory.borrowings.filter(b => b.status !== 'returned');
      results = results.map(b => ({ ...b, itemId: inMemory.items.find(i => i._id === b.itemId) }));
      results.sort((a, b) => new Date(b.borrowDate) - new Date(a.borrowDate));
      return res.json(results);
    }
    const borrowings = await Borrowing.find({ status: { $ne: 'returned' } })
      .populate('itemId')
      .sort({ borrowDate: -1 });
    res.json(borrowings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get borrowing by ID
exports.getBorrowingById = async (req, res) => {
  try {
    if (global.useMemory) {
      const b = inMemory.borrowings.find(x => x._id === req.params.id);
      if (!b) return res.status(404).json({ error: 'Borrowing record not found' });
      return res.json({ ...b, itemId: inMemory.items.find(i => i._id === b.itemId) });
    }
    const borrowing = await Borrowing.findById(req.params.id).populate('itemId');
    if (!borrowing) return res.status(404).json({ error: 'Borrowing record not found' });
    res.json(borrowing);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Approve borrowing (for supervisor approval)
exports.approveBorrowing = async (req, res) => {
  try {
    const { id } = req.params;

    let borrowing;
    if (global.useMemory) {
      borrowing = inMemory.borrowings.find(b => b._id === id);
      if (!borrowing) return res.status(404).json({ error: 'Borrowing record not found' });

      borrowing.supervisorApproved = true;
      borrowing.approvedBy = req.user.userId;
      return res.json({ success: true, borrowing });
    }

    borrowing = await Borrowing.findById(id).populate('itemId');
    if (!borrowing) return res.status(404).json({ error: 'Borrowing record not found' });

    if (borrowing.supervisorApproved) {
      return res.status(400).json({ error: 'Borrowing is already approved' });
    }

    borrowing.supervisorApproved = true;
    borrowing.approvedBy = req.user.userId;
    await borrowing.save();

    res.json({ success: true, borrowing });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get active borrowings
exports.getActiveBorrowings = async (req, res) => {
  try {
    if (global.useMemory) {
      let results = inMemory.borrowings.filter(b => ['borrowed', 'overdue'].includes(b.status));
      results = results.map(b => ({ ...b, itemId: inMemory.items.find(i => i._id === b.itemId) }));
      results.sort((a, b) => new Date(a.expectedReturnDate) - new Date(b.expectedReturnDate));
      return res.json(results);
    }
    const borrowings = await Borrowing.find({ status: { $in: ['borrowed', 'overdue'] } })
      .populate('itemId')
      .sort({ expectedReturnDate: 1 });
    res.json(borrowings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get overdue items
exports.getOverdueItems = async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (global.useMemory) {
      let results = inMemory.borrowings.filter(b => (b.status === 'borrowed' || b.status === 'overdue') && new Date(b.expectedReturnDate) < todayStart);
      results = results.map(b => {
        if (b.status === 'borrowed') {
          b.status = 'overdue';
          const existing = inMemory.notifications.find(n => n.type === 'item-overdue' && n.relatedId === b._id);
          if (!existing) {
            const notif = {
              _id: (inMemory.notifications.length + 1).toString(),
              type: 'item-overdue',
              title: `Overdue: ${b.employeeName}`,
              message: `${b.employeeName} has an overdue ${inMemory.items.find(i => i._id === b.itemId)?.name || 'item'}.`, 
              relatedId: b._id,
              priority: 'high',
              isRead: false,
              createdAt: new Date(),
              expiresAt: new Date(+new Date() + 7*24*60*60*1000)
            };
            inMemory.notifications.push(notif);
            req.app.locals.io.emit('notification-created', notif);
          }
        }
        return { ...b, itemId: inMemory.items.find(i => i._id === b.itemId) };
      });
      return res.json(results);
    }

    const borrowings = await Borrowing.find({
      status: { $in: ['borrowed', 'overdue'] },
      expectedReturnDate: { $lt: todayStart }
    }).populate('itemId');

    // Optionally update status to overdue for borrowed entries that are late
    const notifications = [];
    await Promise.all(borrowings.map(async bor => {
      if (bor.status === 'borrowed') {
          bor.status = 'overdue';
          await bor.save();

          const existing = await Notification.findOne({ type: 'item-overdue', relatedId: bor._id });
          if (!existing) {
            const notif = await Notification.create({
              type: 'item-overdue',
              title: `Overdue: ${bor.employeeName}`,
              message: `${bor.employeeName} has an overdue ${bor.itemId?.name || 'item'}.`,
              relatedId: bor._id,
              priority: 'high',
              isRead: false
            });
            notifications.push(notif);

            // send email (if user has email)
            await sendBorrowNotificationEmail(bor, notif);

            req.app.locals.io.emit('notification-created', notif);
          }
        }
      return bor;
    }));

    res.json(borrowings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get borrowing statistics
exports.getBorrowingStats = async (req, res) => {
  try {
    const totalBorrowings = await Borrowing.countDocuments();
    const activeBorrowings = await Borrowing.countDocuments({ status: 'borrowed' });
    const returnedBorrowings = await Borrowing.countDocuments({ status: 'returned' });
    const todayStart = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    const overdueItems = await Borrowing.countDocuments({
      status: 'borrowed',
      expectedReturnDate: { $lt: todayStart }
    });

    res.json({
      totalBorrowings,
      activeBorrowings,
      returnedBorrowings,
      overdueItems
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Perform maintenance operations
exports.performMaintenance = async (req, res) => {
  try {
    const type = req.params.type;
    if (!type) return res.status(400).json({ error: 'Maintenance type required' });

    switch (type) {
      case 'status': {
        const totalBorrowings = await Borrowing.countDocuments();
        const activeBorrowings = await Borrowing.countDocuments({ status: 'borrowed' });
        const returnedBorrowings = await Borrowing.countDocuments({ status: 'returned' });
        const todayStart = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
        const overdueItems = await Borrowing.countDocuments({ status: 'borrowed', expectedReturnDate: { $lt: todayStart } });
        return res.json({ totalBorrowings, activeBorrowings, returnedBorrowings, overdueItems });
      }
      case 'cleanup': {
        const cutoffDate = new Date();
        cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
        const result = await Borrowing.deleteMany({ status: 'returned', actualReturnDate: { $lt: cutoffDate } });
        return res.json({ message: `${result.deletedCount} returned borrowings older than 1 year deleted.` });
      }
      case 'optimize': {
        // soft optimize: update index and return row counts
        await Borrowing.collection.createIndex({ employeeId: 1 });
        await Borrowing.collection.createIndex({ itemId: 1 });
        const count = await Borrowing.countDocuments();
        return res.json({ message: `Indexes rebuilt and collection contains ${count} entries.` });
      }
      case 'backup': {
        return res.json({ message: 'Manual backup is not available from UI; use database backup script/server-level backup instead.' });
      }
      case 'logs': {
        const notifications = await Notification.find().sort({ createdAt: -1 }).limit(20);
        return res.json({ message: 'Last 20 system notifications (maintenance logs)', data: notifications });
      }
      default:
        return res.status(400).json({ error: `Unknown maintenance task: ${type}` });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update borrowing notes
exports.updateBorrowingNotes = async (req, res) => {
  try {
    const { notes } = req.body;
    const borrowing = await Borrowing.findByIdAndUpdate(
      req.params.id,
      { notes },
      { new: true }
    );
    res.json(borrowing);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Download borrowing details as DOCX
exports.downloadBorrowingDocx = async (req, res) => {
  try {
    const borrowing = await Borrowing.findById(req.params.id).populate('itemId');
    if (!borrowing) return res.status(404).json({ error: 'Borrowing record not found' });

    const item = borrowing.itemId;

    const tableCellBorders = {
      top: { style: BorderStyle.SINGLE, size: 4, color: '999999' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: '999999' },
      left: { style: BorderStyle.SINGLE, size: 3, color: '999999' },
      right: { style: BorderStyle.SINGLE, size: 3, color: '999999' },
    };

    const makeCell = (text) => new TableCell({
      children: [new Paragraph({ text: text || 'N/A', spacing: { after: 120 } })],
      borders: tableCellBorders,
    });

    // Create a standard borrowing document with table
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: "LaSalle Inventory System",
                bold: true,
                size: 32,
              }),
            ],
            alignment: 'center',
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Borrowing Details", bold: true, size: 24 }),
            ],
            alignment: 'center',
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Document ID: ${borrowing._id}`, size: 18 }),
              new TextRun({ text: '    ', size: 18 }),
              new TextRun({ text: `Date: ${moment(borrowing.borrowDate).format('YYYY-MM-DD HH:mm')}`, size: 18 }),
            ],
            alignment: 'center',
          }),
          new Paragraph({
            children: [
              new TextRun(""),
            ],
          }),
          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE,
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: "Item Borrowed", bold: true })],
                    width: { size: 40, type: WidthType.PERCENTAGE },
                    borders: tableCellBorders,
                  }),
                  new TableCell({
                    children: [new Paragraph(item.name || 'N/A')],
                    width: { size: 60, type: WidthType.PERCENTAGE },
                    borders: tableCellBorders,
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Description", bold: true })], borders: tableCellBorders }),
                  new TableCell({ children: [new Paragraph(item.description || 'N/A')], borders: tableCellBorders }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Quantity", bold: true })], borders: tableCellBorders }),
                  new TableCell({ children: [new Paragraph((borrowing.quantity || 0).toString())], borders: tableCellBorders }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Borrower Name", bold: true })], borders: tableCellBorders }),
                  new TableCell({ children: [new Paragraph(borrowing.employeeName || 'N/A')], borders: tableCellBorders }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Employee ID", bold: true })], borders: tableCellBorders }),
                  new TableCell({ children: [new Paragraph(borrowing.employeeId || 'N/A')], borders: tableCellBorders }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Email", bold: true })], borders: tableCellBorders }),
                  new TableCell({ children: [new Paragraph(borrowing.email || 'N/A')], borders: tableCellBorders }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Department", bold: true })], borders: tableCellBorders }),
                  new TableCell({ children: [new Paragraph(borrowing.department || 'N/A')], borders: tableCellBorders }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Borrow Date", bold: true })], borders: tableCellBorders }),
                  new TableCell({ children: [new Paragraph(moment(borrowing.borrowDate).format('YYYY-MM-DD HH:mm'))], borders: tableCellBorders }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Expected Return", bold: true })], borders: tableCellBorders }),
                  new TableCell({ children: [new Paragraph(moment(borrowing.expectedReturnDate).format('YYYY-MM-DD'))], borders: tableCellBorders }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Purpose", bold: true })], borders: tableCellBorders }),
                  new TableCell({ children: [new Paragraph(borrowing.purpose || 'N/A')], borders: tableCellBorders }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: "Status", bold: true })], borders: tableCellBorders }),
                  new TableCell({ children: [new Paragraph(borrowing.status || 'N/A')], borders: tableCellBorders }),
                ],
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun(""),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun("Notes:"),
            ],
            spacing: { before: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun(borrowing.notes || 'None'),
            ],
          }),
        ],
      }],
    });

    // Generate the DOCX file
    const buffer = await Packer.toBuffer(doc);

    // Set headers for download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename=borrowing-receipt-${borrowing._id}.docx`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
