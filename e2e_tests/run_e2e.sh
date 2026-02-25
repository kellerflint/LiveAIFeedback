#!/bin/bash
set -e

# Automatically move to the project root
PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || dirname "$(dirname "$(realpath "$0")")")
cd "$PROJECT_ROOT"

echo "========================================="
echo "        Spinning Up E2E Cluster          "
echo "========================================="

# 1. Spin up the isolated stack in the background
docker-compose -f docker-compose.e2e.yml up -d --build

# 2. Add an EXIT trap to guarantee the cluster is destroyed even if Playwright crashes
trap 'echo "========================================="; echo "        Destroying E2E Cluster           "; echo "========================================="; docker-compose -f docker-compose.e2e.yml down -v' EXIT

echo "Waiting for backend healthcheck..."
# Give the DB and API a moment to hydrate (since it's an empty ephemeral drive)
sleep 15

# 3. Trigger Playwright using the headless docker runner on the host network to bridge into 5174
echo "========================================="
echo "        Executing Playwright Suite       "
echo "========================================="

docker run --rm \
    --network="host" \
    -v "$PROJECT_ROOT/e2e_tests:/e2e" \
    -w /e2e \
    mcr.microsoft.com/playwright:v1.58.2-jammy \
    bash -c "npx playwright test --workers=1"

echo "All tests passed successfully!"
# The EXIT trap will automatically spin down the containers here.
