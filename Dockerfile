# Étape 1 : build / compilation
FROM node:22-alpine AS builder

# Need to install python for the yt-dlp-exec node wrapper
RUN apk add --no-cache python3 ffmpeg \
    && ln -sf /usr/bin/python3 /usr/bin/python

WORKDIR /usr/src/app

COPY package*.json ./
COPY tsconfig.json ./

RUN npm install

COPY ./src ./src
COPY ./commands ./commands
COPY ./form ./form
COPY ./.dmcache ./.dmcache

RUN npm run build

# Étape 2 : image finale allégée
FROM node:22-alpine

RUN apk add --no-cache python3 ffmpeg \
    && ln -sf /usr/bin/python3 /usr/bin/python

WORKDIR /usr/src/app

ENV NODE_ENV=production

# Copie dist compilé
COPY --from=builder /usr/src/app/dist ./dist

# COPIE LES PACKAGE.JSON ET PACKAGE-LOCK.JSON DEPUIS LE BUILDER (important)
COPY --from=builder /usr/src/app/package*.json ./

COPY --from=builder /usr/src/app/commands ./commands
COPY --from=builder /usr/src/app/form ./form
COPY --from=builder /usr/src/app/dist ./.dmcache

# Installe uniquement les dépendances de production, avec le lockfile correcte
RUN npm ci --only=production

# yt-dlp-exec fige un binaire yt-dlp qui vieillit vite (YouTube casse les vieilles
# versions -> 403). On écrase le binaire bundlé par la dernière release stable au
# build. Le fichier `yt-dlp` (zipapp Python) s'exécute via le python3 installé.
RUN apk add --no-cache --virtual .yt-dlp-fetch wget ca-certificates \
    && wget -O node_modules/yt-dlp-exec/bin/yt-dlp \
        https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
    && chmod a+rx node_modules/yt-dlp-exec/bin/yt-dlp \
    && apk del .yt-dlp-fetch

CMD ["node", "./dist/index.js"]