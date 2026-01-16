const GREY = {
    R: 0x90,
    G: 0x8c,
    B: 0xaa,
};
const BLACK = {
    R: 0,
    G: 0,
    B: 0,
};
var pipe_mid_color = GREY;

class Organism {
    constructor(grid, organism) {
        this.grid = grid;

        // Initialize pipes - either copy from parent or generate new random configuration
        this.pipes = organism ? this.copyPipes(organism) : this.generateRandomPipes(); // Array of 3 pipes: {inputSide, inputColor, outputSide, outputColor}
        this.mutate(); // Initial mutation on creation
        this.sideToPipe = {}; // Map: side → pipe for O(1) lookup
        this.rebuildPipeIndex();

        this.energy = 0;
    }

    placeInGrid(q, r) {
        this.q = q;
        this.r = r;
        const gridCell = this.grid.getCell(q, r);
        gridCell.organism = this;
        gridCell.R = 0;
        gridCell.G = 0;
        gridCell.B = 0;
    }

    /**
     * Build index for fast pipe lookup by side
     * Call after any pipe modification
     */
    rebuildPipeIndex() {
        this.sideToPipe = {};
        for (const pipe of this.pipes) {
            this.sideToPipe[pipe.inputSide] = pipe;
            this.sideToPipe[pipe.outputSide] = pipe;
        }
    }

    /**
     * Get the grid cell that this pipe's input pulls from
     */
    getInputCell(pipe) {
        return this.getNeighborOnSide(this.q, this.r, pipe.inputSide);
    }

    /**
     * Get the grid cell that this pipe's output pushes to
     */
    getOutputCell(pipe) {
        return this.getNeighborOnSide(this.q, this.r, pipe.outputSide);
    }

    /**
     * Calculate energy factor for a pipe (color distance / 3)
     */
    getEnergyFactor(pipe) {
        return this.calculateColorDistance(pipe.inputColor, pipe.outputColor) / 3;
    }

    /**
     * Generate random pipe configuration
     */
    generateRandomPipes() {
        const pairing = [];
        const pipes = [];

        const sides = [0, 1, 2, 3, 4, 5];
        while (sides.length > 0) {
            const index1 = randomInt(sides.length);
            const side1 = sides.splice(index1, 1)[0];
            const index2 = randomInt(sides.length);
            const side2 = sides.splice(index2, 1)[0];
            pairing.push([side1, side2]);
        }

        const colors = ['R', 'Y', 'G', 'C', 'B', 'M'];

        // For each pair of sides, create a simple pipe
        for (let [side1, side2] of pairing) {
            const inputColor = colors[randomInt(colors.length)];
            const outputColor = colors[randomInt(colors.length)];

            pipes.push({
                inputSide: side1,
                inputColor: inputColor,
                outputSide: side2,
                outputColor: outputColor,
                inputConnect: true,
                outputConnect: true,
                flow: 0
            });
        }

        return pipes;
        // console.log("Generated organism with pipes:", this.pipes);
    }

    /**
     * Get the neighbor cell on a given side of a hex cell
     */
    getNeighborOnSide(q, r, side) {
        const dir = this.grid.directions[side];
        return this.grid.getCell(q + dir.q, r + dir.r);
    }

    /**
     * Main update function
     */
    update() {
        this.processPipes();
    }

    /**
     * Deep copy pipes - simple structure is trivial to copy
     */
    copyPipes(targetOrganism) {
        const copiedPipes = [];

        for (const pipe of targetOrganism.pipes) {
            copiedPipes.push({
                inputSide: pipe.inputSide,
                inputColor: pipe.inputColor,
                outputSide: pipe.outputSide,
                outputColor: pipe.outputColor,
                inputConnect: pipe.inputConnect,
                outputConnect: pipe.outputConnect,
                flow: 0
            });
        }

        return copiedPipes;
    }

