# Étape 1 : build / compilation
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
COPY tsconfig.json ./

RUN npm install

COPY ./src ./src

RUN npm run build

# Étape 2 : image finale allégée
FROM node:22-alpine

WORKDIR /usr/src/app

ENV NODE_ENV=production

# Copie dist compilé
COPY --from=builder /usr/src/app/dist ./dist

# COPIE LES PACKAGE.JSON ET PACKAGE-LOCK.JSON DEPUIS LE BUILDER (important)
COPY --from=builder /usr/src/app/package*.json ./

# Installe uniquement les dépendances de production, avec le lockfile correcte
RUN npm ci --only=production

CMD ["node", "./dist/index.js"]