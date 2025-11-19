#!/bin/bash

# ============================================
# MongoDB Backup Script
# Automated daily backups with rotation
# ============================================

set -e

# Configuration
BACKUP_DIR="/app/backups/mongodb"
MONGO_DB="${DB_NAME:-scrapi}"
MONGO_HOST="${MONGO_HOST:-localhost}"
MONGO_PORT="${MONGO_PORT:-27017}"
RETENTION_DAYS=7  # Keep backups for 7 days
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="scrapi_backup_${DATE}"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

log_info "Starting MongoDB backup..."
log_info "Database: ${MONGO_DB}"
log_info "Backup location: ${BACKUP_DIR}/${BACKUP_NAME}"

# Perform backup
if mongodump --host="${MONGO_HOST}" --port="${MONGO_PORT}" --db="${MONGO_DB}" --out="${BACKUP_DIR}/${BACKUP_NAME}" --quiet; then
    log_success "Backup completed successfully"
    
    # Compress backup
    log_info "Compressing backup..."
    cd "${BACKUP_DIR}"
    tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}"
    rm -rf "${BACKUP_NAME}"
    
    BACKUP_SIZE=$(du -h "${BACKUP_NAME}.tar.gz" | cut -f1)
    log_success "Backup compressed: ${BACKUP_SIZE}"
    
    # Remove old backups (older than RETENTION_DAYS)
    log_info "Removing backups older than ${RETENTION_DAYS} days..."
    find "${BACKUP_DIR}" -name "scrapi_backup_*.tar.gz" -type f -mtime +${RETENTION_DAYS} -delete
    
    REMAINING_BACKUPS=$(find "${BACKUP_DIR}" -name "scrapi_backup_*.tar.gz" -type f | wc -l)
    log_success "Backup retention applied. ${REMAINING_BACKUPS} backups remaining"
    
    # List all backups
    log_info "Available backups:"
    ls -lh "${BACKUP_DIR}/"scrapi_backup_*.tar.gz 2>/dev/null | awk '{print "  - " $9 " (" $5 ")"}'
    
else
    log_error "Backup failed!"
    exit 1
fi

log_success "MongoDB backup completed: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