    /**
     * Try to reproduce if energy threshold is met
     * Returns new organism or null
     */
    tryReproduce() {
        this.energy -= this.energy * PARAMETERS.energyDecay; // Energy decay each tick
        if (this.energy < PARAMETERS.reproductionThreshold) {
            return null;
        }

        // create a mutated offspring
        const offspring = new Organism(this.grid, this);
        const range = Math.min(5, Math.max(2, Math.floor(this.energy / PARAMETERS.reproductionThreshold)));

        // Find legal placement within range
        const candidates = this.grid.getCellsInRange(this.q, this.r, range);
        const legalCells = candidates.filter(c => this.grid.isLegalPlacement(c.q, c.r));

        // PRIORITY 1: Free spaces (no touching)
        if (legalCells.length > 0) {
            // Pick random legal cell
            const bestCell = legalCells[randomInt(legalCells.length)];
            offspring.placeInGrid(bestCell.q, bestCell.r);

            // Deduct reproduction cost
            this.energy -= PARAMETERS.reproductionThreshold;

            // console.log(`🧬 Organism reproduced at (${bestCell.q}, ${bestCell.r}), parent energy: ${this.energy.toFixed(2)}`);

            return offspring;
        }

        // PRIORITY 2: Check for merge opportunities (adjacent placement)

        const mergeCandidates = candidates.filter(c => this.grid.isLegalAdjacentPlacement(c.q, c.r, offspring));

        if (mergeCandidates.length > 0) {
            // Pick random legal cell
            const bestCell = mergeCandidates[randomInt(mergeCandidates.length)];
            offspring.placeInGrid(bestCell.q, bestCell.r);

            // Deduct reproduction cost
            this.energy -= PARAMETERS.reproductionThreshold;

            // console.log(`🧬 Organism reproduced by merging at (${bestCell.q}, ${bestCell.r}), parent energy: ${this.energy.toFixed(2)}`);

            return offspring;
        }

        // No reproduction possible
        return null;
    }

    /**
     * Apply mutations to offspring
     * IMPORTANT: Don't mutate colors on endpoints connected to other organisms
     */
    mutate() {
        const colors = ['R', 'Y', 'G', 'C', 'B', 'M'];

        // Mutate endpoint colors and connectors
        for (const pipe of this.pipes) {
            const inputCell = this.getInputCell(pipe);
            const outputCell = this.getOutputCell(pipe);

            if (Math.random() < PARAMETERS.mutationRate) {
                pipe.inputColor = colors[randomInt(colors.length)];
            }

            if (Math.random() < PARAMETERS.mutationRate) {
                pipe.outputColor = colors[randomInt(colors.length)];
            }

            if (Math.random() < PARAMETERS.mutationRate) {
                pipe.inputConnect = !pipe.inputConnect;
            }

            if (Math.random() < PARAMETERS.mutationRate) {
                pipe.outputConnect = !pipe.outputConnect;
            }
        }

        if (Math.random() < PARAMETERS.mutationRate) {
            if (this.pipes.length >= 2) {
                const pipe1Idx = randomInt(this.pipes.length);
                let pipe2Idx;
                do {
                    pipe2Idx = randomInt(this.pipes.length);
                } while (pipe2Idx === pipe1Idx);

                const pipe1 = this.pipes[pipe1Idx];
                const pipe2 = this.pipes[pipe2Idx];

                // Randomly choose to swap inputs or outputs
                const swapType = randomInt(4);
                if (swapType === 0) {
                    // Swap input sides
                    [pipe1.inputSide, pipe2.inputSide] = [pipe2.inputSide, pipe1.inputSide];
                } else if (swapType === 1) {
                    // Swap output sides
                    [pipe1.outputSide, pipe2.outputSide] = [pipe2.outputSide, pipe1.outputSide];
                } else if (swapType === 2) {
                    // Swap input of pipe1 with output of pipe2
                    [pipe1.inputSide, pipe2.outputSide] = [pipe2.outputSide, pipe1.inputSide];
                } else {
                    // Swap output of pipe1 with input of pipe2
                    [pipe1.outputSide, pipe2.inputSide] = [pipe2.inputSide, pipe1.outputSide];
                }
            }
        }

        // Mutate rotation
        if (Math.random() < PARAMETERS.mutationRate) {
            // Rotate by ±1 or ±2 positions (60° or 120°)
            const rotations = [-2, -1, 1, 2];
            const rotation = rotations[randomInt(rotations.length)];

            // Rotate all pipes
            for (const pipe of this.pipes) {
                pipe.inputSide = (pipe.inputSide + rotation + 6) % 6;
                pipe.outputSide = (pipe.outputSide + rotation + 6) % 6;
            }
        }
    }

