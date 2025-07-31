// Format currency values
export function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}

// Generate a color scale based on risk score
export function getRiskColorScale(domain = [0, 1]) {
    return d3.scaleSequential(d3.interpolateRdYlGn)
        .domain([domain[1], domain[0]]); // Reverse for red = high risk
}

// Calculate hexbin layout for geographic points
export function createHexbin(width, height, radius) {
    return d3.hexbin()
        .radius(radius)
        .extent([[0, 0], [width, height]]);
}

// Generate a unique ID
export function generateId(prefix = 'id') {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

// Debounce function for resize events
export function debounce(func, wait = 100) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(this, args);
        }, wait);
    };
}