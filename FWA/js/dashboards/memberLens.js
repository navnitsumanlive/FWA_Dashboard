export default class MemberLensDashboard {
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
                    <div class="panel-header">Member Risk Distribution</div>
                    <div class="chart-container" id="member-risk"></div>
                </div>
                <div class="panel">
                    <div class="panel-header">Member Utilization Patterns</div>
                    <div class="chart-container" id="member-utilization"></div>
                </div>
            </div>
        `;
        
        this.renderMemberRisk();
        this.renderMemberUtilization();
    }
    
    renderMemberRisk() {
        const container = d3.select('#member-risk');
        const svg = container.append('svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom)
            .append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
        
        // Group claims by member
        const memberData = d3.rollup(
            this.data.claims,
            v => ({
                count: v.length,
                flagged: v.filter(d => d.risk_score >= this.riskCutoff).length,
                avgRisk: d3.mean(v, d => d.risk_score),
                totalBilled: d3.sum(v, d => d.billed_amount)
            }),
            d => d.member_id
        );
        
        // Convert to array
        const memberArray = Array.from(memberData, ([id, values]) => ({
            id,
            ...values,
            flaggedRate: values.flagged / values.count
        }));
        
        if (memberArray.length === 0) {
            svg.append('text')
                .attr('x', this.width/2)
                .attr('y', this.height/2)
                .attr('text-anchor', 'middle')
                .text('No member data available');
            return;
        }
        
        // Create bins for histogram
        const binGenerator = d3.bin()
            .domain([0, 1])
            .thresholds(20);
        
        const bins = binGenerator(memberArray.map(d => d.avgRisk));
        
        // Create scales
        const x = d3.scaleLinear()
            .domain([0, 1])
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
                const avgRisk = d3.mean(d, d => d.avgRisk);
                return avgRisk > 0.7 ? '#e74c3c' : avgRisk > 0.4 ? '#f39c12' : '#2ecc71';
            })
            .attr('rx', 2)
            .attr('ry', 2)
            .on('mouseover', (event, d) => {
                const avgRisk = d3.mean(d, d => d.avgRisk);
                const avgBilled = d3.mean(d, d => d.totalBilled / d.count);
                
                d3.select('#tooltip')
                    .style('opacity', 1)
                    .html(`
                        <strong>Risk Range:</strong> ${d3.format('.2f')(d.x0)}-${d3.format('.2f')(d.x1)}<br>
                        <strong>Members:</strong> ${d.length}<br>
                        <strong>Avg. Risk:</strong> ${d3.format('.2f')(avgRisk)}<br>
                        <strong>Avg. Claims/Member:</strong> ${d3.format('.1f')(d3.mean(d, d => d.count))}<br>
                        <strong>Avg. Billed/Member:</strong> $${d3.format(',.0f')(avgBilled)}
                    `)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 28) + 'px');
            })
            .on('mouseout', () => d3.select('#tooltip').style('opacity', 0));
        
        // Add current threshold line
        svg.append('line')
            .attr('x1', x(this.riskCutoff / 100))
            .attr('x2', x(this.riskCutoff / 100))
            .attr('y1', 0)
            .attr('y2', this.height)
            .attr('stroke', '#2c3e50')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5,5');
        
        // Add axes
        svg.append('g')
            .attr('transform', `translate(0,${this.height})`)
            .call(d3.axisBottom(x).tickFormat(d3.format('.0%')));
        
        svg.append('g')
            .call(d3.axisLeft(y));
        
        // Add title
        svg.append('text')
            .attr('x', this.width / 2)
            .attr('y', -10)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .text('Distribution of Member Average Risk Scores');
    }
    
    renderMemberUtilization() {
        const container = d3.select('#member-utilization');
        const svg = container.append('svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom)
            .append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
        
        // Group claims by member
        const memberData = d3.rollup(
            this.data.claims,
            v => ({
                count: v.length,
                avgRisk: d3.mean(v, d => d.risk_score),
                totalBilled: d3.sum(v, d => d.billed_amount),
                providers: new Set(v.map(d => d.provider_id)).size
            }),
            d => d.member_id
        );
        
        // Convert to array and filter (min 2 claims)
        const memberArray = Array.from(memberData, ([id, values]) => ({
            id,
            ...values,
            avgBilled: values.totalBilled / values.count
        })).filter(d => d.count >= 2);
        
        if (memberArray.length === 0) {
            svg.append('text')
                .attr('x', this.width/2)
                .attr('y', this.height/2)
                .attr('text-anchor', 'middle')
                .text('No member data available');
            return;
        }
        
        // Create scales
        const x = d3.scaleLinear()
            .domain([0, d3.max(memberArray, d => d.count)])
            .range([0, this.width]);
        
        const y = d3.scaleLinear()
            .domain([0, d3.max(memberArray, d => d.avgBilled)])
            .range([this.height, 0]);
        
        const radius = d3.scaleSqrt()
            .domain([0, d3.max(memberArray, d => d.providers)])
            .range([0, 10]);
        
        const color = d3.scaleSequential(d3.interpolateRdYlGn)
            .domain([1, 0]); // Red = high risk
        
        // Draw circles
        svg.selectAll('.circle')
            .data(memberArray)
            .enter().append('circle')
            .attr('class', 'circle')
            .attr('cx', d => x(d.count))
            .attr('cy', d => y(d.avgBilled))
            .attr('r', d => radius(d.providers))
            .attr('fill', d => color(d.avgRisk))
            .attr('stroke', '#fff')
            .attr('stroke-width', 0.5)
            .on('mouseover', (event, d) => {
                d3.select('#tooltip')
                    .style('opacity', 1)
                    .html(`
                        <strong>Member ID:</strong> ${d.id}<br>
                        <strong>Claims:</strong> ${d.count}<br>
                        <strong>Providers:</strong> ${d.providers}<br>
                        <strong>Avg. Billed:</strong> $${d3.format(',.0f')(d.avgBilled)}<br>
                        <strong>Avg. Risk:</strong> ${d3.format('.2f')(d.avgRisk)}
                    `)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 28) + 'px');
            })
            .on('mouseout', () => d3.select('#tooltip').style('opacity', 0));
        
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
            .text('Number of Claims');
        
        svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', -40)
            .attr('x', -this.height / 2)
            .attr('text-anchor', 'middle')
            .text('Average Billed Amount');
        
        // Add legend
        const legend = svg.append('g')
            .attr('transform', `translate(${this.width - 120},20)`);
        
        // Color legend
        legend.append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', 15)
            .attr('height', 80)
            .attr('fill', 'url(#color-gradient)');
        
        const colorGradient = svg.append('defs')
            .append('linearGradient')
            .attr('id', 'color-gradient')
            .attr('x1', '0%')
            .attr('y1', '0%')
            .attr('x2', '0%')
            .attr('y2', '100%');
        
        colorGradient.selectAll('stop')
            .data([
                { offset: '0%', color: '#e74c3c' },
                { offset: '50%', color: '#f39c12' },
                { offset: '100%', color: '#2ecc71' }
            ])
            .enter().append('stop')
            .attr('offset', d => d.offset)
            .attr('stop-color', d => d.color);
        
        legend.append('text')
            .attr('x', 20)
            .attr('y', 10)
            .text('High Risk')
            .style('font-size', '10px');
        
        legend.append('text')
            .attr('x', 20)
            .attr('y', 75)
            .text('Low Risk')
            .style('font-size', '10px');
        
        // Size legend
        const sizes = [1, 3, 5];
        sizes.forEach((size, i) => {
            legend.append('circle')
                .attr('cx', 60)
                .attr('cy', i * 25 + 10)
                .attr('r', radius(size))
                .attr('fill', '#ddd')
                .attr('stroke', '#999');
            
            legend.append('text')
                .attr('x', 80)
                .attr('y', i * 25 + 15)
                .text(`${size} providers`)
                .style('font-size', '10px');
        });
        
        // Add title
        svg.append('text')
            .attr('x', this.width / 2)
            .attr('y', -10)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .text('Member Utilization Patterns (Size = Unique Providers)');
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