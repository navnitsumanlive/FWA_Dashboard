export default class ClinicalAttributesDashboard {
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
                    <div class="panel-header">Diagnosis Code Analysis</div>
                    <div class="chart-container" id="diagnosis-analysis"></div>
                </div>
                <div class="panel">
                    <div class="panel-header">Procedure Code Analysis</div>
                    <div class="chart-container" id="procedure-analysis"></div>
                </div>
            </div>
        `;
        
        this.renderDiagnosisAnalysis();
        this.renderProcedureAnalysis();
    }
    
    renderDiagnosisAnalysis() {
        const container = d3.select('#diagnosis-analysis');
        const svg = container.append('svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom)
            .append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
        
        // Group claims by diagnosis code
        const diagnosisData = d3.rollup(
            this.data.claims,
            v => ({
                count: v.length,
                flagged: v.filter(d => d.risk_score >= this.riskCutoff).length,
                avgRisk: d3.mean(v, d => d.risk_score),
                totalBilled: d3.sum(v, d => d.billed_amount)
            }),
            d => d.diagnosis_code
        );
        
        // Convert to array and sort
        const diagnosisArray = Array.from(diagnosisData, ([code, values]) => ({
            code,
            ...values,
            flaggedRate: values.flagged / values.count
        })).sort((a, b) => b.totalBilled - a.totalBilled)
        .slice(0, 15); // Top 15 by billed amount
        
        if (diagnosisArray.length === 0) {
            svg.append('text')
                .attr('x', this.width/2)
                .attr('y', this.height/2)
                .attr('text-anchor', 'middle')
                .text('No diagnosis data available');
            return;
        }
        
        // Create scales
        const x = d3.scaleBand()
            .domain(diagnosisArray.map(d => d.code))
            .range([0, this.width])
            .padding(0.2);
        
        const y = d3.scaleLinear()
            .domain([0, d3.max(diagnosisArray, d => d.totalBilled)])
            .range([this.height, 0]);
        
        const color = d3.scaleSequential(d3.interpolateRdYlGn)
            .domain([1, 0]); // Red = high risk
        
        // Draw bars
        svg.selectAll('.bar')
            .data(diagnosisArray)
            .enter().append('rect')
            .attr('class', 'bar')
            .attr('x', d => x(d.code))
            .attr('y', d => y(d.totalBilled))
            .attr('width', x.bandwidth())
            .attr('height', d => this.height - y(d.totalBilled))
            .attr('fill', d => color(d.flaggedRate))
            .attr('rx', 3)
            .attr('ry', 3)
            .on('mouseover', (event, d) => {
                d3.select('#tooltip')
                    .style('opacity', 1)
                    .html(`
                        <strong>Diagnosis:</strong> ${d.code}<br>
                        <strong>Total Billed:</strong> $${d3.format(',.0f')(d.totalBilled)}<br>
                        <strong>Claims:</strong> ${d.count}<br>
                        <strong>Flagged:</strong> ${d.flagged} (${d3.format('.1%')(d.flaggedRate)})<br>
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
        
        // Add title
        svg.append('text')
            .attr('x', this.width / 2)
            .attr('y', -10)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .text('Top Diagnosis Codes by Billed Amount (Color = Flag Rate)');
    }
    
    renderProcedureAnalysis() {
        const container = d3.select('#procedure-analysis');
        const svg = container.append('svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom)
            .append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
        
        // Group claims by procedure code
        const procedureData = d3.rollup(
            this.data.claims,
            v => ({
                count: v.length,
                flagged: v.filter(d => d.risk_score >= this.riskCutoff).length,
                avgRisk: d3.mean(v, d => d.risk_score),
                avgBilled: d3.mean(v, d => d.billed_amount)
            }),
            d => d.procedure_code
        );
        
        // Convert to array and filter (min 5 claims)
        const procedureArray = Array.from(procedureData, ([code, values]) => ({
            code,
            ...values,
            flaggedRate: values.flagged / values.count
        })).filter(d => d.count >= 5)
        .sort((a, b) => b.avgBilled - a.avgBilled)
        .slice(0, 15); // Top 15 by avg billed amount
        
        if (procedureArray.length === 0) {
            svg.append('text')
                .attr('x', this.width/2)
                .attr('y', this.height/2)
                .attr('text-anchor', 'middle')
                .text('No procedure data available');
            return;
        }
        
        // Create scales
        const x = d3.scaleBand()
            .domain(procedureArray.map(d => d.code))
            .range([0, this.width])
            .padding(0.2);
        
        const y = d3.scaleLinear()
            .domain([0, d3.max(procedureArray, d => d.avgBilled)])
            .range([this.height, 0]);
        
        const radius = d3.scaleSqrt()
            .domain([0, d3.max(procedureArray, d => d.count)])
            .range([0, x.bandwidth() / 2]);
        
        const color = d3.scaleSequential(d3.interpolateRdYlGn)
            .domain([1, 0]); // Red = high risk
        
        // Draw circles
        svg.selectAll('.circle')
            .data(procedureArray)
            .enter().append('circle')
            .attr('class', 'circle')
            .attr('cx', d => x(d.code) + x.bandwidth() / 2)
            .attr('cy', d => y(d.avgBilled))
            .attr('r', d => radius(d.count))
            .attr('fill', d => color(d.flaggedRate))
            .attr('stroke', '#fff')
            .attr('stroke-width', 1)
            .on('mouseover', (event, d) => {
                d3.select('#tooltip')
                    .style('opacity', 1)
                    .html(`
                        <strong>Procedure:</strong> ${d.code}<br>
                        <strong>Avg. Billed:</strong> $${d3.format(',.0f')(d.avgBilled)}<br>
                        <strong>Claims:</strong> ${d.count}<br>
                        <strong>Flagged:</strong> ${d.flagged} (${d3.format('.1%')(d.flaggedRate)})<br>
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
        
        // Add legend
        const legend = svg.append('g')
            .attr('transform', `translate(${this.width - 100},20)`);
        
        const sizes = [5, 10, 20];
        sizes.forEach((size, i) => {
            legend.append('circle')
                .attr('cx', 10)
                .attr('cy', i * 25 + 10)
                .attr('r', radius(size))
                .attr('fill', '#ddd')
                .attr('stroke', '#999');
            
            legend.append('text')
                .attr('x', 30)
                .attr('y', i * 25 + 15)
                .text(`${size} claims`)
                .style('font-size', '12px');
        });
        
        // Add title
        svg.append('text')
            .attr('x', this.width / 2)
            .attr('y', -10)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .text('Top Procedure Codes by Average Billed Amount (Size = Claim Count)');
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