#!/bin/bash

# ============================================
# Scrapi Application Startup Script
# Complete startup for frontend, backend, and dependencies
# ============================================

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ ${NC}$1"
}

log_success() {
    echo -e "${GREEN}✅ ${NC}$1"
}

log_warning() {
    echo -e "${YELLOW}⚠️  ${NC}$1"
}

log_error() {
    echo -e "${RED}❌ ${NC}$1"
}

log_section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# ============================================
# STEP 1: System Dependencies
# ============================================
log_section "STEP 1: Installing System Dependencies"

# Function to wait for apt lock
wait_for_apt_lock() {
    local max_wait=300  # 5 minutes max
    local waited=0
    
    while fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1 || fuser /var/lib/dpkg/lock >/dev/null 2>&1; do
        if [ $waited -ge $max_wait ]; then
            log_warning "Apt lock held for too long, removing locks..."
            rm -f /var/lib/dpkg/lock-frontend /var/lib/dpkg/lock /var/cache/apt/archives/lock 2>/dev/null
            dpkg --configure -a 2>/dev/null || true
            break
        fi
        log_info "Waiting for apt lock to be released... ($waited seconds)"
        sleep 5
        waited=$((waited + 5))
    done
}

log_info "Checking for Chromium..."
if ! command -v chromium &> /dev/null; then
    log_info "Installing Chromium for Python Playwright..."
    wait_for_apt_lock
    apt-get update -qq
    apt-get install -y -qq chromium
    log_success "Chromium installed: $(chromium --version)"
else
    log_success "Chromium already installed: $(chromium --version)"
fi

log_info "Checking for Redis..."
if ! command -v redis-server &> /dev/null; then
    log_info "Installing Redis server..."
    wait_for_apt_lock
    apt-get update -qq
    apt-get install -y -qq redis-server
    log_success "Redis installed: $(redis-server --version)"
else
    log_success "Redis already installed: $(redis-server --version)"
fi

# ============================================
# STEP 1.5: Python Scraper Dependencies
# ============================================
log_section "STEP 1.5: Installing Python Scraper Dependencies"

cd /app/scraper-service

log_info "Installing Python dependencies..."
pip install -r requirements.txt -q
log_success "Python dependencies installed"

log_info "Checking Playwright Chromium installation..."
# Check if Chromium is already installed
if [ -d "/pw-browsers/chromium-1148" ] || [ -d "/root/.cache/ms-playwright/chromium-1148" ]; then
    log_success "Playwright Chromium already installed"
else
    log_info "Installing Playwright browsers (Chromium)..."
    python -m playwright install chromium
    log_success "Playwright Chromium installed"
fi

# ============================================
# STEP 2: Backend Dependencies (Node.js API Service)
# ============================================
log_section "STEP 2: Installing Backend Dependencies (Node.js API)"

cd /app/backend

if [ ! -d "node_modules" ]; then
    log_info "Installing backend dependencies with yarn..."
    yarn install
    log_success "Backend dependencies installed"
else
    log_info "Backend node_modules exists, checking for updates..."
    yarn install --check-files
    log_success "Backend dependencies verified"
fi

# ============================================
# STEP 3: Frontend Dependencies
# ============================================
log_section "STEP 3: Installing Frontend Dependencies"

cd /app/frontend

if [ ! -d "node_modules" ]; then
    log_info "Installing frontend dependencies with yarn..."
    yarn install
    log_success "Frontend dependencies installed"
else
    log_info "Frontend node_modules exists, checking for updates..."
    yarn install --check-files
    log_success "Frontend dependencies verified"
fi

# ============================================
# STEP 4: MongoDB
# ============================================
log_section "STEP 4: Starting MongoDB"

# Check if MongoDB is already running
if pgrep -x "mongod" > /dev/null; then
    log_success "MongoDB is already running"
else
    log_info "Starting MongoDB..."
    sudo supervisorctl start mongodb
    sleep 2
    
    if pgrep -x "mongod" > /dev/null; then
        log_success "MongoDB started successfully"
    else
        log_error "Failed to start MongoDB"
        exit 1
    fi
fi

# ============================================
# STEP 4.5: Redis
# ============================================
log_section "STEP 4.5: Starting Redis"

# Check if Redis is already running
if pgrep -x "redis-server" > /dev/null; then
    log_success "Redis is already running"
else
    log_info "Starting Redis..."
    redis-server --daemonize yes
    sleep 2
    
    if redis-cli ping > /dev/null 2>&1; then
        log_success "Redis started successfully"
    else
        log_error "Failed to start Redis"
        exit 1
    fi
fi

# ============================================
# STEP 5: Backend Server
# ============================================
log_section "STEP 5: Starting Backend Server"

cd /app/backend

# Kill any existing backend processes
if pgrep -f "node server.js" > /dev/null; then
    log_warning "Stopping existing backend process..."
    pkill -f "node server.js" || true
    sleep 2
fi

