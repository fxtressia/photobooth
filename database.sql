PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE users (     auth0_id TEXT PRIMARY KEY NOT NULL,     email TEXT NOT NULL UNIQUE,     name TEXT NOT NULL,     created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')) ) STRICT;
CREATE TABLE sessions (     id TEXT PRIMARY KEY NOT NULL,     user_auth0_id TEXT NOT NULL,     location INTEGER NOT NULL,     created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),     images_count INTEGER NOT NULL DEFAULT 0,     FOREIGN KEY (user_auth0_id) REFERENCES users (auth0_id) ON DELETE CASCADE ) STRICT;
CREATE TABLE designs (     id TEXT PRIMARY KEY NOT NULL,     user_auth0_id TEXT NOT NULL,     name TEXT,     created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),     current_state BLOB NOT NULL,     history_stack BLOB,      FOREIGN KEY (user_auth0_id) REFERENCES users (auth0_id) ON DELETE CASCADE ) STRICT;
CREATE INDEX index_sessions_user ON sessions (user_auth0_id);
CREATE INDEX index_designs_user ON designs (user_auth0_id);
