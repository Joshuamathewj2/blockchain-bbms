-- Table to store sync state for event listener
USE bloodchain;

CREATE TABLE IF NOT EXISTS sync_state (
    id INT PRIMARY KEY AUTO_INCREMENT,
    contract_address VARCHAR(42) NOT NULL,
    last_synced_block BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
