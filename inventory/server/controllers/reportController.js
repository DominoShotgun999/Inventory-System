const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, BorderStyle } = require('docx');
const Item = require('../models/Item');
const Borrowing = require('../models/Borrowing');
const Payment = require('../models/Payment');
const fs = require('fs');
const path = require('path');

// Generate Inventory Report - PDF
exports.generateInventoryPDF = async (req, res) => {
  try {
    const items = await Item.find();

    const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'landscape' });
    const filename = `inventory-report-${Date.now()}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    // Invoice style header (similar to provided screenshot)
    const reportDate = new Date();
    doc.fontSize(24).font('Helvetica-Bold').text('LaSalle Inventory System', { align: 'left' });
    doc.fontSize(10).font('Helvetica').text('Unit 123, 1 LaSalle St, City, Country', { align: 'left' });
    doc.text('Phone: (123) 456-7890 | Email: inventory@lasalle.edu', { align: 'left' });
    doc.moveDown(0.5);

    doc.fontSize(18).font('Helvetica-Bold').text('Inventory Report', { align: 'right' });
    doc.fontSize(10).font('Helvetica').text(`Report Date: ${reportDate.toLocaleString()}`, { align: 'right' });
    doc.fontSize(10).text(`Report ID: INV-${Date.now()}`, { align: 'right' });
    doc.moveDown(0.5);

    // Summary block
    doc.rect(50, doc.y, 700, 60).stroke();
    doc.fontSize(10).font('Helvetica-Bold').text(`Total Items: ${items.length}`, 60, doc.y + 10);
    doc.font('Helvetica').text(`Total Quantity: ${items.reduce((sum, item) => sum + item.totalQuantity, 0)}`, 60, doc.y + 28);
    doc.moveDown(4);

    // Table header
    const tableTop = doc.y;
    const columnPositions = [60, 220, 360, 420, 480, 560, 640];
    doc.fontSize(9).font('Helvetica-Bold');
    ['No', 'Name', 'Category', 'Qty', 'Total', 'Condition', 'Status', 'Location'].forEach((label, i) => {
      const x = columnPositions[i] || 720;
      doc.text(label, x, tableTop);
    });

    doc.moveTo(50, tableTop + 15).lineTo(750, tableTop + 15).stroke();

    // Table rows
    let y = tableTop + 20;
    doc.font('Helvetica');
    items.forEach((item, index) => {
      if (y > 760) {
        doc.addPage();
        y = 50;
      }

      const values = [
        index + 1,
        item.name || 'N/A',
        item.category?.main || item.category || 'N/A',
        item.quantity || 0,
        item.totalQuantity || 0,
        item.condition || 'N/A',
        item.status || 'N/A',
        item.location || 'N/A'
      ];
      values.forEach((value, j) => {
        const x = columnPositions[j] || 720;
        doc.text(String(value), x, y, { width: j === 1 ? 120 : 60 });
      });
      y += 16;
    });

    doc.moveDown(2);
    doc.fontSize(9).font('Helvetica-Bold').text('End of Inventory Report', { align: 'center' });
    doc.end();

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Generate Inventory Report - Excel
exports.generateInventoryExcel = async (req, res) => {
  try {
    const items = await Item.find();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Inventory');

    // Headers
    worksheet.columns = [
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Description', key: 'description', width: 30 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Quantity', key: 'quantity', width: 12 },
      { header: 'Total', key: 'totalQuantity', width: 12 },
      { header: 'Condition', key: 'condition', width: 12 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Location', key: 'location', width: 15 },
      { header: 'Purchase Date', key: 'purchaseDate', width: 15 },
      { header: 'Purchase Price', key: 'purchasePrice', width: 15 }
    ];

    // Style headers
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };

    // Add data
    items.forEach((item) => {
      worksheet.addRow({
        name: item.name,
        description: item.description,
        category: item.category,
        quantity: item.quantity,
        totalQuantity: item.totalQuantity,
        condition: item.condition,
        status: item.status,
        location: item.location,
        purchaseDate: item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString() : '',
        purchasePrice: item.purchasePrice
      });
    });

    const filename = `inventory-report-${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Generate Borrowing Report - PDF
exports.generateBorrowingPDF = async (req, res) => {
  try {
    const filter = req.query.filter;
    let query = {};
    if (filter === 'overdue') {
      query = { expectedReturnDate: { $lt: new Date() }, status: { $in: ['borrowed', 'overdue'] } };
    }
    const borrowings = await Borrowing.find(query).populate('itemId');

    const doc = new PDFDocument({ margin: 50 });
    const filename = `borrowing-report-${Date.now()}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    const reportDate = new Date();
    doc.fontSize(24).font('Helvetica-Bold').text('LaSalle Inventory System', { align: 'left' });
    doc.fontSize(10).font('Helvetica').text('Unit 123, 1 LaSalle St, City, Country', { align: 'left' });
    doc.text('Phone: (123) 456-7890 | Email: inventory@lasalle.edu', { align: 'left' });
    doc.moveDown(0.5);

    doc.fontSize(18).font('Helvetica-Bold').text('Borrowing Report', { align: 'right' });
    doc.fontSize(10).font('Helvetica').text(`Generated: ${reportDate.toLocaleString()}`, { align: 'right' });
    doc.fontSize(10).text(`Report ID: BOR-${Date.now()}`, { align: 'right' });
    doc.moveDown(0.5);

    // Summary block
    doc.rect(50, doc.y, 700, 70).stroke();
    doc.fontSize(10).font('Helvetica-Bold').text(`Total Borrowings: ${borrowings.length}`, 60, doc.y + 10);
    doc.font('Helvetica').text(`Active: ${borrowings.filter(b => b.status === 'borrowed').length}`, 60, doc.y + 28);
    doc.text(`Returned: ${borrowings.filter(b => b.status === 'returned').length}`, 60, doc.y + 46);
    doc.moveDown(4);

    // Table header
    const tableTop = doc.y;
    const colX = [50, 90, 260, 340, 430, 520];
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('No', colX[0], tableTop);
    doc.text('Item', colX[1], tableTop);
    doc.text('Qty', colX[2], tableTop);
    doc.text('Borrow Date', colX[3], tableTop);
    doc.text('Expected Ret', colX[4], tableTop);
    doc.text('Status', colX[5], tableTop);

    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    let y = tableTop + 20;
    doc.fontSize(9).font('Helvetica');

    borrowings.forEach((borrowing, index) => {
      if (y > 760) {
        doc.addPage();
        y = 50;
      }
      const borrowDate = borrowing.borrowDate ? new Date(borrowing.borrowDate).toLocaleDateString() : 'N/A';
      const expectedReturn = borrowing.expectedReturnDate ? new Date(borrowing.expectedReturnDate).toLocaleDateString() : 'N/A';
      doc.text(String(index + 1), colX[0], y);
      doc.text(borrowing.itemId?.name || 'N/A', colX[1], y, { width: 150, ellipsis: true });
      doc.text(String(borrowing.quantity || 0), colX[2], y);
      doc.text(borrowDate, colX[3], y);
      doc.text(expectedReturn, colX[4], y);
      doc.text(borrowing.status || 'N/A', colX[5], y);

      y += 16;
    });

    doc.moveDown(2);
    doc.fontSize(9).font('Helvetica-Bold').text('--- End of Borrowing Report ---', { align: 'center' });
    doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Generate Borrowing Report - Excel
exports.generateBorrowingExcel = async (req, res) => {
  try {
    const borrowings = await Borrowing.find().populate('itemId');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Borrowing');

    worksheet.columns = [
      { header: 'Item Name', key: 'itemName', width: 25 },
      { header: 'Employee', key: 'employeeName', width: 20 },
      { header: 'Employee ID', key: 'employeeId', width: 15 },
      { header: 'Department', key: 'department', width: 15 },
      { header: 'Quantity', key: 'quantity', width: 12 },
      { header: 'Borrow Date', key: 'borrowDate', width: 15 },
      { header: 'Expected Return', key: 'expectedReturnDate', width: 15 },
      { header: 'Actual Return', key: 'actualReturnDate', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Purpose', key: 'purpose', width: 20 }
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };

    borrowings.forEach((borrowing) => {
      worksheet.addRow({
        itemName: borrowing.itemId?.name || 'N/A',
        employeeName: borrowing.employeeName,
        employeeId: borrowing.employeeId,
        department: borrowing.department,
        quantity: borrowing.quantity,
        borrowDate: new Date(borrowing.borrowDate).toLocaleDateString(),
        expectedReturnDate: new Date(borrowing.expectedReturnDate).toLocaleDateString(),
        actualReturnDate: borrowing.actualReturnDate ? new Date(borrowing.actualReturnDate).toLocaleDateString() : '-',
        status: borrowing.status,
        purpose: borrowing.purpose
      });
    });

    const filename = `borrowing-report-${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Generate Payment Report - Excel
exports.generatePaymentExcel = async (req, res) => {
  try {
    const payments = await Payment.find().populate('itemId').populate('borrowingId');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Payments');

    worksheet.columns = [
      { header: 'Item', key: 'itemName', width: 25 },
      { header: 'Employee', key: 'employeeName', width: 20 },
      { header: 'Damage Type', key: 'damageType', width: 15 },
      { header: 'Repair Cost', key: 'repairCost', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Payment Method', key: 'paymentMethod', width: 15 },
      { header: 'Date Created', key: 'createdAt', width: 15 },
      { header: 'Date Paid', key: 'paidDate', width: 15 },
      { header: 'Description', key: 'description', width: 30 }
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };

    payments.forEach((payment) => {
      worksheet.addRow({
        itemName: payment.itemId?.name || 'N/A',
        employeeName: payment.employeeName,
        damageType: payment.damageType,
        repairCost: payment.repairCost,
        status: payment.status,
        paymentMethod: payment.paymentMethod || '-',
        createdAt: new Date(payment.createdAt).toLocaleDateString(),
        paidDate: payment.paidDate ? new Date(payment.paidDate).toLocaleDateString() : '-',
        description: payment.description
      });
    });

    const filename = `payment-report-${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
