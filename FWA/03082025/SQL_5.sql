-- Insert Hospitals
INSERT INTO hospitals VALUES 
('H1', 'City General Hospital', 'General', 4.2, 1850, 1200),
('H2', 'Community Medical Center', 'Community', 3.8, 1200, 950),
('H3', 'Regional Specialty Clinic', 'Specialty', 2.9, 800, 1100);

-- Insert Doctors
INSERT INTO doctors VALUES
('D1', 'Dr. Smith A', 'doctor', 'Cardiology', 220, 1850, 35.2, NULL),
('D2', 'Dr. Johnson B', 'doctor', 'Radiology', 180, 1600, 28.7, NULL),
('RD1', 'Dr. Wilson H', 'referring', 'General Practice', 150, 2250, 42.5, NULL),
('SD1', 'Dr. Harris O', 'servicing', 'Radiology', 220, 1800, NULL, 38.7);

-- Insert Hospital-Doctor Affiliations
INSERT INTO hospital_doctor_affiliations VALUES
(1, 'H1', 'D1', 120),
(2, 'H1', 'D2', 95),
(3, 'H2', 'D1', 60);

-- Insert Doctor Referrals
INSERT INTO doctor_referrals VALUES
(1, 'RD1', 'SD1', 200, TRUE),
(2, 'RD1', 'D1', 180, FALSE),
(3, 'D1', 'SD1', 150, TRUE);

-- Insert Communities
INSERT INTO communities VALUES
(1, 'City General Cluster', TRUE, 1850, 2, 6, 0.8, 0.9),
(2, 'Community Hospital Group', FALSE, 950, 5, 1, 0.2, 0.3),
(3, 'Specialty Network', FALSE, 1200, 4, 1, 0.1, 0.2);

-- Insert Community Memberships
INSERT INTO community_memberships VALUES
(1, 'H1', 'hospital', 1),
(2, 'D1', 'doctor', 1),
(3, 'D2', 'doctor', 1),
(4, 'H2', 'hospital', 2),
(5, 'RD1', 'doctor', 1),
(6, 'SD1', 'doctor', 1);

-- Insert Claim Types
INSERT INTO claim_types VALUES
(1, 'MRI'),
(2, 'CT Scan'),
(3, 'X-Ray'),
(4, 'Lab Tests'),
(5, 'Consultation'),
(6, 'Surgery'),
(7, 'Physical Therapy');

-- Insert Community Claim Patterns
INSERT INTO community_claim_patterns VALUES
(1, 1, 1, 35.0), -- Suspicious community has high MRI %
(2, 1, 2, 25.0), -- High CT scans
(3, 2, 3, 30.0), -- Normal community has more X-Rays
(4, 2, 5, 20.0); -- More consultations

-- Insert Monthly Claims
INSERT INTO monthly_claims VALUES
(1, 1, 1, 2023, 120, 144000), -- Jan claims for suspicious community
(2, 1, 2, 2023, 135, 162000),
(3, 2, 1, 2023, 85, 80750),   -- Jan claims for normal community
(4, 2, 2, 2023, 90, 85500);