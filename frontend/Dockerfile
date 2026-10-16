# ---------- Stage 1: build the React app with Node ----------
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
# Baked into the UI (sidebar "build" label) so you can see which commit is live
ARG APP_VERSION=dev
ENV VITE_APP_VERSION=$APP_VERSION
RUN npm run build

# ---------- Stage 2: serve static files with unprivileged Nginx ----------
# Node, npm and source code stay in stage 1; only dist/ is shipped.
FROM nginxinc/nginx-unprivileged:1.27-alpine

USER root
RUN apk upgrade --no-cache
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

# UID 101 = nginx user in this image; listens on 8080 (no root needed)
USER 101

ENV BACKEND_URL=http://backend:8000
EXPOSE 8080
