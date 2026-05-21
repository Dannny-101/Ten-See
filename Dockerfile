FROM node:18-alpine

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm install --production

COPY backend/ ./
COPY frontend/ /app/frontend/

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

CMD ["node", "server.js"]