# Check if supervisor backend config exists and fix if needed
if [ -f /etc/supervisor/conf.d/supervisord.conf ]; then
    # Check if backend is configured with uvicorn (wrong)
    if grep -q "uvicorn.*backend" /etc/supervisor/conf.d/supervisord.conf 2>/dev/null; then
        log_warning "Fixing supervisor backend configuration (was using uvicorn for Node.js)..."
        sudo supervisorctl stop backend 2>/dev/null || true
    fi
fi

# Start backend with Node.js directly (not via supervisor for reliability)
log_info "Starting backend server with Node.js..."
nohup node server.js > /var/log/supervisor/backend.out.log 2> /var/log/supervisor/backend.err.log &
BACKEND_PID=$!

# Wait for backend to start
sleep 5

if pgrep -f "node server.js" > /dev/null; then
    log_success "Backend server started successfully on port 8001 (PID: $BACKEND_PID)"
    log_info "Checking backend logs..."
    tail -n 5 /var/log/supervisor/backend.out.log
else
    log_error "Failed to start backend server"
    log_error "Check logs: tail -f /var/log/supervisor/backend.err.log"
    exit 1
fi

# ============================================
# STEP 6: Python Scraper Service
# ============================================
log_section "STEP 6: Starting Python Scraper Service"

cd /app/scraper-service

# Kill any existing scraper service processes
if pgrep -f "uvicorn server:app" > /dev/null; then
    log_warning "Stopping existing Python scraper service..."
    pkill -f "uvicorn server:app" || true
    sleep 2
fi

# Start Python scraper service
log_info "Starting Python scraper service on port 8002..."
nohup python -m uvicorn server:app --host 0.0.0.0 --port 8002 > /var/log/scraper-service.out.log 2> /var/log/scraper-service.err.log &
SCRAPER_PID=$!

sleep 3

if pgrep -f "uvicorn server:app" > /dev/null; then
    log_success "Python scraper service started successfully (PID: $SCRAPER_PID)"
else
    log_error "Failed to start Python scraper service"
    log_error "Check logs: tail -f /var/log/scraper-service.err.log"
    exit 1
fi

# ============================================
# STEP 7: Celery Worker
# ============================================
log_section "STEP 7: Starting Celery Worker"

# Check if Redis is running (required for Celery)
if ! redis-cli ping > /dev/null 2>&1; then
    log_error "Redis is not running! Celery requires Redis as message broker."
    log_error "Please ensure Redis is running before starting Celery worker."
    exit 1
fi

# Kill any existing Celery workers
if pgrep -f "celery.*worker" > /dev/null; then
    log_warning "Stopping existing Celery workers..."
    pkill -9 -f "celery.*worker" || true
    sleep 2
fi

# Start Celery worker
log_info "Starting Celery worker..."
cd /app/scraper-service
nohup celery -A celery_app worker --loglevel=info --concurrency=4 > /var/log/celery-worker.out.log 2> /var/log/celery-worker.err.log &
CELERY_PID=$!

sleep 5

if pgrep -f "celery.*worker" > /dev/null; then
    log_success "Celery worker started successfully ($(pgrep -f 'celery.*worker' | wc -l) processes running)"
else
    log_error "Failed to start Celery worker"
    log_error "Check logs: tail -f /var/log/celery-worker.err.log"
    exit 1
fi

# ============================================
# STEP 8: Frontend Server
# ============================================
log_section "STEP 8: Starting Frontend Server"

# Check if frontend is already running
if pgrep -f "craco start" > /dev/null; then
    log_success "Frontend is already running on port 3000"
else
    log_info "Starting frontend server..."
    sudo supervisorctl start frontend
    sleep 5
    
    if pgrep -f "craco start" > /dev/null; then
        log_success "Frontend server started successfully on port 3000"
    else
        log_error "Failed to start frontend server"
        log_error "Check logs: tail -f /var/log/supervisor/frontend.err.log"
        exit 1
    fi
fi

# ============================================
# STEP 9: Verification
# ============================================
log_section "STEP 9: Service Verification"

echo ""
log_info "Service Status:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check MongoDB
if pgrep -x "mongod" > /dev/null; then
    echo -e "  MongoDB:           ${GREEN}✅ Running${NC} (Port 27017)"
else
    echo -e "  MongoDB:           ${RED}❌ Not Running${NC}"
fi

# Check Redis
if redis-cli ping > /dev/null 2>&1; then
    echo -e "  Redis:             ${GREEN}✅ Running${NC} (Port 6379)"
else
    echo -e "  Redis:             ${RED}❌ Not Running${NC}"
fi

# Check Backend
if pgrep -f "node server.js" > /dev/null; then
    echo -e "  Node.js Backend:   ${GREEN}✅ Running${NC} (Port 8001)"
else
    echo -e "  Node.js Backend:   ${RED}❌ Not Running${NC}"
fi

# Check Python Scraper Service
if pgrep -f "uvicorn server:app.*8002" > /dev/null; then
    echo -e "  Python Scraper:    ${GREEN}✅ Running${NC} (Port 8002)"
else
    echo -e "  Python Scraper:    ${RED}❌ Not Running${NC}"
fi

