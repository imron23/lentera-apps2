# ── Stage 1: Build ──────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# ── Stage 2: Runtime ────────────────────────────────────────────
FROM node:20-alpine

# Non-root user for security
RUN addgroup -S ldi && adduser -S ldi -G ldi

WORKDIR /app

# Copy only production deps from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy source
COPY . .

# Drop to non-root
USER ldi

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
