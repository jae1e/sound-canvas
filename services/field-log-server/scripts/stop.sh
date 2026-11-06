#!/usr/bin/env bash
set -euo pipefail
systemctl --user stop field-log-server.service || true
# A stopped transient unit that exited with SIGTERM stays "failed" and blocks the next start.
systemctl --user reset-failed field-log-server.service 2>/dev/null || true
echo stopped
