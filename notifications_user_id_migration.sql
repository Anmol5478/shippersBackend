-- Your backend uses users.user_id strings such as D0001 / USR0001 in JWTs.
-- The notification tables must therefore use VARCHAR, not BIGINT, for user_id.
-- Run this migration before calling the new APIs if the tables were created
-- using the earlier BIGINT schema.

ALTER TABLE user_devices MODIFY user_id VARCHAR(30) NOT NULL;
ALTER TABLE notifications MODIFY user_id VARCHAR(30) NOT NULL;
ALTER TABLE notification_preferences MODIFY user_id VARCHAR(30) NOT NULL;

-- Create default preferences for existing accounts.
INSERT IGNORE INTO notification_preferences (user_id)
SELECT user_id FROM users WHERE user_id IS NOT NULL;
