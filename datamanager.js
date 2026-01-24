class DataManager {
    constructor(hexGrid) {
        this.hexGrid = hexGrid;

        this.population = [];
        this.uniqueOrganisms = [];

        this.createGraphs();
    }

    initializeDataArrays() {

    }

    createGraphs() {
        let y_pos = PARAMETERS.graphVertPadding;
        const x_pos = PARAMETERS.canvasWidth - PARAMETERS.graphWidth - PARAMETERS.graphHoriPadding;
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

        y_pos += PARAMETERS.graphHeight + PARAMETERS.graphVertPadding;
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

        y_pos += PARAMETERS.graphHeight + PARAMETERS.graphVertPadding;
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

        y_pos += PARAMETERS.graphHeight + PARAMETERS.graphVertPadding * 2;
        this.organismGraphYPos = y_pos;
        const organismGraphWidth = 550;
        const graphWidth = PARAMETERS.graphWidth;
        const offset = Math.abs(Math.floor((graphWidth - organismGraphWidth) / 2));

        this.organismGraphXPos = PARAMETERS.canvasWidth - (graphWidth - offset) - PARAMETERS.graphHoriPadding;
    }

    updateData() {
        // Update population data
        this.population.push(this.hexGrid.organisms.length);
        this.uniqueOrganisms.push(this.hexGrid.organismGraph.uniqueLivingIDs.size);

        {
            var counts = Array.from(this.hexGrid.organismGraph.organismCount.values());
            counts.sort((a, b) => b - a);
            counts = counts.slice(0, 20);

            if (counts.length > 0) {
                this.totalSpeciesHistogram.data.push(counts);
            }
        }

        {
            var counts = this.hexGrid.organismGraph.livingCounts.values()
                .reduce(function (acc, count) {
                    acc.push(count);
                    return acc;
                }, new Array());
            counts.sort((a, b) => b - a);
            counts = counts.slice(0, 20);

            if (counts.length > 0) {
                this.livingSpeciesHistogram.data.push(counts);
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
        this.hexGrid.organismGraph.drawTopOrganisms(ctx, this.organismGraphXPos, this.organismGraphYPos, 60);
    }
}
