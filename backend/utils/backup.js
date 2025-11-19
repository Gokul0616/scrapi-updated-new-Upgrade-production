const mongoose = require('mongoose');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');

/**
 * MongoDB Backup Utility
 * Provides automated backup functionality with retention policy
 */

class BackupManager {
  constructor() {
    this.backupDir = process.env.BACKUP_DIR || '/app/backups';
    this.retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS) || 7;
    this.dbName = process.env.DB_NAME || 'scrapi';
    this.mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017';
  }

  /**
   * Initialize backup directory
   */
  async init() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      logger.info(`Backup directory initialized: ${this.backupDir}`);
    } catch (error) {
      logger.error('Failed to create backup directory:', error.message);
      throw error;
    }
  }

  /**
   * Create a MongoDB backup
   */
  async createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `backup-${timestamp}`;
    const backupPath = path.join(this.backupDir, backupName);

    logger.info(`Starting MongoDB backup: ${backupName}`);

    return new Promise((resolve, reject) => {
      const command = `mongodump --uri="${this.mongoUrl}/${this.dbName}" --out="${backupPath}" --quiet`;

      exec(command, (error, stdout, stderr) => {
        if (error) {
          logger.error('Backup failed:', error.message);
          return reject(error);
        }

        logger.info(`Backup completed successfully: ${backupName}`);
        resolve({
          name: backupName,
          path: backupPath,
          timestamp: new Date(),
          size: this.getDirectorySize(backupPath)
        });
      });
    });
  }

  /**
   * Clean old backups based on retention policy
   */
  async cleanOldBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const now = Date.now();
      const retentionMs = this.retentionDays * 24 * 60 * 60 * 1000;

      for (const file of files) {
        const filePath = path.join(this.backupDir, file);
        const stats = await fs.stat(filePath);

        if (now - stats.mtimeMs > retentionMs) {
          await fs.rm(filePath, { recursive: true, force: true });
          logger.info(`Deleted old backup: ${file}`);
        }
      }
    } catch (error) {
      logger.error('Failed to clean old backups:', error.message);
    }
  }

  /**
   * Get directory size (simplified)
   */
  async getDirectorySize(dirPath) {
    try {
      const files = await fs.readdir(dirPath, { withFileTypes: true });
      let size = 0;

      for (const file of files) {
        const filePath = path.join(dirPath, file.name);
        if (file.isDirectory()) {
          size += await this.getDirectorySize(filePath);
        } else {
          const stats = await fs.stat(filePath);
          size += stats.size;
        }
      }

      return size;
    } catch (error) {
      return 0;
    }
  }

  /**
   * List all available backups
   */
  async listBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backups = [];

      for (const file of files) {
        const filePath = path.join(this.backupDir, file);
        const stats = await fs.stat(filePath);

        if (stats.isDirectory() && file.startsWith('backup-')) {
          backups.push({
            name: file,
            path: filePath,
            created: stats.mtime,
            size: await this.getDirectorySize(filePath)
          });
        }
      }

      return backups.sort((a, b) => b.created - a.created);
    } catch (error) {
      logger.error('Failed to list backups:', error.message);
      return [];
    }
  }

  /**
   * Restore from backup
   */
  async restoreBackup(backupName) {
    const backupPath = path.join(this.backupDir, backupName, this.dbName);

    logger.info(`Starting restore from backup: ${backupName}`);

    return new Promise((resolve, reject) => {
      const command = `mongorestore --uri="${this.mongoUrl}" --db="${this.dbName}" "${backupPath}" --drop --quiet`;

      exec(command, (error, stdout, stderr) => {
        if (error) {
          logger.error('Restore failed:', error.message);
          return reject(error);
        }

        logger.info(`Restore completed successfully from: ${backupName}`);
        resolve({ success: true, backupName });
      });
    });
  }
}

module.exports = new BackupManager();
