export default class LengthOfStayDashboard {
    constructor(container, data, riskCutoff) {
        this.container = container;
        this.data = data;
        this.riskCutoff = riskCutoff;
        this.margin = {top: 40, right: 30, bottom: 60, left: 60};
        this.width = 800 - this.margin.left - this.margin.right;
        this.height = 500 - this.margin.top - this.margin.bottom;
    }
    
    render() {
        this.container.innerHTML = `
            <div class="dashboard">
                <div class="panel">
                    <div class="panel-header">Length of Stay Distribution</div>
                    <div class="chart-container" id="los-distribution"></div>
                </div>
                <div class="panel">
                    <div class="panel-header">LOS vs. Cost Analysis</div>
                    <div class="chart-container" id="los-cost-analysis"></div>
                </div>
            </div>
        `;
        
        this.renderLOSDistribution();
        this.renderLOSCostAnalysis();
    }
    
    renderLOSDistribution() {
        const container = d3.select('#los-distribution');
        const svg = container.append('svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom)
            .append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
        
        // Filter to inpatient claims with LOS
        const losData = this.data.claims
            .filter(d => d.los_days != null)
            .map(d => ({
                ...d,
                los_days: +d.los_days,
                cost_per_day: d.billed_amount / d.los_days
            }));
        
        if (losData.length === 0) {
            svg.append('text')
                .attr('x', this.width/2)
                .attr('y', this.height/2)
                .attr('text-anchor', 'middle')
                .text('No LOS data available for selected filters');
            return;
        }
        
        // Calculate bins for histogram
        const maxLOS = d3.max(losData, d => d.los_days);
        const binCount = Math.min(20, maxLOS);
        const binGenerator = d3.bin()
            .domain([0, maxLOS])
            .thresholds(binCount);
        
        const bins = binGenerator(losData.map(d => d.los_days));
        
        // Create scales
        const x = d3.scaleLinear()
            .domain([0, maxLOS])
            .range([0, this.width]);
        
        const y = d3.scaleLinear()
            .domain([0, d3.max(bins, d => d.length)])
            .range([this.height, 0]);
        
        // Draw bars
        svg.selectAll('.bar')
            .data(bins)
            .enter().append('rect')
            .attr('class', 'bar')
            .attr('x', d => x(d.x0) + 1)
            .attr('y', d => y(d.length))
            .attr('width', d => x(d.x1) - x(d.x0) - 1)
            .attr('height', d => this.height - y(d.length))
            .attr('fill', d => {
                const avgRisk = d3.mean(d.map(d => this.data.claims.find(c => c.los_days >= d.x0 && c.los_days < d.x1)?.risk_score || 0);
                return avgRisk > 0.7 ? '#e74c3c' : avgRisk > 0.4 ? '#f39c12' : '#2ecc71';
            })
            .attr('rx', 2)
            .attr('ry', 2)
            .on('mouseover', (event, d) => {
                const avgRisk = d3.mean(d.map(d => this.data.claims.find(c => c.los_days >= d.x0 && c.los_days < d.x1)?.risk_score || 0));
                const avgCost = d3.mean(d.map(d => {
                    const claim = this.data.claims.find(c => c.los_days >= d.x0 && c.los_days < d.x1);
                    return claim ? claim.billed_amount / claim.los_days : 0;
                }));
                
                d3.select('#tooltip')
                    .style('opacity', 1)
                    .html(`
                        <strong>LOS Range:</strong> ${d.x0}-${d.x1} days<br>
                        <strong>Claim Count:</strong> ${d.length}<br>
                        <strong>Avg. Risk Score:</strong> ${d3.format('.2f')(avgRisk)}<br>
                        <strong>Avg. Cost/Day:</strong> $${d3.format(',.0f')(avgCost)}
                    `)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 28) + 'px');
            })
            .on('mouseout', () => d3.select('#tooltip').style('opacity', 0));
        
        // Add mean line
        const meanLOS = d3.mean(losData, d => d.los_days);
        svg.append('line')
            .attr('x1', x(meanLOS))
            .attr('x2', x(meanLOS))
            .attr('y1', 0)
            .attr('y2', this.height)
            .attr('stroke', '#2c3e50')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5,5');
        
        svg.append('text')
            .attr('x', x(meanLOS) + 5)
            .attr('y', 20)
            .text(`Mean: ${d3.format('.1f')(meanLOS)} days`)
            .style('font-size', '12px');
        
        // Add axes
        svg.append('g')
            .attr('transform', `translate(0,${this.height})`)
            .call(d3.axisBottom(x));
        
        svg.append('g')
            .call(d3.axisLeft(y));
        
        // Add title
        svg.append('text')
            .attr('x', this.width / 2)
            .attr('y', -10)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .text('Distribution of Length of Stay (Days)');
    }
    
