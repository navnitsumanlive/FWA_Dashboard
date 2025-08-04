SELECT h.name AS hospital, d.name AS doctor, d.specialty, 
       hd.connection_strength, c.name AS community
FROM hospitals h
JOIN hospital_doctor_affiliations hd ON h.hospital_id = hd.hospital_id
JOIN doctors d ON hd.doctor_id = d.doctor_id
JOIN community_memberships cm ON d.doctor_id = cm.entity_id
JOIN communities c ON cm.community_id = c.community_id
WHERE c.is_suspicious = TRUE
ORDER BY hd.connection_strength DESC;