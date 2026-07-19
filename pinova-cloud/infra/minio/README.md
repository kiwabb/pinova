# Local MinIO

Pinova uses MinIO as the local S3-compatible object store. Product images are publicly readable from the `pinova-public` bucket, while writes require MinIO credentials.

## Build and start

Docker Desktop currently cannot pull new images reliably in this development environment. Build the local image from pinned, SHA-256-verified MinIO binaries and the cached `redis:7-alpine` base image:

```bash
./infra/minio/build-local-image.sh
docker compose up -d minio minio-init
```

The one-shot `minio-init` service creates the bucket and applies the public download policy. It exits successfully after initialization.

Local endpoints:

| Purpose | URL |
| --- | --- |
| S3 API and public objects | `http://127.0.0.1:19000` |
| MinIO Console | `http://127.0.0.1:19001` |

Credentials, ports and the bucket name come from the ignored root `.env` file. Never commit real MinIO credentials.

## Demo assets

Upload the five storefront Demo images:

```bash
./infra/minio/seed-demo-assets.sh
```

The script is idempotent and writes objects below `product/demo/`. A database `main_image_key` such as `product/demo/wuhan-kit.webp` resolves locally to:

```text
http://127.0.0.1:19000/pinova-public/product/demo/wuhan-kit.webp
```

Applications should compose the public base URL, bucket and object Key from configuration. Do not persist environment-specific MinIO URLs in PostgreSQL.
