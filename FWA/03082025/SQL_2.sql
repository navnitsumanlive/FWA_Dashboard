SELECT c.name AS community, ct.name AS claim_type, ccp.percentage
FROM community_claim_patterns ccp
JOIN communities c ON ccp.community_id = c.community_id
JOIN claim_types ct ON ccp.claim_type_id = ct.claim_type_id
ORDER BY c.is_suspicious DESC, ccp.percentage DESC;