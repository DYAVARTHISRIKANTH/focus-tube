# Production Dockerfile for FocusTube Studio Testbench
FROM node:20-alpine

WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install dependencies and build bundles
RUN npm ci
COPY . .
RUN npm run build

# Expose server port
EXPOSE 3030

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3030/ || exit 1

CMD ["npm", "start"]
