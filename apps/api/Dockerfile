# Stage 1: build
# Build context is the monorepo root
FROM node:20-alpine AS builder
WORKDIR /app
COPY apps/api/package*.json ./
RUN npm ci
COPY apps/api/tsconfig.json ./
COPY apps/api/src/ ./src/
RUN npm run build

# Stage 2: runtime
FROM node:20-alpine
WORKDIR /app
COPY apps/api/package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY apps/api/migrations/ ./migrations/
RUN mkdir -p /app/uploads && chown node:node /app/uploads
USER node
CMD ["node", "dist/index.js"]
