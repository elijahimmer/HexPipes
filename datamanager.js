class DataManager {
    constructor(hexGrid) {
        this.hexGrid = hexGrid;

        this.population = [];
        this.uniqueOrganisms = [];
        this.starvationDeaths = [];
        this.randomDeaths = [];
        this.starvationDeaths = [];
        this.energyLostOnDeath = [];
        this.randomDeaths = [];
        this.base5Pops = [[],[],[],[],[]];
        this.base15Pops = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]];
        this.base15EnergyAverage = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]];
        this.base15EnergyTotal = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]];

        this.createGraphs();
    }

    initializeDataArrays() {

    }

    createGraphs() {
        let y_pos = PARAMETERS.graphVertPadding;
        const x_pos = PARAMETERS.canvasWidth - PARAMETERS.graphWidth - PARAMETERS.graphHoriPadding * 2;
        const half_width = (PARAMETERS.graphWidth - PARAMETERS.graphHoriPadding) / 2;
        const half_offset = (PARAMETERS.graphWidth + PARAMETERS.graphHoriPadding) / 2;

        // Create action graph
        this.populationGraph = new Graph(
            /* x */ x_pos,
            /* y */ y_pos,
            /* width */ PARAMETERS.graphWidth,
            /* height */ PARAMETERS.graphHeight,
            /* data */ [this.population, this.uniqueOrganisms],
            /* label */ "Population (population green, unique red)",
            /* min */ 0, /* no minimum */
            /* max */ 0, /* no maximum */
        );

        y_pos += PARAMETERS.graphHeight + PARAMETERS.graphVertPadding;
        {
            this.deathCauseGraph = new Graph(
                /* x */ x_pos,
                /* y */ y_pos,
                /* width */ half_width,
                /* height */ PARAMETERS.graphHeight,
                /* data */ [this.starvationDeaths, this.randomDeaths],
                /* label */ "Cause of Death (starvation green, random red)",
                /* min */ 0, /* no minimum */
                /* max */ 0, /* no maximum */
            );
        }

        y_pos += PARAMETERS.graphHeight + PARAMETERS.graphVertPadding;
        {
            this.totalSpeciesHistogram = new Histogram(
               /*       x */ x_pos,
               /*       y */ y_pos,
               /*    data */ [],
               /* options */ {
                   label: "Total Organism Species",
                   width: half_width,
                   height: PARAMETERS.graphHeight,
               },
            );

            this.livingSpeciesHistograms = [];
            for (let i = 0; i < total_living_counts; i ++) {
                this.livingSpeciesHistograms[i] = new Histogram(
                   /*       x */ x_pos + half_offset,
                   /*       y */ y_pos,
                   /*    data */ [],
                   /* options */ {
                       label: "Living Organism Species",
                       width: half_width,
                       height: PARAMETERS.graphHeight,
                   },
                );
            }
        }

        y_pos += PARAMETERS.graphHeight + PARAMETERS.graphVertPadding;
        this.base5SpeciesGraph = new Graph(
            /* x */ x_pos,
            /* y */ y_pos,
            /* width */ PARAMETERS.graphWidth,
            /* height */ PARAMETERS.graphHeight,
            /* data */ this.base5Pops,
            /* label */ "Base 5 Species Graph",
            /* min */ 0, /* no minimum */
            /* max */ 0, /* no maximum */
        );

        y_pos += PARAMETERS.graphHeight + PARAMETERS.graphVertPadding;
        this.base15SpeciesGraph = new Graph(
            /* x */ x_pos,
            /* y */ y_pos,
            /* width */ PARAMETERS.graphWidth,
            /* height */ PARAMETERS.graphHeight * 1.5,
            /* data */ this.base15Pops,
            /* label */ "Base 15 Species Graph",
            /* min */ 0, /* no minimum */
            /* max */ 0, /* no maximum */
            /* resize */ true,
            /* colors */ base15Colors,
        );

        y_pos += PARAMETERS.graphHeight * 1.5 + PARAMETERS.graphVertPadding;
        {
            this.base15EnergyGraphAverage = new Graph(
                /*      x */ x_pos,
                /*      y */ y_pos,
                /*  width */ half_width,
                /* height */ PARAMETERS.graphHeight * 1.5,
                /*   data */ this.base15EnergyAverage,
                /*  label */ "Base 15 Average Energy",
                /*    min */ 0, /* no minimum */
                /*    max */ 0, /* no maximum */
                /* resize */ true,
                /* colors */ base15Colors,
            );
            this.base15EnergyGraphTotal = new Graph(
                /*      x */ x_pos + half_offset,
                /*      y */ y_pos,
                /*  width */ half_width,
                /* height */ PARAMETERS.graphHeight * 1.5,
                /*   data */ this.base15EnergyTotal,
                /*  label */ "Base 15 Total Energy",
                /*    min */ 0,
                /*    max */ 100,
                /* resize */ true,
                /* colors */ base15Colors,
            );
        }

        y_pos += PARAMETERS.graphHeight * 1.5 + PARAMETERS.graphVertPadding * 2;
        this.organismGraphYPos = y_pos;
        const organismGraphWidth = 550;
        const graphWidth = PARAMETERS.graphWidth;
        const offset = Math.abs(Math.floor((graphWidth - organismGraphWidth) / 2));

        this.organismGraphXPos = PARAMETERS.canvasWidth - (graphWidth - offset) - PARAMETERS.graphHoriPadding * 2;
    }

    updateData() {
        const organismGraph = this.hexGrid.organismGraph;
        // Update population data
        this.population.push(this.hexGrid.organisms.length);
        this.uniqueOrganisms.push(organismGraph.uniqueLivingIDs.size);

        this.starvationDeaths.push(this.hexGrid.starvationDeaths.length);
        this.hexGrid.starvationDeaths = [];
        this.randomDeaths.push(this.hexGrid.randomDeaths.length);
        this.hexGrid.randomDeaths = [];

        {
            const histogram = this.totalSpeciesHistogram;
            let counts = Array.from(organismGraph.organismCount.values());
            counts.sort((a, b) => b - a);
            counts = counts.slice(0, 20);

            if (counts.length > 0) {
                histogram.data.push(counts);
            }
        }

        for (let i = 0; i < total_living_counts; i++) {
            const histogram = this.livingSpeciesHistograms[i];
            let counts = organismGraph.livingCountsMatrix[i].values()
                .reduce(function (acc, organism) {
                    acc.push(organism.count);
                    return acc;
                }, new Array());
            if (i != base_5_living_index && i != base_15_living_index) counts.sort((a, b) => b - a);
            counts = counts.slice(0, 20);

            if (counts.length > 0) {
                histogram.data.push(counts);
            }
        }

        {
            const base5 = organismGraph.livingCountsMatrix[base_5_living_index];
            for (const [index, organism] of base5.entries()) {
                this.base5Pops[index].push(organism.count);
            }
        }

        {
            const base15 = organismGraph.livingCountsMatrix[base_15_living_index];
            for (const [index, organism] of base15.entries()) {
                this.base15Pops[index].push(organism.count);

                this.base15EnergyTotal[index].push(organism.energy);

                // TODO(Elijah): Average energy is very volitile when low pops
                const averageEnergy = organism.count ? organism.energy/organism.count : 0;
                this.base15EnergyAverage[index].push(averageEnergy);
            }
        }
    }

    logData() {
        const data = {
            db: PARAMETERS.db,
            collection: PARAMETERS.collection,
            data: {

            }
        };

        if (socket) socket.emit("insert", data);
    }

    update() {
        if (document.getElementById('pause').checked) return;
        // Update data every tick (not just on reporting periods)
        if(this.hexGrid.tick % PARAMETERS.reportingPeriod === 0) {
            this.updateData();
        }
    }

    draw(ctx) {
        this.populationGraph.draw(ctx);
        this.deathCauseGraph.draw(ctx);
        this.hexGrid.organismGraph.drawTopOrganisms(ctx, this.organismGraphXPos, this.organismGraphYPos, 24);
        this.totalSpeciesHistogram.draw(ctx);
        const livingCountIndex = this.hexGrid.organismGraph.getLivingCountIndex();
        this.livingSpeciesHistograms[livingCountIndex].draw(ctx);
        this.base5SpeciesGraph.draw(ctx);
        this.base15SpeciesGraph.draw(ctx);
        this.base15EnergyGraphAverage.draw(ctx);
        this.base15EnergyGraphTotal.draw(ctx);
    }
}
