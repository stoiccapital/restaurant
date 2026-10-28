-- Owner password + sessions.
-- Nullable password fields so pre-existing owners can set theirs on next login.

ALTER TABLE owners ADD COLUMN password_hash TEXT;
ALTER TABLE owners ADD COLUMN password_salt TEXT;

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_owner ON sessions(owner_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
