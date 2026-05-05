#!/bin/bash
set -e

echo "==> Installing frontend dependencies..."
cd frontend && npm install --legacy-peer-deps 2>&1 | tail -5
cd ..

echo "==> Installing backend dependencies..."
cd backend && npm install 2>&1 | tail -5
cd ..

echo "==> Post-merge setup complete."
