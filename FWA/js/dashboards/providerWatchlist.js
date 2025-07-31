export default class ProviderWatchlistDashboard {
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
                    <div class="panel-header">High-Risk Provider Network</div>
                    <div class="chart-container" id="provider-network"></div>
                </div>
                <div class="panel">
                    <div class="panel-header">Provider Risk Trends</div>
                    <div class="chart-container" id="provider-trends"></div>
                </div>
            </div>
        `;
        
        this.renderProviderNetwork();
        this.renderProviderTrends();
    }
    
    renderProviderNetwork() {
        const container = d3.select('#provider-network');
        const svg = container.append('svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom)
            .append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
        
        // Process provider data
        const providerData = this.data.providers.map(provider => {
            const claims = this.data.claims.filter(c => c.provider_id === provider.id);
            const flaggedClaims = claims.filter(c => c.risk_score >= this.riskCutoff);
            
            return {
                ...provider,
                claimCount: claims.length,
                flaggedCount: flaggedClaims.length,
                flaggedRate: flaggedClaims.length / claims.length || 0,
                totalBilled: d3.sum(claims, c => c.billed_amount)
            };
        }).filter(p => p.claimCount > 0);
        
        // Create force simulation
        const simulation = d3.forceSimulation(providerData)
            .force('charge', d3.forceManyBody().strength(-50))
            .force('x', d3.forceX(this.width/2).strength(0.1))
            .force('y', d3.forceY(this.height/2).strength(0.1))
            .force('collision', d3.forceCollide().radius(d => Math.sqrt(d.claimCount)/2 + 5));
        
        // Create scales
        const radiusScale = d3.scaleSqrt()
            .domain([0, d3.max(providerData, d => d.claimCount)])
            .range([5, 30]);
        
        const colorScale = d3.scaleSequential(d3.interpolateRdYlGn)
            .domain([1, 0]); // Red = high risk
        
        // Draw nodes
        const nodes = svg.selectAll('.node')
            .data(providerData)
            .enter().append('g')
            .attr('class', 'node');
        
        nodes.append('circle')
            .attr('r', d => radiusScale(d.claimCount))
            .attr('fill', d => colorScale(d.flaggedRate))
            .attr('stroke', '#fff')
            .attr('stroke-width', 1)
            .call(d3.drag()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended));
        
        nodes.append('text')
            .text(d => d.name.split(' ')[0])
            .attr('dy', 4)
            .style('font-size', d => Math.min(radiusScale(d.claimCount)/2, 10))
            .style('text-anchor', 'middle')
            .style('pointer-events', 'none')
            .style('fill', d => d.flaggedRate > 0.5 ? '#fff' : '#333');
        
        // Update positions on tick
        simulation.on('tick', () => {
            nodes.attr('transform', d => `translate(${d.x},${d.y})`);
        });
        
        // Add legend
        const legend = svg.append('g')
            .attr('transform', `translate(${this.width - 100},${this.height - 100})`);
        
        const legendScale = d3.scaleLinear()
            .domain([0, 1])
            .range([0, 80]);
        
        const legendAxis = d3.axisBottom(legendScale)
            .ticks(5)
            .tickFormat(d3.format('.0%'));
        
        legend.append('g')
            .selectAll('rect')
            .data(d3.range(0, 1, 0.1))
            .enter().append('rect')
            .attr('x', d => legendScale(d))
            .attr('y', 0)
            .attr('width', 8)
            .attr('height', 15)
            .attr('fill', d => colorScale(d));
        
        legend.append('g')
            .attr('transform', 'translate(0,15)')
            .call(legendAxis);
        
        legend.append('text')
            .attr('x', 40)
            .attr('y', -10)
            .attr('text-anchor', 'middle')
            .text('Flagged Claim Rate');
        
        // Drag functions
        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }
        
        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }
        
        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }
    }
    
    renderProviderTrends() {
        const container = d3.select('#provider-trends');
        const svg = container.append('svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom)
            .append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
        
        // Group claims by provider and month
        const nestedData = d3.rollup(
            this.data.claims,
            v => ({
                count: v.length,
                flagged: v.filter(d => d.risk_score >= this.riskCutoff).length,
                avgRisk: d3.mean(v, d => d.risk_score)
            }),
            d => d.provider_id,
            d => d3.timeMonth.floor(new Date(d.service_date))
        );
        
        // Get top 5 high-risk providers
        const topProviders = Array.from(nestedData)
            .map(([providerId, months]) => {
                const provider = this.data.providers.find(p => p.id === providerId) || {name: 'Unknown'};
                const totalFlagged = Array.from(months.values()).reduce((sum, d) => sum + d.flagged, 0);
                return {
                    id: providerId,
                    name: provider.name,
                    flagged: totalFlagged,
                    data: Array.from(months, ([date, values]) => ({
                        date,
                        ...values
                    })).sort((a, b) => a.date - b.date)
                };
            })
            .sort((a, b) => b.flagged - a.flagged)
            .slice(0, 5);
        
        // Create scales
        const x = d3.scaleTime()
            .domain(d3.extent(this.data.claims, d => new Date(d.service_date)))
            .range([0, this.width]);
        
        const y = d3.scaleLinear()
            .domain([0, d3.max(topProviders, d => d3.max(d.data, v => v.flagged))])
            .range([this.height, 0]);
        
        // Color scale
        const color = d3.scaleOrdinal()
            .domain(topProviders.map(d => d.id))
            .range(d3.schemeTableau10);
        
        // Line generator
        const line = d3.line()
            .x(d => x(d.date))
            .y(d => y(d.flagged));
        
        // Add lines
        svg.selectAll('.line')
            .data(topProviders)
            .enter().append('path')
            .attr('class', 'line')
            .attr('d', d => line(d.data))
            .attr('stroke', d => color(d.id))
            .attr('stroke-width', 2)
            .attr('fill', 'none');
        
        // Add circles
        svg.selectAll('.point')
            .data(topProviders.flatMap(d => 
                d.data.map(v => ({ ...v, provider: d }))
            ))
            .enter().append('circle')
            .attr('class', 'point')
            .attr('cx', d => x(d.date))
            .attr('cy', d => y(d.flagged))
            .attr('r', 4)
            .attr('fill', d => color(d.provider.id))
            .on('mouseover', (event, d) => {
                const tooltip = d3.select('#tooltip');
                tooltip.style('opacity', 1)
                    .html(`
                        <strong>${d.provider.name}</strong><br>
                        Date: ${d3.timeFormat('%b %Y')(d.date)}<br>
                        Flagged Claims: ${d.flagged}<br>
                        Total Claims: ${d.count}<br>
                        Flag Rate: ${d3.format('.1%')(d.flagged / d.count)}
                    `)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 28) + 'px');
            })
            .on('mouseout', () => {
                d3.select('#tooltip').style('opacity', 0);
            });
        
        // Add axes
        svg.append('g')
            .attr('transform', `translate(0,${this.height})`)
            .call(d3.axisBottom(x));
        
        svg.append('g')
            .call(d3.axisLeft(y));
        
        // Add legend
        const legend = svg.append('g')
            .attr('transform', `translate(${this.width - 150},20)`);
        
        topProviders.forEach((provider, i) => {
            legend.append('rect')
                .attr('x', 0)
                .attr('y', i * 20)
                .attr('width', 15)
                .attr('height', 15)
                .attr('fill', color(provider.id));
            
            legend.append('text')
                .attr('x', 20)
                .attr('y', i * 20 + 12)
                .text(provider.name)
                .style('font-size', '12px');
        });
        
        // Add title
        svg.append('text')
            .attr('x', this.width / 2)
            .attr('y', -10)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .text('Monthly Flagged Claims for Top 5 High-Risk Providers');
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