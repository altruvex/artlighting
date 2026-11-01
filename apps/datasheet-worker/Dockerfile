# Build context is the MONOREPO ROOT (not this directory) — the worker now
# depends on sibling workspace packages (@repo/database, @repo/datasheet,
# @repo/datasheet-data) for bulk generation, so its Docker build needs
# access to them. Build with:
#   docker build -f apps/datasheet-worker/Dockerfile -t datasheet-worker .
# (run from the repo root, not from this directory).

# ---- installer: resolves workspace deps + generates the Prisma client ----
FROM node:22-bookworm-slim AS installer
# Prisma 7 with a driver adapter (@prisma/adapter-neon) has no native query
# engine, so the openssl CLI that Prisma 6's engine detection needed is gone.
RUN corepack enable
WORKDIR /repo

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/datasheet-worker apps/datasheet-worker
COPY packages/database packages/database
COPY packages/datasheet packages/datasheet
COPY packages/datasheet-data packages/datasheet-data
# The sheet reads specs through @repo/catalog (and its money/pricing deps),
# and prints the product page's own description, whose English wording lives
# in the storefront's catalog messages (apps/web/messages/en/catalog.json).
COPY packages/catalog packages/catalog
COPY packages/money packages/money
COPY packages/pricing packages/pricing
COPY apps/web/messages/en/catalog.json apps/web/messages/en/catalog.json
# Dev-only workspace config packages the worker's package.json references
# (lint/tsconfig); pnpm needs them present to resolve the workspace.
COPY packages/eslint-config packages/eslint-config
COPY packages/typescript-config packages/typescript-config

# --filter=datasheet-worker... installs the worker + its workspace
# dependencies only (pnpm's recursive-dependency filter), not the whole
# monorepo (apps/web, apps/admin, etc. aren't even copied above).
RUN pnpm install --filter=datasheet-worker... --frozen-lockfile

# ---- runner: LibreOffice + fonts + the installed workspace ----
FROM node:22-bookworm-slim AS runner

# Debian, not Alpine — LibreOffice font rendering on musl is unreliable.
# The datasheet is set in Calibri, which no Debian package ships;
# fonts-crosextra-carlito is its metric-compatible twin, so line breaks and
# the right-aligned spec values land where they do in PowerPoint.
# ttf-mscorefonts-installer covers the Microsoft core fonts (fetched from
# Microsoft's CDN at build time, under Microsoft's own EULA).
RUN echo "deb http://deb.debian.org/debian bookworm contrib" >> /etc/apt/sources.list \
    && echo msttcorefonts msttcorefonts/accepted-mscorefonts-eula select true | debconf-set-selections \
    && DEBIAN_FRONTEND=noninteractive apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      libreoffice-impress \
      fonts-liberation \
      fonts-crosextra-carlito \
      ttf-mscorefonts-installer \
      fontconfig \
    && fc-cache -f \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable
WORKDIR /repo
COPY --from=installer /repo /repo

# The datasheet and quotation are set in Jost (packages/datasheet/fonts —
# static Light/Regular/Medium cut from Google Fonts' variable Jost, OFL).
# LibreOffice 7.4 draws only the default instance of a variable font, which
# is why the three weights are separate files.
RUN mkdir -p /usr/share/fonts/truetype/jost \
    && cp /repo/packages/datasheet/fonts/*.ttf /usr/share/fonts/truetype/jost/ \
    && fc-cache -f

WORKDIR /repo/apps/datasheet-worker

ENV PORT=8080
EXPOSE 8080

CMD ["npx", "tsx", "src/server.ts"]
