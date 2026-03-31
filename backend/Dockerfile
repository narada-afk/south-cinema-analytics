# Dockerfile for the FastAPI backend
# Uses Python 3.11 slim image to keep the container small.

FROM python:3.11-slim

# Set the working directory inside the container
WORKDIR /app

# Copy and install Python dependencies first.
# This is done before copying app code so Docker can cache this layer
# and skip reinstalling packages unless requirements.txt changes.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code into the container
COPY . .

# Expose port 8000 so Docker Compose can route traffic to it
EXPOSE 8000

# Start with gunicorn + uvicorn workers (production).
# For local dev with hot reload, docker-compose.dev.yml overrides this CMD with:
#   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
CMD ["gunicorn", "-k", "uvicorn.workers.UvicornWorker", "app.main:app", \
     "--bind", "0.0.0.0:8000", "--workers", "4", "--timeout", "60"]
