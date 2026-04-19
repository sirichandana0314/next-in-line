-- Clear existing data
TRUNCATE TABLE application_status_log CASCADE;
TRUNCATE TABLE applications CASCADE;
TRUNCATE TABLE job_openings CASCADE;
TRUNCATE TABLE companies CASCADE;

-- Insert company
INSERT INTO companies (id, name) VALUES 
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 
     'TechStartup Inc.');

-- Insert job with capacity 3
INSERT INTO job_openings (
    id, company_id, title, description, 
    active_capacity, decay_window_minutes
) VALUES (
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Backend Engineer',
    'Node.js and PostgreSQL expert needed',
    3, 1440
);

-- Active applicants (3 filling capacity)
INSERT INTO applications (
    id, job_id, applicant_name, applicant_email, 
    status, applied_at
) VALUES 
(
    'c1000000-0000-0000-0000-000000000001',
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'Alice Johnson', 'alice@example.com',
    'active', NOW() - INTERVAL '2 days'
),
(
    'c1000000-0000-0000-0000-000000000002',
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'Bob Smith', 'bob@example.com',
    'active', NOW() - INTERVAL '2 days'
),
(
    'c1000000-0000-0000-0000-000000000003',
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'Charlie Brown', 'charlie@example.com',
    'active', NOW() - INTERVAL '1 day'
);

-- Waitlisted applicants
INSERT INTO applications (
    id, job_id, applicant_name, applicant_email,
    status, waitlist_position, applied_at
) VALUES
(
    'c1000000-0000-0000-0000-000000000004',
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'Diana Prince', 'diana@example.com',
    'waitlisted', 1, NOW() - INTERVAL '1 day'
),
(
    'c1000000-0000-0000-0000-000000000005',
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'Evan Rogers', 'evan@example.com',
    'waitlisted', 2, NOW() - INTERVAL '12 hours'
),
(
    'c1000000-0000-0000-0000-000000000006',
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'Fiona Green', 'fiona@example.com',
    'waitlisted', 3, NOW() - INTERVAL '6 hours'
);

-- Previously rejected applicant
INSERT INTO applications (
    id, job_id, applicant_name, applicant_email,
    status, applied_at
) VALUES
(
    'c1000000-0000-0000-0000-000000000007',
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'George Hill', 'george@example.com',
    'rejected', NOW() - INTERVAL '3 days'
);

-- Audit log entries
INSERT INTO application_status_log (
    application_id, previous_status, new_status, reason
) VALUES
('c1000000-0000-0000-0000-000000000001', NULL, 'active', 'Initial application'),
('c1000000-0000-0000-0000-000000000002', NULL, 'active', 'Initial application'),
('c1000000-0000-0000-0000-000000000003', NULL, 'active', 'Initial application'),
('c1000000-0000-0000-0000-000000000004', NULL, 'waitlisted', 'Initial application'),
('c1000000-0000-0000-0000-000000000005', NULL, 'waitlisted', 'Initial application'),
('c1000000-0000-0000-0000-000000000006', NULL, 'waitlisted', 'Initial application'),
('c1000000-0000-0000-0000-000000000007', NULL, 'active', 'Initial application'),
('c1000000-0000-0000-0000-000000000007', 'active', 'rejected', 'Did not meet requirements');