import express from 'express';
import { Record } from './models/Record.js';

export const router = express.Router();

// Import records
router.post('/import', async (req, res) => {
  try {
    const { records, sheetName } = req.body;
    
    // Validate records
    const now = new Date();
    const validRecords = records.filter(record => {
      const date = new Date(record.date);
      return date.getMonth() === now.getMonth() && 
             date.getFullYear() === now.getFullYear();
    });

    // Insert records in batches
    const batchSize = 1000;
    const batches = [];
    
    for (let i = 0; i < validRecords.length; i += batchSize) {
      const batch = validRecords.slice(i, i + batchSize).map(record => ({
        ...record,
        sheetName
      }));
      batches.push(Record.insertMany(batch));
    }

    await Promise.all(batches);

    res.json({
      success: true,
      imported: validRecords.length,
      skipped: records.length - validRecords.length
    });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: 'Failed to import records' });
  }
});

// Get records by sheet name
router.get('/records/:sheetName', async (req, res) => {
  try {
    const { sheetName } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const skip = (page - 1) * limit;
    
    const records = await Record.find({ sheetName })
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Record.countDocuments({ sheetName });
    
    res.json({
      records,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch records' });
  }
});