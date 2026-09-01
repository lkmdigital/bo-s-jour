# Frontend Next.js (bo séjour) — build "standalone" (déjà configuré dans
# next.config.js : output: 'standalone' en production), image finale minimale
# ne contenant que le serveur Node compilé + les assets statiques nécessaires.

# ─── Étape 1 : dépendances ────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ─── Étape 2 : build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
# Next.js a besoin des NEXT_PUBLIC_* au moment du build (inlinées dans le bundle
# client) — passées en --build-arg par docker-compose, pas au runtime.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_ONESIGNAL_APP_ID
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_ONESIGNAL_APP_ID=$NEXT_PUBLIC_ONESIGNAL_APP_ID
RUN npm run build

# ─── Étape 3 : runtime minimal ────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
