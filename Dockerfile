FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Onchain OS CLI — installed at build time; wallet login/session is
# established post-deploy via `fly ssh console` (see vault Rencana Eksekusi).
RUN npx -y @okxweb3/onchainos-installer install --throttle
ENV PATH="/root/.local/bin:${PATH}"

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/server.js"]
