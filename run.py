#!/usr/bin/env python
"""
Startup script for the AI Surveillance Dashboard backend
Run this from the project root directory to start the Flask server
"""

import os
import sys

# Add backend directory to path
backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.insert(0, backend_dir)

# Change to backend directory
os.chdir(backend_dir)

# Import and run the app
# pyrefly: ignore [missing-import]
from app import app

if __name__ == '__main__':
    print("=" * 50)
    print("AI Surveillance Dashboard - Backend Server")
    print("=" * 50)
    app.run(debug=False, use_reloader=False)
