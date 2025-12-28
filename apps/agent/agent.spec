# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller spec file for DistributedCompute Agent."""

import platform
import sys
from pathlib import Path

# Determine platform-specific settings
system = platform.system().lower()
machine = platform.machine().lower()

if system == "windows":
    exe_name = "distributed-agent.exe"
    icon = None  # Add icon path if available
elif system == "darwin":
    exe_name = "distributed-agent"
    icon = None
else:  # Linux
    exe_name = "distributed-agent"
    icon = None

# Analysis
a = Analysis(
    ["src/distributed_agent/main.py"],
    pathex=[],
    binaries=[],
    datas=[],
    hiddenimports=[
        "pynvml",
        "speedtest",
        "docker",
        "docker.transport",
        "docker.api",
        "docker.models",
        "websockets",
        "websockets.client",
        "websockets.exceptions",
        "typer",
        "typer.main",
        "rich",
        "rich.console",
        "rich.panel",
        "rich.table",
        "pydantic",
        "pydantic_settings",
        "structlog",
        "yaml",
        "aiohttp",
        "psutil",
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        "tkinter",
        "matplotlib",
        "numpy",
        "pandas",
        "scipy",
        "PIL",
        "cv2",
    ],
    noarchive=False,
)

# Remove unnecessary data
pyz = PYZ(a.pure, a.zipped_data, cipher=None)

# Single executable
exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name=exe_name,
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=icon,
)
