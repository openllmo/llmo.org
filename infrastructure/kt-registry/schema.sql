-- LLMO KT registry: D1 schema.
-- Reference implementation per ADR-0010 §1 and the implementer spec
-- at /spec/v0.1/kt-registry-endpoints/.
--
-- Apply on first deploy:
--   wrangler d1 execute llmo-kt-registry --file=infrastructure/kt-registry/schema.sql
--
-- The D1 database backs the dynamic query surfaces. The canonical
-- record is the flat JSONL log file served at /kt/v1/log.jsonl; D1
-- entries are a query accelerator and are flushed back to the log
-- file on a separate schedule (operator-managed).

CREATE TABLE IF NOT EXISTS entries (
  entry_id      INTEGER PRIMARY KEY AUTOINCREMENT,
  log_position  INTEGER NOT NULL UNIQUE,
  domain        TEXT    NOT NULL,
  kid           TEXT    NOT NULL,
  jwk_thumbprint TEXT   NOT NULL,
  doc_url       TEXT    NOT NULL,
  doc_id        TEXT    NOT NULL,
  observed_at   TEXT    NOT NULL,
  appended_at   TEXT    NOT NULL,
  entry_jws     TEXT    NOT NULL,
  source_ip     TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_entries_domain      ON entries(domain);
CREATE INDEX IF NOT EXISTS idx_entries_thumbprint  ON entries(jwk_thumbprint);
CREATE INDEX IF NOT EXISTS idx_entries_appended    ON entries(appended_at);

CREATE TABLE IF NOT EXISTS rate_limits (
  source_ip    TEXT    NOT NULL,
  window_start TEXT    NOT NULL,
  count        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (source_ip, window_start)
);

-- Cleanup query for the rate_limits table (operator runs periodically
-- to drop windows older than 24 hours; D1 has no native TTL):
--   DELETE FROM rate_limits WHERE window_start < datetime('now', '-24 hours');
