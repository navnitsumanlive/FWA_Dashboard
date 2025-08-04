SELECT 
    c.name AS community,
    CONCAT(mc.year, '-', LPAD(mc.month, 2, '0')) AS month,
    mc.claim_count,
    mc.total_value
FROM monthly_claims mc
JOIN communities c ON mc.community_id = c.community_id
WHERE mc.year = 2023
ORDER BY c.is_suspicious DESC, mc.year, mc.month;