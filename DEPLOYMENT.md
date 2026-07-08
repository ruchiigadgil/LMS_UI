# AWS Deployment Guide (EC2 + RDS)

Run the site for ~$5–6/week on AWS credits. Delete everything when done = $0.

**Architecture:** One EC2 server runs nginx (serves the React build, proxies `/api`
and `/static` to Flask/gunicorn on port 5005). RDS hosts PostgreSQL.

---

## Part 1 — Create the RDS database (do this first)

1. AWS Console → RDS → **Create database**
2. Choose: **Standard create** → **PostgreSQL**
3. Templates: **Free tier** (if shown) or **Dev/Test** with these settings:
   - Instance: **db.t3.micro** (or db.t4g.micro)
   - Storage: **20 GB gp3**, disable storage autoscaling
   - **Single-AZ** (Multi-AZ doubles the cost)
4. DB instance identifier: `library-db`
5. Master username: `postgres`, set a strong password (save it!)
6. Connectivity: **Don't connect to EC2 yet**, Public access: **No**
7. Additional configuration → Initial database name: `library_db`
8. **Disable** Performance Insights and Enhanced Monitoring
9. Create. Wait ~10 min. Copy the **Endpoint** (looks like
   `library-db.xxxx.ap-south-1.rds.amazonaws.com`)

## Part 2 — Create the EC2 server

1. EC2 → **Launch instance**
2. Name: `library-server`, AMI: **Ubuntu Server 24.04 LTS**
3. Type: **t3.micro**
4. Key pair: create one, download the `.pem` file, keep it safe
5. Security group: allow **HTTP (80)** from Anywhere, **SSH (22)** from My IP
6. Storage: default 8 GB is fine
7. Launch, then copy its **Public IPv4 address**

**Connect the two:** RDS console → your DB → Connectivity → "EC2 connections"
→ **Set up EC2 connection** → pick `library-server`. (This lets the server
reach the database privately.)

## Part 3 — Set up the server

From PowerShell on your laptop:

```
ssh -i path\to\your-key.pem ubuntu@<EC2-PUBLIC-IP>
```

On the server:

```bash
sudo apt update && sudo apt install -y nginx python3-venv python3-pip postgresql-client

git clone https://github.com/ruchiigadgil/LMS_UI.git
cd LMS_UI/library-backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Create the production .env (fill in your RDS endpoint + password)
cat > .env << 'EOF'
DATABASE_URL=postgresql://postgres:YOUR_RDS_PASSWORD@YOUR_RDS_ENDPOINT:5432/library_db
JWT_SECRET_KEY=REPLACE_WITH_RANDOM_STRING
EOF
python3 -c "import secrets; print(secrets.token_hex(32))"   # paste result as JWT_SECRET_KEY

# Create tables + seed data
flask db upgrade
python seed.py
```

Create the Flask service:

```bash
sudo tee /etc/systemd/system/library.service << 'EOF'
[Unit]
Description=Library Flask API
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/LMS_UI/library-backend
ExecStart=/home/ubuntu/LMS_UI/library-backend/venv/bin/gunicorn -w 2 -b 127.0.0.1:5005 run:app
Restart=always

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl enable --now library
```

## Part 4 — Frontend + nginx

On your laptop, in `libraryFrontend`: `npm run build`, then upload it:

```
scp -i path\to\your-key.pem -r dist ubuntu@<EC2-PUBLIC-IP>:/home/ubuntu/frontend
```

Back on the server:

```bash
sudo tee /etc/nginx/sites-available/library << 'EOF'
server {
    listen 80 default_server;
    root /home/ubuntu/frontend;
    index index.html;
    client_max_body_size 6M;

    location / { try_files $uri /index.html; }
    location /api    { proxy_pass http://127.0.0.1:5005; proxy_set_header Host $host; }
    location /static { proxy_pass http://127.0.0.1:5005; }
}
EOF
sudo ln -sf /etc/nginx/sites-available/library /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

Open `http://<EC2-PUBLIC-IP>` — the site is live.

---

## Deploying updates to the live site

**Frontend changes** — all from laptop PowerShell:
```powershell
cd "C:\UI Enhacements\Library_Management_System\libraryFrontend"
npm run build
scp -i C:\Users\Ruchi\Downloads\library-key.pem -r dist ubuntu@3.236.152.164:/home/ubuntu/frontend
```
Then hard-refresh the browser (Ctrl+Shift+R).

**Backend changes:**
1. Laptop: `git add . && git commit -m "..." && git push`
2. Laptop: `ssh -i C:\Users\Ruchi\Downloads\library-key.pem ubuntu@3.236.152.164`
3. Server: `cd ~/LMS_UI && git pull && sudo systemctl restart library`

If you added a Python package (server, before restart):
`cd library-backend && source venv/bin/activate && pip install -r requirements.txt`

If you changed database models (server, before restart):
`export FLASK_APP=run.py && flask db upgrade`

Note: the server IP (3.236.152.164) changes if the EC2 instance is
stopped and started — update it in these commands after a restart.

## Teardown after your week ($0 after this)

1. **Backup the database** (from the server):
   ```bash
   pg_dump "postgresql://postgres:PASSWORD@RDS_ENDPOINT:5432/library_db" > backup.sql
   ```
   Copy it to your laptop:
   `scp -i key.pem ubuntu@<IP>:~/LMS_UI/library-backend/backup.sql .`
2. **Backup uploaded covers** (if any were added while live):
   `scp -i key.pem -r ubuntu@<IP>:~/LMS_UI/library-backend/app/static/covers .`
3. RDS → select `library-db` → Actions → **Delete** (skip final snapshot,
   acknowledge). Snapshots cost money — the backup.sql on your laptop is free.
4. EC2 → select `library-server` → Instance state → **Terminate**.
5. Check Billing next day: should show no new charges.

## Redeploy later (~30 min)

Repeat Parts 1–4. To restore old data instead of reseeding, replace
`flask db upgrade && python seed.py` with:

```bash
psql "postgresql://postgres:PASSWORD@NEW_RDS_ENDPOINT:5432/library_db" < backup.sql
```
