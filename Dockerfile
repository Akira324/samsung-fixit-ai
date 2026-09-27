# Multi-stage production Dockerfile for Samsung PRISM Theme 2 FixIt AI

# Stage 1: Build application
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install dependencies based on lockfile
COPY package.json package-lock.json ./
RUN npm ci

# Copy project source and data assets
COPY . .

# Instruct Vite / Nitro to produce a standalone Node.js server bundle
ENV NITRO_PRESET=node-server
ENV NODE_ENV=production

# Build client and SSR server bundles into .output/
RUN npm run build

# Stage 2: Production runner
FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080

# Run as non-root user for security
USER node

# Copy standalone .output directory from builder stage
COPY --chown=node:node --from=builder /app/.output ./.output

EXPOSE 8080

# Health check against existing /api/health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:8080/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Start the standalone server
CMD ["node", ".output/server/index.mjs"]
