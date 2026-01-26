# Build stage for Frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend

# Copy package files
COPY frontend/package*.json ./

# Install ALL dependencies (including dev) - essential for Vite build
RUN npm install

# Copy source code
COPY frontend/ ./

# Increase memory limit for build process to prevent OOM
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Build the frontend
RUN npm run build

# Production stage for Backend
FROM node:20-slim
WORKDIR /app

# Copy root package files
COPY package*.json ./

# Install ONLY production dependencies for backend execution
RUN npm install --omit=dev

# Copy backend source
COPY backend/ ./backend/

# Copy frontend build artifacts from builder stage
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "backend/serve.js"]
