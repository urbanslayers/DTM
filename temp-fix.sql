-- Fix database schema to make api_usage.userId nullable
-- This script removes the foreign key constraint and makes userId nullable

-- Check current schema
.schema api_usage;

-- Create new table without foreign key constraint
CREATE TABLE api_usage_new (
    id TEXT NOT NULL PRIMARY KEY,
    userId TEXT,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    statusCode INTEGER NOT NULL,
    responseTime INTEGER NOT NULL,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Copy existing data
INSERT INTO api_usage_new (id, userId, endpoint, method, statusCode, responseTime, timestamp)
SELECT id, userId, endpoint, method, statusCode, responseTime, timestamp
FROM api_usage;

-- Drop old table and rename new one
DROP TABLE api_usage;
ALTER TABLE api_usage_new RENAME TO api_usage;

-- Check new schema
.schema api_usage;
