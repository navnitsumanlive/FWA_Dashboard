const syntheticData = {
  "hospital-doctor": {
    "nodes": [
      // Sample of hospital nodes (60 total)
      {
        "id": "H1",
        "name": "City General Hospital",
        "type": "hospital",
        "size": 40,
        "hospitalType": "General",
        "community": 1,
        "claimsLastYear": 1850,
        "avgClaimValue": 1200,
        "readmissionRate": "4.2%"
      },
      {
        "id": "H2",
        "name": "Community Medical Center",
        "type": "hospital",
        "size": 35,
        "hospitalType": "Community",
        "community": 2,
        "claimsLastYear": 1200,
        "avgClaimValue": 950,
        "readmissionRate": "3.8%"
      },
      // ... more hospitals ...
      
      // Sample of doctor nodes (1140 total)
      {
        "id": "D1",
        "name": "Dr. Smith A",
        "type": "doctor",
        "specialty": "Cardiology",
        "size": 18,
        "community": 1,
        "affiliatedHospital": "H1",
        "claimsLastYear": 220,
        "avgClaimValue": 1850,
        "referralRate": "35.2%"
      },
      {
        "id": "D2",
        "name": "Dr. Johnson B",
        "type": "doctor",
        "specialty": "Radiology",
        "size": 15,
        "community": 1,
        "affiliatedHospital": "H1",
        "claimsLastYear": 180,
        "avgClaimValue": 1600,
        "referralRate": "28.7%"
      },
      // ... more doctors ...
    ],
    "links": [
      // Hospital-doctor affiliations
      {"source": "H1", "target": "D1", "value": 120},
      {"source": "H1", "target": "D2", "value": 95},
      // Doctor-doctor connections within communities
      {"source": "D1", "target": "D2", "value": 60},
      {"source": "D1", "target": "D3", "value": 75},
      // ... more links ...
    ],
    "communities": [
      {
        "id": 1,
        "name": "City General Cluster",
        "suspicious": true,
        "avgClaimValue": 1850,
        "externalConnections": 2,
        "internalConnections": 6,
        "claimTypes": {
          "MRI": 35,
          "CT Scan": 25,
          "Lab Tests": 20,
          "Surgery": 15,
          "Consultation": 5
        },
        "monthlyClaims": [120, 135, 142, 130, 155, 160, 148, 165, 170, 158, 145, 130]
      },
      {
        "id": 2,
        "name": "Community Hospital Group",
        "suspicious": false,
        "avgClaimValue": 950,
        "externalConnections": 5,
        "internalConnections": 1,
        "claimTypes": {
          "X-Ray": 30,
          "Lab Tests": 25,
          "Consultation": 20,
          "Physical Therapy": 15,
          "MRI": 10
        },
        "monthlyClaims": [85, 90, 88, 92, 95, 98, 100, 102, 105, 98, 92, 88]
      },
      // ... more communities ...
    ],
    "specialties": ["Cardiology", "Radiology", "Orthopedics", "Neurology", "Oncology", "Pediatrics", "General Practice"],
    "hospitalTypes": ["General", "Specialty", "Teaching", "Community", "Private", "Public"]
  },
  "doctor-doctor": {
    "nodes": [
      // Referring doctors (500 total)
      {
        "id": "RD1",
        "name": "Dr. Wilson H",
        "type": "referring",
        "specialty": "General Practice",
        "size": 14,
        "community": 1,
        "claimsLastYear": 150,
        "avgClaimValue": 2250,
        "referralRate": "42.5%"
      },
      // ... more referring doctors ...
      
      // Servicing doctors (500 total)
      {
        "id": "SD1",
        "name": "Dr. Harris O",
        "type": "servicing",
        "specialty": "Radiology",
        "size": 18,
        "community": 1,
        "claimsLastYear": 220,
        "avgClaimValue": 1800,
        "procedureRate": "38.7%"
      },
      // ... more servicing doctors ...
    ],
    "links": [
      // Referral relationships
      {"source": "RD1", "target": "SD1", "value": 200},
      {"source": "RD1", "target": "SD2", "value": 180},
      // Reciprocal relationships in suspicious community
      {"source": "SD1", "target": "RD1", "value": 150},
      // ... more links ...
    ],
    "communities": [
      {
        "id": 1,
        "name": "Potential Collusion Group",
        "suspicious": true,
        "avgClaimValue": 2250,
        "reciprocity": 0.8,
        "density": 0.9,
        "claimTypes": {
          "MRI": 40,
          "Specialty Consultation": 25,
          "CT Scan": 20,
          "Ultrasound": 10,
          "Lab Tests": 5
        },
        "monthlyClaims": [180, 195, 210, 205, 220, 235, 230, 245, 260, 250, 235, 220]
      },
      {
        "id": 2,
        "name": "Standard Referral Network",
        "suspicious": false,
        "avgClaimValue": 1150,
        "reciprocity": 0.2,
        "density": 0.3,
        "claimTypes": {
          "Consultation": 35,
          "Lab Tests": 25,
          "X-Ray": 20,
          "Physical Therapy": 15,
          "MRI": 5
        },
        "monthlyClaims": [95, 100, 105, 102, 110, 115, 112, 118, 120, 115, 108, 100]
      },
      // ... more communities ...
    ],
    "specialties": ["Cardiology", "Radiology", "Orthopedics", "Neurology", "Oncology", "Pediatrics", "General Practice"],
    "hospitalTypes": ["General", "Specialty", "Teaching", "Community", "Private", "Public"]
  }
};