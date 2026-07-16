-- SYM-CARE database schema
-- Run with: mysql -u root -p < models/schema.sql

CREATE DATABASE IF NOT EXISTS sym_care
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE sym_care;

-- ---------------------------------------------------------------------------
-- users: patients, Village Health Team members, clinic staff, admins
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phone VARCHAR(20) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  role ENUM('patient', 'vht', 'clinic_staff', 'admin') NOT NULL DEFAULT 'patient',
  clinic_id INT NULL, -- set for clinic_staff, references clinics.id
  date_of_birth DATE NULL,
  sex ENUM('male', 'female', 'other') NULL,
  district VARCHAR(120) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_phone (phone)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- clinics
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  lat DECIMAL(9,6) NOT NULL,
  lng DECIMAL(9,6) NOT NULL,
  district VARCHAR(120) NULL,
  phone VARCHAR(20) NULL,
  status ENUM('open', 'closed') NOT NULL DEFAULT 'open',
  specialist_on_duty VARCHAR(120) NULL, -- e.g. 'Midwife', 'Clinical Officer', NULL if none
  medication_stock ENUM('full', 'limited', 'out_of_stock') NOT NULL DEFAULT 'full',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_clinics_status (status),
  INDEX idx_clinics_location (lat, lng)
) ENGINE=InnoDB;

ALTER TABLE users
  ADD CONSTRAINT fk_users_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id)
  ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- symptom_reports: every symptom-checker submission (app or USSD)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS symptom_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  channel ENUM('app', 'ussd') NOT NULL DEFAULT 'app',
  chest_pain BOOLEAN NOT NULL DEFAULT FALSE,
  breathing_difficulty BOOLEAN NOT NULL DEFAULT FALSE,
  heavy_bleeding BOOLEAN NOT NULL DEFAULT FALSE,
  loss_of_consciousness BOOLEAN NOT NULL DEFAULT FALSE,
  fever BOOLEAN NOT NULL DEFAULT FALSE,
  duration_days INT NOT NULL DEFAULT 0,
  pain_location VARCHAR(80) NULL,
  urgency_level ENUM('routine', 'soon', 'emergency') NOT NULL,
  advice_given TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_symptom_reports_user (user_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- sos_alerts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sos_alerts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  channel ENUM('app', 'ussd') NOT NULL DEFAULT 'app',
  lat DECIMAL(9,6) NOT NULL,
  lng DECIMAL(9,6) NOT NULL,
  assigned_clinic_id INT NULL,
  status ENUM('dispatched', 'en_route', 'arrived', 'cancelled') NOT NULL DEFAULT 'dispatched',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_clinic_id) REFERENCES clinics(id) ON DELETE SET NULL,
  INDEX idx_sos_user (user_id),
  INDEX idx_sos_status (status)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- visits: encrypted clinical notes belong here (AES-256-GCM, see middleware/encryption.js)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS visits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  clinic_id INT NOT NULL,
  visit_date DATE NOT NULL,
  diagnosis_summary VARCHAR(255) NULL, -- non-sensitive short label, e.g. "Malaria treatment"
  encrypted_notes TEXT NULL, -- AES-256-GCM ciphertext ("iv:authTag:ciphertext")
  prescription TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  INDEX idx_visits_user (user_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- referrals
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS referrals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  from_clinic_id INT NOT NULL,
  to_clinic_id INT NOT NULL,
  reason VARCHAR(255) NOT NULL,
  status ENUM('pending', 'accepted', 'completed', 'declined') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (from_clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  FOREIGN KEY (to_clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  INDEX idx_referrals_user (user_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- seed data: a handful of sample clinics around Mukono / Kampala area for testing
-- ---------------------------------------------------------------------------
INSERT INTO clinics (name, lat, lng, district, phone, status, specialist_on_duty, medication_stock) VALUES
('Mukono Health Centre IV', 0.353600, 32.755600, 'Mukono', '+256700000001', 'open', 'Clinical Officer', 'full'),
('Nakisunga HC III', 0.408300, 32.716700, 'Mukono', '+256700000002', 'open', NULL, 'limited'),
('Seeta Community Clinic', 0.335000, 32.767000, 'Mukono', '+256700000003', 'closed', NULL, 'full'),
('Kampala Central Medical Centre', 0.347600, 32.582500, 'Kampala', '+256700000004', 'open', 'Midwife', 'full'),
('Ntenjeru HC II', 0.317000, 32.850000, 'Mukono', '+256700000005', 'open', NULL, 'out_of_stock');
