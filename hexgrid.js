class HexGrid {
    constructor() {
        // Grid parameters
        this.radius = PARAMETERS.gridRadius;
        this.cellSize = PARAMETERS.cellSize;

        this.tick = 0;

        // Axial coordinate direction offsets for the 6 neighbors (flat-top orientation)
        // Ordered to match visual edge angles: 30°, 90°, 150°, 210°, 270°, 330°
        this.directions = [
            {q: +1, r:  0},  // Side 0: 30°
            {q:  0, r: +1},  // Side 1: 90°
            {q: -1, r: +1},  // Side 2: 150°
            {q: -1, r:  0},  // Side 3: 210°
            {q:  0, r: -1},  // Side 4: 270°
            {q: +1, r: -1},  // Side 5: 330°
        ];

        // 6-color wheel (RGB combinations)
        this.colorWheel = [
            {name: 'R', R: 255, G: 0,   B: 0},    // Red
            {name: 'Y', R: 255, G: 255, B: 0},    // Yellow (R+G)
            {name: 'G', R: 0,   G: 255, B: 0},    // Green
            {name: 'C', R: 0,   G: 255, B: 255},  // Cyan (G+B)
            {name: 'B', R: 0,   G: 0,   B: 255},  // Blue
            {name: 'M', R: 255, G: 0,   B: 255},  // Magenta (R+B)
        ];

        // Cell storage using Map with "q,r" string keys
        this.cells = new Map();

        // Organism storage
        this.organisms = [];

        // Initialize the hex grid
        this.initializeGrid();

        this.organismGraph = new OrganismGraph(this);
        this.dataManager = new DataManager(this);
        gameEngine.addEntity(this.dataManager);
    }

    /**
     * Determine which edge (0-5) a cell belongs to, or -1 if not on edge
     * Edges correspond to the 6 sides of the hex
     */
    getEdgeIndex(q, r) {
        if (!this.isEdge(q, r)) return -1;

        // Determine which edge by checking which coordinate is maxed out
        const s = -q - r; // Third cube coordinate

        if (q === this.radius && r <= 0) return 0;      // East edge
        if (r === -this.radius && s >= 0) return 1;     // Northeast edge
        if (s === this.radius && q <= 0) return 2;      // Northwest edge
        if (q === -this.radius && r >= 0) return 3;     // West edge
        if (r === this.radius && s <= 0) return 4;      // Southwest edge
        if (s === -this.radius && q >= 0) return 5;     // Southeast edge

        return -1; // Shouldn't happen
    }

    /**
     * Initialize all cells in a hexagonal shape
     */
    initializeGrid() {
        for (let q = -this.radius; q <= this.radius; q++) {
            for (let r = -this.radius; r <= this.radius; r++) {
                if (this.isInBounds(q, r)) {
                    const key = this.key(q, r);
                    const edgeIndex = this.getEdgeIndex(q, r);
                    const isSource = edgeIndex !== -1;

                    let R = 0, G = 0, B = 0;
                    if (isSource) {
                        // Assign color based on which edge this cell is on
                        const color = this.colorWheel[edgeIndex];
                        R = color.R;
                        G = color.G;
                        B = color.B;
                    }

                    // Create cell with only RGB channels
                    this.cells.set(key, {
                        q: q,
                        r: r,
                        R: R,
                        G: G,
                        B: B,
                        isSource: isSource,
                        edgeIndex: edgeIndex  // Store which edge for visualization
                    });
                }
            }
        }
        console.log(`Grid initialized with ${this.cells.size} cells`);
    }

    /**
     * Spawn multiple test organisms for testing
     */
    spawnTestOrganisms() {
        const numOrganisms = PARAMETERS.numOrganisms;

        for (let i = 0; i < numOrganisms; i++) {
            // Try to find a legal placement
            let q, r;
            let attempts = 0;
            do {
                // Random position in interior (not edges)
                q = Math.floor(Math.random() * (2 * (this.radius - 1) + 1)) - (this.radius - 1);
                r = Math.floor(Math.random() * (2 * (this.radius - 1) + 1)) - (this.radius - 1);
                attempts++;
                if (attempts > 100) break; // Safety check
            } while (!this.isLegalPlacement(q, r));

            if (this.isLegalPlacement(q, r)) {
                const organism = new Organism(this);
                organism.placeInGrid(q, r);
                this.organisms.push(organism);
                // console.log(`Spawned organism ${i + 1} at (${q}, ${r})`);
                this.organismGraph.addOrganism(organism);
            }
        }

        console.log(`Total organisms spawned: ${this.organisms.length}`);
    }

    /**
     * Check if a cell is a legal placement for a new organism
     * Rules: not on edges, not touching another organism
     */
    isLegalPlacement(q, r) {
        // Must be in bounds and not on edge
        if (!this.isInBounds(q, r) || this.isEdge(q, r)) {
            return false;
        }

        // Cell itself must not have an organism
        const cell = this.getCell(q, r);
        if (cell.organism) {
            return false;
        }

        // None of the neighbors can have an organism (no touching)
        const neighbors = this.getNeighbors(q, r);
        for (const neighbor of neighbors) {
            if (neighbor.organism || this.isEdge(neighbor.q, neighbor.r)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Check if placing offspring at (q, r) is valid - ALL touching pipes must match
     * Returns information about which adjacent organisms could merge
     * @param {number} q - axial coordinate
     * @param {number} r - axial coordinate
     * @param {Organism} newOrganism - the organism trying to reproduce
     * @returns {Object} - {canMerge: bool, adjacentOrganisms: [...], matchingConnections: [...]}
     */
    isLegalAdjacentPlacement(q, r, newOrganism) {
                // Must be in bounds and not on edge
        if (!this.isInBounds(q, r) || this.isEdge(q, r)) {
            return false;
        }

        // Cell itself must not have an organism
        const cell = this.getCell(q, r);
        if (cell.organism) {
            return false;
        }

        // None of the neighbors can have an organism (no touching)
        const neighbors = this.getNeighbors(q, r);
        for (const neighbor of neighbors) {
            if (this.isEdge(neighbor.q, neighbor.r)) {
                return false;
            }
        }

        // Check each of the 6 sides of the potential placement
        for (let side = 0; side < 6; side++) {
            const neighbor = newOrganism.getNeighborOnSide(q, r, side);

            // Skip if no neighbor or neighbor has no organism
            if (!neighbor || !neighbor.organism) continue;

            const neighborOrganism = neighbor.organism;
            const oppositeSide = (side + 3) % 6;  // Opposite side on hexagon

            // connecting pipes on this side
            const newOrganismPipe = newOrganism.sideToPipe[side];
            const neighborOrganismPipe = neighborOrganism.sideToPipe[oppositeSide];

            let newOrgColor;
            let neighborOrgColor;
            let newOrgConnect;
            let neighborOrgConnect;

            if(newOrganismPipe.inputSide === side) {
                newOrgColor = newOrganismPipe.inputColor;
                newOrgConnect = newOrganismPipe.inputConnect;
                if(neighborOrganismPipe.outputSide !== oppositeSide)
                    return false; // Mismatched direction - reject placement
                neighborOrgColor = neighborOrganismPipe.outputColor;
                neighborOrgConnect = neighborOrganismPipe.outputConnect;
            } else {
                newOrgColor = newOrganismPipe.outputColor;
                newOrgConnect = newOrganismPipe.outputConnect;
                if(neighborOrganismPipe.inputSide !== oppositeSide)
                    return false; // Mismatched direction - reject placement
                neighborOrgColor = neighborOrganismPipe.inputColor;
                neighborOrgConnect = neighborOrganismPipe.inputConnect;
            }

            // Check if colors match
            if (newOrgColor !== neighborOrgColor) {
                return false; // Color mismatch - reject placement
            }
            // Check if connectors match
            if (!newOrgConnect || !neighborOrgConnect) {
                return false; // Connection mismatch - reject placement
            }

            // console.log(`Matching pipes side ${side} to ${oppositeSide} with color ${newOrgColor} and ${neighborOrgColor}.`);
        }
        return true; // All touching pipes match
    }

    /**
     * Get all cells within a given radius of a position
     */
    getCellsInRange(q, r, radius) {
        const cells = [];
        for (let dq = -radius; dq <= radius; dq++) {
            for (let dr = -radius; dr <= radius; dr++) {
                const nq = q + dq;
                const nr = r + dr;
                // Check if in range using cube distance
                if (Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr)) <= radius) {
                    if (this.isInBounds(nq, nr)) {
                        cells.push({q: nq, r: nr});
                    }
                }
            }
        }
        return cells;
    }

    /**
     * Generate string key for a cell coordinate
     */
    key(q, r) {
        return `${q},${r}`;
    }

    /**
     * Check if coordinate is within hex-shaped bounds
     */
    isInBounds(q, r) {
        return Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) <= this.radius;
    }

    /**
     * Check if coordinate is on the edge of the hex grid
     */
    isEdge(q, r) {
        return Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) === this.radius;
    }

    /**
     * Get cell at coordinate (q, r)
     */
    getCell(q, r) {
        return this.cells.get(this.key(q, r));
    }

    /**
     * Get all neighbors of cell at (q, r)
     */
    getNeighbors(q, r) {
        const neighbors = [];
        for (const dir of this.directions) {
            const nq = q + dir.q;
            const nr = r + dir.r;
            if (this.isInBounds(nq, nr)) {
                neighbors.push(this.getCell(nq, nr));
            }
        }
        return neighbors;
    }

    /**
     * Main update function called by game engine
     */
    update() {
        this.updateLineage()

        if (document.getElementById('pause').checked) return;
        this.tick++;
        // Step 1: Diffusion
        this.diffuse();

        // Step 2: Organism pipe flows
        // Spawn test organisms
        if(this.tick === PARAMETERS.addOrganismsOnTick)
            this.spawnTestOrganisms();

        this.processPipes();

        // Step 3: Reproduction (must happen after all organisms update)
        const newOrganisms = [];
        for (const organism of this.organisms) {
            const offspring = organism.tryReproduce();
            if (offspring) {
                newOrganisms.push(offspring);
                this.organismGraph.addOrganism(offspring, organism);
            }
        }
        this.organisms.push(...newOrganisms);

        // Step 4: Death (lightning bolt)
        this.organisms = this.organisms.filter(organism => {
            if (Math.random() < PARAMETERS.deathRate ||
                (organism.energy < PARAMETERS.reproductionThreshold * PARAMETERS.starvationThreshold && Math.random() < PARAMETERS.starvationRate)) {
                // Clear organism from cell
                const gridCell = this.getCell(organism.q, organism.r);
                gridCell.organism = null;
                gridCell.R = 0;
                gridCell.G = 0;
                gridCell.B = 0;
                // console.log(`⚡ Organism died at (${organism.q}, ${organism.r})`);
                return false; // Remove from array
            }
            return true; // Keep in array
        });

        // get unique living organism IDs
        this.organismGraph.update(this.organisms);
    }

    updateLineage() {
        // TODO(Elijah): Fix lineages to re-enable this function.
        return;
        // if (!gameEngine.click) return;
        const pos = this.pixelToHex(gameEngine.click.x, gameEngine.click.y);
        if (!pos) return;
        const wanted_key = this.key(pos.q, pos.r);

        const cell = this.cells.get(wanted_key);
        if (!cell || !cell.organism) return;
        console.log(cell);
        this.lineage = cell;
    }

    /**
     * Perform diffusion step with calculate and update passes
     */
    diffuse() {
        const colors = ['R', 'G', 'B'];

        // CALCULATE PASS - compute all flows without modifying cells
        const flows = new Map();

        for (const [key, cell] of this.cells) {
            // Skip sources and cells with organisms
            if (cell.isSource || cell.organism) continue;

            const neighbors = this.getNeighbors(cell.q, cell.r);
            const cellFlows = {R: 0, G: 0, B: 0};

            // Calculate flow from each neighbor
            for (const neighbor of neighbors) {
                // Only diffuse from cells without organisms
                if (neighbor.organism) continue;

                for (const color of colors) {
                    const flow = PARAMETERS.k_diffusion * (neighbor[color] - cell[color]);
                    cellFlows[color] += flow;
                }
            }

            flows.set(key, cellFlows);
        }

        // UPDATE PASS - apply all flows simultaneously
        for (const [key, cellFlows] of flows) {
            const cell = this.cells.get(key);
            for (const color of colors) {
                cell[color] += cellFlows[color];
                // Clamp to [0, 255]
                cell[color] = Math.max(0, Math.min(255, cell[color]));
                cell[color] -= cell[color] * PARAMETERS.resourceDecay; // Resource decay each tick
            }
        }
    }

    /**
     * Process all pipe flows for organisms
     */
    processPipes() {
        const chains = [];
        for (const organism of this.organisms) {
            for (const pipe of organism.pipes) {
                pipe.flow = 0; // Reset flow
                if(!organism.getNeighborOnSide(organism.q, organism.r, pipe.inputSide).organism) {
                    chains.push(this.traceForward(organism, pipe));
                }
            }
        }

        // TODO(Elijah): groups here
        // place chains in groups with the same source
        const groups = [];
        for (let i = 0; i < chains.length; i++) {
            const chain = chains[i];
            let placed = false;
            for (let group of groups) {
                if (group[0].inputCell === chain.inputCell) {
                    group.push(chain);
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                groups.push([chain]);
            }
        }

        for (let group of groups) {
            // calculate total desired flow for each color
            const totalDesired = {R: 0, G: 0, B: 0};
            for (let chain of group) {
                const colorReq = chain.inputColorRequirements;
                if (colorReq.R === 1) totalDesired.R += chain.desiredFlow;
                if (colorReq.G === 1) totalDesired.G += chain.desiredFlow;
                if (colorReq.B === 1) totalDesired.B += chain.desiredFlow;
            }

            // calculate available flow for each color
            const available = {R: group[0].inputCell.R, G: group[0].inputCell.G, B: group[0].inputCell.B};

            // determine scaling factors
            const scaleFactors = {R: 1, G: 1, B: 1};
            if (totalDesired.R > available.R) scaleFactors.R = available.R / totalDesired.R;
            if (totalDesired.G > available.G) scaleFactors.G = available.G / totalDesired.G;
            if (totalDesired.B > available.B) scaleFactors.B = available.B / totalDesired.B;

            // update desired flows based on scaling factors
            for (let chain of group) {
                const colorReq = chain.inputColorRequirements;
                let scale = 1;
                if (colorReq.R === 1) scale = Math.min(scale, scaleFactors.R);
                if (colorReq.G === 1) scale = Math.min(scale, scaleFactors.G);
                if (colorReq.B === 1) scale = Math.min(scale, scaleFactors.B);
                chain.desiredFlow *= scale;
            }
        }

        // Process chains to apply flows and update organisms
        for (let chain of chains) {
            let remainingFlow = chain.desiredFlow;
            // draw flow from source and deposit to sink
            const inputCell = chain.inputCell;
            const outputCell = chain.outputCell;

            // Withdraw from input cell
            let colorReq = chain.inputColorRequirements;
            if (colorReq.R === 1) {
                inputCell.R -= remainingFlow;
            }
            if (colorReq.G === 1) {
                inputCell.G -= remainingFlow;
            }
            if (colorReq.B === 1) {
                inputCell.B -= remainingFlow;
            }
            // Deposit to output cell
            colorReq = chain.outputColorRequirements;
            if (colorReq.R === 1) {
                outputCell.R += remainingFlow * (1 - PARAMETERS.loss_rate);
            }
            if (colorReq.G === 1) {
                outputCell.G += remainingFlow * (1 - PARAMETERS.loss_rate);
            }
            if (colorReq.B === 1) {
                outputCell.B += remainingFlow * (1 - PARAMETERS.loss_rate);
            }

            // Update organism energy based on flow and loss rate
            const energyGained = remainingFlow * PARAMETERS.loss_rate;
            for (let step of chain.chain) {
                // compute pipe energy gain
                const pipe = step.pipe;
                const pipeFactor = this.calculateColorDistance(pipe.inputColor, pipe.outputColor) / 3;
                pipe.flow = remainingFlow;
                const organism = step.organism;
                organism.energy = Math.min(organism.energy + energyGained * pipeFactor, PARAMETERS.energyMax);
            }
        }
    }

    // TODO(Elijah): The pipes are made here
    traceForward(organism, pipe) {
        const chain = [{organism: organism, pipe: pipe}];
        let current = {organism: organism, pipe: pipe};
        const inputCell = current.organism.getInputCell(current.pipe);
        const inputColorRequirements = this.getColorRequirements(current.pipe.inputColor);
        const inputFlowAvailable = this.getAvailableResource(inputCell, inputColorRequirements);
        const desiredFlow = inputFlowAvailable*PARAMETERS.k_pipe;
        let outputCell = null;

        while (current.organism) {
            outputCell = current.organism.getOutputCell(current.pipe);
            const nextOrganism = outputCell.organism;
            const oppositeSide = (current.pipe.outputSide + 3) % 6;
            const nextPipe = nextOrganism?.sideToPipe[oppositeSide];
            current = {
                organism: nextOrganism,
                pipe: nextPipe
            };
            if (current.organism) chain.push(current);
        }
        let outputColorRequirements = this.getColorRequirements(chain[chain.length - 1].pipe.outputColor);

        return {chain, desiredFlow, inputCell, outputCell, inputColorRequirements, outputColorRequirements};
    }

    /**
     * Calculate color distance on the 6-color wheel (0-3)
     */
    calculateColorDistance(color1, color2) {
        const wheel = ['R', 'Y', 'G', 'C', 'B', 'M'];
        const idx1 = wheel.indexOf(color1);
        const idx2 = wheel.indexOf(color2);

        // Distance around the wheel (min of clockwise and counter-clockwise)
        const dist = Math.abs(idx1 - idx2);
        return Math.min(dist, 6 - dist);
    }

    /**
     * Get the RGB requirements for a color
     * Returns {R: amount, G: amount, B: amount} needed from input
     */
    getColorRequirements(color) {
        switch(color) {
            case 'R': return {R: 1, G: 0, B: 0};
            case 'G': return {R: 0, G: 1, B: 0};
            case 'B': return {R: 0, G: 0, B: 1};
            case 'Y': return {R: 1, G: 1, B: 0}; // R + G
            case 'C': return {R: 0, G: 1, B: 1}; // G + B
            case 'M': return {R: 1, G: 0, B: 1}; // R + B
        }
    }

    /**
     * Calculate how much resource is available for a given color requirement
     */
    getAvailableResource(cell, colorReq) {
        if (!cell) return 0;

        // For single colors, return that channel
        if (colorReq.R === 1 && colorReq.G === 0 && colorReq.B === 0) return cell.R;
        if (colorReq.R === 0 && colorReq.G === 1 && colorReq.B === 0) return cell.G;
        if (colorReq.R === 0 && colorReq.G === 0 && colorReq.B === 1) return cell.B;

        // For dual colors, return minimum of both required channels
        if (colorReq.R === 1 && colorReq.G === 1) return Math.min(cell.R, cell.G); // Yellow
        if (colorReq.G === 1 && colorReq.B === 1) return Math.min(cell.G, cell.B); // Cyan
        if (colorReq.R === 1 && colorReq.B === 1) return Math.min(cell.R, cell.B); // Magenta

        return 0;
    }

    /**
     * Convert axial coordinates (q, r) to pixel coordinates (x, y)
     */
    hexToPixel(q, r) {
        const y = this.cellSize * (Math.sqrt(3) * q + Math.sqrt(3)/2 * r);
        const x = this.cellSize * (3/2 * r);
        return {
            x: x + PARAMETERS.gridOffsetX,
            y: y + PARAMETERS.gridOffsetY
        };
    }

    pixelToHex(x, y) {
        const ny = (y - PARAMETERS.gridOffsetY) / this.cellSize;
        const nx = (x - PARAMETERS.gridOffsetX) / this.cellSize;
        const q = Math.sqrt(3)/3 * ny - 1/3 * nx;
        const r = 2/3 * nx;
        const pos = { q: Math.floor(q), r: Math.floor(r) }
        if (this.isInBounds(pos.q, pos.r)) return pos;
        else return null;
    }

    /**
     * Draw the entire grid
     */
    draw(ctx) {
        // Draw all cells
        for (const [key, cell] of this.cells) {
            this.drawHex(ctx, cell);
        }

        // Draw organisms on top
        for (const organism of this.organisms) {
            organism.draw(ctx);
        }
    }

    /**
     * Draw a single hexagon cell
     */
    drawHex(ctx, cell) {
        const center = this.hexToPixel(cell.q, cell.r);
        const size = this.cellSize;

        // Calculate vertices for flat-top hexagon
        const vertices = [];
        for (let i = 0; i < 6; i++) {
            const angle = Math.PI / 3 * i;
            vertices.push({
                x: center.x + size * Math.cos(angle),
                y: center.y + size * Math.sin(angle)
            });
        }

        // Draw filled hexagon
        ctx.beginPath();
        ctx.moveTo(vertices[0].x, vertices[0].y);
        for (let i = 1; i < 6; i++) {
            ctx.lineTo(vertices[i].x, vertices[i].y);
        }
        ctx.closePath();

        // force draw colors on cell tiles (for energy display)
        const drawRed = cell.organism != null || document.getElementById('cell-draw-red').checked;
        const drawGreen = cell.organism != null || document.getElementById('cell-draw-green').checked;
        const drawBlue = cell.organism != null || document.getElementById('cell-draw-blue').checked;
        // Color based on RGB concentrations
        // Note: C/M/Y colors emerge from RGB combinations (C=G+B, M=R+B, Y=R+G)
        const r = drawRed ? Math.floor(cell.R) : 0;
        const g = drawGreen ? Math.floor(cell.G) : 0;
        const b = drawBlue ? Math.floor(cell.B) : 0;
        ctx.fillStyle = rgb(r, g, b);
        ctx.fill();

        // Draw border (thicker for sources, colored by edge)
        if (cell.isSource) {
            const edgeColor = this.colorWheel[cell.edgeIndex];
            ctx.strokeStyle = rgb(edgeColor.R, edgeColor.G, edgeColor.B);
            ctx.lineWidth = 2;
        } else if (cell.organism) {
            ctx.strokeStyle = '#666666';
            ctx.lineWidth = 2;
        } else {
            ctx.strokeStyle = '#666666';
            ctx.lineWidth = 0.5;
        }
        ctx.stroke();
    }

    drawNumInHex(ctx, cell, number) {
        const center = this.hexToPixel(cell.q, cell.r);
        ctx.fillStyle = 'black';
        ctx.font = `${this.cellSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(number, center.x, center.y);
    }
}
