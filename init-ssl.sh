#!/bin/bash
# ============================================================
# Let's Encrypt 초기 인증서 발급 스크립트
# 사용법: bash init-ssl.sh
# ============================================================

DOMAIN="cwmegaboxansan.co.kr"
EMAIL="iamy_two@naver.com"   # Gabia/Let's Encrypt 알림용 이메일
CERTBOT_DIR="./certbot"

# certbot 디렉토리 생성
mkdir -p "$CERTBOT_DIR/conf"
mkdir -p "$CERTBOT_DIR/www"

echo "========================================"
echo " STEP 1: Nginx HTTP 전용 모드로 시작"
echo "========================================"
# HTTPS 블록 없이 HTTP만 사용하는 임시 config로 nginx 시작
# (인증서가 없으면 nginx가 시작되지 않으므로 임시 config 사용)
cat > ./nginx/nginx-init.conf << 'EOF'
upstream backend {
    server backend:8000;
}
server {
    listen 80;
    server_name cwmegaboxansan.co.kr;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 "OK";
    }
}
EOF

# 임시 config로 nginx 시작
docker run -d --name megabox-nginx-init \
  -p 80:80 \
  -v "$(pwd)/nginx/nginx-init.conf:/etc/nginx/conf.d/default.conf:ro" \
  -v "$(pwd)/certbot/www:/var/www/certbot:ro" \
  nginx:alpine

echo "Nginx 시작 대기 중..."
sleep 3

echo ""
echo "========================================"
echo " STEP 2: Let's Encrypt 인증서 발급"
echo "========================================"
docker run --rm \
  -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
  -v "$(pwd)/certbot/www:/var/www/certbot" \
  certbot/certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN"

CERT_EXIT=$?

# 임시 nginx 정리
docker stop megabox-nginx-init && docker rm megabox-nginx-init
rm -f ./nginx/nginx-init.conf

if [ $CERT_EXIT -ne 0 ]; then
  echo ""
  echo "[오류] 인증서 발급 실패!"
  echo "  → DNS A 레코드가 올바르게 설정되어 있는지 확인하세요."
  echo "  → api.megabox-ansan.co.kr → IPTIME 서버 공인 IP"
  echo "  → IPTIME 포트포워딩: 80 → Docker 호스트 80"
  exit 1
fi

echo ""
echo "========================================"
echo " STEP 3: 전체 스택 시작 (HTTPS 포함)"
echo "========================================"
docker-compose up -d --build

echo ""
echo "========================================"
echo " 완료!"
echo "========================================"
echo " 백엔드 API: https://cwmegaboxansan.co.kr/api/"
echo " 프론트엔드: https://www.megabox-ansan.co.kr/"
echo "========================================"