# Check Celery Worker
if pgrep -f "celery.*worker" > /dev/null; then
    CELERY_COUNT=$(pgrep -f "celery.*worker" | wc -l)
    echo -e "  Celery Worker:     ${GREEN}✅ Running${NC} ($CELERY_COUNT processes)"
else
    echo -e "  Celery Worker:     ${RED}❌ Not Running${NC}"
fi

# Check Frontend
if pgrep -f "craco start" > /dev/null; then
    echo -e "  React Frontend:    ${GREEN}✅ Running${NC} (Port 3000)"
else
    echo -e "  React Frontend:    ${RED}❌ Not Running${NC}"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Health Checks
log_info "Health Checks:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test Python Scraper health endpoint
if curl -s http://localhost:8002/health > /dev/null 2>&1; then
    HEALTH_STATUS=$(curl -s http://localhost:8002/health | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    if [ "$HEALTH_STATUS" = "healthy" ]; then
        echo -e "  Scraper Service:   ${GREEN}✅ Healthy${NC} (Redis connected)"
    else
        echo -e "  Scraper Service:   ${YELLOW}⚠️  Running but unhealthy${NC}"
    fi
else
    echo -e "  Scraper Service:   ${RED}❌ Health check failed${NC}"
fi

# Test Backend
if curl -s http://localhost:8001/api/health > /dev/null 2>&1; then
    echo -e "  Backend API:       ${GREEN}✅ Healthy${NC}"
else
    echo -e "  Backend API:       ${YELLOW}⚠️  No health endpoint${NC}"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check open ports
log_info "Open Ports:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
netstat -tlnp 2>/dev/null | grep -E "3000|8001|8002|27017|6379" | awk '{print "  "$4" -> "$7}' || echo "  Could not check ports"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ============================================
# FINAL STATUS
# ============================================
log_section "🎉 APPLICATION STARTUP COMPLETE!"

# Count running services
SERVICES_RUNNING=0
pgrep -x "mongod" > /dev/null && SERVICES_RUNNING=$((SERVICES_RUNNING + 1))
redis-cli ping > /dev/null 2>&1 && SERVICES_RUNNING=$((SERVICES_RUNNING + 1))
pgrep -f "node server.js" > /dev/null && SERVICES_RUNNING=$((SERVICES_RUNNING + 1))
pgrep -f "uvicorn server:app.*8002" > /dev/null && SERVICES_RUNNING=$((SERVICES_RUNNING + 1))
pgrep -f "celery.*worker" > /dev/null && SERVICES_RUNNING=$((SERVICES_RUNNING + 1))
pgrep -f "craco start" > /dev/null && SERVICES_RUNNING=$((SERVICES_RUNNING + 1))

if [ $SERVICES_RUNNING -eq 6 ]; then
    echo ""
    echo -e "${GREEN}✅ All 6 services running successfully!${NC}"
    echo ""
elif [ $SERVICES_RUNNING -ge 4 ]; then
    echo ""
    echo -e "${YELLOW}⚠️  $SERVICES_RUNNING/6 services running (some issues detected)${NC}"
    echo ""
else
    echo ""
    echo -e "${RED}❌ Only $SERVICES_RUNNING/6 services running (startup failed)${NC}"
    echo ""
fi

echo "📍 Access Points:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  • Frontend:         http://localhost:3000"
echo "  • Node.js Backend:  http://localhost:8001"
echo "  • Python Scraper:   http://localhost:8002"
echo "  • MongoDB:          mongodb://localhost:27017"
echo "  • Redis:            redis://localhost:6379"
echo ""
echo "📋 Useful Commands:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  • View backend logs:       tail -f /var/log/supervisor/backend.out.log"
echo "  • View scraper logs:       tail -f /var/log/scraper-service.out.log"
echo "  • View Celery logs:        tail -f /var/log/celery-worker.out.log"
echo "  • View frontend logs:      tail -f /var/log/supervisor/frontend.out.log"
echo "  • Check services:          ps aux | grep -E 'node|mongod|celery|uvicorn'"
echo ""
echo "🔄 Restart Commands:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  • Restart all:             bash /app/application_startup.sh"
echo "  • Restart backend:         pkill -f 'node server.js' && cd /app/backend && nohup node server.js > /var/log/supervisor/backend.out.log 2>&1 &"
echo "  • Restart Python scraper:  pkill -f 'uvicorn server:app' && cd /app/scraper-service && nohup python -m uvicorn server:app --host 0.0.0.0 --port 8002 > /var/log/scraper-service.out.log 2>&1 &"
echo "  • Restart Celery:          pkill -9 -f 'celery.*worker' && cd /app/scraper-service && nohup celery -A celery_app worker --loglevel=info --concurrency=4 > /var/log/celery-worker.out.log 2>&1 &"
echo "  • Restart frontend:        sudo supervisorctl restart frontend"
echo ""

if [ $SERVICES_RUNNING -eq 6 ]; then
    log_success "All services started successfully! Application ready for use."
elif [ $SERVICES_RUNNING -ge 4 ]; then
    log_warning "Most services started, but some issues detected. Check logs for details."
else
    log_error "Startup failed. Check logs and try manual restart."
fi
echo ""
