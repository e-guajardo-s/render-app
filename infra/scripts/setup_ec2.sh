#!/bin/bash
# infra/scripts/setup_ec2.sh
# Script de bootstrap para una EC2 nueva (Ubuntu 22.04 / Amazon Linux 2023)
# Ejecutar UNA SOLA VEZ como root: sudo bash setup_ec2.sh

set -e
echo "=== Configurando EC2 para render-app ==="

# 1. Actualizar sistema
apt-get update -y && apt-get upgrade -y

# 2. Instalar Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# 3. Instalar PM2 globalmente
npm install -g pm2

# 4. Configurar PM2 para arrancar con el sistema
pm2 startup systemd -u ubuntu --hp /home/ubuntu
systemctl enable pm2-ubuntu

# 5. Instalar CodeDeploy Agent
apt-get install -y ruby-full wget
cd /tmp
wget https://aws-codedeploy-us-east-1.s3.us-east-1.amazonaws.com/latest/install
# IMPORTANTE: cambia 'us-east-1' por tu región en la URL de arriba
chmod +x install
./install auto
systemctl start codedeploy-agent
systemctl enable codedeploy-agent

# 6. Instalar AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
./aws/install

# 7. Crear directorios de la app y logs
mkdir -p /var/www/render-app/backend
mkdir -p /var/log/render-app
chown -R ubuntu:ubuntu /var/www/render-app
chown -R ubuntu:ubuntu /var/log/render-app

# 8. Verificar instalaciones
echo ""
echo "=== Verificación ==="
node --version
npm --version
pm2 --version
aws --version
systemctl status codedeploy-agent --no-pager

echo ""
echo "=== Setup completado ==="
echo "Recuerda adjuntar el IAM Role con permisos a esta instancia EC2."
