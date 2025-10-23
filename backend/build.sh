#!/usr/bin/env bash
# Build script for production deployment

echo "Starting build process..."

# Install dependencies
pip install -r requirements.txt

# Initialize database if it doesn't exist
python -c "
from app import db, app
with app.app_context():
    db.create_all()
    print('Database initialized successfully')
"

echo "Build completed successfully!" 