FROM python:3.11-slim

WORKDIR /app

COPY requirements-cloud.txt .
RUN pip install --no-cache-dir -r requirements-cloud.txt

COPY . .

EXPOSE 8080

CMD ["python", "-c", "import uvicorn; uvicorn.run('main:app', host='0.0.0.0', port=8080)"]
