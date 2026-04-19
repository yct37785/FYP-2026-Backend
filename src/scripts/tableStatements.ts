import { env } from '@config/env';

export const schemaResetStatements: string[] = [
  `DROP DATABASE IF EXISTS \`${env.dbName}\``,
  `CREATE DATABASE \`${env.dbName}\``,
];

export const tableStatements: string[] = [
  `
  CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('user', 'organizer', 'admin') NOT NULL DEFAULT 'user',
    status ENUM('active', 'suspended', 'deactivated') NOT NULL DEFAULT 'active',
    credits DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    profile_pic_url VARCHAR(500) NULL,
    description TEXT NULL,
    gender ENUM('male', 'female', 'other', 'prefer_not_to_say') NULL,
    age INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )
  `,

  `
  CREATE TABLE category (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )
  `,

  `
  CREATE TABLE user_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_user_categories_user
      FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE CASCADE,

    CONSTRAINT fk_user_categories_category
      FOREIGN KEY (category_id) REFERENCES category(id)
      ON DELETE CASCADE,

    CONSTRAINT uq_user_category UNIQUE (user_id, category_id)
  )
  `,

  `
  CREATE TABLE event (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    title VARCHAR(191) NOT NULL,
    description TEXT NOT NULL,
    banner_url VARCHAR(255) NULL,
    category_id INT NOT NULL,
    venue VARCHAR(191) NOT NULL,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    starts_at DATETIME NOT NULL,
    ends_at DATETIME NOT NULL,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    pax INT NOT NULL DEFAULT 1,
    source ENUM('INTERNAL', 'EXTERNAL') NOT NULL DEFAULT 'INTERNAL',
    source_name VARCHAR(191) NULL,
    external_event_id VARCHAR(191) NULL,
    external_url VARCHAR(500) NULL,
    is_suspended BOOLEAN NOT NULL DEFAULT false,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_event_owner
      FOREIGN KEY (owner_id) REFERENCES users(id)
      ON DELETE CASCADE,

    CONSTRAINT fk_event_category
      FOREIGN KEY (category_id) REFERENCES category(id)
      ON DELETE RESTRICT,

    INDEX idx_event_category_starts_at_is_suspended (category_id, starts_at, is_suspended),
    UNIQUE KEY uq_event_source_external (source_name, external_event_id)
  )
  `,

  `
  CREATE TABLE booking (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    event_id INT NOT NULL,
    credits_spent DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_booking_user
      FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE CASCADE,

    CONSTRAINT fk_booking_event
      FOREIGN KEY (event_id) REFERENCES event(id)
      ON DELETE CASCADE,

    CONSTRAINT uq_booking_user_event UNIQUE (user_id, event_id)
  )
  `,

  `
  CREATE TABLE waitlist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    event_id INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_waitlist_user
      FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE CASCADE,

    CONSTRAINT fk_waitlist_event
      FOREIGN KEY (event_id) REFERENCES event(id)
      ON DELETE CASCADE,

    CONSTRAINT uq_waitlist_user_event UNIQUE (user_id, event_id)
  )
  `,

  `
  CREATE TABLE favorite (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    event_id INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_favorite_user
      FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE CASCADE,

    CONSTRAINT fk_favorite_event
      FOREIGN KEY (event_id) REFERENCES event(id)
      ON DELETE CASCADE,

    CONSTRAINT uq_favorite_user_event UNIQUE (user_id, event_id)
  )
  `,

  `
  CREATE TABLE review (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    event_id INT NOT NULL,
    rating INT NOT NULL,
    comment TEXT NOT NULL,
    is_suspended BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_review_user
      FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE CASCADE,

    CONSTRAINT fk_review_event
      FOREIGN KEY (event_id) REFERENCES event(id)
      ON DELETE CASCADE,

    CONSTRAINT uq_review_user_event UNIQUE (user_id, event_id),
    CONSTRAINT chk_review_rating CHECK (rating >= 1 AND rating <= 5)
  )
  `,

  `
  CREATE TABLE report (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    event_id INT NULL,
    review_id INT NULL,
    reason VARCHAR(100) NOT NULL,
    details TEXT NULL,
    status ENUM('OPEN', 'RESOLVED', 'DISMISSED') NOT NULL DEFAULT 'OPEN',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_report_user
      FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE CASCADE,

    CONSTRAINT fk_report_event
      FOREIGN KEY (event_id) REFERENCES event(id)
      ON DELETE CASCADE,

    CONSTRAINT fk_report_review
      FOREIGN KEY (review_id) REFERENCES review(id)
      ON DELETE CASCADE,

    CONSTRAINT uq_report_user_event UNIQUE (user_id, event_id),
    CONSTRAINT uq_report_user_review UNIQUE (user_id, review_id)
  )
  `,

  `
  CREATE TABLE notification (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_notification_user
      FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE CASCADE
  )
  `,

  `
  CREATE TABLE sync (
    id INT AUTO_INCREMENT PRIMARY KEY,
    source VARCHAR(50) NOT NULL UNIQUE,
    last_created_at DATETIME NULL,
    last_run_at DATETIME NULL,
    last_success_at DATETIME NULL,
    last_error TEXT NULL,
    total_new_events INT NOT NULL DEFAULT 0,
    is_running BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )
  `,
];