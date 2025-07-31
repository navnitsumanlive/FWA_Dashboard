export default class SimulationViewDashboard {
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
                    <div class="panel-header">Threshold Sensitivity Analysis</div>
                    <div class="chart-container" id="threshold-sensitivity"></div>
                    <div class="controls">
                        <label>Threshold Percentile:
                            <input type="range" id="sim-threshold" min="50" max="99" value="${this.riskCutoff}">
                            <span id="sim-threshold-value">${this.riskCutoff}%</span>
                        </label>
                    </div>
                </div>
                <div class="panel">
                    <div class="panel-header">Precision-Recall Tradeoff</div>
                    <div class="chart-container" id="precision-recall"></div>
                </div>
            </div>
        `;
        
        this.renderThresholdSensitivity();
        this.renderPrecisionRecall();
        this.initSimulationControls();
    }
    
    renderThresholdSensitivity() {
        const container = d3.select('#threshold-sensitivity');
        const svg = container.append('svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom)
            .append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
        
        // Calculate metrics at different thresholds
        const thresholds = d3.range(50, 100, 1);
        const simulationData = thresholds.map(threshold => {
            const cutoff = d3.quantile(
                this.data.claims.map(d => d.risk_score),
                threshold / 100
            );
            
            const flaggedClaims = this.data.claims.filter(d => d.risk_score >= cutoff);
            const truePositives = flaggedClaims.filter(d => d.fraud_flag).length;
            const falsePositives = flaggedClaims.filter(d => !d.fraud_flag).length;
            const falseNegatives = this.data.claims.filter(d => 
                d.fraud_flag && d.risk_score < cutoff
            ).length;
            
            return {
                threshold,
                cutoff,
                flagged: flaggedClaims.length,
                savings: d3.sum(flaggedClaims, d => d.billed_amount - d.allowed_amount),
                precision: truePositives / (truePositives + falsePositives) || 0,
                recall: truePositives / (truePositives + falseNegatives) || 0,
                f1: 2 * (truePositives / (truePositives + falsePositives)) * 
                    (truePositives / (truePositives + falseNegatives)) / 
                    (truePositives / (truePositives + falsePositives) + 
                     truePositives / (truePositives + falseNegatives)) || 0
            };
        });
        
        // Create scales
        const x = d3.scaleLinear()
            .domain([50, 99])
            .range([0, this.width]);
        
        const ySavings = d3.scaleLinear()
            .domain([0, d3.max(simulationData, d => d.savings)])
            .range([this.height, 0]);
        
        const yPrecision = d3.scaleLinear()
            .domain([0, 1])
            .range([this.height, 0]);
        
        // Create line generators
        const savingsLine = d3.line()
            .x(d => x(d.threshold))
            .y(d => ySavings(d.savings));
        
        const precisionLine = d3.line()
            .x(d => x(d.threshold))
            .y(d => yPrecision(d.precision));
        
        // Add savings line
        svg.append('path')
            .datum(simulationData)
            .attr('class', 'line')
            .attr('d', savingsLine)
            .attr('stroke', '#3498db')
            .attr('stroke-width', 2)
            .attr('fill', 'none');
        
        // Add precision line
        svg.append('path')
            .datum(simulationData)
            .attr('class', 'line')
            .attr('d', precisionLine)
            .attr('stroke', '#e74c3c')
            .attr('stroke-width', 2)
            .attr('fill', 'none');
        
        // Add current threshold marker
        this.currentThresholdLine = svg.append('line')
            .attr('class', 'threshold-line')
            .attr('x1', x(this.riskCutoff))
            .attr('x2', x(this.riskCutoff))
            .attr('y1', 0)
            .attr('y2', this.height)
            .attr('stroke', '#2c3e50')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5,5');
        
        // Add axes
        svg.append('g')
            .attr('transform', `translate(0,${this.height})`)
            .call(d3.axisBottom(x).tickFormat(d => `${d}%`));
        
        // Add left axis (savings)
        svg.append('g')
            .call(d3.axisLeft(ySavings).tickFormat(d => `$${d3.format(',.0f')(d)}`))
            .append('text')
            .attr('y', -10)
            .attr('text-anchor', 'middle')
            .text('Potential Savings');
        
        // Add right axis (precision)
        svg.append('g')
            .attr('transform', `translate(${this.width},0)`)
            .call(d3.axisRight(yPrecision).tickFormat(d3.format('.0%')))
            .append('text')
            .attr('y', -10)
            .attr('x', -20)
            .attr('text-anchor', 'middle')
            .text('Precision');
        
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
            .text('Potential Savings')
            .style('font-size', '12px');
        
        legend.append('path')
            .attr('d', d3.line()([[0,20],[30,20]]))
            .attr('stroke', '#e74c3c')
            .attr('stroke-width', 2)
            .attr('fill', 'none');
        
        legend.append('text')
            .attr('x', 40)
            .attr('y', 25)
            .text('Precision')
            .style('font-size', '12px');
        
        // Add title
        svg.append('text')
            .attr('x', this.width / 2)
            .attr('y', -10)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .text('Threshold Sensitivity Analysis');
    }
    
    renderPrecisionRecall() {
        const container = d3.select('#precision-recall');
        const svg = container.append('svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom)
            .append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
        
        // Calculate metrics at different thresholds
        const thresholds = d3.range(50, 100, 1);
        const simulationData = thresholds.map(threshold => {
            const cutoff = d3.quantile(
                this.data.claims.map(d => d.risk_score),
                threshold / 100
            );
            
            const flaggedClaims = this.data.claims.filter(d => d.risk_score >= cutoff);
            const truePositives = flaggedClaims.filter(d => d.fraud_flag).length;
            const falsePositives = flaggedClaims.filter(d => !d.fraud_flag).length;
            const falseNegatives = this.data.claims.filter(d => 
                d.fraud_flag && d.risk_score < cutoff
            ).length;
            
            return {
                threshold,
                precision: truePositives / (truePositives + falsePositives) || 0,
                recall: truePositives / (truePositives + falseNegatives) || 0
            };
        });
        
        // Create scales
        const x = d3.scaleLinear()
            .domain([0, 1])
            .range([0, this.width]);
        
        const y = d3.scaleLinear()
            .domain([0, 1])
            .range([this.height, 0]);
        
        // Create line generator
        const line = d3.line()
            .x(d => x(d.recall))
            .y(d => y(d.precision));
        
        // Add line
        svg.append('path')
            .datum(simulationData)
            .attr('class', 'line')
            .attr('d', line)
            .attr('stroke', '#9b59b6')
            .attr('stroke-width', 2)
            .attr('fill', 'none');
        
        // Add current threshold point
        const currentData = simulationData.find(d => d.threshold === this.riskCutoff);
        this.currentPoint = svg.append('circle')
            .attr('cx', x(currentData.recall))
            .attr('cy', y(currentData.precision))
            .attr('r', 6)
            .attr('fill', '#e74c3c')
            .attr('stroke', '#fff')
            .attr('stroke-width', 2);
        
        // Add axes
        svg.append('g')
            .attr('transform', `translate(0,${this.height})`)
            .call(d3.axisBottom(x).tickFormat(d3.format('.0%')))
            .append('text')
            .attr('x', this.width / 2)
            .attr('y', 30)
            .attr('text-anchor', 'middle')
            .text('Recall');
        
        svg.append('g')
            .call(d3.axisLeft(y).tickFormat(d3.format('.0%')))
            .append('text')
            .attr('y', -40)
            .attr('x', -this.height / 2)
            .attr('text-anchor', 'middle')
            .attr('transform', 'rotate(-90)')
            .text('Precision');
        
        // Add title
        svg.append('text')
            .attr('x', this.width / 2)
            .attr('y', -10)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .text('Precision-Recall Curve');
    }
    
    initSimulationControls() {
        const slider = document.getElementById('sim-threshold');
        const valueDisplay = document.getElementById('sim-threshold-value');
        
        slider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            valueDisplay.textContent = `${value}%`;
            
            // Update visualizations
            if (this.currentThresholdLine) {
                const x = d3.scaleLinear()
                    .domain([50, 99])
                    .range([0, this.width]);
                
                this.currentThresholdLine
                    .attr('x1', x(value))
                    .attr('x2', x(value));
            }
            
            // Update point in precision-recall chart
            if (this.currentPoint) {
                const thresholds = d3.range(50, 100, 1);
                const simulationData = thresholds.map(threshold => {
                    const cutoff = d3.quantile(
                        this.data.claims.map(d => d.risk_score),
                        threshold / 100
                    );
                    
                    const flaggedClaims = this.data.claims.filter(d => d.risk_score >= cutoff);
                    const truePositives = flaggedClaims.filter(d => d.fraud_flag).length;
                    const falsePositives = flaggedClaims.filter(d => !d.fraud_flag).length;
                    const falseNegatives = this.data.claims.filter(d => 
                        d.fraud_flag && d.risk_score < cutoff
                    ).length;
                    
                    return {
                        threshold,
                        precision: truePositives / (truePositives + falsePositives) || 0,
                        recall: truePositives / (truePositives + falseNegatives) || 0
                    };
                });
                
                const currentData = simulationData.find(d => d.threshold === value);
                const x = d3.scaleLinear()
                    .domain([0, 1])
                    .range([0, this.width]);
                
                const y = d3.scaleLinear()
                    .domain([0, 1])
                    .range([this.height, 0]);
                
                this.currentPoint
                    .attr('cx', x(currentData.recall))
                    .attr('cy', y(currentData.precision));
            }
        });
    }
    
    updateData(data, riskCutoff) {
        this.data = data;
        this.riskCutoff = riskCutoff;
        this.render();
    }
    
    unload() {
        // Clean up event listeners
        const slider = document.getElementById('sim-threshold');
        if (slider) {
            slider.replaceWith(slider.cloneNode(true));
        }
    }
}