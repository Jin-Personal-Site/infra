#!/bin/bash
domain="__DOMAIN__"

# Install Nginx
sudo dnf update
sudo dnf install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Create self-signed SSL using OpenSSL
sudo mkdir -p /etc/ssl/mycert
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
	-keyout /etc/ssl/mycert/selfsigned.key \
	-out /etc/ssl/mycert/selfsigned.crt \
	-subj "/C=VN/ST=Vietnam/L=Ho Chi Minh/O=Company Ltd/CN=$domain"

# Create a new file and echo content into it
sudo tee "/etc/nginx/conf.d/default.conf" <<EOF
# Default server configuration
server {
	listen 80;
	listen [::]:80;
	server_name _;

	return 301 https://\$server_name\$request_uri;
}

server {
	# SSL configuration
	listen 443 ssl;
	listen [::]:443 ssl;
	ssl_certificate /etc/ssl/mycert/selfsigned.crt;
	ssl_certificate_key /etc/ssl/mycert/selfsigned.key;

	server_name _;

	location / {
		try_files \$uri \$uri/ =404;
	}

	location /api {
		rewrite ^\/api\/(.*)$ /api/\$1 break;
		proxy_pass http://localhost:3000;
		proxy_set_header Host \$host;
		proxy_set_header X-Real-IP \$remote_addr;
		proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
	}
}

EOF

sudo tee "/etc/nginx/conf.d/$domain.conf" <<EOF
# Default server configuration
server {
	listen 80;
	listen [::]:80;
	server_name $domain;

	return 301 https://\$server_name\$request_uri;
}

server {
	# SSL configuration
	listen 443 ssl;
	listen [::]:443 ssl;
	ssl_certificate /etc/ssl/mycert/selfsigned.crt;
	ssl_certificate_key /etc/ssl/mycert/selfsigned.key;

	server_name $domain;

	location / {
		try_files \$uri \$uri/ =404;
	}

	location /api {
		rewrite ^\/api\/(.*)$ /api/\$1 break;
		proxy_pass http://localhost:3000;
		proxy_set_header Host \$host;
		proxy_set_header X-Real-IP \$remote_addr;
		proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
	}
}

EOF

# Restart Nginx server after configuring
sudo systemctl restart nginx

# Download and install nvm:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# in lieu of restarting the shell
\. "$HOME/.nvm/nvm.sh"
# Download and install Node.js:
nvm install 22

# Verify the Node.js version:
node -v

# Verify npm version:
npm -v

# Install PM2
npm install pm2 -g
pm2 -v