    /**
     * Get RGB color for a color name
     */
    getColorRGB(colorName) {
        const colorMap = {
            'R': {R: 255, G: 0, B: 0},
            'Y': {R: 255, G: 255, B: 0},
            'G': {R: 0, G: 255, B: 0},
            'C': {R: 0, G: 255, B: 255},
            'B': {R: 0, G: 0, B: 255},
            'M': {R: 255, G: 0, B: 255}
        };
        return colorMap[colorName];
    }

    organismID() {
        const pipeCodes = this.pipes.map(pipe =>
            `${pipe.inputSide}${pipe.inputColor}${pipe.outputSide}${pipe.outputColor}`
        ).sort((a, b) => a.localeCompare(b)).join('-');
        return pipeCodes;
    }

    pipesFromID(pipeID) {
        const pipeStrings = pipeID.split('-');
        const pipes = pipeStrings.map(str => {
            return {
                inputSide: parseInt(str[0]),
                inputColor: str[1],
                outputSide: parseInt(str[2]),
                outputColor: str[3]
            };
        });
        return pipes;
    }

    /**
     * Draw the organism and its pipes
     */
    draw(ctx) {
        const center = this.grid.hexToPixel(this.q, this.r);
        const size = this.grid.cellSize;
        const display = document.getElementById('organism-display').value;
        const pipe_show = document.getElementById('organism-pipes').value;
        const endpoints = document.getElementById('endpoints').checked;

        const gridCell = this.grid.getCell(this.q, this.r);
        if (display === "none") {
            // don't display them
            gridCell.R = 0;
            gridCell.G = 0;
            gridCell.B = 0;
            pipe_mid_color = GREY;
        } else if (display === "grey") {
            // reset color of cell
            gridCell.R = 0x90;
            gridCell.G = 0x8c;
            gridCell.B = 0xaa;
            pipe_mid_color = BLACK;
        } else if (display === "energy") {
            const proportion = Math.floor((this.energy / 100) * 255);
            gridCell.R = 255 - proportion;
            gridCell.G = 0;
            gridCell.B = proportion;
            pipe_mid_color = GREY;
        } else console.error(`Unknown 'organism-display' value ${display}`);

         if (pipe_show === "none") {
            // do nothing
        } else if (pipe_show === "color" || pipe_show === "flow") {
            this.drawPipesAtPoint(ctx, center, size, this.pipes, pipe_show === "flow");
        } else console.error(`Unknown 'organism-pipes' value ${pipe_show}`);

        if (endpoints) {
            for (const pipe of this.pipes) {
                const inputColor = this.getColorRGB(pipe.inputColor);
                const outputColor = this.getColorRGB(pipe.outputColor);
                this.drawDirectionIndicators(ctx, pipe, center, size, inputColor, outputColor);
            }
        }
    }

    drawPipesAtPoint(ctx, center, size, pipes, flow) {
        for (const pipe of pipes) {
            this.drawPipe(ctx, center, size, pipe, flow);
        }
    }

