#!/bin/sh
set -eu

mkdir -p /runtime/config /runtime/sources /app/logs

if [ ! -f /runtime/config/internalConfig.json ]; then
  printf '{\n  "version": "0.2.0"\n}\n' > /runtime/config/internalConfig.json
fi

rm -rf /app/config/sources
ln -s /runtime/sources /app/config/sources
ln -sf /runtime/config/internalConfig.json /app/config/internalConfig.json

exec "$@"
