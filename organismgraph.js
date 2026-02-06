const color_bitmask = 1;
const directionality_bitmask = 2;
const rotation_bitmask = 4;
const total_living_counts = 8;
const base_5_living_index = color_bitmask | directionality_bitmask | rotation_bitmask;
const base_15_living_index = color_bitmask | directionality_bitmask;

class OrganismGraph {
    constructor(hexGrid) {
        this.hexGrid = hexGrid;
        this.organismCount = new Map(); // Map from organism ID to count
        this.offspringMap = new Map(); // Map from parent organism ID to array of offspring IDs
        this.livingIDs = [];
        this.uniqueLivingIDs = new Set();
        this.livingCountsMatrix = new Array(total_living_counts);
        for (var i = 0; i < total_living_counts; i++) this.livingCountsMatrix[i] = [];
        this.maxCount = 0;
        this.maxOffspring = 0;
        this.totalOrganisms = 0;
        this.lineage = null;
    }

    getLivingCountIndex() {
        const ignore_color = document.getElementById('ignore-color').checked * color_bitmask;
        const ignore_rotation = document.getElementById('ignore-rotation').checked * rotation_bitmask;
        const ignore_directionality = document.getElementById('ignore-directionality').checked * directionality_bitmask;
        return ignore_color + ignore_rotation + ignore_directionality;
    }

    addOrganism(organism, parent) {
        this.totalOrganisms++;
        const orgID = organism.organismID();
        const parentID = parent?.organismID();

        const organismCount = this.organismCount;
        if (organismCount.has(orgID)) {
            organismCount.set(orgID, organismCount.get(orgID) + 1);
        } else {
            organismCount.set(orgID, 1);
        }
        this.maxCount = Math.max(this.maxCount, organismCount.get(orgID));

        if (parentID) {
            if (!this.offspringMap.has(parentID)) {
                this.offspringMap.set(parentID, []);
            }
            this.offspringMap.get(parentID).push(orgID);
            this.maxOffspring = Math.max(this.maxOffspring, this.offspringMap.get(parentID).length);
        }
    }

    update(livingOrgs) {
        this.updateLivingOrganisms(livingOrgs);
        this.updateHTML();
    }

    updateLivingOrganisms(livingOrgs) {

        this.livingIDs = livingOrgs.map(org => org.organismID());
        this.uniqueLivingIDs = new Set(this.livingIDs);

        const countMap = new Map();
        for (let org of livingOrgs) {
            const id = org.organismID();
            if (countMap.has(id)) {
                const last = countMap.get(id);
                last.count += 1;
                last.energy += org.energy;
            } else {
                countMap.set(id, {
                    count: 1,
                    energy: org.energy,
                });
            }
        }

        for (var i = 0; i < total_living_counts; i++) {
            const topOrgs = new Map();
            const tempOrg = new Organism(this.hexGrid);

            countMap.forEach((entry, id) => {
                var pipes = tempOrg.pipesFromID(id);

                if (i & color_bitmask) {
                    pipes = pipes.map(pipe => {
                        pipe.inputColor = 'B';
                        pipe.outputColor = 'R';
                        return pipe;
                    })
                }
                var name_pipes = JSON.parse(JSON.stringify(pipes)); // deep copy pipes... this is terrible...
                tempOrg.pipes = name_pipes;

                if (i & directionality_bitmask) {
                    name_pipes = name_pipes.map((entry) => {
                        if (entry.inputSide > entry.outputSide) {
                            const tmp = entry.inputSide;
                            entry.inputSide = entry.outputSide;
                            entry.outputSide = tmp;
                        }
                        return entry;
                    });
                }
                if (i & color_bitmask) {
                    name_pipes = name_pipes.map(pipe => {
                        pipe.inputColor = 'B';
                        pipe.outputColor = 'R';
                        return pipe;
                    })
                }

                // This code is terrible-- but it works.
                if (i & rotation_bitmask) {
                    for (let j = 0; j < 6; j++) {
                        for (const pipe of name_pipes) {
                            pipe.inputSide = (pipe.inputSide + 1) % 6;
                            pipe.outputSide = (pipe.outputSide + 1) % 6;
                            if (i & directionality_bitmask) {
                                if (pipe.inputSide > pipe.outputSide) {
                                    const tmp = pipe.inputSide;
                                    pipe.inputSide = pipe.outputSide;
                                    pipe.outputSide = tmp;
                                }
                            }
                            if (i & color_bitmask) {
                                pipe.inputColor = 'B';
                                pipe.outputColor = 'R';
                            }
                        }
                        tempOrg.pipes = name_pipes;
                        if (topOrgs.has(tempOrg.organismID())) {
                            break;
                        }
                    }
                }

                const name = tempOrg.organismID();

                if (topOrgs.has(name)) {
                    const old = topOrgs.get(name);
                    old.count += entry.count;
                    old.energy += entry.energy;
                    topOrgs.set(name, old);
                } else {
                    topOrgs.set(name, { count: entry.count, energy: entry.energy, pipes: pipes });
                }
            });

            this.livingCountsMatrix[i] = Array.from(topOrgs.entries()).map(([id, {count, pipes, energy}]) => {
                return {
                    orgID: id,
                    count: count,
                    pipes: pipes,
                    energy: energy,
                };
            }).sort((a, b) => b.count - a.count);
        }
    }

    updateHTML() {
        document.getElementById('orggraph').innerHTML = `Tick: ${this.hexGrid.tick} <br/>
         Total Organisms: ${this.totalOrganisms} Unique Kinds: ${this.organismCount.size}<br/>
         Living Organisms: ${this.livingIDs.length} Unique Kinds: ${this.uniqueLivingIDs.size}<br/>
         Max Count: ${this.maxCount} Max Offspring: ${this.maxOffspring}`;
    }

    drawHex(ctx, center, size, color) {
        const corners = [];
        // corners for flat-topped hexagon
        for (let i = 0; i < 6; i++) {
            const angle = Math.PI / 180 * (60 * i);
            const x = center.x + size * Math.cos(angle);
            const y = center.y + size * Math.sin(angle);
            corners.push({ x: x, y: y });
        }

        ctx.beginPath();
        ctx.moveTo(corners[0].x, corners[0].y);
        for (let i = 1; i < 6; i++) {
            ctx.lineTo(corners[i].x, corners[i].y);
        }
        ctx.closePath();

        ctx.fillStyle = color;
        ctx.fill();
    }

    drawTopOrganisms(ctx, x, y, n) {
        const tempOrg = new Organism(this.hexGrid);

        ctx.save();

        const entries = this.livingCountsMatrix[this.getLivingCountIndex()].slice(0, 120);

        const pipe_mid_color_tmp = pipe_mid_color;
        pipe_mid_color = BLACK_RGB;
        var index = 0;
        entries.forEach(({count, pipes}) => {
            const flow = false;
            const center = { x: x + (index % 12) * 50, y: y + Math.floor(index / 12) * 62 };
            const size = 20;
            index++;

            this.drawHex(ctx, center, size, GREY);
            tempOrg.drawPipesAtPoint(ctx, center, size, pipes, flow);
            ctx.font = "14px Arial";
            ctx.fillStyle = TEXT_COLOR;
            ctx.textAlign = "center";
            ctx.fillText(`${count}`, center.x, center.y + size + 16);
        });
        pipe_mid_color = pipe_mid_color_tmp;
        ctx.restore();

    }

}
