#!/bin/bash
set -e

SITE_DIR="/var/www/vals.quest"

echo "Building..."
npm run build

echo "Deploying to $SITE_DIR..."
mkdir -p "$SITE_DIR"
rsync -a --delete dist/ "$SITE_DIR/"

echo "Done. Site live at https://vals.quest"
