# IRL Application - Deployment Guide

This guide walks you through deploying the IRL application with:
- **Frontend**: GitHub Pages at https://eyearrell.com
- **Backend API**: DigitalOcean droplet at https://api.eyearrell.com (178.128.11.67)

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [DNS Configuration](#dns-configuration)
3. [DigitalOcean Server Setup](#digitalocean-server-setup)
4. [GitHub Configuration](#github-configuration)
5. [First Deployment](#first-deployment)
6. [Verification](#verification)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

- DigitalOcean droplet running Ubuntu (178.128.11.67)
- SSH access to the droplet
- Domain name: eyearrell.com
- GitHub repository with Actions enabled
- Production credentials for:
  - PostgreSQL database
  - MailerSend API
  - Cloudinary

## DNS Configuration

Configure your DNS records with your domain registrar:

### Required DNS Records

```
# Frontend - GitHub Pages
Type: A
Name: @ (or root)
Value: 185.199.108.153

Type: A
Name: @ (or root)
Value: 185.199.109.153

Type: A
Name: @ (or root)
Value: 185.199.110.153

Type: A
Name: @ (or root)
Value: 185.199.111.153

Type: CNAME
Name: www
Value: eyearrell.com

# Backend API - DigitalOcean
Type: A
Name: api
Value: 178.128.11.67
```

**Note**: DNS propagation can take up to 48 hours, but usually happens within a few hours.

## DigitalOcean Server Setup

### Step 1: Connect to Your Server

```bash
ssh root@178.128.11.67
```

### Step 2: Run Initial Setup Script

Copy the setup script to your server and run it:

```bash
# On your local machine
scp scripts/setup-digitalocean.sh root@178.128.11.67:/root/

# On the server
ssh root@178.128.11.67
chmod +x /root/setup-digitalocean.sh
./setup-digitalocean.sh
```

This script will:
- Update system packages
- Install Node.js 22
- Install pnpm
- Install PM2 process manager
- Install nginx
- Install certbot for SSL
- Configure firewall

### Step 3: Setup PostgreSQL

```bash
# Copy and run the PostgreSQL setup script
scp scripts/setup-postgres.sh root@178.128.11.67:/root/
ssh root@178.128.11.67
chmod +x /root/setup-postgres.sh
./setup-postgres.sh
```

**IMPORTANT**: Save the database password securely. You'll need it for the `.env` file.

### Step 4: Configure Nginx

```bash
# On your local machine, copy nginx config
scp scripts/nginx-irl.conf root@178.128.11.67:/etc/nginx/sites-available/irl

# On the server
ssh root@178.128.11.67
ln -s /etc/nginx/sites-available/irl /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default  # Remove default config
nginx -t  # Test configuration
systemctl reload nginx
```

### Step 5: Setup SSL Certificate

**Wait for DNS propagation** before running this step. Verify DNS is working:

```bash
dig api.eyearrell.com
```

Then obtain SSL certificate:

```bash
certbot --nginx -d api.eyearrell.com
```

Follow the prompts:
- Enter your email address
- Agree to terms of service
- Choose whether to share email with EFF
- Certbot will automatically configure nginx

### Step 6: Configure Environment Variables

Create the production environment file:

```bash
# On the server
mkdir -p /var/www/irl/service
nano /var/www/irl/service/.env
```

Copy the contents from `service/.env.production` and fill in actual values:

```env
DATABASE_URL="postgresql://irl_app:YOUR_DB_PASSWORD@localhost:5432/irl_production"
CLIENT_URL="https://eyearrell.com"
SESSION_SECRET="GENERATE_RANDOM_32_CHAR_STRING"
SERVICE_PUBLIC_URL="https://api.eyearrell.com"
NODE_ENV=production
SERVICE_PORT=3001

MAILERSEND_API_TOKEN=YOUR_ACTUAL_TOKEN
MAILERSEND_FROM_NAME=IRL
MAILERSEND_FROM_EMAIL=YOUR_FROM_EMAIL

CLOUDINARY_API_KEY=YOUR_ACTUAL_KEY
CLOUDINARY_API_SECRET=YOUR_ACTUAL_SECRET
CLOUDINARY_CLOUD_NAME=YOUR_CLOUD_NAME
```

**Generate a secure SESSION_SECRET**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## GitHub Configuration

### Step 1: Setup GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:

| Secret Name | Value | Description |
|------------|-------|-------------|
| `DO_SSH_PRIVATE_KEY` | Your SSH private key | SSH key for connecting to DigitalOcean |
| `DO_HOST` | `178.128.11.67` | DigitalOcean server IP |
| `DO_USER` | `root` | SSH username |

**To get your SSH private key**:
```bash
cat ~/.ssh/id_rsa
```

If you don't have an SSH key, generate one:
```bash
ssh-keygen -t rsa -b 4096 -C "github-actions"
# Add the public key to your server
ssh-copy-id root@178.128.11.67
```

### Step 2: Enable GitHub Pages

1. Go to repository Settings → Pages
2. Source: GitHub Actions
3. Custom domain: `eyearrell.com`
4. Enforce HTTPS: ✓ (after DNS propagates)

### Step 3: Configure GitHub Actions Permissions

1. Go to Settings → Actions → General
2. Under "Workflow permissions", select:
   - ✓ Read and write permissions
   - ✓ Allow GitHub Actions to create and approve pull requests

## First Deployment

### Deploy Backend First

The backend must be deployed before the frontend to ensure the API is available.

```bash
# Trigger backend deployment
git add .
git commit -m "Configure production deployment"
git push origin main
```

Watch the deployment in GitHub Actions. Once complete, verify the API is running:

```bash
curl https://api.eyearrell.com/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456
}
```

### Run Database Migrations

```bash
# On the DigitalOcean server
ssh root@178.128.11.67
cd /var/www/irl/service
pnpm prisma migrate deploy
```

### Deploy Frontend

The frontend deployment will be triggered automatically by the same push, or you can manually trigger it:

1. Go to Actions tab in GitHub
2. Select "Deploy Frontend to GitHub Pages"
3. Click "Run workflow"

## Verification

### Check Backend API

```bash
# Health check
curl https://api.eyearrell.com/api/health

# Test root endpoint
curl https://api.eyearrell.com/
```

### Check Frontend

1. Visit https://eyearrell.com
2. Open browser DevTools → Console
3. Look for any errors
4. Try logging in with test credentials

### Check PM2 Status

```bash
ssh root@178.128.11.67
pm2 status
pm2 logs irl-service
```

### Check Nginx Logs

```bash
ssh root@178.128.11.67
tail -f /var/log/nginx/irl-api.access.log
tail -f /var/log/nginx/irl-api.error.log
```

## Continuous Deployment

Once setup is complete, deployments are automatic:

- **Frontend**: Pushes to `main` that modify `client/**` or `shared/**` trigger frontend deployment
- **Backend**: Pushes to `main` that modify `service/**` or `shared/**` trigger backend deployment

You can also trigger deployments manually from the GitHub Actions tab.

## Troubleshooting

### Frontend Issues

**Problem**: Frontend shows 404 errors
- Check GitHub Pages is enabled in repository settings
- Verify custom domain is configured correctly
- Check DNS records are pointing to GitHub Pages IPs

**Problem**: API calls fail with CORS errors
- Verify `CLIENT_URL` in server `.env` is set to `https://eyearrell.com`
- Check nginx is running: `systemctl status nginx`
- Check API is accessible: `curl https://api.eyearrell.com/api/health`

### Backend Issues

**Problem**: PM2 service not running
```bash
ssh root@178.128.11.67
pm2 restart irl-service
pm2 logs irl-service --lines 100
```

**Problem**: Database connection errors
- Verify PostgreSQL is running: `systemctl status postgresql`
- Check DATABASE_URL in `/var/www/irl/service/.env`
- Test connection: `psql -U irl_app -d irl_production -h localhost`

**Problem**: SSL certificate errors
```bash
# Renew certificate
certbot renew
systemctl reload nginx

# Check certificate status
certbot certificates
```

### GitHub Actions Issues

**Problem**: Deployment fails with SSH errors
- Verify `DO_SSH_PRIVATE_KEY` secret is set correctly
- Test SSH connection manually: `ssh root@178.128.11.67`
- Check server firewall allows SSH on port 22

**Problem**: Build fails
- Check build logs in Actions tab
- Verify all dependencies are in package.json
- Test build locally: `pnpm build`

## Manual Deployment Commands

If you need to deploy manually:

### Frontend
```bash
cd client
pnpm install
pnpm build:prod
# Manually upload dist/ to GitHub Pages
```

### Backend
```bash
cd service
pnpm install --prod
pnpm build
# Copy to server
scp -r dist/ package.json root@178.128.11.67:/var/www/irl/service/
ssh root@178.128.11.67 "cd /var/www/irl/service && pnpm install --prod && pm2 restart irl-service"
```

## Maintenance

### Update Dependencies

```bash
# On your local machine
pnpm update
pnpm build
git commit -am "Update dependencies"
git push origin main
```

### Database Backups

```bash
# On the server
ssh root@178.128.11.67
pg_dump -U irl_app irl_production > backup-$(date +%Y%m%d).sql
```

### View Logs

```bash
# Application logs
ssh root@178.128.11.67
pm2 logs irl-service

# Nginx logs
tail -f /var/log/nginx/irl-api.access.log
tail -f /var/log/nginx/irl-api.error.log
```

## Security Notes

- Never commit `.env` files with real credentials
- Rotate `SESSION_SECRET` periodically
- Keep SSL certificates up to date (certbot auto-renews)
- Regularly update system packages: `apt-get update && apt-get upgrade`
- Review nginx logs for suspicious activity
- Use strong database passwords
- Consider setting up database backups to external storage

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review GitHub Actions logs
3. Check server logs via SSH
4. Review nginx configuration
