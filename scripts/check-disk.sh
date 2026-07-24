#!/bin/bash
# Alerta automática de espacio en disco — Sistema Matrícula E-79
THRESHOLD=80
LOG_FILE="/opt/matricula-e79/logs/disk-alerts.log"

USAGE=$(df / | tail -1 | awk '{print $5}' | tr -d '%')
AVAILABLE=$(df -h / | tail -1 | awk '{print $4}')
TOTAL=$(df -h / | tail -1 | awk '{print $2}')

if [ "$USAGE" -ge "$THRESHOLD" ]; then
    MSG="[$(date '+%Y-%m-%dT%H:%M:%S')] ALERTA DISCO: ${USAGE}% usado (${AVAILABLE} libre de ${TOTAL})"
    echo "$MSG" >> "$LOG_FILE"
    # También al log del sistema para que PM2 lo capture si se ejecuta desde Node
    echo "$MSG" >&2
fi

# Alerta crítica: backups si el directorio supera 1 GB
BACKUP_SIZE=$(du -sm /opt/matricula-e79/backups/postgres/ 2>/dev/null | awk '{print $1}')
if [ -n "$BACKUP_SIZE" ] && [ "$BACKUP_SIZE" -gt 1024 ]; then
    MSG="[$(date '+%Y-%m-%dT%H:%M:%S')] ALERTA BACKUPS: directorio postgres ocupa ${BACKUP_SIZE} MB"
    echo "$MSG" >> "$LOG_FILE"
fi
