FROM node:20-alpine AS deps
WORKDIR /app
COPY apps/frontend/package.json ./package.json
RUN npm install

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY apps/frontend ./
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./apps/frontend/.next/static
COPY --from=builder /app/public ./apps/frontend/public
EXPOSE 3000
CMD ["node", "apps/frontend/server.js"]
