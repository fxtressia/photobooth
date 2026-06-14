CREATE TABLE IF NOT EXISTS users (
    auth0_id TEXT PRIMARY KEY NOT NULL,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
) STRICT;

CREATE TABLE IF NOT EXISTS designs (
    id TEXT PRIMARY KEY NOT NULL,
    user_auth0_id TEXT NOT NULL,
    name TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    current_state BLOB,
    history_stack BLOB, 
    aspect_ratio REAL NOT NULL DEFAULT 1.5,
    FOREIGN KEY (user_auth0_id) REFERENCES users (auth0_id) ON DELETE CASCADE
    
) STRICT;
CREATE INDEX IF NOT EXISTS index_designs_user ON designs (user_auth0_id);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY NOT NULL,
    user_auth0_id TEXT NOT NULL,
    location INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    images_count INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (user_auth0_id) REFERENCES users (auth0_id) ON DELETE CASCADE
) STRICT;

CREATE INDEX IF NOT EXISTS index_sessions_user ON sessions (user_auth0_id);