#!/bin/bash
set -e

echo "Setting up Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs nginx certbot python3-certbot-nginx

echo "Installing PM2..."
npm install -g pm2

echo "Installing dependencies and starting API..."
cd /opt/arhamavaz/api
npm install
pm2 restart arhamavaz-api || pm2 start index.js --name arhamavaz-api
pm2 save
pm2 startup systemd -u root --hp /root || true

echo "Configuring Nginx..."
cat << 'EOF' > /etc/nginx/sites-available/arhamavaz
server {
    listen 80;
    server_name api-134-209-149-189.nip.io;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

ln -sf /etc/nginx/sites-available/arhamavaz /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
systemctl restart nginx

echo "Generating SSL Certificate..."
certbot --nginx -n --agree-tos --email admin@arhamfintech.in -d api-134-209-149-189.nip.io --redirect

echo "Deployment complete!"
