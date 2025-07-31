export default class SavingsPotentialDashboard {
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
                <div class="panel full-width">
                    <div class="panel-header">Savings Potential Analysis</div>
                    <div class="chart-container" id="savings-waterfall"></div>
                </div>
            </div>
        `;
        
        this.renderSavingsWaterfall();
    }
    
    renderSavingsWaterfall() {
        const container = d3.select('#savings-waterfall');
        const svg = container.append('svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom)
            .append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
        
        // Calculate savings data
        const flaggedClaims = this.data.claims.filter(d => d.risk_score >= this.riskCutoff);
        const cleanClaims = this.data.claims.filter(d => d.risk_score < this.riskCutoff);
        
        const savingsData = [
            { category: "Total Billed", value: d3.sum(this.data.claims, d => d.billed_amount), type: "total" },
            { category: "Clean Claims", value: -d3.sum(cleanClaims, d => d.billed_amount), type: "clean" },
            { category: "Flagged Claims", value: -d3.sum(flaggedClaims, d => d.billed_amount), type: "flagged" },
            { category: "Allowed Amount", value: d3.sum(flaggedClaims, d => d.allowed_amount), type: "allowed" },
            { category: "Potential Savings", value: d3.sum(flaggedClaims, d => d.billed_amount - d.allowed_amount), type: "savings" }
        ];
        
        // Calculate cumulative values
        let cumulative = 0;
        const formattedData = savingsData.map((d, i) => {
            let start = cumulative;
            cumulative += d.value;
            return {
                ...d,
                start,
                end: cumulative,
                value: d.value
            };
        });
        
        // Create scales
        const x = d3.scaleBand()
            .domain(savingsData.map(d => d.category))
            .range([0, this.width])
            .padding(0.3);
        
        const y = d3.scaleLinear()
            .domain([0, d3.max(formattedData, d => d.end)])
            .range([this.height, 0]);
        
        // Color scale
        const color = d3.scaleOrdinal()
            .domain(["total", "clean", "flagged", "allowed", "savings"])
            .range(["#7f8c8d", "#2ecc71", "#e74c3c", "#3498db", "#9b59b6"]);
        
        // Draw bars
        svg.selectAll('.bar')
            .data(formattedData)
            .enter().append('rect')
            .attr('class', 'bar')
            .attr('x', d => x(d.category))
            .attr('y', d => y(Math.max(d.start, d.end)))
            .attr('width', x.bandwidth())
            .attr('height', d => Math.abs(y(d.start) - y(d.end)))
            .attr('fill', d => color(d.type))
            .attr('rx', 3)
            .attr('ry', 3)
            .on('mouseover', (event, d) => {
                const tooltip = d3.select('#tooltip');
                tooltip.style('opacity', 1)
                    .html(`
                        <strong>${d.category}</strong><br>
                        Amount: $${d3.format(',.0f')(Math.abs(d.value))}<br>
                        ${d.type === 'savings' ? 
                            `Claims: ${flaggedClaims.length}` : 
                            d.type === 'flagged' ? 
                            `Claims: ${flaggedClaims.length}<br>Avg Risk: ${d3.format('.2f')(d3.mean(flaggedClaims, c => c.risk_score))}` : 
                            ''}
                    `)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 28) + 'px');
            })
            .on('mouseout', () => d3.select('#tooltip').style('opacity', 0));
        
        // Add connectors for waterfall
        svg.selectAll('.connector')
            .data(formattedData.slice(0, -1))
            .enter().append('line')
            .attr('class', 'connector')
            .attr('x1', d => x(d.category) + x.bandwidth())
            .attr('y1', d => y(d.end))
            .attr('x2', d => x(savingsData[savingsData.indexOf(d) + 1].category))
            .attr('y2', d => y(d.end))
            .attr('stroke', '#95a5a6')
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '3,3');
        
        // Add value labels
        svg.selectAll('.label')
            .data(formattedData)
            .enter().append('text')
            .attr('class', 'label')
            .attr('x', d => x(d.category) + x.bandwidth() / 2)
            .attr('y', d => y(Math.max(d.start, d.end)) - 10)
            .attr('text-anchor', 'middle')
            .style('font-size', '12px')
            .style('fill', d => d.type === 'total' || d.type === 'savings' ? 'white' : 'var(--dark)')
            .text(d => {
                if (d.category === "Total Billed") {
                    return `$${d3.format(',.0f')(d.value)}`;
                } else if (d.category === "Potential Savings") {
                    return `$${d3.format(',.0f')(d.value)} Saved`;
                } else {
                    return `$${d3.format(',.0f')(Math.abs(d.value))}`;
                }
            });
        
        // Add axes
        svg.append('g')
            .attr('transform', `translate(0,${this.height})`)
            .call(d3.axisBottom(x));
        
        svg.append('g')
            .call(d3.axisLeft(y).tickFormat(d => `$${d3.format(',.0f')(d)}`));
        
        // Add title
        svg.append('text')
            .attr('x', this.width / 2)
            .attr('y', -10)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .text('Potential Savings from Flagged Claims');
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