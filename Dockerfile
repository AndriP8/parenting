FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable

ENV PNPM_ONLY_BUILT_DEPENDENCIES="@google/genai,esbuild,protobufjs"

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

FROM node:22-alpine AS runner
WORKDIR /app
RUN corepack enable

COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./
COPY --from=builder /app/.output ./.output

EXPOSE 4173
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=4173
CMD ["node", ".output/server/index.mjs"]
