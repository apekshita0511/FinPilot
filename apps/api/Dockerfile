FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

RUN npm install

COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

WORKDIR /app/apps/api

EXPOSE 4000

CMD ["npm", "run", "dev"]
