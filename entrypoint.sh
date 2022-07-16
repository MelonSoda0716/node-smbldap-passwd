#!/bin/bash

DATETIME=`date '+%Y%m'`
mkdir -p /opt/application/logs
cd /opt/application/ && npm install
cd /opt/application/ && npm start 2>&1 | tee logs/log_$DATETIME.log
tail -f /dev/null
