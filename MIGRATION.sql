-- Required for admin "Block app" feature
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_blocked TINYINT(1) NOT NULL DEFAULT 0;

-- MySQL < 8 may not support IF NOT EXISTS on ADD COLUMN; use:
-- ALTER TABLE users ADD COLUMN is_blocked TINYINT(1) NOT NULL DEFAULT 0;

-- Password-reset history: keep every forgot-password request (not only the latest).
-- Drop UNIQUE on otp.email if it exists so multiple rows per email are allowed.
-- Check index name first: SHOW INDEX FROM otp;
-- Then e.g.:
-- ALTER TABLE otp DROP INDEX email;
-- ALTER TABLE otp DROP INDEX otp_email_unique;
