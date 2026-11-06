#!/usr/bin/env bash
set -euo pipefail
systemctl --user stop field-log-server.service
echo stopped
