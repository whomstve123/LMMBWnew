#!/usr/bin/env bash
set -euo pipefail

# Downloads minimal face-api.js model files into public/models
# Sources: face-api.js weights on GitHub raw

MODEL_DIR="public/models"
mkdir -p "$MODEL_DIR"

BASE_URL="https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"

FILES=(
  "tiny_face_detector_model-weights_manifest.json"
  "face_landmark_68_model-weights_manifest.json"
  "face_recognition_model-weights_manifest.json"
)

# Download manifests
for f in "${FILES[@]}"; do
  echo "Downloading $f"
  curl -sSfL "$BASE_URL/$f" -o "$MODEL_DIR/$f"
done

# Parse manifests to download the weight shards referenced inside
for f in "${FILES[@]}"; do
  echo "Processing manifest $f"
  shards=$(jq -r '.weights[]?.file' "$MODEL_DIR/$f" 2>/dev/null || true)
  if [ -z "$shards" ]; then
    echo "No shards found in $f or jq missing. Skipping shard download."
    continue
  fi
  for s in $shards; do
    echo "Downloading shard $s"
    curl -sSfL "$BASE_URL/$s" -o "$MODEL_DIR/$s"
  done
done

echo "Models downloaded to $MODEL_DIR"
