CREATE DATABASE study_space_db DEFAULT CHARSET utf8mb4;
USE study_space_db;

CREATE TABLE user (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(100) NOT NULL,
    role ENUM('student','admin') DEFAULT 'student'
);
CREATE TABLE study_space (
    space_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(100),
    capacity INT NOT NULL,
    open_time TIME,
    close_time TIME
);
CREATE TABLE reservation (
    reservation_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    space_id INT NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    status ENUM('reserved','cancelled','completed') DEFAULT 'reserved',
    FOREIGN KEY (user_id) REFERENCES user(user_id),
    FOREIGN KEY (space_id) REFERENCES study_space(space_id)
);
CREATE TABLE usage_record (
    usage_id INT AUTO_INCREMENT PRIMARY KEY,
    reservation_id INT NOT NULL,
    check_in_time DATETIME,
    check_out_time DATETIME,
    duration INT,
    FOREIGN KEY (reservation_id) REFERENCES reservation(reservation_id)
);
CREATE TABLE abnormal_behavior (
    abnormal_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    space_id INT NOT NULL,
    type ENUM('no_show','overtime') NOT NULL,
    record_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(user_id),
    FOREIGN KEY (space_id) REFERENCES study_space(space_id)
);
DELIMITER $$

CREATE TRIGGER check_no_show
AFTER UPDATE ON reservation
FOR EACH ROW
BEGIN
    IF NEW.status = 'completed' THEN
        IF NOT EXISTS (
            SELECT 1 FROM usage_record
            WHERE reservation_id = NEW.reservation_id
        ) THEN
            INSERT INTO abnormal_behavior(user_id, space_id, type)
            VALUES (NEW.user_id, NEW.space_id, 'no_show');
        END IF;
    END IF;
END$$

DELIMITER ;

-- 插入几条测试数据
INSERT INTO user(username,password,role)
VALUES ('student1','123456','student'),
       ('admin1','admin123','admin');

INSERT INTO study_space(name,location,capacity,open_time,close_time)
VALUES ('自习室A','图书馆1楼',100,'08:00','22:00');
