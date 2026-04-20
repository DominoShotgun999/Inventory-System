const mongoose = require('mongoose');
const Item = require('./models/Item');

async function run() {
  try {
    await mongoose.connect('mongodb://localhost:27017/inventory-system');
    console.log('Connected to MongoDB');
    const items = await Item.find();
    console.log('Total items:', items.length);
    items.forEach(i => console.log(i.name, 'qty', i.quantity, 'total', i.totalQuantity));
  } catch (e) {
    console.error('Error querying items', e);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();