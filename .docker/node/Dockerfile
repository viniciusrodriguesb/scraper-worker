# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim AS base
WORKDIR /app

# Copia apenas os manifests primeiro para melhor cache
COPY app/package*.json ./

# Instala apenas dependências de produção
FROM base AS deps
RUN npm ci --omit=dev

# Etapa opcional para build/transpile
FROM base AS build
RUN npm ci
COPY app/ ./
# Use essa linha se seu projeto tiver build, ex.: TypeScript
# RUN npm run build

# Imagem final de runtime
FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

# Copia node_modules de produção
COPY --from=deps /app/node_modules ./node_modules

# Copia o código-fonte
COPY app/ ./

# Segurança: roda com usuário não-root já existente na imagem oficial
USER node

EXPOSE 3000

# Ajuste aqui se o arquivo inicial for diferente
CMD ["node", "src/server.js"]