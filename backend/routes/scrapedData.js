const express = require('express');
const router = express.Router();
const Run = require('../models/Run');
const authMiddleware = require('../middleware/auth');

// Get all scraped data (from successful runs with output)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { actorId, search, limit = 20, page = 1 } = req.query;
    
    // Query for successful runs with output data
    let query = { 
      userId: req.userId,
      status: 'succeeded',
      resultCount: { $gt: 0 }
    };
    
    if (actorId) query.actorId = actorId;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const runs = await Run.find(query)
      .sort({ finishedAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);
    
    // Transform runs into scraped data records
    const scrapedDataRecords = [];
    
    runs.forEach(run => {
      if (run.output && Array.isArray(run.output)) {
        run.output.forEach((item, index) => {
          scrapedDataRecords.push({
            id: `${run.runId}-${index}`,
            runId: run.runId,
            actorId: run.actorId,
            actorName: run.actorName,
            dataItem: item,
            scrapedAt: run.finishedAt,
            usage: run.usage,
            itemIndex: index + 1,
            totalItems: run.output.length
          });
        });
      }
    });
    
    // Apply search filter if provided
    let filteredRecords = scrapedDataRecords;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredRecords = scrapedDataRecords.filter(record => {
        const dataString = JSON.stringify(record.dataItem).toLowerCase();
        return dataString.includes(searchLower) || 
               record.actorName.toLowerCase().includes(searchLower);
      });
    }
    
    const total = filteredRecords.length;
    
    res.json({
      data: filteredRecords,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching scraped data:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get scraped data by run ID
router.get('/:runId', authMiddleware, async (req, res) => {
  try {
    const run = await Run.findOne({ 
      runId: req.params.runId,
      userId: req.userId
    });
    
    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }
    
    if (run.status !== 'succeeded' || !run.output) {
      return res.status(404).json({ error: 'No scraped data available for this run' });
    }
    
    res.json({
      runId: run.runId,
      actorId: run.actorId,
      actorName: run.actorName,
      data: run.output,
      resultCount: run.resultCount,
      finishedAt: run.finishedAt,
      usage: run.usage
    });
  } catch (error) {
    console.error('Error fetching scraped data:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
