const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
// when working with in-memory fallback we'll store data here
const inMemory = global.inMemory || { users: [] }; // global.updated by server.js

// Admin login
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user
    let user;
    if (global.useMemory) {
      user = inMemory && inMemory.users && inMemory.users.find(u => u.username === username);
    } else {
      user = await User.findOne({ username });
    }
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Check if authorized role (admin, supervisor, personnel)
    if (!['admin', 'supervisor', 'personnel'].includes(user.role)) {
      return res.status(403).json({ error: 'Unauthorized role' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'your_jwt_secret_key',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Logout
exports.logout = async (req, res) => {
  try {
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Verify token
exports.verifyToken = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key');
    let user;
    if (global.useMemory) {
      user = inMemory.users.find(u => u._id == decoded.userId);
    } else {
      user = await User.findById(decoded.userId);
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Get current admin profile
exports.getProfile = async (req, res) => {
  try {
    if (global.useMemory) {
      const user = inMemory.users.find(u => u._id == req.user.userId);
      if (!user) return res.status(404).json({ error: 'User not found' });
      return res.json({ success: true, user: { id: user._id, username: user.username, name: user.name, email: user.email, role: user.role } });
    }

    const user = await User.findById(req.user.userId).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update current admin profile
exports.updateProfile = async (req, res) => {
  try {
    const { username, name, email, password } = req.body;

    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    let user;
    if (global.useMemory) {
      user = inMemory.users.find(u => u._id == req.user.userId);
      if (!user) return res.status(404).json({ error: 'User not found' });

      if (username && username !== user.username && inMemory.users.some(u => u.username === username)) {
        return res.status(409).json({ error: 'Username already taken' });
      }
      if (email && email !== user.email && inMemory.users.some(u => u.email === email)) {
        return res.status(409).json({ error: 'Email already taken' });
      }

      if (username) user.username = username;
      if (name) user.name = name;
      if (email) user.email = email;
      if (password) user.password = await bcrypt.hash(password, 10);

      return res.json({ success: true, message: 'Profile updated', user: { id: user._id, username: user.username, name: user.name, email: user.email, role: user.role } });
    }

    user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (username && username !== user.username) {
      const existing = await User.findOne({ username });
      if (existing) return res.status(409).json({ error: 'Username already taken' });
      user.username = username;
    }
    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) return res.status(409).json({ error: 'Email already taken' });
      user.email = email;
    }
    if (name) user.name = name;
    if (password) user.password = await bcrypt.hash(password, 10);

    user.updatedAt = new Date();
    await user.save();

    res.json({ success: true, message: 'Profile updated', user: { id: user._id, username: user.username, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create admin user (for initial setup)
exports.createAdmin = async (req, res) => {
  try {
    const { username, password, name, email } = req.body;

    // Check if admin already exists
    if (global.useMemory) {
      if (inMemory.users.find(u => u.role === 'admin')) {
        return res.status(400).json({ error: 'Admin user already exists' });
      }
    } else {
      const existingAdmin = await User.findOne({ role: 'admin' });
      if (existingAdmin) {
        return res.status(400).json({ error: 'Admin user already exists' });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const adminEmail = email || `${username}@admin.local`;
    if (!adminEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(adminEmail)) {
      return res.status(400).json({ error: 'Valid email is required for admin user' });
    }

    if (global.useMemory) {
      inMemory.users.push({
        _id: (inMemory.users.length + 1).toString(),
        username,
        password: hashedPassword,
        name: name || username,
        email: adminEmail,
        role: 'admin'
      });
      res.status(201).json({ success: true, message: 'Admin user created successfully (in-memory)' });
    } else {
      const admin = new User({
        username,
        password: hashedPassword,
        name: name || username,
        email: adminEmail,
        role: 'admin'
      });

      await admin.save();
      res.status(201).json({ success: true, message: 'Admin user created successfully' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Add or update an existing user's email (admin only)
exports.updateUserEmail = async (req, res) => {
  try {
    const { userId, username, employeeId, email } = req.body;

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    let user = null;
    if (userId) {
      user = await User.findById(userId);
    } else if (username) {
      user = await User.findOne({ username });
    } else if (employeeId) {
      user = await User.findOne({ employeeId });
    } else {
      return res.status(400).json({ error: 'Provide userId or username or employeeId to locate user' });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.email = email;
    await user.save();

    res.json({ success: true, message: 'Email updated', user: { id: user._id, username: user.username, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
