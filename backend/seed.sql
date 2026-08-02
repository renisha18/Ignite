-- ============================================================
-- IGNITE — SEED DATA (adapted for existing users only)
-- Run immediately after backend/schema.sql.
-- Assumes the following users ALREADY exist (not created here):
--   1  admin           (admin)
--   2  Renisha         (volunteer)
--   3  Test Organizer  (organizer)
--   4  Other Organizer (organizer)
--   5  Anisha          (organizer)
--   6  Remi            (organizer)
--   7  Sameeha         (volunteer)
--
-- NOTE: sponsors / event_sponsors column names are a best guess
-- (their schema wasn't in the original seed file). Adjust if your
-- schema.sql differs.
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE event_sponsors;
TRUNCATE TABLE sponsors;
TRUNCATE TABLE notifications;
TRUNCATE TABLE recognitions;
TRUNCATE TABLE volunteer_achievements;
TRUNCATE TABLE achievements;
TRUNCATE TABLE certificates;
TRUNCATE TABLE attendance;
TRUNCATE TABLE assignments;
TRUNCATE TABLE applications;
TRUNCATE TABLE role_skills;
TRUNCATE TABLE event_roles;
TRUNCATE TABLE events;
TRUNCATE TABLE volunteer_skills;
TRUNCATE TABLE skills;
TRUNCATE TABLE organizer_profiles;
TRUNCATE TABLE organizations;
TRUNCATE TABLE volunteer_profiles;
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- ORGANIZATIONS (2) — created_by must be an organizer user_id
-- ============================================================
INSERT INTO organizations (org_id, name, description, location, status, created_by) VALUES
(1, 'Rotaract Club of Chennai',    'Community service club focused on youth-led volunteering across Chennai.', 'Chennai',    'approved', 3),
(2, 'Rotaract Club of Coimbatore', 'Community service club driving environmental and civic initiatives in Coimbatore.', 'Coimbatore', 'approved', 5);

-- ============================================================
-- ORGANIZER PROFILES — all 4 organizer users mapped to the 2 orgs
-- (Test Organizer & Other Organizer -> org 1, Anisha & Remi -> org 2)
-- ============================================================
INSERT INTO organizer_profiles (organizer_id, org_id) VALUES
(3, 1),
(4, 1),
(5, 2),
(6, 2);

-- ============================================================
-- SKILLS (8)
-- ============================================================
INSERT INTO skills (skill_id, name) VALUES
(1, 'Photography'),
(2, 'Public Speaking'),
(3, 'Cleaning'),
(4, 'First Aid'),
(5, 'Teaching'),
(6, 'Social Media'),
(7, 'Event Management'),
(8, 'Logistics');

-- ============================================================
-- VOLUNTEER PROFILES — only the 2 existing volunteer users
-- ============================================================
INSERT INTO volunteer_profiles (volunteer_id, bio, location, total_hours, reputation_score) VALUES
(2, 'Enjoys community service and event photography.',        'Chennai', 15.50, 4.50),
(7, 'Passionate about healthcare outreach and first aid.',     'Chennai', 18.25, 4.70);

-- ============================================================
-- VOLUNTEER SKILLS
-- ============================================================
INSERT INTO volunteer_skills (volunteer_id, skill_id) VALUES
(2, 1), (2, 6), (2, 7),   -- Renisha: Photography, Social Media, Event Management
(7, 4), (7, 5), (7, 7);   -- Sameeha: First Aid, Teaching, Event Management

-- ============================================================
-- EVENTS (5) — 1,2,4 are past (before 2026-08-02), 3,5 upcoming
-- ============================================================
INSERT INTO events (event_id, org_id, created_by, title, description, location, event_start, event_end, application_deadline, status) VALUES
(1, 1, 3, 'Beach Cleanup',       'A community beach cleanup drive to remove plastic waste and raise awareness.', 'Chennai',    '2026-07-05 07:00:00', '2026-07-05 11:00:00', '2026-07-03 23:59:00', 'published'),
(2, 1, 3, 'Blood Donation Camp', 'A blood donation camp organized in partnership with a local hospital.',       'Chennai',    '2026-07-15 09:00:00', '2026-07-15 15:00:00', '2026-07-13 23:59:00', 'published'),
(3, 1, 4, 'Hackathon',           'A 24-hour hackathon for students, mentored by industry volunteers.',          'Chennai',    '2026-08-20 08:00:00', '2026-08-21 20:00:00', '2026-08-15 23:59:00', 'published'),
(4, 2, 5, 'Tree Plantation',     'A tree plantation drive across public parks in Coimbatore.',                  'Coimbatore', '2026-07-25 07:30:00', '2026-07-25 11:00:00', '2026-07-23 23:59:00', 'published'),
(5, 2, 6, 'Medical Camp',        'A free medical checkup camp for underserved communities.',                    'Madurai',    '2026-09-05 09:00:00', '2026-09-05 16:00:00', '2026-08-30 23:59:00', 'published');

-- ============================================================
-- EVENT ROLES (15, 3 per event)
-- ============================================================
INSERT INTO event_roles (role_id, event_id, title, capacity) VALUES
(1,  1, 'Cleaning',           6),
(2,  1, 'Photography',        2),
(3,  1, 'Social Media',       2),
(4,  2, 'Registration',       3),
(5,  2, 'First Aid',          4),
(6,  2, 'Photography',        1),
(7,  3, 'Mentor',             3),
(8,  3, 'Registration',       3),
(9,  3, 'Photography',        2),
(10, 4, 'Plantation',         8),
(11, 4, 'Photography',        2),
(12, 4, 'Logistics',          3),
(13, 5, 'Registration',       3),
(14, 5, 'First Aid',          4),
(15, 5, 'Volunteer Support',  3);

-- ============================================================
-- ROLE SKILLS
-- ============================================================
INSERT INTO role_skills (role_id, skill_id) VALUES
(1, 3), (2, 1), (3, 6),
(4, 7), (5, 4), (6, 1),
(7, 5), (8, 7), (9, 1),
(10, 8), (11, 1), (12, 8),
(13, 7), (14, 4), (15, 8);

-- ============================================================
-- APPLICATIONS (10) — only volunteers 2 (Renisha) and 7 (Sameeha)
-- Mixed statuses: confirmed, selected, applied, rejected, withdrawn
-- ============================================================
INSERT INTO applications (application_id, volunteer_id, event_id, preferred_role_id, motivation, status, applied_at, decided_at) VALUES
(1,  2, 1, 1,  'I would love to help keep our beaches clean.',              'confirmed', '2026-06-25 10:00:00', '2026-07-01 09:00:00'),
(2,  7, 1, 2,  'I have a good camera and enjoy event photography.',        'selected',  '2026-06-26 11:00:00', '2026-07-01 09:15:00'),
(3,  7, 2, 5,  'I am first-aid trained and want to support the camp.',     'confirmed', '2026-07-05 09:00:00', '2026-07-10 09:00:00'),
(4,  2, 2, 4,  'I can help manage the registration desk smoothly.',        'applied',   '2026-07-06 10:00:00', NULL),
(5,  2, 3, 7,  'Would like to mentor students in web development.',        'applied',   '2026-08-01 09:00:00', NULL),
(6,  7, 3, 9,  'Would like to photograph the hackathon for the recap.',    'confirmed', '2026-08-01 10:00:00', '2026-08-02 09:00:00'),
(7,  2, 4, 10, 'Enjoy outdoor environmental work.',                        'confirmed', '2026-07-15 09:00:00', '2026-07-20 09:00:00'),
(8,  7, 4, 11, 'Would like to photograph the plantation drive.',           'rejected',  '2026-07-16 10:00:00', '2026-07-20 09:10:00'),
(9,  2, 5, 13, 'Interested in helping with camp registration.',            'withdrawn', '2026-07-20 09:00:00', NULL),
(10, 7, 5, 14, 'First-aid trained, keen to support the medical camp.',     'confirmed', '2026-07-21 10:00:00', '2026-07-25 09:00:00');

-- ============================================================
-- ASSIGNMENTS (only for confirmed applications)
-- ============================================================
INSERT INTO assignments (assignment_id, application_id, volunteer_id, event_id, role_id, assigned_by, assigned_at, status, rating) VALUES
(1, 1,  2, 1, 1,  3, '2026-07-01 09:05:00', 'assigned', 5),
(2, 3,  7, 2, 5,  3, '2026-07-10 09:05:00', 'assigned', 5),
(3, 6,  7, 3, 9,  4, '2026-08-02 09:05:00', 'assigned', NULL),
(4, 7,  2, 4, 10, 5, '2026-07-20 09:05:00', 'assigned', NULL),
(5, 10, 7, 5, 14, 6, '2026-07-25 09:05:00', 'assigned', NULL);

-- ============================================================
-- ATTENDANCE (only for past-event assignments: events 1, 2, 4)
-- One left pending on purpose so verification flow can be tested
-- ============================================================
INSERT INTO attendance (attendance_id, assignment_id, check_in_time, check_out_time, verification_status, hours_recorded) VALUES
(1, 1, '2026-07-05 06:55:00', '2026-07-05 11:05:00', 'verified', TRUE),
(2, 2, '2026-07-15 08:55:00', '2026-07-15 15:05:00', 'verified', TRUE),
(3, 4, '2026-07-25 07:25:00', NULL,                   'pending',  FALSE);

-- ============================================================
-- CERTIFICATES (only for verified attendance)
-- ============================================================
INSERT INTO certificates (certificate_id, certificate_code, assignment_id, volunteer_id, event_id, hours_credited, issued_at) VALUES
(1, 'IGNITE-CERT-0001', 1, 2, 1, 4.17, '2026-07-06 10:00:00'),
(2, 'IGNITE-CERT-0002', 2, 7, 2, 6.17, '2026-07-16 10:00:00');

-- ============================================================
-- ACHIEVEMENTS
-- ============================================================
INSERT INTO achievements (achievement_id, name, criteria_type, criteria_value) VALUES
(1, 'First Steps',         'events_count', 1),
(2, 'Community Champion',  'events_count', 5),
(3, 'Half Century',        'hours',        50),
(4, 'Century Club',        'hours',        100),
(5, 'Dedicated Volunteer', 'hours',        20);

-- ============================================================
-- VOLUNTEER ACHIEVEMENTS
-- ============================================================
INSERT INTO volunteer_achievements (volunteer_id, achievement_id, earned_at) VALUES
(2, 1, '2026-07-05 12:00:00'),
(7, 1, '2026-07-15 16:00:00');

-- ============================================================
-- RECOGNITIONS (Hall of Fame)
-- ============================================================
INSERT INTO recognitions (recognition_id, org_id, volunteer_id, title, description, event_id, created_at) VALUES
(1, 1, 2, 'Rising Star Volunteer',    'Recognized for consistent enthusiasm at the Beach Cleanup.',         1, '2026-07-07 09:00:00'),
(2, 1, 7, 'Outstanding Contribution', 'Recognized for exceptional dedication at the Blood Donation Camp.',  2, '2026-07-17 09:00:00');

-- ============================================================
-- NOTIFICATIONS (covers admin, organizers, and volunteers)
-- ============================================================
INSERT INTO notifications (notification_id, user_id, title, message, type, is_read, created_at) VALUES
(1,  2, 'Application Confirmed',      'Your application for Beach Cleanup has been confirmed.',                  'application_status', TRUE,  '2026-07-01 09:00:00'),
(2,  7, 'Application Selected',       'You have been selected for Beach Cleanup — confirmation pending.',        'application_status', FALSE, '2026-07-01 09:15:00'),
(3,  2, 'Assigned to Cleaning Team',  'You have been assigned to the Cleaning role for Beach Cleanup.',          'assignment',          TRUE,  '2026-07-01 09:05:00'),
(4,  7, 'Application Confirmed',      'Your application for Blood Donation Camp has been confirmed.',            'application_status', FALSE, '2026-07-10 09:00:00'),
(5,  2, 'Certificate Ready',          'Your certificate for Beach Cleanup is ready to download.',                'certificate',         FALSE, '2026-07-06 10:00:00'),
(6,  7, 'Certificate Ready',          'Your certificate for Blood Donation Camp is ready to download.',          'certificate',         FALSE, '2026-07-16 10:00:00'),
(7,  7, 'You Have Been Recognized!',  'Rotaract Club of Chennai recognized you for Outstanding Contribution.',   'recognition',         FALSE, '2026-07-17 09:00:00'),
(8,  2, 'You Have Been Recognized!',  'Rotaract Club of Chennai recognized you as Rising Star Volunteer.',       'recognition',         FALSE, '2026-07-07 09:00:00'),
(9,  3, 'New Application Received',   'A new applicant has applied for Blood Donation Camp.',                    'application_status', FALSE, '2026-07-06 10:05:00'),
(10, 4, 'New Application Received',   'A new applicant has applied for Hackathon.',                              'application_status', FALSE, '2026-08-01 09:05:00'),
(11, 5, 'New Application Received',   'A new applicant has applied for Tree Plantation.',                        'application_status', TRUE,  '2026-07-15 09:05:00'),
(12, 6, 'New Application Received',   'A new applicant has applied for Medical Camp.',                           'application_status', FALSE, '2026-07-21 10:05:00'),
(13, 1, 'Weekly Platform Summary',    '2 events completed this week across both organizations.',                 'system',              FALSE, '2026-07-27 08:00:00');

-- ============================================================
-- SPONSORS (3)
-- ============================================================
INSERT INTO sponsors (sponsor_id, sponsor_name, website, industry, contact_person, email, phone, created_at) VALUES
(1, 'GreenLeaf Foods',    'https://greenleaf.example.com', 'Food & Beverage', 'Anjali Menon',  'anjali@greenleaf.example.com',  '+91-9800011122', '2026-06-20 09:00:00'),
(2, 'CareWell Hospitals', 'https://carewell.example.com',  'Healthcare',      'Dr. Ramesh Iyer','ramesh@carewell.example.com',   '+91-9800033344', '2026-06-20 09:05:00'),
(3, 'EcoBuild Supplies',  'https://ecobuild.example.com',  'Construction/Retail', 'Farah Sheikh','farah@ecobuild.example.com',   '+91-9800055566', '2026-06-22 10:00:00');

-- ============================================================
-- EVENT SPONSORS
-- ============================================================
INSERT INTO event_sponsors (event_sponsor_id, event_id, sponsor_id, sponsorship_type, sponsorship_amount, remarks, created_at) VALUES
(1, 1, 1, 'cash',     10000.00, 'Sponsored refreshments and cleanup supplies for Beach Cleanup.',    '2026-06-28 09:00:00'),
(2, 2, 2, 'cash',     25000.00, 'Primary healthcare sponsor for the Blood Donation Camp.',            '2026-07-01 09:00:00'),
(3, 4, 3, 'in-kind',  NULL,     'Donated saplings and gardening tools for the Tree Plantation drive.', '2026-07-08 09:00:00'),
(4, 5, 2, 'cash',     15000.00, 'Supporting medical staff and supplies for the Medical Camp.',        '2026-07-22 09:00:00');