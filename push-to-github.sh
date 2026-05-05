#!/bin/bash
set -e

DEST=/tmp/aivirtualinterview
SRC=/home/runner/workspace

echo "→ Preparing clean copy (skipping node_modules, .pythonlibs, etc.)..."
rm -rf "$DEST"
mkdir -p "$DEST"

# Use tar with excludes so we never touch the giant directories
tar -C "$SRC" \
  --exclude='./.git' \
  --exclude='./node_modules' \
  --exclude='./.pythonlibs' \
  --exclude='./venv' \
  --exclude='./.cache' \
  --exclude='./frontend/dist' \
  --exclude='./frontend/node_modules' \
  --exclude='./backend/node_modules' \
  --exclude='./__pycache__' \
  --exclude='./ai-service/__pycache__' \
  --exclude='./backend/uploads/*.webm' \
  --exclude='./backend/uploads/*.mp3' \
  --exclude='./push-to-github.sh' \
  -cf - . | tar -C "$DEST" -xf -

cd "$DEST"

# Sweep any stray __pycache__ that slipped through
find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
find . -name "*.pyc" -delete 2>/dev/null || true

echo "→ Files ready: $(find . -type f | wc -l)"

echo "→ Initialising git repo..."
git init
git config user.email "sriharin.ai@github.com"
git config user.name "sriharin-ai"

echo "→ Staging & committing..."
git add -A
git commit -m "feat: AI-Powered Technical Interview Prepper — full-stack app with corporate onboarding, streak badges, readiness goals, and certificate sharing"

echo "→ Pushing to GitHub..."
git push --force \
  "https://sriharin-ai:${GITHUB_PERSONAL_ACCESS_TOKEN}@github.com/sriharin-ai/aivirtualinterview.git" \
  main

echo ""
echo "✅ Done! https://github.com/sriharin-ai/aivirtualinterview"
