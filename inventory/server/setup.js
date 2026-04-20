const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const dotenv = require('dotenv');
const readline = require('readline');

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer);
    });
  });
}

async function createAdmin() {
  try {
    // Connect to MongoDB
    console.log('\n🔄 Connecting to MongoDB...');
    // allow either a full URI or separate host/port environment variables
    let connectUri = process.env.MONGODB_URI;
    if (!connectUri) {
      const host = process.env.MONGODB_HOST || 'localhost';
      const port = process.env.MONGODB_PORT || '27017';
      connectUri = `mongodb://${host}:${port}/inventory-system`;
    }
    await mongoose.connect(connectUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // Check if admin exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists!');
      console.log(`    Username: ${existingAdmin.username}`);
      const confirm = await askQuestion('\nDo you want to create another admin? (yes/no): ');
      if (confirm.toLowerCase() !== 'yes') {
        console.log('Cancelled.');
        rl.close();
        mongoose.connection.close();
        return;
      }
    }

    // Get credentials
    console.log('\n📝 Create Admin User');
    console.log('─'.repeat(40));
    
    const username = await askQuestion('Admin username: ');
    if (!username) {
      console.log('❌ Username cannot be empty');
      rl.close();
      mongoose.connection.close();
      return;
    }

    // Check if username exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      console.log('❌ Username already exists');
      rl.close();
      mongoose.connection.close();
      return;
    }

    const password = await askQuestion('Admin password: ');
    if (!password) {
      console.log('❌ Password cannot be empty');
      rl.close();
      mongoose.connection.close();
      return;
    }

    const name = await askQuestion('Admin name: ');

    // Hash password
    console.log('\n🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin
    const admin = new User({
      username,
      password: hashedPassword,
      name: name || username,
      email: `${username}@inventory.local`,
      role: 'admin'
    });

    await admin.save();

    console.log('\n✅ Admin user created successfully!');
    console.log('─'.repeat(40));
    console.log(`   Username: ${username}`);
    console.log(`   Name: ${name || username}`);
    console.log(`   Role: Admin`);
    console.log('\n🚀 You can now login at: http://localhost:5000/inventory/admin\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    rl.close();
    mongoose.connection.close();
  }
}

createAdmin();
