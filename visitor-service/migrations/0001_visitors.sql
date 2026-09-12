CREATE TABLE summary (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  visits INTEGER NOT NULL DEFAULT 0,
  started_at TEXT
);
INSERT INTO summary (id) VALUES (1);

CREATE TABLE countries (
  country TEXT PRIMARY KEY,
  visits INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE locations (
  country TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  visits INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (country, latitude, longitude)
);

-- Short-lived, random session hashes only. No IP, user agent, or raw session ID.
CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL,
  country TEXT NOT NULL,
  latitude REAL,
  longitude REAL
);
CREATE INDEX sessions_expiry ON sessions (expires_at);

-- The insert and all counters commit atomically. A duplicate cannot increment them.
CREATE TRIGGER count_visit AFTER INSERT ON sessions
BEGIN
  UPDATE summary SET visits = visits + 1,
    started_at = COALESCE(started_at, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    WHERE id = 1;
  INSERT INTO countries (country, visits) VALUES (NEW.country, 1)
    ON CONFLICT (country) DO UPDATE SET visits = visits + 1;
  INSERT INTO locations (country, latitude, longitude, visits)
    SELECT NEW.country, NEW.latitude, NEW.longitude, 1
    WHERE NEW.country != 'ZZ' AND NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL
    ON CONFLICT (country, latitude, longitude) DO UPDATE SET visits = visits + 1;
END;
