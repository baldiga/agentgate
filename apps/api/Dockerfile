# Stage 1: build
# Build context is the monorepo root
FROM node:20-alpine AS builder
WORKDIR /app

# Copy workspace manifests for dependency resolution
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/ ./packages/

# Install all workspace deps (uses root lockfile)
RUN npm ci

# Copy api source and build
COPY apps/api/tsconfig.json ./apps/api/
COPY apps/api/src/ ./apps/api/src/
WORKDIR /app/apps/api
RUN npm run build

# Stage 2: runtime
FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/ ./packages/

RUN npm ci --omit=dev

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY apps/api/migrations/ ./apps/api/migrations/

RUN mkdir -p /app/uploads && chown node:node /app/uploads

WORKDIR /app/apps/api
USER node
CMD ["node", "dist/index.js"]
