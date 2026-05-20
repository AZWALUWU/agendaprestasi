#!/bin/bash

clear

echo "===================================================="
echo "          MEMBERSIHKAN PROJECT"
echo "===================================================="
echo ""

rm -rf dist/ .wrangler/

echo ""
echo "===================================================="
echo "          CLEANING SELESAI"
echo "===================================================="
echo ""

sleep 2

echo "===================================================="
echo "          BUILD VITE PROJECT"
echo "===================================================="
echo ""

npm run build

if [ $? -ne 0 ]; then
  echo ""
  echo "BUILD FAILED!"
  exit 1
fi

echo ""
echo "===================================================="
echo "          WRANGLER BUILD"
echo "===================================================="
echo ""

npx wrangler build

if [ $? -ne 0 ]; then
  echo ""
  echo "WRANGLER BUILD FAILED!"
  exit 1
fi

echo ""
echo "===================================================="
echo "          DEPLOYING TO CLOUDFLARE"
echo "===================================================="
echo ""

npx wrangler deploy

if [ $? -ne 0 ]; then
  echo ""
  echo "DEPLOY FAILED!"
  exit 1
fi

echo ""
echo "===================================================="
echo "          DEPLOY SUCCESSFUL"
echo "===================================================="
echo ""