"""Startup script for Python Backend"""

import os
import sys
import socket
import subprocess
import uvicorn
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


def is_port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(("127.0.0.1", port)) == 0


def kill_port(port: int):
    """Kill any process occupying the given port (Windows)."""
    try:
        result = subprocess.run(
            ["netstat", "-ano"],
            capture_output=True, text=True, timeout=10
        )
        for line in result.stdout.splitlines():
            if f":{port}" in line and "LISTENING" in line:
                parts = line.split()
                pid = parts[-1]
                subprocess.run(["taskkill", "/PID", pid, "/F"],
                               capture_output=True, timeout=10)
                print(f"[startup] Killed process {pid} on port {port}")
                return True
    except Exception as e:
        print(f"[startup] Could not kill process on port {port}: {e}")
    return False


def main():
    port = int(os.getenv("PORT", 5000))

    # If port is in use, try to free it automatically
    if is_port_in_use(port):
        print(f"[startup] Port {port} is already in use — attempting to free it...")
        killed = kill_port(port)
        if not killed or is_port_in_use(port):
            print(f"[startup] ERROR: Port {port} is still occupied.")
            print(f"[startup] Please close the other process and retry.")
            sys.exit(1)
        import time
        time.sleep(1)  # Brief pause so OS releases the socket
        print(f"[startup] Port {port} freed — starting server...")

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="info",
    )


if __name__ == "__main__":
    main()
