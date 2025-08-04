-- Table: providers
CREATE TABLE providers (
    provider_id UUID PRIMARY KEY,
    provider_type VARCHAR(50) NOT NULL, -- 'doctor' or 'hospital'
    name VARCHAR(255) NOT NULL,
    speciality VARCHAR(255),
    location VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: patients (optional)
CREATE TABLE patients (
    patient_id UUID PRIMARY KEY,
    gender CHAR(1),
    dob DATE,
    location VARCHAR(255)
);

-- Table: claims
CREATE TABLE claims (
    claim_id UUID PRIMARY KEY,
    billing_provider_id UUID NOT NULL REFERENCES providers(provider_id),
    servicing_provider_id UUID NOT NULL REFERENCES providers(provider_id),
    patient_id UUID REFERENCES patients(patient_id),
    claim_amount DECIMAL(12,2) NOT NULL,
    billed_amount DECIMAL(12,2),
    claim_date DATE NOT NULL,
    procedure_code VARCHAR(50),
    status VARCHAR(50), -- e.g., Approved / Rejected / Flagged
    risk_score DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: connections (graph edges between providers)
CREATE TABLE connections (
    connection_id UUID PRIMARY KEY,
    source_id UUID NOT NULL REFERENCES providers(provider_id),
    target_id UUID NOT NULL REFERENCES providers(provider_id),
    connection_type VARCHAR(50), -- e.g., 'referral', 'collaboration'
    strength_score DECIMAL(5,2),
    shared_claims INT,
    community_id VARCHAR(50),
    last_interaction_date DATE
);

-- Table: community_clusters
CREATE TABLE community_clusters (
    community_id VARCHAR(50) PRIMARY KEY,
    description VARCHAR(255),
    risk_level VARCHAR(20), -- High / Medium / Low
    node_count INT,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
