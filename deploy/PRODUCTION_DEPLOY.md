# JanSewa AI Production Deployment (VPS + Docker)

This guide deploys frontend + backend + postgres + redis on a single Linux VPS.

## 1) Server prerequisites

- Ubuntu 22.04/24.04 VPS
- Domain mapped to VPS IP (for HTTPS)
- Ports open: 22, 80, 443

## 2) Install Docker

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
newgrp docker
```

## 3) Clone project

```bash
sudo mkdir -p /opt
cd /opt
git clone https://github.com/sanjay-sky7/JanSewa-AI.git
cd JanSewa-AI
```

## 4) Configure backend env

```bash
cp backend/.env.example backend/.env
nano backend/.env
```

Set at minimum:

- DATABASE_URL=postgresql+asyncpg://jansewa:jansewa_secret@postgres:5432/jansewa_db
- DATABASE_SYNC_URL=postgresql://jansewa:jansewa_secret@postgres:5432/jansewa_db
- JWT_SECRET=<strong-random-secret>
- CORS_ORIGINS should include your frontend domain, for example:
  - https://yourdomain.com
  - https://www.yourdomain.com

Optional integrations:

- MSG91_* for SMS/WhatsApp
- SMTP_* for email
- GEMINI_API_KEY / OPENAI_API_KEY

## 5) First deployment

```bash
cd /opt/JanSewa-AI
chmod +x deploy/scripts/*.sh
./deploy/scripts/deploy-prod.sh
```

This starts services using:

- deploy/docker-compose.prod.yml

Internal bindings used:

- frontend -> 127.0.0.1:3000
- backend -> 127.0.0.1:8000

## 6) Configure Nginx reverse proxy

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo cp deploy/nginx/jansewa.conf /etc/nginx/sites-available/jansewa
sudo nano /etc/nginx/sites-available/jansewa
```

Replace:

- yourdomain.com
- www.yourdomain.com

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/jansewa /etc/nginx/sites-enabled/jansewa
sudo nginx -t
sudo systemctl reload nginx
```

## 7) Enable HTTPS

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## 8) Validate

```bash
BASE_URL=https://yourdomain.com ./deploy/scripts/healthcheck.sh
```

Manual checks:

- https://yourdomain.com
- https://yourdomain.com/api/health
- https://yourdomain.com/docs

## 9) Regular update deploy

```bash
cd /opt/JanSewa-AI
./deploy/scripts/deploy-prod.sh
```

## 10) Backup database

```bash
cd /opt/JanSewa-AI
./deploy/scripts/backup-postgres.sh
```

Backups are saved in:

- /opt/JanSewa-AI/backups

## 11) Useful operations

```bash
cd /opt/JanSewa-AI

# service status
docker compose -f deploy/docker-compose.prod.yml ps

# logs
docker compose -f deploy/docker-compose.prod.yml logs -f backend
docker compose -f deploy/docker-compose.prod.yml logs -f frontend

# restart one service
docker compose -f deploy/docker-compose.prod.yml restart backend

# stop
docker compose -f deploy/docker-compose.prod.yml down
```

## 12) Rollback to previous commit

```bash
cd /opt/JanSewa-AI
git log --oneline -n 5
git checkout <previous_commit_hash>
docker compose -f deploy/docker-compose.prod.yml up -d --build
```
