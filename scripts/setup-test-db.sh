#!/usr/bin/env bash
# =============================================================================
# setup-test-db.sh
#
# One-time setup: creates a local PostgreSQL test database (jobnow_test)
# that is completely isolated from the production Neon database.
#
# Prerequisites: PostgreSQL 14+ installed locally
#   Ubuntu/Debian: sudo apt-get install postgresql postgresql-14-postgis-3
#
# Usage:
#   bash scripts/setup-test-db.sh
#
# After running this script, use:
#   pnpm db:push:test       — apply schema migrations to test DB
#   pnpm test:integration   — run integration tests against test DB
# =============================================================================

set -euo pipefail

DB_NAME="jobnow_test"
DB_USER="test_user"
DB_PASS="test_password"
DB_HOST="localhost"
DB_PORT="5432"

echo "▶ Starting local PostgreSQL service..."
sudo pg_ctlcluster 14 main start 2>/dev/null || true
sleep 1

echo "▶ Creating test database and user..."
sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME};" 2>/dev/null || echo "  (database already exists)"
sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';" 2>/dev/null || echo "  (user already exists)"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"
sudo -u postgres psql -d "${DB_NAME}" -c "GRANT ALL ON SCHEMA public TO ${DB_USER};"
sudo -u postgres psql -d "${DB_NAME}" -c "CREATE EXTENSION IF NOT EXISTS postgis;" 2>/dev/null || echo "  (PostGIS not available — geometry columns will be skipped)"

echo "▶ Applying schema migrations to test DB..."
TEST_DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}" \
  npx drizzle-kit migrate --config=drizzle.test.config.ts

echo ""
echo "✅ Test database ready!"
echo "   TEST_DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
echo ""
echo "Next steps:"
echo "  pnpm test:integration   — run integration tests"
echo "  pnpm db:seed:test       — seed with synthetic data"
