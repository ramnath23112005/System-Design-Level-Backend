FROM nginx:alpine

RUN apk add --no-cache curl

RUN addgroup -g 1001 -S nginx && adduser -S nginx -u 1001

RUN rm -f /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/nginx.conf
COPY sites/url-shortener.conf /etc/nginx/conf.d/url-shortener.conf

RUN mkdir -p /var/cache/nginx /var/log/nginx /etc/nginx/ssl && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/ssl && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

USER nginx

EXPOSE 80 443

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:80/health || curl -f http://localhost:443/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
