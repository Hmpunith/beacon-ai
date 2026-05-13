# Stage 1: Build Next.js frontend
FROM node:20-slim AS frontend-build
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Python backend + static frontend
FROM python:3.11-slim
WORKDIR /app

COPY backend/requirements-cloud.txt .
RUN pip install --no-cache-dir -r requirements-cloud.txt

COPY backend/ .

# Copy built frontend into /app/static
COPY --from=frontend-build /frontend/out ./static

EXPOSE 8080

CMD ["python", "-c", "import uvicorn; uvicorn.run('main:app', host='0.0.0.0', port=8080)"]
