#!/usr/bin/env sh

set -eu

PROJECT_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
ASSET_DIR="$PROJECT_ROOT/pinova-web/src/assets/storefront"
CONTAINER_DIR="/tmp/pinova-demo-assets"

for asset in couple-charms.webp couple-cups.webp parent-child.webp photo-to-pattern.webp wuhan-kit.webp; do
    if [ ! -f "$ASSET_DIR/$asset" ]; then
        echo "Missing demo asset: $ASSET_DIR/$asset" >&2
        exit 1
    fi
done

cd "$PROJECT_ROOT"
docker compose exec -T minio mkdir -p "$CONTAINER_DIR"

for asset in couple-charms.webp couple-cups.webp parent-child.webp photo-to-pattern.webp wuhan-kit.webp; do
    docker compose cp "$ASSET_DIR/$asset" "minio:$CONTAINER_DIR/$asset"
done

docker compose exec -T minio /bin/sh -c '
    mc alias set local http://127.0.0.1:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"
    for file in /tmp/pinova-demo-assets/*.webp; do
        mc cp --attr "Content-Type=image/webp" "$file" "local/${PINOVA_MINIO_BUCKET:-pinova-public}/product/demo/$(basename "$file")"
    done
    rm -rf /tmp/pinova-demo-assets
'
