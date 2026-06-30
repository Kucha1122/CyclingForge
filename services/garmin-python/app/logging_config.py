"""Structured JSON logging for the Garmin service.

In a k8s pod, reconfigures uvicorn's loggers to emit single-line JSON so Alloy can
parse the fields (level, message, timestamp, logger) the same way it does for the
.NET backend's Serilog output, landing everything in Loki with a consistent shape.

Locally (run.ps1 / bare uvicorn) JSON is unreadable noise, so we leave uvicorn's
default human-readable logging untouched there. Detected via KUBERNETES_SERVICE_HOST,
which the kubelet always injects into containers — no extra config needed.
"""
from __future__ import annotations

import logging
import os

from pythonjsonlogger import jsonlogger

_IN_KUBERNETES = "KUBERNETES_SERVICE_HOST" in os.environ


def configure_logging(level: str = "INFO") -> None:
    if not _IN_KUBERNETES:
        return

    handler = logging.StreamHandler()
    handler.setFormatter(
        jsonlogger.JsonFormatter(
            "%(asctime)s %(levelname)s %(name)s %(message)s",
            rename_fields={"levelname": "level", "asctime": "timestamp", "name": "logger"},
        )
    )

    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(level)

    # Route uvicorn's own loggers through the same JSON handler.
    for name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        log = logging.getLogger(name)
        log.handlers = [handler]
        log.propagate = False
        log.setLevel(level)