    /**
     * Get point on hexagon edge for a given side (0-5)
     */
    getSidePoint(center, size, side) {
        const angle = Math.PI / 3 * side + Math.PI / 6; // Angle to side midpoint
        // For flat-top hexagon, edge midpoint is at distance size * cos(30°) = size * sqrt(3)/2
        // Reduce slightly (0.85 instead of 0.866) to start just inside the edge
        const edgeDistance = size * 0.85;
        return {
            x: center.x + edgeDistance * Math.cos(angle),
            y: center.y + edgeDistance * Math.sin(angle)
        };
    }

    /**
     * Draw a single pipe with curved line
     */
    drawPipe(ctx, center, size, pipe, flow) {
        const startPoint = this.getSidePoint(center, size, pipe.inputSide);
        const endPoint = this.getSidePoint(center, size, pipe.outputSide);

        const inputColor = this.getColorRGB(pipe.inputColor);
        const outputColor = this.getColorRGB(pipe.outputColor);

        // Check if this is a straight-through pipe (opposite sides)
        const oppositeSides = [
            [0, 3], [1, 4], [2, 5]
        ];
        const isStraight = oppositeSides.some(([a, b]) =>
            (pipe.inputSide === a && pipe.outputSide === b) ||
            (pipe.inputSide === b && pipe.outputSide === a)
        );

        if (isStraight) {
            // Draw straight line through center
            this.drawGradientLine(ctx, startPoint, endPoint, inputColor, outputColor, pipe.flow, flow);
        } else {
            // Draw curved line that doesn't go through center
            this.drawCurvedPipe(ctx, center, startPoint, endPoint, inputColor, outputColor, pipe.flow, flow);
        }

        // Draw direction indicators at the pipe endpoints (input/output)
    }

