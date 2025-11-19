#!/bin/bash
set -e

echo "Starting Redis..."
redis-server --daemonize yes
sleep 2
if redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis started successfully"
else
    echo "❌ Redis failed to start"
    exit 1
fi

echo "Starting MongoDB..."
if ! pgrep -x "mongod" > /dev/null; then
    sudo supervisorctl start mongodb
    sleep 3
fi
echo "✅ MongoDB running"

echo "Starting Node.js Backend (API Service)..."
cd /app/backend
pkill -f "node server.js" 2>/dev/null || true
sleep 1
nohup node server.js > /var/log/supervisor/backend.out.log 2> /var/log/supervisor/backend.err.log &
BACKEND_PID=$!
sleep 3
if pgrep -f "node server.js" > /dev/null; then
    echo "✅ Backend API started (PID: $BACKEND_PID)"
    echo "   Logs: tail -f /var/log/supervisor/backend.out.log"
else
    echo "❌ Backend API failed"
    exit 1
fi

echo "Starting Python Scraper Service..."
cd /app/scraper-service
pkill -f "uvicorn server:app" 2>/dev/null || true
sleep 1
nohup python -m uvicorn server:app --host 0.0.0.0 --port 8002 > /var/log/scraper-service.out.log 2> /var/log/scraper-service.err.log &
SCRAPER_PID=$!
sleep 3
if pgrep -f "uvicorn server:app" > /dev/null; then
    echo "✅ Python Scraper Service started (PID: $SCRAPER_PID)"
    echo "   Logs: tail -f /var/log/scraper-service.out.log"
else
    echo "❌ Python Scraper Service failed"
    exit 1
fi

echo "Starting Celery Worker..."
cd /app/scraper-service
pkill -f "celery.*worker" 2>/dev/null || true
sleep 1
nohup celery -A celery_app worker --loglevel=info --concurrency=4 > /var/log/celery-worker.out.log 2> /var/log/celery-worker.err.log &
CELERY_PID=$!
sleep 3
if pgrep -f "celery.*worker" > /dev/null; then
    echo "✅ Celery Worker started (PID: $CELERY_PID)"
    echo "   Logs: tail -f /var/log/celery-worker.out.log"
else
    echo "❌ Celery Worker failed"
    exit 1
fi

echo "Starting Frontend..."
if ! pgrep -f "craco start" > /dev/null; then
    sudo supervisorctl start frontend
    sleep 5
fi

if pgrep -f "craco start" > /dev/null; then
    echo "✅ Frontend started"
else
    echo "❌ Frontend failed"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 ALL SERVICES STARTED SUCCESSFULLY!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Services Status:"
echo "  • MongoDB:          Running (Port 27017)"
echo "  • Redis:            Running (Port 6379)"
echo "  • Node.js API:      Running (Port 8001)"
echo "  • Python Scraper:   Running (Port 8002)"
echo "  • Celery Worker:    Running"
echo "  • Frontend:         Running (Port 3000)"
echo ""
echo "Architecture:"
echo "  • Node.js Backend = API Service ONLY (no scrapers)"
echo "  • Python Service = All Scraping (Playwright + Chromium)"
echo "  • Chromium installed for Python (not Node.js)"
echo ""