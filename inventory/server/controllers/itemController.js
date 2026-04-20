const Item = require('../models/Item');
const QRCode = require('qrcode');

// Get all items (supports optional search via ?q= or individual filters)
exports.getAllItems = async (req, res) => {
  try {
    console.log('getAllItems query:', req.query);
    const { q, id, name, category, location, serialNumber } = req.query;

    if (global.useMemory) {
      // perform same filtering on JS array
      let results = inMemory.items.slice();
      if (id) {
        results = results.filter(i => i._id === id);
      } else {
        if (name) {
          const re = new RegExp(name, 'i');
          results = results.filter(i => re.test(i.name));
        }
        if (category) {
          const re = new RegExp(category, 'i');
          results = results.filter(i =>
            re.test(i.category?.main || '') ||
            re.test(i.category?.type || '') ||
            re.test(i.category || '')
          );
        }
        if (location) {
          const re = new RegExp(location, 'i');
          results = results.filter(i => re.test(i.location));
        }
        if (serialNumber) {
          const re = new RegExp(serialNumber, 'i');
          results = results.filter(i => re.test(i.serialNumber));
        }
      }
      if (q) {
        const re = new RegExp(q, 'i');
        results = results.filter(i =>
          re.test(i.name) ||
          re.test(i.category?.main || '') ||
          re.test(i.category?.type || '') ||
          re.test(i.category || '') ||
          re.test(i.brandModel || '') ||
          re.test(i.location) ||
          re.test(i.serialNumber)
        );
      }
      return res.json(results);
    }

    let filter = {};

    if (id) {
      // exact lookup - ignore other filters
      filter._id = id;
    } else {
      if (name) {
        filter.name = new RegExp(name, 'i');
      }
      if (category) {
        const catRegex = new RegExp(category, 'i');
        filter.$or = filter.$or || [];
        filter.$or.push({ 'category.main': catRegex }, { 'category.type': catRegex }, { category: catRegex });
      }
      if (location) {
        filter.location = new RegExp(location, 'i');
      }
      if (serialNumber) {
        filter.serialNumber = new RegExp(serialNumber, 'i');
      }
    }

    if (q) {
      const regex = new RegExp(q, 'i');
      // if there are existing conditions, merge with $or
      const orClauses = [
        { name: regex },
        { category: regex },
        { 'category.main': regex },
        { 'category.type': regex },
        { brandModel: regex },
        { location: regex },
        { serialNumber: regex }
      ];
      if (filter.$or) {
        filter.$or = filter.$or.concat(orClauses);
      } else {
        filter.$or = orClauses;
      }
    }

    console.log('item filter built:', JSON.stringify(filter));
    const items = await Item.find(filter);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get public items (available for borrowing)
exports.getPublicItems = async (req, res) => {
  try {
    if (global.useMemory) {
      return res.json(inMemory.items.filter(i => i.quantity > 0));
    }
    const items = await Item.find({ quantity: { $gt: 0 } }); // Only items with available quantity
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get single item
exports.getItemById = async (req, res) => {
  try {
    if (global.useMemory) {
      const item = inMemory.items.find(i => i._id === req.params.id);
      if (!item) return res.status(404).json({ error: 'Item not found' });
      return res.json(item);
    }
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create item
exports.createItem = async (req, res) => {
  try {
    const { name, description, category, totalQuantity, quantity, condition, status, serialNumber, purchaseDate, purchasePrice, location, image } = req.body;

    if (global.useMemory) {
      const newItem = {
        _id: (inMemory.items.length + 1).toString(),
        name,
        description,
        category: category || { main: 'Other', type: 'Miscellaneous' },
        totalQuantity,
        quantity: quantity !== undefined ? quantity : totalQuantity,
        condition: condition || 'good',
        status: status || 'available',
        serialNumber: serialNumber || new Date().getTime().toString(),
        qrCode: null,
        purchaseDate,
        purchasePrice,
        location,
        image
      };
      inMemory.items.push(newItem);
      return res.status(201).json(newItem);
    }

    const item = new Item({
      name,
      description,
      category: category || { main: 'Other', type: 'Miscellaneous' }, // Support both old and new format
      totalQuantity,
      quantity: quantity !== undefined ? quantity : totalQuantity,
      condition: condition || 'good',
      status: status || 'available',
      serialNumber: serialNumber || new Date().getTime().toString(),
      qrCode: null, // No individual QR codes
      purchaseDate,
      purchasePrice,
      location,
      image
    });

    await item.save();
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update item
exports.updateItem = async (req, res) => {
  try {
    const { name, description, category, totalQuantity, condition, location, image, status, serialNumber, purchaseDate, purchasePrice, quantity, requiresSupervisorApproval } = req.body;

    if (global.useMemory) {
      const item = inMemory.items.find(i => i._id === req.params.id);
      if (!item) return res.status(404).json({ error: 'Item not found' });
      if (name) item.name = name;
      if (description) item.description = description;
      if (category) item.category = category;
      if (totalQuantity) item.totalQuantity = totalQuantity;
      if (condition) item.condition = condition;
      if (location) item.location = location;
      if (image) item.image = image;
      if (status) item.status = status;
      if (serialNumber) item.serialNumber = serialNumber;
      if (purchaseDate) item.purchaseDate = purchaseDate;
      if (purchasePrice !== undefined) item.purchasePrice = purchasePrice;
      if (quantity !== undefined) item.quantity = quantity;
      if (requiresSupervisorApproval !== undefined) item.requiresSupervisorApproval = requiresSupervisorApproval;
      req.app.locals.io.emit('item-updated', item);
      return res.json(item);
    }

    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    if (name) item.name = name;
    if (description) item.description = description;
    if (category) item.category = category;
    if (totalQuantity) item.totalQuantity = totalQuantity;
    if (condition) item.condition = condition;
    if (location) item.location = location;
    if (image) item.image = image;
    if (status) item.status = status;
    if (serialNumber) item.serialNumber = serialNumber;
    if (purchaseDate) item.purchaseDate = purchaseDate;
    if (purchasePrice !== undefined) item.purchasePrice = purchasePrice;
    if (quantity !== undefined) item.quantity = quantity;
    if (requiresSupervisorApproval !== undefined) item.requiresSupervisorApproval = requiresSupervisorApproval;

    await item.save();
    
    // Notify clients of update
    req.app.locals.io.emit('item-updated', item);

    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete item
exports.deleteItem = async (req, res) => {
  try {
    if (global.useMemory) {
      const idx = inMemory.items.findIndex(i => i._id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Item not found' });
      inMemory.items.splice(idx, 1);
      req.app.locals.io.emit('item-deleted', req.params.id);
      return res.json({ message: 'Item deleted successfully' });
    }
    const item = await Item.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    
    // Notify clients of deletion
    req.app.locals.io.emit('item-deleted', req.params.id);

    res.json({ message: 'Item deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get item by serial number / QR scan
exports.getItemByQR = async (req, res) => {
  try {
    const { serialNumber } = req.query;
    if (global.useMemory) {
      const item = inMemory.items.find(i => i.serialNumber === serialNumber);
      if (!item) return res.status(404).json({ error: 'Item not found' });
      return res.json(item);
    }
    const item = await Item.findOne({ serialNumber });
    
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get inventory statistics
exports.getInventoryStats = async (req, res) => {
  try {
    const totalItems = await Item.countDocuments();
    const itemsByStatus = await Item.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const itemsByCategory = await Item.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    const totalQuantity = await Item.aggregate([
      { $group: { _id: null, total: { $sum: '$quantity' } } }
    ]);

    res.json({
      totalItems,
      itemsByStatus,
      itemsByCategory,
      totalQuantity: totalQuantity[0]?.total || 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
