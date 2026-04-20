const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5000',
    methods: ['GET', 'POST'],
    credentials: true,
    maxAge: 3600
  }
});

// Security: CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:5000',
      'http://localhost:3000',
      process.env.CLIENT_URL
    ].filter(Boolean);
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else if (process.env.NODE_ENV === 'development') {
      callback(null, true); // Allow all in development
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// Database Connection and fallback flag
let useMemory = false; // whether to operate against JS arrays instead of Mongo
// we'll expose these globals so controllers can use the same flag/stores
global.useMemory = useMemory; // will be updated after connection completed
// simple in-memory data containers used when useMemory=true
const inMemory = {
  users: [],
  items: [],
  borrowings: []
};
// also expose globally for convenience
global.inMemory = inMemory;

async function connectDatabase() {
  const options = { useNewUrlParser: true, useUnifiedTopology: true };
  let uri = process.env.MONGODB_URI;

  if (!uri) {
    // if the user supplied a host/port pair instead of a full URI, construct it here
    const host = process.env.MONGODB_HOST || 'localhost';
    const port = process.env.MONGODB_PORT || '27017';
    uri = `mongodb://${host}:${port}/inventory-system`;
    console.log('No MONGODB_URI specified, defaulting to', uri);
  }

  try {
    await mongoose.connect(uri, options);
    console.log('MongoDB connected to', uri);
  } catch (err) {
    console.log('MongoDB connection error (', uri, '):', err.message || err);
    console.log('Falling back to in-memory stores');
    useMemory = true;
  }
}

// after connecting we seed and then add routes
connectDatabase().then(async () => {
  // perform optional seeding (admin + sample items)
  try {
    global.useMemory = useMemory; // update global after we determined the flag
    const bcrypt = require('bcryptjs');
    if (useMemory) {
      // JS placeholder admin
      if (!inMemory.users.find(u => u.role === 'admin')) {
        console.log('Creating default in-memory admin (admin/admin)');
        const hashed = await bcrypt.hash('admin', 10);
        inMemory.users.push({
          _id: '000000000000000000000001',
          username: 'admin',
          password: hashed,
          name: 'Administrator',
          role: 'admin'
        });
      }
      // sample items
      if (inMemory.items.length === 0) {
        console.log('Populating in-memory sample items');
        inMemory.items.push(
          { _id:'item1', name:'Laptop', category:{main:'Electronics',type:''}, quantity:5,totalQuantity:5,location:'Shelf A',status:'available' },
          { _id:'item2', name:'Monitor', category:{main:'Electronics',type:''}, quantity:3,totalQuantity:3,location:'Shelf B',status:'available' }
        );
      }
    } else {
      const User = require('./models/User');
      const Item = require('./models/Item');

      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount === 0) {
        console.log('No admin user found, creating default admin (username: admin, password: admin)');
        const hashed = await bcrypt.hash('admin', 10);
        await User.create({ username: 'admin', password: hashed, name: 'Administrator', email: 'admin@admin.local', role: 'admin' });
      }

      const itemCount = await Item.countDocuments();
      if (itemCount === 0) {
        console.log('No items in database, inserting sample data');
        const sample = require('./loadSampleData');
        if (typeof sample === 'function') await sample();
      }
    }
  } catch (seedErr) {
    console.error('Seeding error:', seedErr.message || seedErr);
  }

  // Socket.IO connection
  io.on('connection', (socket) => {
    console.log('New user connected:', socket.id);

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  // Export io for use in controllers
  app.locals.io = io;

  // Static files
  app.use(express.static(path.join(__dirname, '../client')));

  // Routes
  const itemRoutes = require('./routes/itemRoutes');
  const borrowingRoutes = require('./routes/borrowingRoutes');
  const reportRoutes = require('./routes/reportRoutes');
  const qrRoutes = require('./routes/qrRoutes');
  const paymentRoutes = require('./routes/paymentRoutes');
  const notificationRoutes = require('./routes/notificationRoutes');
  const authRoutes = require('./routes/authRoutes');
  const schoolIdRoutes = require('./routes/schoolIdRoutes');
  const authMiddleware = require('./middleware/authMiddleware');
  const itemController = require('./controllers/itemController');
  const borrowingController = require('./controllers/borrowingController');

  // Public endpoints without authentication
  app.get('/api/items/public', itemController.getPublicItems);
  app.get('/api/borrowing/public', borrowingController.getPublicBorrowings);

  // Authenticated/admin routes
  app.use('/api/items', authMiddleware.verifyToken, authMiddleware.checkSupervisor, itemRoutes);
  app.use('/api/borrowing', borrowingRoutes);
  app.use('/api/reports', authMiddleware.verifyToken, authMiddleware.checkAdmin, reportRoutes);
  app.use('/api/qr', qrRoutes);
  app.use('/api/payments', authMiddleware.verifyToken, authMiddleware.checkAdmin, paymentRoutes);
  app.use('/api/notifications', authMiddleware.verifyToken, authMiddleware.checkAdmin, notificationRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/school-ids', schoolIdRoutes);

  // Route to serve client pages
  app.get('/inventory', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
  });

  app.get('/inventory/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/admin.html'));
  });

  app.get('/inventory/scan', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/scan.html'));
  });

  app.get('/inventory/borrow', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/borrow.html'));
  });

  app.get('/inventory/borrow-tv', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/borrow-tv.html'));
  });

  app.get('/inventory/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dashboard.html'));
  });

  app.get('/inventory/school-id', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/school-id.html'));
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'Server is running' });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found', path: req.path });
  });

  // Global error handler
  app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal server error';
    res.status(status).json({ error: message, status });
  });

  // start the HTTP server with automatic port fallback
  let basePort = parseInt(process.env.PORT, 10) || 5000;
  function startServer(port) {
    const serverInstance = http.createServer(app);
    const ioInstance = socketIO(serverInstance, {
      cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        methods: ['GET', 'POST']
      }
    });
    // Update global io reference
    global.io = ioInstance;
    app.set('io', ioInstance);

    serverInstance.listen(port, () => {
      console.log(`Server running on port ${port}`);
    }).on('error', err => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`Port ${port} in use, trying ${port + 1}...`);
        startServer(port + 1);
      } else {
        console.error('Server error:', err);
      }
    });
  }

  startServer(basePort);
}).catch(err => {
  console.error('Database initialization failed:', err);
});

module.exports = { app, io };
