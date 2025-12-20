-- StuSpace schema.sql (aligned with current Django models & MySQL schema)
-- 目标：老师可直接执行本脚本建库并运行（含关键约束/索引 + 1个视图 + 1个存储过程）

CREATE DATABASE IF NOT EXISTS study_space_db DEFAULT CHARSET utf8mb4;
USE study_space_db;

SET FOREIGN_KEY_CHECKS = 0;

DROP VIEW IF EXISTS v_space_today_stats;
DROP PROCEDURE IF EXISTS sp_create_reservation;
DROP TRIGGER IF EXISTS trg_feedback_only_completed;

DROP TABLE IF EXISTS feedback;
DROP TABLE IF EXISTS abnormal_behavior;
DROP TABLE IF EXISTS usage_record;
DROP TABLE IF EXISTS reservation;
DROP TABLE IF EXISTS study_space;
DROP TABLE IF EXISTS `user`;

SET FOREIGN_KEY_CHECKS = 1;

-- =========================
-- Core Tables (3NF)
-- =========================

CREATE TABLE `user` (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(100) NOT NULL,
    role VARCHAR(10) NOT NULL,
    credit_score INT NOT NULL DEFAULT 100,
    CONSTRAINT chk_user_role CHECK (role IN ('student','admin')),
    CONSTRAINT chk_user_credit_score CHECK (credit_score BETWEEN 0 AND 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE study_space (
    space_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(100),
    capacity INT NOT NULL,
    open_time TIME,
    close_time TIME,
    CONSTRAINT chk_space_capacity CHECK (capacity >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE reservation (
    reservation_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    space_id INT NOT NULL,
    start_time DATETIME(6) NOT NULL,
    end_time DATETIME(6) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'reserved',
    CONSTRAINT chk_reservation_time CHECK (end_time > start_time),
    CONSTRAINT chk_reservation_status CHECK (status IN ('reserved','in_use','cancelled','completed')),
    CONSTRAINT fk_reservation_user FOREIGN KEY (user_id) REFERENCES `user`(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_reservation_space FOREIGN KEY (space_id) REFERENCES study_space(space_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE usage_record (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    reservation_id INT NOT NULL,
    check_in_time DATETIME(6),
    check_out_time DATETIME(6),
    duration INT,
    CONSTRAINT fk_usage_reservation FOREIGN KEY (reservation_id) REFERENCES reservation(reservation_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE abnormal_behavior (
    abnormal_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    space_id INT NOT NULL,
    type VARCHAR(20) NOT NULL,
    record_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT chk_abnormal_type CHECK (type IN ('no_show','overtime')),
    CONSTRAINT fk_abnormal_user FOREIGN KEY (user_id) REFERENCES `user`(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_abnormal_space FOREIGN KEY (space_id) REFERENCES study_space(space_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE feedback (
    feedback_id INT AUTO_INCREMENT PRIMARY KEY,
    rating INT NOT NULL,
    comment LONGTEXT,
    created_at DATETIME(6) NOT NULL,
    reservation_id INT NOT NULL,
    CONSTRAINT chk_feedback_rating CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT fk_feedback_reservation FOREIGN KEY (reservation_id) REFERENCES reservation(reservation_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================
-- Indexes (performance)
-- =========================

-- Reservation overlap checks (space/time and user/time)
CREATE INDEX idx_reservation_space_time ON reservation(space_id, start_time, end_time, status);
CREATE INDEX idx_reservation_user_time ON reservation(user_id, start_time, end_time, status);

-- Quick lookups
CREATE INDEX idx_usage_reservation ON usage_record(reservation_id);
CREATE INDEX idx_abnormal_user_time ON abnormal_behavior(user_id, record_time);
CREATE INDEX idx_abnormal_space_time ON abnormal_behavior(space_id, record_time);

-- Enforce 1 feedback per reservation
CREATE UNIQUE INDEX uniq_feedback_reservation ON feedback(reservation_id);

-- =========================
-- View (reporting)
-- =========================

-- Today's per-space stats (for admin demo)
CREATE VIEW v_space_today_stats AS
SELECT
    s.space_id,
    s.name,
    s.location,
    s.capacity,
    SUM(CASE WHEN r.status IN ('reserved','in_use') AND DATE(r.start_time) = CURDATE() THEN 1 ELSE 0 END) AS today_active_reservations,
    SUM(CASE WHEN r.status = 'completed' AND DATE(r.start_time) = CURDATE() THEN 1 ELSE 0 END) AS today_completed_reservations,
    SUM(CASE WHEN a.type = 'no_show' AND DATE(a.record_time) = CURDATE() THEN 1 ELSE 0 END) AS today_no_show,
    SUM(CASE WHEN a.type = 'overtime' AND DATE(a.record_time) = CURDATE() THEN 1 ELSE 0 END) AS today_overtime
FROM study_space s
LEFT JOIN reservation r ON r.space_id = s.space_id
LEFT JOIN abnormal_behavior a ON a.space_id = s.space_id
GROUP BY s.space_id, s.name, s.location, s.capacity;

-- =========================
-- Stored Procedure (consistency & concurrency demo)
-- =========================

DELIMITER $$

-- Create reservation with capacity/conflict checks inside DB transaction
CREATE PROCEDURE sp_create_reservation(
    IN p_user_id INT,
    IN p_space_id INT,
    IN p_start DATETIME,
    IN p_end DATETIME
)
BEGIN
    DECLARE v_capacity INT;
    DECLARE v_active_count INT;
    DECLARE v_user_conflict INT;
    DECLARE v_credit INT;

    IF p_end <= p_start THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid time range: end_time must be greater than start_time.';
    END IF;

    START TRANSACTION;

    -- Credit score gate
    SELECT credit_score INTO v_credit FROM `user` WHERE user_id = p_user_id FOR UPDATE;
    IF v_credit IS NULL THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'User not found.';
    END IF;
    IF v_credit < 60 THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Credit score too low.';
    END IF;

    -- Lock space row to prevent race conditions
    SELECT capacity INTO v_capacity FROM study_space WHERE space_id = p_space_id FOR UPDATE;
    IF v_capacity IS NULL THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Space not found.';
    END IF;

    -- Capacity check: count overlapping active reservations
    SELECT COUNT(*) INTO v_active_count
    FROM reservation
    WHERE space_id = p_space_id
      AND status IN ('reserved','in_use')
      AND start_time < p_end
      AND end_time > p_start
    FOR UPDATE;

    IF v_active_count >= v_capacity THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Space is full for the requested time.';
    END IF;

    -- User conflict check
    SELECT COUNT(*) INTO v_user_conflict
    FROM reservation
    WHERE user_id = p_user_id
      AND status IN ('reserved','in_use')
      AND start_time < p_end
      AND end_time > p_start
    FOR UPDATE;

    IF v_user_conflict > 0 THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'User has a time conflict.';
    END IF;

    INSERT INTO reservation(user_id, space_id, start_time, end_time, status)
    VALUES (p_user_id, p_space_id, p_start, p_end, 'reserved');

    COMMIT;
END$$

DELIMITER ;

-- =========================
-- Trigger (integrity demo)
-- =========================

DELIMITER $$

-- Only allow feedback for completed reservations
CREATE TRIGGER trg_feedback_only_completed
BEFORE INSERT ON feedback
FOR EACH ROW
BEGIN
    DECLARE v_status VARCHAR(20);
    SELECT status INTO v_status FROM reservation WHERE reservation_id = NEW.reservation_id;
    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Reservation not found for feedback.';
    END IF;
    IF v_status <> 'completed' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only completed reservations can be reviewed.';
    END IF;
END$$

DELIMITER ;

-- =========================
-- Minimal demo seed (optional)
-- =========================

INSERT INTO `user`(username,password,role,credit_score)
VALUES
  ('admin','adminpassword','admin',100),
  ('demo_low','123456','student',55),
  ('demo_mid','123456','student',60),
  ('demo_good','123456','student',80),
  ('demo_high','123456','student',95)
ON DUPLICATE KEY UPDATE
  password=VALUES(password),
  role=VALUES(role),
  credit_score=VALUES(credit_score);

INSERT INTO study_space(name,location,capacity,open_time,close_time)
VALUES
  ('Library 101 (Quiet Zone)','Library 1F',50,'08:00','22:00'),
  ('Library 202 (Group Study)','Library 2F',20,'08:00','22:00'),
  ('Discussion Room D-1','Student Center',6,'08:00','22:00')
;
