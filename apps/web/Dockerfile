FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json turbo.json ./
COPY apps/web/package.json apps/web/
COPY packages/ packages/

RUN npm ci --workspace=apps/web

COPY apps/web apps/web

ENV NEXT_TELEMETRY_DISABLED=1
# Bake API URL into client bundle at build time
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

WORKDIR /app/apps/web
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app/apps/web
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web/package.json ./package.json

USER nextjs
EXPOSE 3000
ENV PORT=3000

CMD ["node_modules/.bin/next", "start", "--port", "3000"]
