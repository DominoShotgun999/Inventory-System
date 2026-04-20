const SchoolID = require('../models/SchoolID');

// Get all school IDs
exports.getAllSchoolIDs = async (req, res) => {
  try {
    const schoolIDs = await SchoolID.find().sort({ createdAt: -1 });
    res.json({ success: true, data: schoolIDs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get school ID by ID
exports.getSchoolIDById = async (req, res) => {
  try {
    const schoolID = await SchoolID.findById(req.params.id);
    if (!schoolID) {
      return res.status(404).json({ error: 'School ID not found' });
    }
    res.json({ success: true, data: schoolID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create new school ID
exports.createSchoolID = async (req, res) => {
  try {
    const { name, studentId, printed, released, reprinted, datePrinted, dateReleased } = req.body;

    const schoolID = new SchoolID({
      name,
      studentId,
      printed,
      released,
      reprinted,
      datePrinted,
      dateReleased
    });

    await schoolID.save();
    res.status(201).json({ success: true, data: schoolID });
  } catch (err) {
    if (err.code === 11000) {
      res.status(400).json({ error: 'Student ID already exists' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
};

// Update school ID
exports.updateSchoolID = async (req, res) => {
  try {
    const { name, studentId, printed, released, reprinted, datePrinted, dateReleased } = req.body;

    const schoolID = await SchoolID.findByIdAndUpdate(
      req.params.id,
      {
        name,
        studentId,
        printed,
        released,
        reprinted,
        datePrinted,
        dateReleased,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );

    if (!schoolID) {
      return res.status(404).json({ error: 'School ID not found' });
    }

    res.json({ success: true, data: schoolID });
  } catch (err) {
    if (err.code === 11000) {
      res.status(400).json({ error: 'Student ID already exists' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
};

// Delete school ID
exports.deleteSchoolID = async (req, res) => {
  try {
    const schoolID = await SchoolID.findByIdAndDelete(req.params.id);
    if (!schoolID) {
      return res.status(404).json({ error: 'School ID not found' });
    }
    res.json({ success: true, message: 'School ID deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update print status
exports.updatePrintStatus = async (req, res) => {
  try {
    const { printed, datePrinted } = req.body;

    const schoolID = await SchoolID.findByIdAndUpdate(
      req.params.id,
      {
        printed,
        datePrinted: printed ? datePrinted || Date.now() : null,
        updatedAt: Date.now()
      },
      { new: true }
    );

    if (!schoolID) {
      return res.status(404).json({ error: 'School ID not found' });
    }

    res.json({ success: true, data: schoolID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update release status
exports.updateReleaseStatus = async (req, res) => {
  try {
    const { released, dateReleased } = req.body;

    const schoolID = await SchoolID.findByIdAndUpdate(
      req.params.id,
      {
        released,
        dateReleased: released ? dateReleased || Date.now() : null,
        updatedAt: Date.now()
      },
      { new: true }
    );

    if (!schoolID) {
      return res.status(404).json({ error: 'School ID not found' });
    }

    res.json({ success: true, data: schoolID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update reprint status
exports.updateReprintStatus = async (req, res) => {
  try {
    const { reprinted } = req.body;

    const schoolID = await SchoolID.findByIdAndUpdate(
      req.params.id,
      {
        reprinted,
        updatedAt: Date.now()
      },
      { new: true }
    );

    if (!schoolID) {
      return res.status(404).json({ error: 'School ID not found' });
    }

    res.json({ success: true, data: schoolID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};