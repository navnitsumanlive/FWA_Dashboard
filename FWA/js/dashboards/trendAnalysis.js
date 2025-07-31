export default class TrendAnalysisDashboard {
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
                    <div class="panel-header">Monthly Claim Trends</div>
                    <div class="chart-container" id="claim-trends"></div>
                </div>
                <div class="panel">
                    <div class="panel-header">Risk Score Trends</div>
                    <div class="chart-container" id="risk-trends"></div>
                </div>
            </div>
        `;
        
        this.renderClaimTrends();
        this.renderRiskTrends();
    }
    
    renderClaimTrends() {
        const container = d3.select('#claim-trends');
        const svg = container.append('svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom)
            .append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
        
        // Group claims by month
        const nestedData = d3.rollup(
            this.data.claims,
            v => ({
                total: v.length,
                flagged: v.filter(d => d.risk_score >= this.riskCutoff).length,
                avgRisk: d3.mean(v, d => d.risk_score),
                totalBilled: d3.sum(v, d => d.billed_amount)
            }),
            d => d3.timeMonth.floor(new Date(d.service_date))
        );
        
        const trendData = Array.from(nestedData, ([date, values]) => ({
            date,
            ...values,
            flaggedRate: values.flagged / values.total
        })).sort((a, b) => a.date - b.date);
        
        if (trendData.length === 0) {
            svg.append('text')
                .attr('x', this.width/2)
                .attr('y', this.height/2)
                .attr('text-anchor', 'middle')
                .text('No trend data available');
            return;
        }
        
        // Create scales
        const x = d3.scaleTime()
            .domain(d3.extent(trendData, d => d.date))
            .range([0, this.width]);
        
        const y = d3.scaleLinear()
            .domain([0, d3.max(trendData, d => d.total)])
            .range([this.height, 0]);
        
        // Create line generators
        const totalLine = d3.line()
            .x(d => x(d.date))
            .y(d => y(d.total)));
        
        const flaggedLine = d3.line()
            .x(d => x(d.date))
            .y(d => y(d.flagged)));
        
        // Add total claims line
        svg.append('path')
            .datum(trendData)
            .attr('class', 'line')
            .attr('d', totalLine)
            .attr('stroke', '#3498db')
            .attr('stroke-width', 2)
            .attr('fill', 'none');
        
        // Add flagged claims line
        svg.append('path')
            .datum(trendData)
            .attr('class', 'line')
            .attr('d', flaggedLine)
            .attr('stroke', '#e74c3c')
            .attr('stroke-width', 2)
            .attr('fill', 'none');
        
        // Add area for flagged rate
        const area = d3.area()
            .x(d => x(d.date))
            .y0(this.height)
            .y1(d => y(d.total * d.flaggedRate)));
        
        svg.append('path')
            .datum(trendData)
            .attr('class', 'area')
            .attr('d', area)
            .attr('fill', '#e74c3c')
            .attr('opacity', 0.2);
        
        // Add axes
        svg.append('g')
            .attr('transform', `translate(0,${this.height})`)
            .call(d3.axisBottom(x));
        
        svg.append('g')
            .call(d3.axisLeft(y));
        
        // Add legend
        const legend = svg.append('g')
            .attr('transform', `translate(${this.width - 150},20)`);
        
        legend.append('path')
            .attr('d', d3.line()([[0,0],[30,0]]))
            .attr('stroke', '#3498db')
            .attr('stroke-width', 2)
            .attr('fill', 'none');
        
        legend.append('text')
            .attr('x', 40)
            .attr('y', 5)
            .text('Total Claims')
            .style('font-size', '12px');
        
        legend.append('path')
            .attr('d', d3.line()([[0,20],[30,20]]))
            .attr('stroke', '#e74c3c')
            .attr('stroke-width', 2)
            .attr('fill', 'none');
        
        legend.append('text')
            .attr('x', 40)
            .attr('y', 25)
            .text('Flagged Claims')
            .style('font-size', '12px');
        
        // Add title
        svg.append('text')
            .attr('x', this.width / 2)
            .attr('y', -10)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .text('Monthly Claim Volume Trends');
    }
    
    renderRiskTrends() {
        const container = d3.select('#risk-trends');
        const svg = container.append('svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom)
            .append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
        
        // Group claims by week
        const nestedData = d3.rollup(
            this.data.claims,
            v => ({
                count: v.length,
                avgRisk: d3.mean(v, d => d.risk_score),
                flaggedRate: v.filter(d => d.risk_score >= this.riskCutoff).length / v.length
            }),
            d => d3.timeWeek.floor(new Date(d.service_date))
        );
        
        const trendData = Array.from(nestedData, ([date, values]) => ({
            date,
            ...values
        })).sort((a, b) => a.date - b.date);
        
        if (trendData.length === 0) {
            svg.append('text')
                .attr('x', this.width/2)
                .attr('y', this.height/2)
                .attr('text-anchor', 'middle')
                .text('No trend data available');
            return;
        }
        
        // Create scales
        const x = d3.scaleTime()
            .domain(d3.extent(trendData, d => d.date))
            .range([0, this.width]);
        
        const y = d3.scaleLinear()
            .domain([0, 1])
            .range([this.height, 0]);
        
        // Create line generators
        const riskLine = d3.line()
            .x(d => x(d.date))
            .y(d => y(d.avgRisk)));
        
        const rateLine = d3.line()
            .x(d => x(d.date))
            .y(d => y(d.flaggedRate)));
        
        // Add moving average line for risk
        const movingAvgRisk = this.calculateMovingAverage(trendData.map(d => d.avgRisk), 4);
        svg.append('path')
            .datum(trendData.map((d, i) => ({ date: d.date, value: movingAvgRisk[i] })))
            .attr('class', 'line')
            .attr('d', riskLine)
            .attr('stroke', '#3498db')
            .attr('stroke-width', 2)
            .attr('fill', 'none');
        
        // Add moving average line for flagged rate
        const movingAvgRate = this.calculateMovingAverage(trendData.map(d => d.flaggedRate), 4);
        svg.append('path')
            .datum(trendData.map((d, i) => ({ date: d.date, value: movingAvgRate[i] })))
            .attr('class', 'line')
            .attr('d', rateLine)
            .attr('stroke', '#e74c3c')
            .attr('stroke-width', 2)
            .attr('fill', 'none');
        
        // Add current threshold line
        svg.append('line')
            .attr('x1', 0)
            .attr('x2', this.width)
            .attr('y1', y(this.riskCutoff / 100))
            .attr('y2', y(this.riskCutoff / 100))
            .attr('stroke', '#2c3e50')
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '3,3');
        
        // Add axes
        svg.append('g')
            .attr('transform', `translate(0,${this.height})`)
            .call(d3.axisBottom(x));
        
        svg.append('g')
            .call(d3.axisLeft(y).tickFormat(d3.format('.0%')));
        
        // Add legend
        const legend = svg.append('g')
            .attr('transform', `translate(${this.width - 150},20)`);
        
        legend.append('path')
            .attr('d', d3.line()([[0,0],[30,0]]))
            .attr('stroke', '#3498db')
            .attr('stroke-width', 2)
            .attr('fill', 'none');
        
        legend.append('text')
            .attr('x', 40)
            .attr('y', 5)
            .text('Avg. Risk Score')
            .style('font-size', '12px');
        
        legend.append('path')
            .attr('d', d3.line()([[0,20],[30,20]]))
            .attr('stroke', '#e74c3c')
            .attr('stroke-width', 2)
            .attr('fill', 'none');
        
        legend.append('text')
            .attr('x', 40)
            .attr('y', 25)
            .text('Flagged Claim Rate')
            .style('font-size', '12px');
        
        // Add title
        svg.append('text')
            .attr('x', this.width / 2)
            .attr('y', -10)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .text('Weekly Risk Score Trends (4-Week Moving Average)');
    }
    
    calculateMovingAverage(data, windowSize) {
        return data.map((_, i) => {
            const start = Math.max(0, i - windowSize + 1);
            const subset = data.slice(start, i + 1);
            return d3.mean(subset);
        });
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