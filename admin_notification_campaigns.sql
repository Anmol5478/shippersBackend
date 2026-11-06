CREATE TABLE IF NOT EXISTS admin_notification_campaigns (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(30) NOT NULL DEFAULT 'announcement',
    audience ENUM('all', 'drivers', 'customers', 'enterprise') NOT NULL,
    created_by VARCHAR(30) DEFAULT NULL,
    recipient_count INT UNSIGNED NOT NULL DEFAULT 0,
    push_attempted_count INT UNSIGNED NOT NULL DEFAULT 0,
    push_accepted_count INT UNSIGNED NOT NULL DEFAULT 0,
    status ENUM('PROCESSING', 'SENT', 'PARTIAL', 'IN_APP_ONLY', 'FAILED') NOT NULL DEFAULT 'PROCESSING',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_admin_campaign_created (created_at),
    KEY idx_admin_campaign_audience (audience),
    KEY idx_admin_campaign_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
