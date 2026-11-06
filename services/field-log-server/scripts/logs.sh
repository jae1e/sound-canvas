#!/usr/bin/env bash
# Follow the server log (ids, sizes and timings only; never transcript text or tokens).
exec journalctl --user -u field-log-server "${@:--f}"
