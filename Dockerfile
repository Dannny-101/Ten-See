FROM node:18-alpine

WORKDIR /app

# Copy backend package files and install IN the backend directory
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm install --production

# Go back to /app to copy everything else
WORKDIR /app

# Copy application files
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Set working directory to backend
WORKDIR /app/backend

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3   CMD node -e "require('http').get('http://localhost:5000/api/listings', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

CMD ["node", "server.js"]
