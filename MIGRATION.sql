-- Required for admin "Block app" feature
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_blocked TINYINT(1) NOT NULL DEFAULT 0;

-- MySQL < 8 may not support IF NOT EXISTS on ADD COLUMN; use:
-- ALTER TABLE users ADD COLUMN is_blocked TINYINT(1) NOT NULL DEFAULT 0;
