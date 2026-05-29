FROM node:18-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/backend/package.json packages/backend/

RUN npm ci --include=dev --workspaces --if-present

COPY packages/shared/ packages/shared/
COPY packages/backend/ packages/backend/

RUN npm run build -w packages/shared && npm run build -w packages/backend

FROM node:18-alpine AS production

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && adduser -S node -u 1001

COPY package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/backend/package.json packages/backend/

RUN npm ci --only=production --workspaces --if-present

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health || exit 1

CMD ["node", "packages/backend/dist/server.js"]
