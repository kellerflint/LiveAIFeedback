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

echo -n "Waiting for DB to be healthy..."
while [ "$(docker inspect -f '{{.State.Health.Status}}' ai_rt_fb-db-e2e-1 2>/dev/null)" != "healthy" ]; do
  echo -n "."
  sleep 2
done
echo " DB is healthy!"

echo -n "Waiting for API and Frontend to be ready"
# Proactively check for API and Frontend every second up to 60 seconds
for i in {1..60}; do
  if curl -s http://127.0.0.1:8001/health | grep -q "ok" && curl -s http://127.0.0.1:5174/ > /dev/null 2>&1; then
    echo ""
    echo "Services are fully up and running!"
    break
  fi
  echo -n "."
  sleep 1
  if [ "$i" -eq 60 ]; then
    echo ""
    echo "Timeout waiting for services to start."
    exit 1
  fi
done

echo "========================================="
echo "        Running Backend Contract Tests   "
echo "========================================="
docker-compose -f docker-compose.e2e.yml exec -T backend-e2e bash -c "PYTHONPATH=. pytest tests/test_contracts.py -v"

# 3. Trigger Playwright using the headless docker runner
echo "========================================="
echo "        Executing Playwright Suite       "
echo "========================================="

# Allow passing specific test files or arguments (e.g. ./run_e2e.sh tests/admin.spec.js)
TEST_ARGS=${@:-"."}

docker run --rm \
    --network="host" \
    -v "$PROJECT_ROOT/e2e_tests:/e2e" \
    -w /e2e \
    mcr.microsoft.com/playwright:v1.58.2-jammy \
    bash -c "npx playwright test $TEST_ARGS --workers=1"

echo "All tests passed successfully!"
# The EXIT trap will automatically spin down the containers here.
