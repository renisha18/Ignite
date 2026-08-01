CREATE DATABASE IF NOT EXISTS ignite;
USE ignite;

CREATE TABLE users (
    user_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role ENUM('volunteer','organizer','admin') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE volunteer_profiles (
    volunteer_id BIGINT PRIMARY KEY,
    bio TEXT,
    location VARCHAR(255),
    total_hours DECIMAL(8,2) DEFAULT 0,
    reputation_score DECIMAL(5,2) DEFAULT 0,
    FOREIGN KEY (volunteer_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE organizations (
    org_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(255),
    status ENUM('pending','approved','rejected') DEFAULT 'pending',
    created_by BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);

CREATE TABLE organizer_profiles (
    organizer_id BIGINT PRIMARY KEY,
    org_id BIGINT NOT NULL,
    FOREIGN KEY (organizer_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (org_id) REFERENCES organizations(org_id) ON DELETE CASCADE
);

CREATE TABLE skills (
    skill_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE volunteer_skills (
    volunteer_id BIGINT NOT NULL,
    skill_id INT NOT NULL,
    PRIMARY KEY (volunteer_id, skill_id),
    FOREIGN KEY (volunteer_id) REFERENCES volunteer_profiles(volunteer_id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(skill_id) ON DELETE CASCADE
);

CREATE TABLE events (
    event_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    org_id BIGINT NOT NULL,
    created_by BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(255),
    event_start DATETIME NOT NULL,
    event_end DATETIME,
    application_deadline DATETIME,
    status ENUM('published','closed','completed','cancelled') DEFAULT 'published',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (org_id) REFERENCES organizations(org_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);

CREATE TABLE event_roles (
    role_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id BIGINT NOT NULL,
    title VARCHAR(150) NOT NULL,
    capacity INT NOT NULL,
    FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
);

CREATE TABLE role_skills (
    role_id BIGINT NOT NULL,
    skill_id INT NOT NULL,
    PRIMARY KEY (role_id, skill_id),
    FOREIGN KEY (role_id) REFERENCES event_roles(role_id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(skill_id) ON DELETE CASCADE
);

CREATE TABLE applications (
    application_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    volunteer_id BIGINT NOT NULL,
    event_id BIGINT NOT NULL,
    preferred_role_id BIGINT NULL,
    motivation TEXT,
    status ENUM('applied','selected','confirmed','rejected','withdrawn') DEFAULT 'applied',
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    decided_at TIMESTAMP NULL,
    UNIQUE (volunteer_id, event_id),
    FOREIGN KEY (volunteer_id) REFERENCES volunteer_profiles(volunteer_id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
    FOREIGN KEY (preferred_role_id) REFERENCES event_roles(role_id)
);

CREATE TABLE assignments (
    assignment_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    application_id BIGINT NOT NULL,
    volunteer_id BIGINT NOT NULL,
    event_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    assigned_by BIGINT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('assigned','cancelled') DEFAULT 'assigned',
    rating TINYINT NULL,
    UNIQUE (volunteer_id, event_id),
    FOREIGN KEY (application_id) REFERENCES applications(application_id),
    FOREIGN KEY (volunteer_id) REFERENCES volunteer_profiles(volunteer_id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES event_roles(role_id),
    FOREIGN KEY (assigned_by) REFERENCES users(user_id)
);

CREATE TABLE attendance (
    attendance_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    assignment_id BIGINT NOT NULL UNIQUE,
    check_in_time TIMESTAMP NULL,
    check_out_time TIMESTAMP NULL,
    verification_status ENUM('pending','verified') DEFAULT 'pending',
    hours_recorded BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (assignment_id) REFERENCES assignments(assignment_id) ON DELETE CASCADE
);

CREATE TABLE certificates (
    certificate_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    certificate_code VARCHAR(64) UNIQUE NOT NULL,
    assignment_id BIGINT NOT NULL UNIQUE,
    volunteer_id BIGINT NOT NULL,
    event_id BIGINT NOT NULL,
    hours_credited DECIMAL(6,2),
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assignment_id) REFERENCES assignments(assignment_id),
    FOREIGN KEY (volunteer_id) REFERENCES volunteer_profiles(volunteer_id),
    FOREIGN KEY (event_id) REFERENCES events(event_id)
);

CREATE TABLE achievements (
    achievement_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    criteria_type ENUM('events_count','hours') NOT NULL,
    criteria_value INT NOT NULL
);

CREATE TABLE volunteer_achievements (
    volunteer_id BIGINT NOT NULL,
    achievement_id INT NOT NULL,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (volunteer_id, achievement_id),
    FOREIGN KEY (volunteer_id) REFERENCES volunteer_profiles(volunteer_id) ON DELETE CASCADE,
    FOREIGN KEY (achievement_id) REFERENCES achievements(achievement_id)
);

CREATE TABLE recognitions (
    recognition_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    org_id BIGINT NOT NULL,
    volunteer_id BIGINT NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    event_id BIGINT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (org_id) REFERENCES organizations(org_id),
    FOREIGN KEY (volunteer_id) REFERENCES volunteer_profiles(volunteer_id),
    FOREIGN KEY (event_id) REFERENCES events(event_id)
);

CREATE TABLE notifications (
    notification_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
