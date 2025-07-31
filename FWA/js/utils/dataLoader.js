export async function loadFWAData() {
    try {
        // In a real implementation, this would fetch from an API:
        // const response = await fetch('/api/fwa-data');
        
        // For demo purposes, we'll use a static import:
        const response = await fetch('data/fwa-data.json');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
        
    } catch (error) {
        console.error('Error loading FWA data:', error);
        throw error; // Re-throw to let calling code handle it
    }
}
// export async function loadFWAData() {
//     try {
//         const response = await fetch('data/fwa-data.json');
//         if (!response.ok) {
//             throw new Error('Network response was not ok');
//         }
//         return await response.json();
//     } catch (error) {
//         console.error('Error loading FWA data:', error);
//         throw error;
//     }
// }

export function filterDataByTime(data, timePeriod) {
    const now = new Date();
    let cutoffDate;
    
    switch(timePeriod) {
        case '7d': cutoffDate = new Date(now.setDate(now.getDate() - 7)); break;
        case '30d': cutoffDate = new Date(now.setDate(now.getDate() - 30)); break;
        case '90d': cutoffDate = new Date(now.setDate(now.getDate() - 90)); break;
        default: cutoffDate = new Date(0);
    }
    
    return {
        claims: data.claims.filter(claim => 
            new Date(claim.service_date) >= cutoffDate
        ),
        providers: data.providers
    };
}

export function calculateRiskCutoff(claims, thresholdPercent) {
    const riskScores = claims.map(d => d.risk_score);
    return d3.quantile(riskScores, thresholdPercent / 100);
}