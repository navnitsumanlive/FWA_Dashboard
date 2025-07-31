export default class DecisionComparisonDashboard {
    constructor(container, data, riskCutoff) {
        this.container = container;
        this.data = data;
        this.riskCutoff = riskCutoff;
        this.margin = {top: 40, right: 30, bottom: 80, left: 60};
        this.width = 800 - this.margin.left - this.margin.right;
        this.height = 500 - this.margin.top - this.margin.bottom;
    }
    
    render() {
        this.container.innerHTML = `
            <div class="dashboard">
                <div class="panel">
                    <div class="panel-header">Decision Flow Analysis</div>
                    <div class="chart-container" id="sankey-diagram"></div>
                </div>
                <div class="panel">
                    <div class="panel-header">Decision Discrepancies</div>
                    <div class="chart-container" id="discrepancy-matrix"></div>
                </div>
            </div>
        `;
        
        this.renderSankeyDiagram();
        this.renderDiscrepancyMatrix();
    }
    
    renderSankeyDiagram() {
        const container = d3.select('#sankey-diagram');
        const svg = container.append('svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom)
            .append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
        
        // Prepare nodes
        const nodes = [
            ...new Set([
                ...this.data.claims.map(d => `Model: ${d.model_decision}`),
                ...this.data.claims.map(d => `Assessor: ${d.assessor_decision}`),
                ...this.data.claims.map(d => `Final: ${d.final_decision}`)
            ])
        ].map(name => ({ name }));
        
        // Prepare links
        const links = [];
        
        // Model to Assessor links
        const modelAssessor = d3.rollup(
            this.data.claims,
            v => v.length,
            d => `Model: ${d.model_decision}`,
            d => `Assessor: ${d.assessor_decision}`
        );
        
        modelAssessor.forEach((targets, source) => {
            targets.forEach((value, target) => {
                links.push({
                    source: nodes.findIndex(n => n.name === source),
                    target: nodes.findIndex(n => n.name === target),
                    value,
                    type: 'model-assessor'
                });
            });
        });
        
        // Assessor to Final links
        const assessorFinal = d3.rollup(
            this.data.claims,
            v => v.length,
            d => `Assessor: ${d.assessor_decision}`,
            d => `Final: ${d.final_decision}`
        );
        
        assessorFinal.forEach((targets, source) => {
            targets.forEach((value, target) => {
                links.push({
                    source: nodes.findIndex(n => n.name === source),
                    target: nodes.findIndex(n => n.name === target),
                    value,
                    type: 'assessor-final'
                });
            });
        });
        
        // Sankey layout
        const sankey = d3.sankey()
            .nodeWidth(15)
            .nodePadding(10)
            .extent([[1, 1], [this.width - 1, this.height - 6]]);
        
        const { nodes: sankeyNodes, links: sankeyLinks } = sankey({
            nodes: nodes.map(d => ({ ...d })),
            links: links.map(d => ({ ...d }))
        });
        
        // Color scales
        const nodeColor = d3.scaleOrdinal()
            .domain(['Model', 'Assessor', 'Final'])
            .range(['#3498db', '#f39c12', '#2ecc71']);
        
        const linkColor = d3.scaleOrdinal()
            .domain(['model-assessor', 'assessor-final'])
            .range(['#7fb3d5', '#f8c471']);
        
        // Draw links
        svg.append('g')
            .selectAll('path')
            .data(sankeyLinks)
            .enter().append('path')
            .attr('d', d3.sankeyLinkHorizontal())
            .attr('stroke', d => linkColor(d.type))
            .attr('stroke-width', d => Math.max(1, d.width))
            .attr('stroke-opacity', 0.6)
            .attr('fill', 'none');
        
        // Draw nodes
        const node = svg.append('g')
            .selectAll('rect')
            .data(sankeyNodes)
            .enter().append('rect')
            .attr('x', d => d.x0)
            .attr('y', d => d.y0)
            .attr('height', d => d.y1 - d.y0)
            .attr('width', d => d.x1 - d.x0)
            .attr('fill', d => nodeColor(d.name.split(': ')[0]))
            .attr('stroke', '#000')
            .attr('stroke-opacity', 0.2);
        
        // Add node labels
        svg.append('g')
            .selectAll('text')
            .data(sankeyNodes)
            .enter().append('text')
            .attr('x', d => d.x0 < this.width / 2 ? d.x1 + 6 : d.x0 - 6)
            .attr('y', d => (d.y1 + d.y0) / 2)
            .attr('dy', '0.35em')
            .attr('text-anchor', d => d.x0 < this.width / 2 ? 'start' : 'end')
            .text(d => d.name)
            .style('font-size', '12px')
            .style('fill', 'var(--dark)');
        
        // Add title
        svg.append('text')
            .attr('x', this.width / 2)
            .attr('y', -10)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .text('Claim Decision Flow');
    }
    
    renderDiscrepancyMatrix() {
        const container = d3.select('#discrepancy-matrix');
        const svg = container.append('svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom)
            .append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
        
        // Get unique decisions
        const decisions = ['Approved', 'Denied', 'Pending'];
        
        // Calculate discrepancy matrix
        const matrix = decisions.map(modelDecision => {
            return decisions.map(assessorDecision => {
                return this.data.claims.filter(claim => 
                    claim.model_decision === modelDecision && 
                    claim.assessor_decision === assessorDecision
                ).length;
            });
        });
        
        // Create scales
        const x = d3.scaleBand()
            .domain(decisions)
            .range([0, this.width])
            .padding(0.05);
        
        const y = d3.scaleBand()
            .domain(decisions)
            .range([0, this.height])
            .padding(0.05);
        
        const color = d3.scaleSequentialLog(d3.interpolateBlues)
            .domain([1, d3.max(matrix.flat())]);
        
        // Create cells
        svg.selectAll('.row')
            .data(matrix)
            .enter().append('g')
            .attr('class', 'row')
            .selectAll('.cell')
            .data((d, i) => d.map((value, j) => ({ 
                model: decisions[i], 
                assessor: decisions[j], 
                value 
            })))
            .enter().append('rect')
            .attr('class', 'cell')
            .attr('x', d => x(d.assessor))
            .attr('y', d => y(d.model))
            .attr('width', x.bandwidth())
            .attr('height', y.bandwidth())
            .attr('fill', d => d.value > 0 ? color(d.value) : '#eee')
            .attr('stroke', '#fff')
            .attr('rx', 3)
            .attr('ry', 3)
            .on('mouseover', this.showMatrixTooltip)
            .on('mouseout', () => d3.select('#tooltip').style('opacity', 0));
        
        // Add value labels
        svg.selectAll('.value')
            .data(matrix.flatMap((row, i) => 
                row.map((value, j) => ({ 
                    model: decisions[i], 
                    assessor: decisions[j], 
                    value 
                }))
            ))
            .enter().append('text')
            .attr('x', d => x(d.assessor) + x.bandwidth() / 2)
            .attr('y', d => y(d.model) + y.bandwidth() / 2)
            .attr('dy', '0.35em')
            .attr('text-anchor', 'middle')
            .style('font-size', '10px')
            .style('fill', d => d.value > d3.max(matrix.flat()) / 2 ? 'white' : 'var(--dark)')
            .text(d => d.value || '');
        
        // Add axes
        svg.append('g')
            .attr('transform', `translate(0,${this.height})`)
            .call(d3.axisBottom(x))
            .selectAll('text')
            .style('text-anchor', 'middle');
        
        svg.append('g')
            .call(d3.axisLeft(y));
        
        // Add labels
        svg.append('text')
            .attr('x', this.width / 2)
            .attr('y', -15)
            .attr('text-anchor', 'middle')
            .style('font-size', '12px')
            .text('Assessor Decision');
        
        svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', -40)
            .attr('x', -this.height / 2)
            .attr('text-anchor', 'middle')
            .style('font-size', '12px')
            .text('Model Decision');
        
        // Add title
        svg.append('text')
            .attr('x', this.width / 2)
            .attr('y', -30)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .text('Decision Agreement Matrix');
    }
    
    showMatrixTooltip(event, d) {
        const tooltip = d3.select('#tooltip');
        tooltip.style('opacity', 1)
            .html(`
                <strong>Model:</strong> ${d.model}<br>
                <strong>Assessor:</strong> ${d.assessor}<br>
                <strong>Count:</strong> ${d.value}
            `)
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