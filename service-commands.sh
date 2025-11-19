#!/bin/bash

# ============================================
# Scrapi Service Management Commands
# Quick reference for managing services
# ============================================

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

show_help() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  Scrapi Service Management${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "Usage: bash service-commands.sh [command]"
    echo ""
    echo "Commands:"
    echo "  status          - Check status of all services"
    echo "  start-all       - Start all services"
    echo "  stop-all        - Stop all services"
    echo "  restart-all     - Restart all services"
    echo "  restart-backend - Restart Node.js backend only"
    echo "  restart-scraper - Restart Python scraper service only"
    echo "  restart-celery  - Restart Celery worker only"
    echo "  restart-frontend - Restart React frontend only"
    echo "  logs-backend    - View backend logs"
    echo "  logs-scraper    - View scraper logs"
    echo "  logs-celery     - View Celery logs"
    echo "  logs-frontend   - View frontend logs"
    echo "  health          - Run health checks"
    echo ""
}

check_status() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  Service Status${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    SERVICES_RUNNING=0
    
    if pgrep -x "mongod" > /dev/null; then
        echo -e "  MongoDB:           ${GREEN}✅ Running${NC} (Port 27017)"
        SERVICES_RUNNING=$((SERVICES_RUNNING + 1))
    else
        echo -e "  MongoDB:           ${RED}❌ Not Running${NC}"
    fi
    
    if redis-cli ping > /dev/null 2>&1; then
        echo -e "  Redis:             ${GREEN}✅ Running${NC} (Port 6379)"
        SERVICES_RUNNING=$((SERVICES_RUNNING + 1))
    else
        echo -e "  Redis:             ${RED}❌ Not Running${NC}"
    fi
    
    if pgrep -f "node server.js" > /dev/null; then
        echo -e "  Backend:           ${GREEN}✅ Running${NC} (Port 8001)"
        SERVICES_RUNNING=$((SERVICES_RUNNING + 1))
    else
        echo -e "  Backend:           ${RED}❌ Not Running${NC}"
    fi
    
    if pgrep -f "uvicorn server:app.*8002" > /dev/null; then
        echo -e "  Python Scraper:    ${GREEN}✅ Running${NC} (Port 8002)"
        SERVICES_RUNNING=$((SERVICES_RUNNING + 1))
    else
        echo -e "  Python Scraper:    ${RED}❌ Not Running${NC}"
    fi
    
    if pgrep -f "celery.*worker" > /dev/null; then
        CELERY_COUNT=$(pgrep -f "celery.*worker" | wc -l)
        echo -e "  Celery Worker:     ${GREEN}✅ Running${NC} ($CELERY_COUNT processes)"
        SERVICES_RUNNING=$((SERVICES_RUNNING + 1))
    else
        echo -e "  Celery Worker:     ${RED}❌ Not Running${NC}"
    fi
    
    if pgrep -f "craco start" > /dev/null; then
        echo -e "  Frontend:          ${GREEN}✅ Running${NC} (Port 3000)"
        SERVICES_RUNNING=$((SERVICES_RUNNING + 1))
    else
        echo -e "  Frontend:          ${RED}❌ Not Running${NC}"
    fi
    
    echo ""
    echo -e "Summary: ${BLUE}$SERVICES_RUNNING/6${NC} services running"
    echo ""
}

start_all() {
    echo -e "${GREEN}Starting all services...${NC}"
    bash /app/application_startup.sh
}

stop_all() {
    echo -e "${YELLOW}Stopping all services...${NC}"
    pkill -f "node server.js" 2>/dev/null || true
    pkill -f "uvicorn server:app" 2>/dev/null || true
    pkill -9 -f "celery.*worker" 2>/dev/null || true
    sudo supervisorctl stop frontend 2>/dev/null || true
    echo -e "${GREEN}✅ All application services stopped${NC}"
    echo -e "${YELLOW}Note: MongoDB and Redis are still running (system services)${NC}"
}

restart_backend() {
    echo -e "${YELLOW}Restarting backend...${NC}"
    pkill -f "node server.js" 2>/dev/null || true
    sleep 2
    cd /app/backend
    nohup node server.js > /var/log/supervisor/backend.out.log 2> /var/log/supervisor/backend.err.log &
    sleep 3
    if pgrep -f "node server.js" > /dev/null; then
        echo -e "${GREEN}✅ Backend restarted successfully${NC}"
    else
        echo -e "${RED}❌ Backend failed to restart${NC}"
    fi
}

restart_scraper() {
    echo -e "${YELLOW}Restarting Python scraper...${NC}"
    pkill -f "uvicorn server:app" 2>/dev/null || true
    sleep 2
    cd /app/scraper-service
    nohup python -m uvicorn server:app --host 0.0.0.0 --port 8002 > /var/log/scraper-service.out.log 2> /var/log/scraper-service.err.log &
    sleep 3
    if pgrep -f "uvicorn server:app.*8002" > /dev/null; then
        echo -e "${GREEN}✅ Python scraper restarted successfully${NC}"
    else
        echo -e "${RED}❌ Python scraper failed to restart${NC}"
    fi
}

restart_celery() {
    echo -e "${YELLOW}Restarting Celery worker...${NC}"
    pkill -9 -f "celery.*worker" 2>/dev/null || true
    sleep 2
    cd /app/scraper-service
    nohup celery -A celery_app worker --loglevel=info --concurrency=4 > /var/log/celery-worker.out.log 2> /var/log/celery-worker.err.log &
    sleep 3
    if pgrep -f "celery.*worker" > /dev/null; then
        echo -e "${GREEN}✅ Celery worker restarted successfully${NC}"
    else
        echo -e "${RED}❌ Celery worker failed to restart${NC}"
    fi
}

restart_frontend() {
    echo -e "${YELLOW}Restarting frontend...${NC}"
    sudo supervisorctl restart frontend
    sleep 3
    if pgrep -f "craco start" > /dev/null; then
        echo -e "${GREEN}✅ Frontend restarted successfully${NC}"
    else
        echo -e "${RED}❌ Frontend failed to restart${NC}"
    fi
}

health_check() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  Health Checks${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    # Check Python Scraper health
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
    
    # Check Redis
    if redis-cli ping > /dev/null 2>&1; then
        echo -e "  Redis:             ${GREEN}✅ Healthy${NC}"
    else
        echo -e "  Redis:             ${RED}❌ Not responding${NC}"
    fi
    
    # Check MongoDB
    if pgrep -x mongod > /dev/null; then
        echo -e "  MongoDB:           ${GREEN}✅ Running${NC}"
    else
        echo -e "  MongoDB:           ${RED}❌ Not running${NC}"
    fi
    
    echo ""
}

# Main command handler
case "$1" in
    status)
        check_status
        ;;
    start-all)
        start_all
        ;;
    stop-all)
        stop_all
        ;;
    restart-all)
        stop_all
        sleep 3
        start_all
        ;;
    restart-backend)
        restart_backend
        ;;
    restart-scraper)
        restart_scraper
        ;;
    restart-celery)
        restart_celery
        ;;
    restart-frontend)
        restart_frontend
        ;;
    logs-backend)
        tail -f /var/log/supervisor/backend.out.log
        ;;
    logs-scraper)
        tail -f /var/log/scraper-service.out.log
        ;;
    logs-celery)
        tail -f /var/log/celery-worker.out.log
        ;;
    logs-frontend)
        tail -f /var/log/supervisor/frontend.out.log
        ;;
    health)
        health_check
        ;;
    *)
        show_help
        ;;
esac
