class DataManager {
    constructor(hexGrid) {
        this.hexGrid = hexGrid;

        this.population = [];
        this.uniqueOrganisms = [];
        this.deathsStarvation = [];
        this.deathsRandom = [];
        this.energyLostFromDeath = [];
        this.base5Pops = [[],[],[],[],[]];
        this.base15Pops = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]];
        this.base15EnergyAverage = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]];
        this.base15EnergyTotal = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]];
        this.pipeFlowLoss = [];
        this.pipeChainLengthsAverage = [];
        this.pipeChainLengthsLongest = [];

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
        this.graphPopulation = new Graph(
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
            this.graphDeathCause = new Graph(
                /*      x */ x_pos,
                /*      y */ y_pos,
                /*  width */ half_width,
                /* height */ PARAMETERS.graphHeight,
                /*   data */ [this.deathsStarvation, this.deathsRandom],
                /*  label */ "Cause of Death (starvation green, random red)",
                /*    min */ 0, /* no minimum */
                /*    max */ 0, /* no maximum */
            );

            this.graphEnergyLoss = new Graph(
                /*      x */ x_pos + half_offset,
                /*      y */ y_pos,
                /*  width */ half_width,
                /* height */ PARAMETERS.graphHeight,
                /*   data */ [this.energyLostFromDeath, this.pipeFlowLoss],
                /*  label */ "Energy loss (death green, flow tax red)",
                /*    min */ 0, /* no minimum */
                /*    max */ 0, /* no maximum */
            );
            y_pos += PARAMETERS.graphHeight + PARAMETERS.graphVertPadding;
        }

        {
            this.graphPipeChains = new Graph(
                /*      x */ x_pos,
                /*      y */ y_pos,
                /*  width */ half_width,
                /* height */ PARAMETERS.graphHeight,
                /*   data */ [this.pipeChainLengthsAverage, this.pipeChainLengthsLongest],
                /*  label */ "Chain Lenghts (average green, longest red)",
                /*    min */ 0, /* no minimum */
                /*    max */ 0, /* no maximum */
                /* resize */ true,
                /* colors */ base5Colors,
            );
            y_pos += PARAMETERS.graphHeight + PARAMETERS.graphVertPadding;
        }

        {
            this.histogramTotalSpecies = new Histogram(
               /*       x */ x_pos,
               /*       y */ y_pos,
               /*    data */ [],
               /* options */ {
                   label: "Total Organism Species",
                   width: half_width,
                   height: PARAMETERS.graphHeight,
               },
            );

            this.histogramsLivingSpecies = [];
            for (let i = 0; i < total_living_counts; i ++) {
                this.histogramsLivingSpecies[i] = new Histogram(
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

        this.graphBase5Species = new Graph(
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

        this.graphBase15Species = new Graph(
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
            this.graphBase15EnergyAverage = new Graph(
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
            this.graphBase15EnergyTotal = new Graph(
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
            y_pos += PARAMETERS.graphHeight * 1.5 + PARAMETERS.graphVertPadding;
        }

        y_pos += PARAMETERS.graphVertPadding;
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
        this.pipeFlowLoss.push(this.hexGrid.pipeFlowLoss);
        this.hexGrid.pipeFlowLoss = 0;

        {
            this.deathsStarvation.push(this.hexGrid.starvationDeaths.length);
            this.deathsRandom.push(this.hexGrid.randomDeaths.length);

            {
                let totalLoss = 0;
                for (const org of this.hexGrid.starvationDeaths) totalLoss += org.energy;
                for (const org of this.hexGrid.randomDeaths) totalLoss += org.energy;
                this.energyLostFromDeath.push(totalLoss);
            }

            this.hexGrid.starvationDeaths = [];
            this.hexGrid.randomDeaths = [];
        }

        {
            const chains = this.hexGrid.chains;
            this.hexGrid.chains = [];

            let sum = 0;
            let max = 0;

            for (const chain of chains) {
                sum += chain.chain.length;
                max = Math.max(max, chain.chain.length);
            }


            const average = sum / chains.length;
            this.pipeChainLengthsAverage.push(average ? average : 0);
            this.pipeChainLengthsLongest.push(max);
        }

        {
            const histogram = this.histogramTotalSpecies;
            let counts = Array.from(organismGraph.organismCount.values());
            counts.sort((a, b) => b - a);
            counts = counts.slice(0, 20);

            histogram.data.push(counts);
        }

        for (let i = 0; i < total_living_counts; i++) {
            const histogram = this.histogramsLivingSpecies[i];
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
        this.graphPopulation.draw(ctx);
        this.graphDeathCause.draw(ctx);
        this.graphEnergyLoss.draw(ctx);
        this.graphPipeChains.draw(ctx);
        this.histogramTotalSpecies.draw(ctx);
        const livingCountIndex = this.hexGrid.organismGraph.getLivingCountIndex();
        this.histogramsLivingSpecies[livingCountIndex].draw(ctx);
        this.graphBase5Species.draw(ctx);
        this.graphBase15Species.draw(ctx);
        this.graphBase15EnergyAverage.draw(ctx);
        this.graphBase15EnergyTotal.draw(ctx);

        this.hexGrid.organismGraph.drawTopOrganisms(ctx, this.organismGraphXPos, this.organismGraphYPos, 24);
    }
}
