class OrganismGraph {
    constructor(hexGrid) {
        this.hexGrid = hexGrid;
        this.organismCount = new Map(); // Map from organism ID to count
        this.offspringMap = new Map(); // Map from parent organism ID to array of offspring IDs
        this.livingIDs = [];
        this.uniqueLivingIDs = new Set();
        this.livingCounts = [];
        this.maxCount = 0;
        this.maxOffspring = 0;
        this.totalOrganisms = 0;
    }

    addOrganism(organism, parent) {
        this.totalOrganisms++;
        const orgID = organism.organismID();
        const parentID = parent?.organismID();

        if (this.organismCount.has(orgID)) {
            this.organismCount.set(orgID, this.organismCount.get(orgID) + 1);
        } else {
            this.organismCount.set(orgID, 1);
        }
        this.maxCount = Math.max(this.maxCount, this.organismCount.get(orgID));

        if (parentID) {
            if (!this.offspringMap.has(parentID)) {
                this.offspringMap.set(parentID, []);
            }
            this.offspringMap.get(parentID).push(orgID);
            this.maxOffspring = Math.max(this.maxOffspring, this.offspringMap.get(parentID).length);
        }
    }

    updateLivingOrganisms(livingIDs) {
        this.livingIDs = livingIDs;
        this.uniqueLivingIDs = new Set(livingIDs);

        const countMap = new Map();
        for (let id of livingIDs) {
            if (countMap.has(id)) {
                countMap.set(id, countMap.get(id) + 1);
            } else {
                countMap.set(id, 1);
            }
        }
        this.livingCounts = [...countMap.entries()].sort((a, b) => b[1] - a[1]);
    }

    drawHexOutline(ctx, center, size, color) {
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
        ctx.strokeStyle = color;
        ctx.stroke();
    }

    drawTopOrganisms(ctx, x, y, n) {
        const topOrgs = this.livingCounts.slice(0, n);
        const tempOrg = new Organism(this.hexGrid);

        ctx.save();
        topOrgs.forEach(([orgID, count], index) => {
            const pipes = tempOrg.pipesFromID(orgID);

            const flow = false;
            const center = { x: x + (index % 12) * 50, y: y + Math.floor(index / 12) * 62 };
            const size = 20;

            tempOrg.drawPipesAtPoint(ctx, center, size, pipes, flow);
            this.drawHexOutline(ctx, center, size, "#333333");
            ctx.font = "14px Arial";
            ctx.fillStyle = "#e0def4";
            ctx.textAlign = "center";
            ctx.fillText(`${count}`, center.x, center.y + size + 16);
        });
        ctx.restore();
    }

    updateHTML() {
        document.getElementById('orggraph').innerHTML = `Tick: ${this.hexGrid.tick} <br/>
         Total Organisms: ${this.totalOrganisms} Unique Kinds: ${this.organismCount.size}<br/>
         Living Organisms: ${this.livingIDs.length} Unique Kinds: ${this.uniqueLivingIDs.size}<br/>
         Max Count: ${this.maxCount} Max Offspring: ${this.maxOffspring}`;
    }
}
