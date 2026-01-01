#!/bin/bash

# PostgreSQL Setup Script for IRL Application
# Run this after the initial server setup

set -e

echo "========================================="
echo "Setting up PostgreSQL for IRL"
echo "========================================="

# Install PostgreSQL
echo "Installing PostgreSQL..."
apt-get install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# Create database and user
echo "Creating database and user..."
sudo -u postgres psql <<EOF
-- Create production database
CREATE DATABASE irl_production;

-- Create user (replace YOUR_PASSWORD with a strong password)
CREATE USER irl_app WITH PASSWORD 'REPLACE_WITH_STRONG_PASSWORD';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE irl_production TO irl_app;

-- Connect to the database and grant schema privileges
\c irl_production
GRANT ALL ON SCHEMA public TO irl_app;

EOF

echo ""
echo "========================================="
echo "PostgreSQL Setup Complete!"
echo "========================================="
echo ""
echo "Database: irl_production"
echo "User: irl_app"
echo ""
echo "IMPORTANT: Update the DATABASE_URL in /var/www/irl/service/.env with:"
echo 'DATABASE_URL="postgresql://irl_app:YOUR_PASSWORD@localhost:5432/irl_production"'
echo ""
