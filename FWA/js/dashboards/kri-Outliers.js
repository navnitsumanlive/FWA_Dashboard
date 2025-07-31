export default class KRIOutliersDashboard {
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
                    <div class="panel-header">Key Risk Indicator Outliers</div>
                    <div class="chart-container" id="parallel-coordinates"></div>
                </div>
                <div class="panel">
                    <div class="panel-header">Outlier Distribution by KRI</div>
                    <div class="chart-container" id="outlier-distribution"></div>
                </div>
            </div>
        `;
        
        this.renderParallelCoordinates();
        this.renderOutlierDistribution();
    }
    
    renderParallelCoordinates() {
        const container = d3.select('#parallel-coordinates');
        const svg = container.append('svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom)
            .append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
        
        // Get KRI dimensions from first claim
        const dimensions = Object.keys(this.data.claims[0].kri_scores);
        
        // Prepare data - normalize values and add outlier flag
        const normalizedData = this.data.claims.map(claim => {
            const normalized = { id: claim.claim_id, outlier: claim.risk_score >= this.riskCutoff };
            dimensions.forEach(dim => {
                normalized[dim] = claim.kri_scores[dim];
            });
            return normalized;
        });
        
        // Create scales for each dimension
        const y = {};
        dimensions.forEach(dim => {
            y[dim] = d3.scaleLinear()
                .domain([0, 1])
                .range([this.height, 0]);
        });
        
        const x = d3.scalePoint()
            .domain(dimensions)
            .range([0, this.width])
            .padding(0.5);
        
        // Draw lines
        const line = d3.line()
            .defined(d => !isNaN(d.value))
            .x(d => x(d.name))
            .y(d => y[d.name](d.value));
        
        svg.selectAll('.path')
            .data(normalizedData)
            .enter().append('path')
            .attr('class', 'path-transition')
            .attr('d', d => line(dimensions.map(name => ({ name, value: d[name] }))))
            .attr('stroke', d => d.outlier ? '#e74c3c' : '#3498db')
            .attr('stroke-width', 1)
            .attr('opacity', d => d.outlier ? 0.7 : 0.3)
            .on('mouseover', this.showTooltip)
            .on('mouseout', () => d3.select('#tooltip').style('opacity', 0));
        
        // Add axes
        svg.selectAll('.axis')
            .data(dimensions)
            .enter().append('g')
            .attr('class', 'axis')
            .attr('transform', d => `translate(${x(d)})`)
            .each(function(d) { 
                d3.select(this).call(d3.axisLeft(y[d]).ticks(5)); 
            })
            .append('text')
            .attr('y', -15)
            .attr('text-anchor', 'middle')
            .text(d => d)
            .style('fill', 'var(--dark)');
        
        // Add title
        svg.append('text')
            .attr('x', this.width / 2)
            .attr('y', -10)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .text('Parallel Coordinates of KRI Scores');
    }
    
    renderOutlierDistribution() {
        const container = d3.select('#outlier-distribution');
        const svg = container.append('svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom)
            .append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
        
        // Get KRI dimensions
        const dimensions = Object.keys(this.data.claims[0].kri_scores);
        
        // Calculate outlier counts per KRI (95th percentile)
        const kriData = dimensions.map(dim => {
            const values = this.data.claims.map(d => d.kri_scores[dim]);
            const cutoff = d3.quantile(values, 0.95);
            return {
                name: dim,
                outliers: values.filter(v => v >= cutoff).length,
                total: values.length,
                rate: values.filter(v => v >= cutoff).length / values.length
            };
        });
        
        // Create scales
        const x = d3.scaleBand()
            .domain(kriData.map(d => d.name))
            .range([0, this.width])
            .padding(0.2);
        
        const y = d3.scaleLinear()
            .domain([0, d3.max(kriData, d => d.rate)])
            .range([this.height, 0]);
        
        // Add violin plot areas
        dimensions.forEach(dim => {
            const values = this.data.claims.map(d => d.kri_scores[dim]);
            const kde = kernelDensityEstimator(kernelEpanechnikov(0.1), x.bandwidth() / 2);
            const density = kde(values);
            
            const area = d3.area()
                .x(d => x(dim) + x.bandwidth() / 2 + d[1] * 30)
                .y0(d => y(d[0]))
                .y1(() => y(0));
            
            svg.append('path')
                .datum(density)
                .attr('fill', '#3498db')
                .attr('opacity', 0.2)
                .attr('d', area);
        });
        
        // Add bars
        svg.selectAll('.bar')
            .data(kriData)
            .enter().append('rect')
            .attr('class', 'path-transition')
            .attr('x', d => x(d.name))
            .attr('y', d => y(d.rate))
            .attr('width', x.bandwidth())
            .attr('height', d => this.height - y(d.rate))
            .attr('fill', d => d.rate > 0.1 ? 'var(--danger)' : 'var(--primary)')
            .attr('rx', 3)
            .attr('ry', 3);
        
        // Add axes
        svg.append('g')
            .attr('transform', `translate(0,${this.height})`)
            .call(d3.axisBottom(x));
        
        svg.append('g')
            .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('.0%')));
        
        // Add title
        svg.append('text')
            .attr('x', this.width / 2)
            .attr('y', -10)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .text('Outlier Rate by KRI (95th Percentile)');
        
        // Helper functions for kernel density estimation
        function kernelDensityEstimator(kernel, bandwidth) {
            return function(sample) {
                return x => [x, d3.mean(sample, v => kernel((x - v) / bandwidth)) / bandwidth];
            };
        }
        
        function kernelEpanechnikov(k) {
            return function(u) {
                return Math.abs(u /= k) <= 1 ? 0.75 * (1 - u * u) / k : 0;
            };
        }
    }
    
    showTooltip(event, d) {
        const tooltip = d3.select('#tooltip');
        tooltip.style('opacity', 1)
            .html(`<strong>Claim ID:</strong> ${d.id}<br>
                  <strong>Outlier:</strong> ${d.outlier ? 'Yes' : 'No'}`)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
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