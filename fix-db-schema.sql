-- Fix the api_usage table to make userId nullable
-- This script updates the database schema to match the Prisma schema

-- First, check current table structure
PRAGMA table_info(api_usage);

-- Create a new table with the correct schema
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

-- Verify the change
PRAGMA table_info(api_usage);
