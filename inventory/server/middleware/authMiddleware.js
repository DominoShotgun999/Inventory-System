const jwt = require('jsonwebtoken');

// Verify token middleware
exports.verifyToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key');
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Check admin role
exports.checkAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Admin access required' });
  }
};

// Check supervisor role
exports.checkSupervisor = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'supervisor')) {
    next();
  } else {
    res.status(403).json({ error: 'Supervisor access required' });
  }
};

// Check personnel role
exports.checkPersonnel = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'supervisor' || req.user.role === 'personnel')) {
    next();
  } else {
    res.status(403).json({ error: 'Personnel access required' });
  }
};
