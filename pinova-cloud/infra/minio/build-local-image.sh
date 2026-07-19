#!/usr/bin/env sh

set -eu

MINIO_RELEASE="RELEASE.2025-09-07T16-13-09Z"
MC_RELEASE="RELEASE.2025-08-13T08-35-41Z"
IMAGE_NAME="pinova/minio:2025-09-07"
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
BIN_DIR="$SCRIPT_DIR/bin"

docker_arch=$(docker info --format '{{.Architecture}}')
case "$docker_arch" in
    aarch64|arm64)
        platform="linux-arm64"
        minio_sha256="5c83cd2cf151717ba0243f73e1c7802ff36e272b67144bdd7f1f7d684fd6f03d"
        mc_sha256="14c8c9616cfce4636add161304353244e8de383b2e2752c0e9dad01d4c27c12c"
        ;;
    x86_64|amd64)
        platform="linux-amd64"
        minio_sha256="7c5bd8512c6e966455b1d198209358b2d191c77a83ab377c4073281065fb855f"
        mc_sha256="01f866e9c5f9b87c2b09116fa5d7c06695b106242d829a8bb32990c00312e891"
        ;;
    *)
        echo "Unsupported Docker architecture: $docker_arch" >&2
        exit 1
        ;;
esac

mkdir -p "$BIN_DIR"

download_and_verify() {
    url=$1
    destination=$2
    expected_sha256=$3

    curl -fL --retry 3 --output "$destination" "$url"
    if command -v shasum >/dev/null 2>&1; then
        actual_sha256=$(shasum -a 256 "$destination" | awk '{print $1}')
    else
        actual_sha256=$(sha256sum "$destination" | awk '{print $1}')
    fi
    if [ "$actual_sha256" != "$expected_sha256" ]; then
        rm -f "$destination"
        echo "Checksum verification failed for $destination" >&2
        exit 1
    fi
    chmod 0755 "$destination"
}

download_and_verify \
    "https://dl.min.io/server/minio/release/$platform/archive/minio.$MINIO_RELEASE" \
    "$BIN_DIR/minio" \
    "$minio_sha256"
download_and_verify \
    "https://dl.min.io/client/mc/release/$platform/archive/mc.$MC_RELEASE" \
    "$BIN_DIR/mc" \
    "$mc_sha256"

docker build --pull=false --tag "$IMAGE_NAME" "$SCRIPT_DIR"
