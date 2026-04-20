const Notification = require('../models/Notification');
const User = require('../models/User');
const emailService = require('../utils/emailService');

async function sendNotificationEmailToUsers(users, subject, message) {
  if (!users || users.length === 0) return 0;

  const emails = users
    .filter(u => u.email)
    .map(u => u.email);

  if (!emails.length) return 0;

  try {
    for (const to of emails) {
      await emailService.sendEmail({
        to,
        subject,
        text: message
      });
    }
    return emails.length;
  } catch (err) {
    console.error('Email send error', err);
    return 0;
  }
}

// Get all notifications
exports.getAllNotifications = async (req, res) => {
  try {
    const { isRead, type } = req.query;
    const filter = {};

    if (typeof isRead !== 'undefined') {
      if (isRead === 'true') filter.isRead = true;
      else if (isRead === 'false') filter.isRead = false;
    }

    if (type) {
      filter.type = type;
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get unread notifications
exports.getUnreadNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ isRead: false })
      .sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );
    res.json(notification);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ isRead: false }, { isRead: true });
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete notification
exports.deleteNotification = async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get notification count
exports.getNotificationCount = async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({ isRead: false });
    const totalCount = await Notification.countDocuments();
    res.json({ unreadCount, totalCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create a notification (admin UI)
exports.createNotification = async (req, res) => {
  try {
    const { type, title, message, relatedId, priority = 'medium', target = 'all', employeeId } = req.body;

    if (!type || !title || !message) {
      return res.status(400).json({ error: 'type, title and message are required' });
    }

    const notification = await Notification.create({
      type,
      title,
      message,
      relatedId,
      priority,
      isRead: false
    });

    req.app.locals.io.emit('notification-created', notification);

    let users = [];
    if (target === 'all') {
      users = await User.find({ email: { $exists: true, $ne: '' } });
    } else if (target === 'admins') {
      users = await User.find({ role: 'admin', email: { $exists: true, $ne: '' } });
    } else if (target === 'employees') {
      users = await User.find({ role: 'employee', email: { $exists: true, $ne: '' } });
    } else if (target === 'specific' && employeeId) {
      const u = await User.findOne({ employeeId });
      if (u) users = [u];
    }

    const sentEmailCount = await sendNotificationEmailToUsers(users, `[Inventory] ${title}`, message);

    res.json({ success: true, notification, sentEmailCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
