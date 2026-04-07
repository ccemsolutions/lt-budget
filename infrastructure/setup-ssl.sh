#!/bin/bash
# Run this script AFTER DNS A record lt-budget.errevitalize.com.br -> 159.69.154.122 propagates
# Usage: bash setup-ssl.sh your-email@example.com

set -e
EMAIL=${1:-"admin@errevitalize.com.br"}
DOMAIN="lt-budget.errevitalize.com.br"

cd /opt/lt-budget/infrastructure

echo "=== Verificando DNS ==="
RESOLVED=$(dig +short $DOMAIN @8.8.8.8)
if [ "$RESOLVED" != "159.69.154.122" ]; then
  echo "❌ DNS não resolvido ainda: '$RESOLVED'"
  echo "   Configure o registro A: $DOMAIN → 159.69.154.122"
  exit 1
fi
echo "✅ DNS OK: $DOMAIN → $RESOLVED"

echo "=== Obtendo certificado Let's Encrypt ==="
docker run --rm \
  -v infrastructure_certbot_www:/var/www/certbot \
  -v infrastructure_certbot_conf:/etc/letsencrypt \
  certbot/certbot certonly \
  --webroot -w /var/www/certbot \
  -d $DOMAIN \
  --email $EMAIL \
  --agree-tos --no-eff-email

echo "=== Trocando nginx para HTTPS ==="
docker compose -f docker-compose.prod.yml -f docker-compose.nginx.yml --env-file .env stop nginx

# Substituir pela config completa com SSL
docker run -d --name nginx-ssl \
  --network infrastructure_default \
  -p 80:80 -p 443:443 \
  -v $(pwd)/nginx/nginx.conf:/etc/nginx/nginx.conf:ro \
  -v infrastructure_certbot_www:/var/www/certbot:ro \
  -v infrastructure_certbot_conf:/etc/letsencrypt:ro \
  nginx:alpine

sleep 3
curl -sf https://$DOMAIN/api/v1/health && echo "✅ HTTPS OK!" || echo "❌ HTTPS falhou"

echo "=== Configurando renovação automática (cron) ==="
(crontab -l 2>/dev/null; echo "0 3 * * * docker exec nginx-ssl nginx -s reload") | crontab -
(crontab -l 2>/dev/null; echo "0 2 1 * * docker run --rm -v infrastructure_certbot_www:/var/www/certbot -v infrastructure_certbot_conf:/etc/letsencrypt certbot/certbot renew --quiet") | crontab -

echo "✅ SSL configurado com sucesso!"
echo "   Acesse: https://$DOMAIN"
