document.addEventListener('DOMContentLoaded', function() {
    const width = 450;
    const height = 450;
    const margin = { top: 20, right: 20, bottom: 40, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // State space bounds
    const xMin = 0, xMax = 160;
    const yMin = 0, yMax = 160;

    // Vector field grid resolution
    const gridSize = 15;

    // Fixed parameters
    const r1 = 1, r2 = 1;
    const dt = 0.05;

    const svg = d3.select('#competition-svg')
        .attr('width', width)
        .attr('height', height);

    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, innerWidth]);
    const yScale = d3.scaleLinear().domain([yMin, yMax]).range([innerHeight, 0]);

    // Axes (will be updated)
    const xAxisG = g.append('g').attr('transform', `translate(0,${innerHeight})`);
    const yAxisG = g.append('g');

    // Axis labels
    g.append('text')
        .attr('x', innerWidth / 2)
        .attr('y', innerHeight + 35)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .text('N₁');

    g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerHeight / 2)
        .attr('y', -35)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .text('N₂');

    // Layers
    const vectorFieldLayer = g.append('g');
    const nullclineLayer = g.append('g');
    const trajectoryLayer = g.append('g');
    const pointLayer = g.append('g');

    function getParams() {
        return {
            K1: parseFloat(document.getElementById('K1').value),
            K2: parseFloat(document.getElementById('K2').value),
            gamma12: parseFloat(document.getElementById('gamma12').value),
            gamma21: parseFloat(document.getElementById('gamma21').value)
        };
    }

    function dxdt(n1, n2, params) {
        const { K1, K2, gamma12, gamma21 } = params;
        const dn1 = r1 * n1 * (1 - (n1 + gamma12 * n2) / K1);
        const dn2 = r2 * n2 * (1 - (n2 + gamma21 * n1) / K2);
        return [dn1, dn2];
    }

    function step(n1, n2, params, stepSize = dt) {
        const [dn1, dn2] = dxdt(n1, n2, params);
        return [n1 + stepSize * dn1, n2 + stepSize * dn2];
    }

    function updateAxes() {
        const params = getParams();
        xAxisG.call(d3.axisBottom(xScale).tickValues([0, params.K1]).tickFormat((d, i) => i === 0 ? '0' : 'K₁'));
        yAxisG.call(d3.axisLeft(yScale).tickValues([0, params.K2]).tickFormat((d, i) => i === 0 ? '0' : 'K₂'));
    }

    function drawVectorField() {
        const params = getParams();
        const arrows = [];
        const stepX = (xMax - xMin) / gridSize;
        const stepY = (yMax - yMin) / gridSize;

        for (let i = 0; i <= gridSize; i++) {
            for (let j = 0; j <= gridSize; j++) {
                const n1 = xMin + i * stepX;
                const n2 = yMin + j * stepY;
                const [dn1, dn2] = dxdt(n1, n2, params);
                const mag = Math.sqrt(dn1 * dn1 + dn2 * dn2);
                const maxLen = 12;
                const scale = mag > 0.1 ? Math.min(maxLen / mag, maxLen * 2) : 0;

                arrows.push({ n1, n2, dn1: dn1 * scale, dn2: dn2 * scale, mag });
            }
        }

        const lines = vectorFieldLayer.selectAll('line').data(arrows);
        lines.enter()
            .append('line')
            .merge(lines)
            .attr('x1', d => xScale(d.n1))
            .attr('y1', d => yScale(d.n2))
            .attr('x2', d => xScale(d.n1) + d.dn1)
            .attr('y2', d => yScale(d.n2) - d.dn2)
            .attr('stroke', '#999')
            .attr('stroke-width', 1);
        lines.exit().remove();
    }

    function drawNullclines() {
        nullclineLayer.selectAll('*').remove();
        if (!document.getElementById('show-nullclines').checked) return;

        const params = getParams();
        const { K1, K2, gamma12, gamma21 } = params;

        // N1-nullcline: N2 = (K1 - N1) / gamma12
        if (gamma12 > 0) {
            const n1Vals = d3.range(0, Math.min(K1, xMax) + 1, 1);
            const line1 = d3.line()
                .x(d => xScale(d))
                .y(d => yScale(Math.max(0, Math.min(yMax, (K1 - d) / gamma12))));
            nullclineLayer.append('path')
                .attr('class', 'nullcline-n1')
                .attr('d', line1(n1Vals.filter(d => (K1 - d) / gamma12 >= 0 && (K1 - d) / gamma12 <= yMax)));
        }

        // N2-nullcline: N2 = K2 - gamma21 * N1
        const maxN1 = gamma21 > 0 ? Math.min(K2 / gamma21, xMax) : xMax;
        const n1Vals2 = d3.range(0, maxN1 + 1, 1);
        const line2 = d3.line()
            .x(d => xScale(d))
            .y(d => yScale(Math.max(0, K2 - gamma21 * d)));
        nullclineLayer.append('path')
            .attr('class', 'nullcline-n2')
            .attr('d', line2(n1Vals2.filter(d => K2 - gamma21 * d >= 0)));
    }

    let trajectoryPoints = [];
    let currentPoint = null;
    let animationId = null;

    const drag = d3.drag()
        .on('drag', function(event) {
            const n1 = Math.max(xMin, Math.min(xMax, xScale.invert(event.x)));
            const n2 = Math.max(yMin, Math.min(yMax, yScale.invert(event.y)));
            d3.select(this).attr('cx', xScale(n1)).attr('cy', yScale(n2));
            updateTrajectory(n1, n2);
        })
        .on('end', function(event) {
            const n1 = Math.max(xMin, Math.min(xMax, xScale.invert(event.x)));
            const n2 = Math.max(yMin, Math.min(yMax, yScale.invert(event.y)));
            startTrajectory(n1, n2);
        });

    function updateTrajectory(startN1, startN2) {
        if (animationId) cancelAnimationFrame(animationId);
        const params = getParams();
        trajectoryPoints = [[startN1, startN2]];
        let current = [startN1, startN2];

        for (let i = 0; i < 2000; i++) {
            const [n1, n2] = current;
            const [dn1, dn2] = dxdt(n1, n2, params);
            if (Math.sqrt(dn1*dn1 + dn2*dn2) < 0.01) break;
            const [nn1, nn2] = step(n1, n2, params);
            if (nn1 < 0 || nn2 < 0 || nn1 > xMax * 2 || nn2 > yMax * 2) break;
            current = [nn1, nn2];
            trajectoryPoints.push(current);
        }
        currentPoint = current;
        drawTrajectory();
    }

    function startTrajectory(startN1, startN2) {
        if (animationId) cancelAnimationFrame(animationId);
        trajectoryPoints = [[startN1, startN2]];
        currentPoint = [startN1, startN2];

        pointLayer.selectAll('.start-point').remove();
        pointLayer.append('circle')
            .attr('class', 'start-point')
            .attr('cx', xScale(startN1))
            .attr('cy', yScale(startN2))
            .attr('r', 6)
            .call(drag);

        animateTrajectory();
    }

    function animateTrajectory() {
        const params = getParams();
        function animate() {
            for (let s = 0; s < 5; s++) {
                const [n1, n2] = currentPoint;
                const [dn1, dn2] = dxdt(n1, n2, params);
                if (Math.sqrt(dn1*dn1 + dn2*dn2) < 0.01) {
                    drawTrajectory();
                    return;
                }
                const [nn1, nn2] = step(n1, n2, params);
                if (nn1 < 0 || nn2 < 0 || nn1 > xMax * 2 || nn2 > yMax * 2) {
                    drawTrajectory();
                    return;
                }
                currentPoint = [nn1, nn2];
                trajectoryPoints.push(currentPoint);
                if (trajectoryPoints.length > 3000) trajectoryPoints.shift();
            }
            drawTrajectory();
            animationId = requestAnimationFrame(animate);
        }
        animate();
    }

    function drawTrajectory() {
        const line = d3.line().x(d => xScale(d[0])).y(d => yScale(d[1]));
        trajectoryLayer.selectAll('.trajectory').remove();
        if (trajectoryPoints.length > 1) {
            trajectoryLayer.append('path')
                .attr('class', 'trajectory')
                .attr('d', line(trajectoryPoints));
        }
        pointLayer.selectAll('.current-point').remove();
        if (currentPoint) {
            pointLayer.append('circle')
                .attr('class', 'current-point')
                .attr('cx', xScale(currentPoint[0]))
                .attr('cy', yScale(currentPoint[1]))
                .attr('r', 4);
        }
    }

    function redrawAll() {
        updateAxes();
        drawVectorField();
        drawNullclines();
        if (trajectoryPoints.length > 0) {
            startTrajectory(trajectoryPoints[0][0], trajectoryPoints[0][1]);
        }
    }

    svg.on('click', function(event) {
        if (event.target.classList.contains('start-point')) return;
        const [mx, my] = d3.pointer(event, g.node());
        const n1 = xScale.invert(mx);
        const n2 = yScale.invert(my);
        if (n1 >= xMin && n1 <= xMax && n2 >= yMin && n2 <= yMax) {
            startTrajectory(n1, n2);
        }
    });

    ['K1', 'K2', 'gamma12', 'gamma21'].forEach(id => {
        const slider = document.getElementById(id);
        const display = document.getElementById(id + '-val');
        slider.addEventListener('input', function() {
            display.textContent = id.startsWith('K') ? this.value : parseFloat(this.value).toFixed(1);
            redrawAll();
        });
    });

    document.getElementById('show-nullclines').addEventListener('change', drawNullclines);

    // Initial draw
    redrawAll();
});
