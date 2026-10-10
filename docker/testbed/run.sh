#!/usr/bin/env bash
set -euo pipefail

# Build the testbed container
IMAGE_NAME="specty-testbed:latest"

echo "==> Building specty testbed Docker image..."
docker build -t "${IMAGE_NAME}" -f docker/testbed/Dockerfile .

echo "==> Running matrix verification inside testbed container..."
docker run --rm -v "$(pwd):/workspace" -w /workspace "${IMAGE_NAME}" bash -c "
  npm ci
  npm run build
  npm test
  node dist/cli/index.js playground list
"

echo "==> Testbed execution completed successfully."
