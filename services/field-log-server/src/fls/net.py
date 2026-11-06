"""Bind-address policy: loopback or the Tailscale CGNAT range only."""

from __future__ import annotations

import ipaddress
import subprocess

TAILNET = ipaddress.ip_network("100.64.0.0/10")


def validate_host(host: str) -> str:
    try:
        ip = ipaddress.ip_address(host)
    except ValueError:
        raise SystemExit(f"refusing to bind '{host}': give an IP literal (127.0.0.1 or a 100.64.0.0/10 address)")
    if ip.version == 4 and (str(ip) == "127.0.0.1" or ip in TAILNET):
        return str(ip)
    raise SystemExit(f"refusing to bind {host}: only 127.0.0.1 and 100.64.0.0/10 (tailnet) are allowed")


def tailscale_ipv4() -> str:
    try:
        out = subprocess.run(["tailscale", "ip", "-4"], capture_output=True, text=True, timeout=10, check=True)
        return out.stdout.split()[0]
    except (OSError, subprocess.SubprocessError, IndexError):
        raise SystemExit("cannot determine the tailnet address; pass --host explicitly") from None
