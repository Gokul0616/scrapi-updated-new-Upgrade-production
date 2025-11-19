#!/usr/bin/env node

/**
 * Automated Backup Cron Job
 * Run this script via cron for automated backups
 * Example cron: 0 2 * * * node /app/backend/scripts/backup-cron.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const logger = require('../utils/logger');
const backupManager = require('../utils/backup');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

async function runBackup() {
  try {
    logger.info('Starting automated backup job...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URL, {
      dbName: process.env.DB_NAME || 'scrapi',
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info('MongoDB connected');

    // Initialize backup manager
    await backupManager.init();

    // Create backup
    const backup = await backupManager.createBackup();
    logger.info(`Backup completed: ${backup.name}`);
    logger.info(`Backup size: ${(backup.size / 1024 / 1024).toFixed(2)} MB`);

    // Clean old backups
    await backupManager.cleanOldBackups();
    logger.info('Old backups cleaned');

    // Close MongoDB connection
    await mongoose.connection.close();
    logger.info('Backup job completed successfully');

    process.exit(0);
  } catch (error) {
    logger.error('Backup job failed:', error.message);
    process.exit(1);
  }
}

// Run backup
runBackup();