    drawSideNumbers(ctx) {
        const center = this.grid.hexToPixel(this.q, this.r);
        const size = this.grid.cellSize;

        for (let side = 0; side < 6; side++) {
            const neighbor = this.getNeighborOnSide(this.q, this.r, side);
            this.grid.drawNumInHex(ctx, neighbor, side);

            const sidePoint = this.getSidePoint(center, size, side);
            ctx.fillStyle = 'white';
            ctx.font = `${size}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(side, sidePoint.x, sidePoint.y);
        }
    }

    /**
     * Draw direction indicators at pipe endpoints
     * Only draw on external connections (not organism-to-organism)
     */
    drawDirectionIndicators(ctx, pipe, center, size, inputColor, outputColor) {
        const startPoint = this.getSidePoint(center, size, pipe.inputSide);
        const endPoint = this.getSidePoint(center, size, pipe.outputSide);

        // Get cell references using helper methods
        const inputCell = this.getInputCell(pipe);
        const outputCell = this.getOutputCell(pipe);

        // Only draw input indicator if inputCell is external (no organism)
        if (inputCell && !inputCell.organism) {
            ctx.fillStyle = rgb(inputColor.R, inputColor.G, inputColor.B);
            ctx.beginPath();
            ctx.arc(startPoint.x, startPoint.y, PARAMETERS.circleRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Only draw output indicator if outputCell is external (no organism)
        if (outputCell && !outputCell.organism) {
            const arrowSize = PARAMETERS.arrowLength;
            const angle = Math.PI / 3 * pipe.outputSide + Math.PI / 6;

            // Arrow points outward from hex
            const tipX = endPoint.x + Math.cos(angle) * arrowSize;
            const tipY = endPoint.y + Math.sin(angle) * arrowSize;

            // Two base points perpendicular to arrow direction
            const perpAngle = angle + Math.PI / 2;
            const baseX1 = endPoint.x + Math.cos(perpAngle) * arrowSize * 0.4;
            const baseY1 = endPoint.y + Math.sin(perpAngle) * arrowSize * 0.4;
            const baseX2 = endPoint.x - Math.cos(perpAngle) * arrowSize * 0.4;
            const baseY2 = endPoint.y - Math.sin(perpAngle) * arrowSize * 0.4;

            ctx.fillStyle = rgb(outputColor.R, outputColor.G, outputColor.B);
            ctx.beginPath();
            ctx.moveTo(tipX, tipY);
            ctx.lineTo(baseX1, baseY1);
            ctx.lineTo(baseX2, baseY2);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }

    /**
     * Draw straight line with gradient
     */
    drawGradientLine(ctx, start, end, startColor, outputColor, flow, showFlow) {
        const gradient = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
        gradient.addColorStop(0, rgb(startColor.R, startColor.G, startColor.B));
        gradient.addColorStop(0.5, rgb(pipe_mid_color.R, pipe_mid_color.G, pipe_mid_color.B));
        gradient.addColorStop(1, rgb(outputColor.R, outputColor.G, outputColor.B));

        if(showFlow) {
            // Modulate color brightness by flow amount (0 to 1)
            const flowFactor = Math.floor(flow/(255*PARAMETERS.k_pipe)*255); // Scale flow for visibility
            ctx.strokeStyle = rgb(0, flowFactor, 0); // Greenish tint for flow
        } else {
            ctx.strokeStyle = gradient;
        }
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
    }

    /**
     * Draw curved pipe using quadratic bezier
     */
    drawCurvedPipe(ctx, center, start, end, startColor, outputColor, flow, showFlow) {
        // Control point is perpendicular to midpoint, offset toward center
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;

        // Vector from center to midpoint
        const toMidX = midX - center.x;
        const toMidY = midY - center.y;
        const dist = Math.sqrt(toMidX * toMidX + toMidY * toMidY);

        // Control point pushed toward center (subtract instead of add)
        const controlX = midX - (toMidX / dist) * this.grid.cellSize * 0.5;
        const controlY = midY - (toMidY / dist) * this.grid.cellSize * 0.5;

        // Draw curve with color endpoints and gray middle
        // We'll approximate gradient with multiple line segments
        const segments = 20;
        for (let i = 0; i < segments; i++) {
            const t1 = i / segments;
            const t2 = (i + 1) / segments;

            const p1 = this.bezierPoint(start, {x: controlX, y: controlY}, end, t1);
            const p2 = this.bezierPoint(start, {x: controlX, y: controlY}, end, t2);

            // Interpolate color
            const color = this.interpolateColor(startColor, outputColor, t1);

            if(showFlow) {
                // Modulate color brightness by flow amount (0 to 1)
                const flowFactor = Math.floor(flow/(255*PARAMETERS.k_pipe)*255); // Scale flow for visibility
                ctx.strokeStyle = rgb(0, flowFactor, 0); // Greenish tint for flow
            } else {
                ctx.strokeStyle = rgb(Math.floor(color.R), Math.floor(color.G), Math.floor(color.B));
            }
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }
    }

    /**
     * Calculate point on quadratic bezier curve
     */
    bezierPoint(start, control, end, t) {
        const x = (1-t)*(1-t)*start.x + 2*(1-t)*t*control.x + t*t*end.x;
        const y = (1-t)*(1-t)*start.y + 2*(1-t)*t*control.y + t*t*end.y;
        return {x, y};
    }


    /**
     * Interpolate between two colors with gray in middle
     */
    interpolateColor(color1, color2, t) {
        // Make middle (t=0.5) be gray (128, 128, 128)
        if (t < 0.5) {
            // Interpolate from color1 to gray
            const s = t * 2; // 0 to 1
            return {
                R: color1.R * (1 - s) + pipe_mid_color.R * s,
                G: color1.G * (1 - s) + pipe_mid_color.G * s,
                B: color1.B * (1 - s) + pipe_mid_color.B * s
            };
        } else {
            // Interpolate from gray to color2
            const s = (t - 0.5) * 2; // 0 to 1
            return {
                R: pipe_mid_color.R * (1 - s) + color2.R * s,
                G: pipe_mid_color.G * (1 - s) + color2.G * s,
                B: pipe_mid_color.B * (1 - s) + color2.B * s
            };
        }
    }
}
