SELECT 
    d1.name AS referring_doctor, 
    d2.name AS servicing_doctor,
    dr.referral_value,
    CASE WHEN dr.is_reciprocal THEN 'Yes' ELSE 'No' END AS reciprocal
FROM doctor_referrals dr
JOIN doctors d1 ON dr.referring_doctor_id = d1.doctor_id
JOIN doctors d2 ON dr.servicing_doctor_id = d2.doctor_id
JOIN community_memberships cm ON d1.doctor_id = cm.entity_id
JOIN communities c ON cm.community_id = c.community_id
WHERE c.is_suspicious = TRUE
ORDER BY dr.referral_value DESC;