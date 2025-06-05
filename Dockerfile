# ---------- 1️⃣ BUILD STAGE ----------
FROM node:20-alpine AS builder

# Aktifkan Corepack dan install Yarn 4.1.1 global
RUN corepack enable && corepack prepare yarn@4.1.1 --activate

# Buat direktori kerja
WORKDIR /app

# Salin file yang dibutuhkan untuk install dependensi
COPY package.json yarn.lock .yarnrc.yml ./

# Install dependensi tanpa mengandalkan yarnPath (karena yarn-4.1.1.cjs tidak disalin)
ENV YARN_IGNORE_PATH=1
RUN yarn install --immutable

# Salin seluruh isi project dan build
COPY . .
RUN yarn build

# ---------- 2️⃣ RUNTIME STAGE ----------
FROM nginx:1.25-alpine

# Bersihkan direktori HTML default nginx
RUN rm -rf /usr/share/nginx/html/*

# Salin hasil build dari stage sebelumnya
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80 dan tambahkan healthcheck sederhana
EXPOSE 80
HEALTHCHECK CMD wget -qO- http://localhost || exit 1

# Jalankan nginx
CMD ["nginx", "-g", "daemon off;"]
