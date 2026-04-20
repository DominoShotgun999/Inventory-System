const mongoose = require('mongoose');
const QRCode = require('qrcode');
const Item = require('./models/Item');
const dotenv = require('dotenv');

dotenv.config();

const sampleItems = [
  {
    name: 'Laptop - Dell XPS 13',
    description: 'High-performance ultrabook for development',
    category: 'Electronics',
    totalQuantity: 5,
    serialNumber: 'DELL-XPS-001',
    purchaseDate: new Date('2023-01-15'),
    purchasePrice: 1299.99,
    location: 'Shelf A1',
    condition: 'good'
  },
  {
    name: 'Monitor - 27 inch 4K',
    description: '27-inch 4K resolution monitor with USB-C',
    category: 'Electronics',
    totalQuantity: 8,
    serialNumber: 'MON-4K-001',
    purchaseDate: new Date('2023-02-10'),
    purchasePrice: 599.99,
    location: 'Shelf A2',
    condition: 'good'
  },
  {
    name: 'USB-C Cable',
    description: '2-meter USB-C cable',
    category: 'Accessories',
    totalQuantity: 20,
    serialNumber: 'USB-C-001',
    purchaseDate: new Date('2023-03-01'),
    purchasePrice: 9.99,
    location: 'Box B1',
    condition: 'good'
  },
  {
    name: 'Wireless Mouse',
    description: 'Ergonomic wireless mouse with 2.4GHz',
    category: 'Accessories',
    totalQuantity: 15,
    serialNumber: 'MOUSE-001',
    purchaseDate: new Date('2023-01-20'),
    purchasePrice: 34.99,
    location: 'Box B2',
    condition: 'good'
  },
  {
    name: 'Mechanical Keyboard',
    description: 'RGB mechanical keyboard, Cherry MX switches',
    category: 'Accessories',
    totalQuantity: 12,
    serialNumber: 'KB-RGB-001',
    purchaseDate: new Date('2023-02-15'),
    purchasePrice: 129.99,
    location: 'Box B3',
    condition: 'good'
  },
  {
    name: 'External SSD 1TB',
    description: 'Portable SSD, USB 3.1, 1TB capacity',
    category: 'Storage',
    totalQuantity: 10,
    serialNumber: 'SSD-EXT-001',
    purchaseDate: new Date('2023-04-01'),
    purchasePrice: 99.99,
    location: 'Box C1',
    condition: 'good'
  },
  {
    name: 'Webcam HD',
    description: '1080p HD webcam with microphone',
    category: 'Electronics',
    totalQuantity: 6,
    serialNumber: 'WEB-CAM-001',
    purchaseDate: new Date('2023-03-10'),
    purchasePrice: 49.99,
    location: 'Shelf A3',
    condition: 'good'
  },
  {
    name: 'Stand for Monitor',
    description: 'Adjustable monitor stand with storage',
    category: 'Furniture',
    totalQuantity: 4,
    serialNumber: 'STAND-001',
    purchaseDate: new Date('2023-05-01'),
    purchasePrice: 79.99,
    location: 'Shelf D1',
    condition: 'good'
  }
];

async function loadSampleData() {
  try {
    console.log('\n📦 Loading Sample Data');
    console.log('─'.repeat(50));

    // no need to reconnect; assume caller has already connected

    // Check if items exist
    const existingItems = await Item.countDocuments();
    if (existingItems > 0) {
      console.log(`⚠️  Database already has ${existingItems} items!`);
      console.log('Skipping sample data.\n');
      return;
    }

    // Create items (without individual QR codes)
    let createdCount = 0;
    for (const itemData of sampleItems) {
      try {
        const categoryValue = typeof itemData.category === 'string'
          ? { main: itemData.category, type: itemData.name || 'General' }
          : itemData.category;

        const item = new Item({
          ...itemData,
          category: categoryValue,
          quantity: itemData.totalQuantity,
          qrCode: null, // No individual QR codes needed
          status: 'available'
        });

        await item.save();
        createdCount++;
        console.log(`✅ Created: ${itemData.name}`);
      } catch (err) {
        console.log(`❌ Error creating ${itemData.name}: ${err.message}`);
      }
    }

    console.log('\n' + '─'.repeat(50));
    console.log(`\n📊 Summary: ${createdCount}/${sampleItems.length} items created`);
    console.log('\n🚀 Sample data loaded successfully!');
    console.log('You can now start borrowing items!\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

module.exports = loadSampleData;
