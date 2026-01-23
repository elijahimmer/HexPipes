class DataManager {
    constructor(hexGrid) {
        this.hexGrid = hexGrid;
        this.organismGraph = hexGrid.organismGraph;

        this.population = [];
        this.uniqueOrganisms = [];

        this.createGraphs();
    }

    initializeDataArrays() {

    }

    createGraphs() {
        let y_pos = PARAMETERS.graphPadding;
        const x_pos = PARAMETERS.canvasWidth - PARAMETERS.graphWidth - PARAMETERS.graphPadding;
        // Create action graph
        this.populationGraph = new Graph(
            /* x */ x_pos,
            /* y */ y_pos,
            /* data */ [this.population, this.uniqueOrganisms],
            /* label */ "Population",
            /* min */ 0, /* no minimum */
            /* max */ 0, /* no maximum */
        );
        gameEngine.addGraph(this.populationGraph);

        y_pos += PARAMETERS.graphHeight + PARAMETERS.graphPadding;
        this.totalSpeciesHistogram = new Histogram(
           /*       x */ x_pos,
           /*       y */ y_pos,
           /*    data */ [],
           /* options */ {
               label: "Total Organism Species",
               width: PARAMETERS.graphWidth,
               height: PARAMETERS.graphHeight,
           },
        );
        gameEngine.addGraph(this.totalSpeciesHistogram);

        y_pos += PARAMETERS.graphHeight + PARAMETERS.graphPadding;
        this.livingSpeciesHistogram = new Histogram(
           /*       x */ x_pos,
           /*       y */ y_pos,
           /*    data */ [],
           /* options */ {
               label: "Living Organism Species",
               width: PARAMETERS.graphWidth,
               height: PARAMETERS.graphHeight,
           },
        );
        gameEngine.addGraph(this.livingSpeciesHistogram);

        y_pos += PARAMETERS.graphHeight + PARAMETERS.graphPadding * 2;
        this.organismGraphYPos = y_pos;
        this.organismGraphXPos = PARAMETERS.canvasWidth - 600;
    }

    updateData() {
        // Update population data
        this.population.push(this.hexGrid.organisms.length);
        this.uniqueOrganisms.push(this.organismGraph.uniqueLivingIDs.size);
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
        // Update data every tick (not just on reporting periods)
        if(this.hexGrid.tick % PARAMETERS.reportingPeriod === 0) {
            this.updateData();
        }

        {
            var counts = this.organismGraph.organismCount.entries().reduce(function (acc, entry) {
                acc.push(entry[1]);
                return acc;
            }, new Array());
            counts.sort((a, b) => b - a);
            counts = counts.slice(0, 20);

            if (counts.length > 0) {
                this.totalSpeciesHistogram.data.push(counts);
            }
        }

        {
            var counts = this.organismGraph.livingCounts.entries().reduce(function (acc, entry) {
                acc.push(entry[1][1]);
                return acc;
            }, new Array());
            counts.sort((a, b) => b - a);
            counts = counts.slice(0, 20);

            if (counts.length > 0) {
                this.livingSpeciesHistogram.data.push(counts);
            }
        }
    }

    draw(ctx) {
        this.organismGraph.drawTopOrganisms(ctx, this.organismGraphXPos, this.organismGraphYPos, 60);
    }
}
