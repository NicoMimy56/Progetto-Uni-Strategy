# Uni-Strategy — immagine per Raspberry Pi / CasaOS (arm64 e amd64).
# Usa Debian slim (non Alpine): better-sqlite3 compila senza sorprese su ARM.

FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
ENV TZ=Europe/Rome

EXPOSE 3000

CMD ["npm", "start"]
