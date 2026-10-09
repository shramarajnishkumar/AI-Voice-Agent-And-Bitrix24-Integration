FROM python:3.12-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend files into /app/backend to match python package pathing
COPY . /app/backend
RUN sed -i 's/\r$//' /app/backend/docker-entrypoint.sh && chmod +x /app/backend/docker-entrypoint.sh

EXPOSE 8000

CMD ["/app/backend/docker-entrypoint.sh"]