    renderLOSCostAnalysis() {
        const container = d3.select('#los-cost-analysis');
        const svg = container.append('svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom)
            .append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
        
        // Filter to inpatient claims with LOS
        const losData = this.data.claims
            .filter(d => d.los_days != null)
            .map(d => ({
                ...d,
                los_days: +d.los_days,
                cost_per_day: d.billed_amount / d.los_days,
                is_outlier: d.risk_score >= this.riskCutoff
            }));
        
        if (losData.length === 0) {
            svg.append('text')
                .attr('x', this.width/2)
                .attr('y', this.height/2)
                .attr('text-anchor', 'middle')
                .text('No LOS data available for selected filters');
            return;
        }
        
        // Create scales
        const x = d3.scaleLinear()
            .domain([0, d3.max(losData, d => d.los_days)])
            .range([0, this.width]);
        
        const y = d3.scaleLinear()
            .domain([0, d3.max(losData, d => d.cost_per_day)])
            .range([this.height, 0]);
        
        // Add hexbin plot
        const hexbin = d3.hexbin()
            .x(d => x(d.los_days))
            .y(d => y(d.cost_per_day))
            .radius(15)
            .extent([[0, 0], [this.width, this.height]]);
        
        const bins = hexbin(losData);
        const countScale = d3.scaleSequential(d3.interpolateBlues)
            .domain([0, d3.max(bins, d => d.length)]);
        
        svg.append('g')
            .selectAll('path')
            .data(bins)
            .enter().append('path')
            .attr('d', hexbin.hexagon())
            .attr('transform', d => `translate(${d.x},${d.y})`)
            .attr('fill', d => countScale(d.length))
            .attr('stroke', '#fff')
            .attr('stroke-width', 0.5)
            .on('mouseover', (event, d) => {
                const avgRisk = d3.mean(d, d => d.risk_score);
                d3.select('#tooltip')
                    .style('opacity', 1)
                    .html(`
                        <strong>LOS:</strong> ${d3.format('.1f')(x.invert(d.x))} days<br>
                        <strong>Cost/Day:</strong> $${d3.format(',.0f')(y.invert(d.y))}<br>
                        <strong>Claims:</strong> ${d.length}<br>
                        <strong>Avg. Risk:</strong> ${d3.format('.2f')(avgRisk)}
                    `)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 28) + 'px');
            })
            .on('mouseout', () => d3.select('#tooltip').style('opacity', 0));
        
        // Add outlier points
        svg.selectAll('.outlier')
            .data(losData.filter(d => d.is_outlier))
            .enter().append('circle')
            .attr('class', 'outlier')
            .attr('cx', d => x(d.los_days))
            .attr('cy', d => y(d.cost_per_day))
            .attr('r', 3)
            .attr('fill', '#e74c3c')
            .attr('stroke', '#fff')
            .attr('stroke-width', 0.5)
            .on('mouseover', (event, d) => {
                d3.select('#tooltip')
                    .style('opacity', 1)
                    .html(`
                        <strong>Outlier Claim</strong><br>
                        LOS: ${d.los_days} days<br>
                        Cost/Day: $${d3.format(',.0f')(d.cost_per_day)}<br>
                        Total Billed: $${d3.format(',.0f')(d.billed_amount)}<br>
                        Risk Score: ${d3.format('.2f')(d.risk_score)}
                    `)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 28) + 'px');
            })
            .on('mouseout', () => d3.select('#tooltip').style('opacity', 0));
        
        // Add regression line
        const regression = this.calculateRegression(losData);
        svg.append('line')
            .attr('x1', x(0))
            .attr('y1', y(regression.intercept))
            .attr('x2', x(d3.max(losData, d => d.los_days)))
            .attr('y2', y(regression.intercept + regression.slope * d3.max(losData, d => d.los_days)))
            .attr('stroke', '#2c3e50')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5,5');
        
        // Add axes
        svg.append('g')
            .attr('transform', `translate(0,${this.height})`)
            .call(d3.axisBottom(x));
        
        svg.append('g')
            .call(d3.axisLeft(y).tickFormat(d => `$${d3.format(',.0f')(d)}`));
        
        // Add labels
        svg.append('text')
            .attr('x', this.width / 2)
            .attr('y', this.height + 40)
            .attr('text-anchor', 'middle')
            .text('Length of Stay (Days)');
        
        svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', -40)
            .attr('x', -this.height / 2)
            .attr('text-anchor', 'middle')
            .text('Cost Per Day ($)');
        
        // Add title
        svg.append('text')
            .attr('x', this.width / 2)
            .attr('y', -10)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .text('Length of Stay vs. Cost Per Day (Red = Outliers)');
    }
    
    calculateRegression(data) {
        const n = data.length;
        const sumX = d3.sum(data, d => d.los_days);
        const sumY = d3.sum(data, d => d.cost_per_day);
        const sumXY = d3.sum(data, d => d.los_days * d.cost_per_day);
        const sumX2 = d3.sum(data, d => d.los_days * d.los_days);
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        return { slope, intercept };
    }
    
    updateData(data, riskCutoff) {
        this.data = data;
        this.riskCutoff = riskCutoff;
        this.render();
    }
    
    unload() {
        // Clean up if needed
    }
}