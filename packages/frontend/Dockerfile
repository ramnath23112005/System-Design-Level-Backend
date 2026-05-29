FROM node:18-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/frontend/package.json packages/frontend/

RUN npm ci --include=dev --workspaces --if-present

COPY packages/shared/ packages/shared/
COPY packages/frontend/ packages/frontend/

RUN npm run build -w packages/frontend

FROM nginx:alpine AS production

RUN apk add --no-cache curl

RUN addgroup -g 1001 -S nginx && adduser -S nginx -u 1001

COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/sites/url-shortener.conf /etc/nginx/conf.d/url-shortener.conf

COPY --from=builder /app/packages/frontend/dist /usr/share/nginx/html

RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

USER nginx

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:80/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
