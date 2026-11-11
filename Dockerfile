# Stage 1: Install dependencies & generate Prisma client
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci

# Stage 2: Build source code
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js inlines NEXT_PUBLIC_* env vars into client bundles at build time
ARG NEXT_PUBLIC_APP_MODE=external
ARG NEXT_PUBLIC_BUSINESS_NAME=BookEase
ARG NEXT_PUBLIC_MERCHANT_WHATSAPP=60123456789
ARG NEXT_PUBLIC_PAYMENT_QR_URL=
ARG NEXT_PUBLIC_BOOKING_REF_PREFIX=BK
ARG NEXT_PUBLIC_OPERATING_HOUR_START=9
ARG NEXT_PUBLIC_OPERATING_HOUR_END=19
ARG NEXT_PUBLIC_CLOSED_DAYS=0
ARG NEXT_PUBLIC_OPERATING_DAYS_DESCRIPTION="Mon – Sat"
ARG NEXT_PUBLIC_OPERATING_HOURS_DISPLAY="9:00 AM – 7:00 PM"
ARG NEXT_PUBLIC_CURRENCY_SYMBOL=RM
ARG NEXT_PUBLIC_CURRENCY_CODE=MYR
ARG NEXT_PUBLIC_BUSINESS_TIMEZONE=Asia/Kuala_Lumpur

ENV NEXT_PUBLIC_APP_MODE=$NEXT_PUBLIC_APP_MODE
ENV NEXT_PUBLIC_BUSINESS_NAME=$NEXT_PUBLIC_BUSINESS_NAME
ENV NEXT_PUBLIC_MERCHANT_WHATSAPP=$NEXT_PUBLIC_MERCHANT_WHATSAPP
ENV NEXT_PUBLIC_PAYMENT_QR_URL=$NEXT_PUBLIC_PAYMENT_QR_URL
ENV NEXT_PUBLIC_BOOKING_REF_PREFIX=$NEXT_PUBLIC_BOOKING_REF_PREFIX
ENV NEXT_PUBLIC_OPERATING_HOUR_START=$NEXT_PUBLIC_OPERATING_HOUR_START
ENV NEXT_PUBLIC_OPERATING_HOUR_END=$NEXT_PUBLIC_OPERATING_HOUR_END
ENV NEXT_PUBLIC_CLOSED_DAYS=$NEXT_PUBLIC_CLOSED_DAYS
ENV NEXT_PUBLIC_OPERATING_DAYS_DESCRIPTION=$NEXT_PUBLIC_OPERATING_DAYS_DESCRIPTION
ENV NEXT_PUBLIC_OPERATING_HOURS_DISPLAY=$NEXT_PUBLIC_OPERATING_HOURS_DISPLAY
ENV NEXT_PUBLIC_CURRENCY_SYMBOL=$NEXT_PUBLIC_CURRENCY_SYMBOL
ENV NEXT_PUBLIC_CURRENCY_CODE=$NEXT_PUBLIC_CURRENCY_CODE
ENV NEXT_PUBLIC_BUSINESS_TIMEZONE=$NEXT_PUBLIC_BUSINESS_TIMEZONE
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build \
 && npx tsc prisma/seed.ts --module commonjs --target es2022 --esModuleInterop --skipLibCheck --moduleResolution node --outDir /tmp/seed

# Stage 3: Minimal production runner
FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Copy standalone build and static assets
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma schema, compiled seed script, and CLI/engines for offline schema sync at startup
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /tmp/seed/seed.js ./prisma/seed.js
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs

USER nextjs

EXPOSE 3000

# Apply Prisma migrations if present, otherwise push schema, then start Next.js
CMD ["sh", "-c", "if [ -d prisma/migrations ] && [ \"$(ls -A prisma/migrations 2>/dev/null)\" ]; then node ./node_modules/prisma/build/index.js migrate deploy; else node ./node_modules/prisma/build/index.js db push --skip-generate; fi && exec node server.js"]
