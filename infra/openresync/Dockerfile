FROM node:18.19.1-bullseye

ARG OPENRESYNC_REF=7fedd4e06558198645ec0659296edf301aafc432
ENV NODE_ENV=production
ENV NODE_OPTIONS=--openssl-legacy-provider
ENV TZ=UTC

RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
RUN git clone https://github.com/tylercollier/openresync.git . \
  && git checkout "${OPENRESYNC_REF}" \
  && npm ci --include=dev \
  && npm run build \
  && npm prune --omit=dev

COPY config.js /app/config/config.js
COPY entrypoint.sh /usr/local/bin/sunset-openresync-entrypoint
RUN chmod +x /usr/local/bin/sunset-openresync-entrypoint

VOLUME ["/runtime"]
EXPOSE 4000
ENTRYPOINT ["sunset-openresync-entrypoint"]
CMD ["node", "server/index.js"]
