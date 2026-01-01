# Deployment Quick Start

This is a condensed version of the full deployment guide. For detailed instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

## Initial Setup (One Time)

### 1. Configure DNS
Point these DNS records to the appropriate targets:
- `eyearrell.com` (A records) → GitHub Pages IPs
- `api.eyearrell.com` (A record) → `178.128.11.67`

### 2. Setup DigitalOcean Server

```bash
# Copy and run setup scripts
scp scripts/setup-digitalocean.sh root@178.128.11.67:/root/
scp scripts/setup-postgres.sh root@178.128.11.67:/root/
scp scripts/nginx-irl.conf root@178.128.11.67:/etc/nginx/sites-available/irl

ssh root@178.128.11.67

# Run setup
chmod +x /root/*.sh
./setup-digitalocean.sh
./setup-postgres.sh

# Configure nginx
ln -s /etc/nginx/sites-available/irl /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# Get SSL certificate (wait for DNS propagation first!)
certbot --nginx -d api.eyearrell.com

# Create production environment file
nano /var/www/irl/service/.env
# Copy from service/.env.production and fill in real values
```

### 3. Configure GitHub

**Secrets** (Settings → Secrets and variables → Actions):
- `DO_SSH_PRIVATE_KEY`: Your SSH private key
- `DO_HOST`: `178.128.11.67`
- `DO_USER`: `root`

**GitHub Pages** (Settings → Pages):
- Source: GitHub Actions
- Custom domain: `eyearrell.com`

**Actions Permissions** (Settings → Actions → General):
- Workflow permissions: Read and write
- Allow creating/approving PRs: ✓

### 4. First Deployment

```bash
git add .
git commit -m "Configure production deployment"
git push origin main
```

Monitor deployment in GitHub Actions tab.

After backend deploys, run migrations:
```bash
ssh root@178.128.11.67
cd /var/www/irl/service
pnpm prisma migrate deploy
```

## Daily Development

### Local Development

```bash
# Start both services
pnpm dev:client   # Terminal 1 - Frontend on :3000
pnpm dev:service  # Terminal 2 - Backend on :3001
```

### Deploy Changes

Just push to main:
```bash
git add .
git commit -m "Your changes"
git push origin main
```

- Changes to `client/**` or `shared/**` → Frontend deploys
- Changes to `service/**` or `shared/**` → Backend deploys

### Manual Deploy Triggers

Go to Actions tab → Select workflow → Run workflow

## Common Commands

### Check Service Status
```bash
ssh root@178.128.11.67 "pm2 status"
```

### View Service Logs
```bash
ssh root@178.128.11.67 "pm2 logs irl-service --lines 50"
```

### Restart Service
```bash
ssh root@178.128.11.67 "pm2 restart irl-service"
```

### Check API Health
```bash
curl https://api.eyearrell.com/api/health
```

### View Nginx Logs
```bash
ssh root@178.128.11.67 "tail -f /var/log/nginx/irl-api.access.log"
```

### Run Database Migration
```bash
# After adding new migrations locally
git push origin main
# Wait for deployment to complete, then:
ssh root@178.128.11.67
cd /var/www/irl/service
pnpm prisma migrate deploy
```

### Database Backup
```bash
ssh root@178.128.11.67
pg_dump -U irl_app irl_production > backup-$(date +%Y%m%d).sql
```

## URLs

- **Frontend**: https://eyearrell.com
- **Backend API**: https://api.eyearrell.com
- **Health Check**: https://api.eyearrell.com/api/health
- **Local Dev Frontend**: http://localhost:3000
- **Local Dev Backend**: http://localhost:3001

## Troubleshooting

### Frontend not loading
1. Check GitHub Pages is enabled
2. Verify DNS is pointing to GitHub
3. Check deployment status in Actions tab

### API errors
```bash
ssh root@178.128.11.67
pm2 logs irl-service --lines 100
systemctl status nginx
```

### CORS errors
Verify `/var/www/irl/service/.env` has:
```
CLIENT_URL="https://eyearrell.com"
```

### SSL issues
```bash
ssh root@178.128.11.67
certbot certificates
certbot renew
systemctl reload nginx
```

## Important Files

- `client/.env.production` - Frontend production config
- `service/.env.production` - Backend production config template
- `scripts/nginx-irl.conf` - Nginx configuration
- `.github/workflows/deploy-frontend.yml` - Frontend CI/CD
- `.github/workflows/deploy-backend.yml` - Backend CI/CD

For detailed troubleshooting and advanced topics, see [DEPLOYMENT.md](DEPLOYMENT.md).
