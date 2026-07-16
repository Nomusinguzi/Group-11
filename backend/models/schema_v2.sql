-- SYM-CARE additive migration (v2)
-- Run once: mysql -u root -p sym_care < models/schema_v2.sql
-- Safe to re-run (all statements use IF NOT EXISTS).

USE sym_care;

CREATE TABLE IF NOT EXISTS appointments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  clinic_id INT NOT NULL,
  appointment_date DATETIME NOT NULL,
  reason VARCHAR(255) NULL,
  status ENUM('scheduled','completed','cancelled','missed') NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  INDEX idx_appointments_user (user_id),
  INDEX idx_appointments_date (appointment_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  body TEXT NULL,
  kind ENUM('sos','appointment','system','record') NOT NULL DEFAULT 'system',
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notifications_user (user_id, read_at)
) ENGINE=InnoDB;
