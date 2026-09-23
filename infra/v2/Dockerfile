FROM node:24-bookworm-slim AS frontend
WORKDIR /build
COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm ci --ignore-scripts
COPY apps/web/ ./
RUN npm run build

FROM python:3.12-slim-bookworm AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PYTHONPATH=/app/apps/api
WORKDIR /app
COPY apps/api/requirements.lock /tmp/requirements.lock
RUN pip install --no-cache-dir -r /tmp/requirements.lock \
    && useradd --create-home --uid 10001 athlete
COPY apps/api /app/apps/api
COPY --from=frontend /build/dist /app/apps/web/dist
USER athlete
EXPOSE 10000
ENV PORT=10000
CMD ["python", "-m", "alos.cli", "serve"]
