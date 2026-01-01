#!/bin/bash

# DigitalOcean Server Setup Script for IRL Application
# This script sets up the production environment on a fresh Ubuntu server
# Run this script as root or with sudo privileges

set -e

echo "========================================="
echo "IRL Application - DigitalOcean Setup"
echo "========================================="

# Update system packages
echo "Updating system packages..."
apt-get update
apt-get upgrade -y

# Install essential packages
echo "Installing essential packages..."
apt-get install -y curl wget git build-essential

# Install Node.js 22
echo "Installing Node.js 22..."
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

# Verify Node.js installation
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"

# Install pnpm
echo "Installing pnpm..."
npm install -g pnpm
echo "pnpm version: $(pnpm --version)"

# Install PM2 globally
echo "Installing PM2..."
npm install -g pm2

# Setup PM2 to start on boot
pm2 startup systemd -u root --hp /root
echo "PM2 installed and configured for auto-start"

# Install nginx
echo "Installing nginx..."
apt-get install -y nginx

# Install certbot for Let's Encrypt SSL
echo "Installing certbot for SSL certificates..."
apt-get install -y certbot python3-certbot-nginx

# Create application directory
echo "Creating application directory..."
mkdir -p /var/www/irl
chown -R www-data:www-data /var/www/irl

# Setup firewall
echo "Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo ""
echo "========================================="
echo "Initial Setup Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Configure DNS to point api.eyearrell.com to this server's IP"
echo "2. Copy the nginx configuration to /etc/nginx/sites-available/irl"
echo "3. Create a symbolic link: ln -s /etc/nginx/sites-available/irl /etc/nginx/sites-enabled/"
echo "4. Copy service/.env.production to /var/www/irl/service/.env and fill in actual values"
echo "5. Setup PostgreSQL database"
echo "6. Run: certbot --nginx -d api.eyearrell.com"
echo "7. The GitHub Actions workflow will handle the rest!"
echo ""
