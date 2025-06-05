FROM node:20-alpine AS builder
WORKDIR /app

# Enable corepack and ignore yarnPath to prevent lookup
RUN corepack enable && corepack prepare yarn@4.1.1 --activate
ENV YARN_IGNORE_PATH=1

COPY package.json yarn.lock .yarn/ .yarnrc.yml ./
RUN yarn install --immutable

COPY . .
RUN yarn build

FROM nginx:1.25-alpine
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
