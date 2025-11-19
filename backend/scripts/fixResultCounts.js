const mongoose = require('mongoose');
const Run = require('../models/Run');

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'scrapi';

async function fixResultCounts() {
  try {
    // Connect to MongoDB
    await mongoose.connect(`${MONGO_URL}/${DB_NAME}`);
    console.log('✅ Connected to MongoDB');
    
    // Get all runs
    const runs = await Run.find({});
    console.log(`📊 Found ${runs.length} runs to check`);
    
    let updatedCount = 0;
    
    for (const run of runs) {
      let actualResultCount = 0;
      
      if (run.output && run.output.length > 0) {
        // Check if output has nested results array
        if (run.output[0].results && Array.isArray(run.output[0].results)) {
          // Count items in results arrays
          actualResultCount = run.output.reduce((total, item) => {
            return total + (item.results ? item.results.length : 0);
          }, 0);
        } else {
          // No nested results, count outer array
          actualResultCount = run.output.length;
        }
      }
      
      // Update if different
      if (run.resultCount !== actualResultCount) {
        console.log(`🔧 Updating run ${run.runId}: ${run.resultCount} -> ${actualResultCount}`);
        run.resultCount = actualResultCount;
        await run.save();
        updatedCount++;
      }
    }
    
    console.log(`✅ Updated ${updatedCount} runs`);
    console.log(`✓ ${runs.length - updatedCount} runs already had correct counts`);
    
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
fixResultCounts();
