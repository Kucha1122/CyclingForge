FROM node:22-alpine AS build
WORKDIR /app

# Copy shared package first
COPY shared/ ./shared/

# Copy frontend
COPY frontend/package.json frontend/package-lock.json ./frontend/
WORKDIR /app/frontend
RUN npm ci

COPY frontend/ .
RUN npm run build

FROM nginx:alpine AS runtime

COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY --from=build /app/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
