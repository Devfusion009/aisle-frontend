# ============================================
# Aisle Frontend — Next.js Production Dockerfile
# ============================================

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for layer caching
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Set build-time env variable for the API URL
# This can be overridden at build time using --build-arg
ARG NEXT_PUBLIC_API_URL=http://localhost:3000/api
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Build with standalone output
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy built assets from the builder stage
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

USER nextjs

# Expose the Next.js port
EXPOSE 3001

ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

# Start the Next.js application
CMD ["npm", "start"]
