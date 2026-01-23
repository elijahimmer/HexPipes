const TEXT_COLOR_DARK_BACKGROUND = "#000000";
const TEXT_COLOR_LIGHT_BACKGROUND = "#e0def4";

// var TEXT_COLOR = TEXT_COLOR_LIGHT_BACKGROUND;

// Set initial text color.
if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    // dark mode
    TEXT_COLOR = TEXT_COLOR_DARK_BACKGROUND;
}
// update text color on color scheme change.
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
    TEXT_COLOR = event.matches ? TEXT_COLOR_DARK_BACKGROUND : TEXT_COLOR_LIGHT_BACKGROUND;
});

var PARAMETERS = {
    // Framework parameters
    updatesPerDraw: 1,
    reportingPeriod: 100,
    db: "HexPipes",
    collection: "test",
    ip: 'https://73.19.38.112:8888',

    // Canvas parameters
    canvasWidth: 1600,
    canvasHeight: 1000,
    gridOffsetX: 500,        // X offset to center grid
    gridOffsetY: 500,        // Y offset to center grid

    // Hex Grid parameters
    gridRadius: 25,          // Radius of hex grid (10 = 271 cells)
    cellSize: 12,            // Size of each hex cell in pixels
    addOrganismsOnTick: 200, // Tick that new organisms are added

    numOrganisms: 30,        // Initial number of organisms
    k_diffusion: 0.15,       // Diffusion rate (must be < 1/6 ≈ 0.167 for stability)

    // Pipe flow parameters
    k_pipe: 0.75,             // Pipe flow rate
    loss_rate: 0.05,          // Fraction of flow converted to energy (0.1-0.3)
    resourceDecay: 0,         // Fraction of cell resource lost per tick
    energyDecay: 0.01,        // Fraction of organism energy lost per tick

    // Evolution parameters
    energyMax: 100,               // The maximum amount of energy that can be stored at one time
    reproductionThreshold: 100,   // Energy needed to reproduce
    mutationRate: 0.05,           // chance per endpoint/configuration
    deathRate: 0.005,             // death chance per tick (lightning bolt)
    starvationRate: 0.5,          // death chance per tick if low energy
    starvationThreshold: 0.01,    // fraction of reproductionThreshold considered "low energy"

    arrowLength: 6,          // Length of flow direction arrows
    circleRadius: 3,         // Radius of flow direction circle

    graphWidth: 600,
    graphHeight: 120,
};

function loadParameters() {
    // Load parameters from UI if available
    PARAMETERS.numOrganisms = parseInt(document.getElementById("numOrganisms").value);
    PARAMETERS.mutationRate = parseFloat(document.getElementById("mutationRate").value);
    PARAMETERS.reproductionThreshold = parseFloat(document.getElementById("reproductionThreshold").value);
    PARAMETERS.deathRate = parseFloat(document.getElementById("deathRate").value);
    PARAMETERS.starvationRate = parseFloat(document.getElementById("starvationRate").value);
    PARAMETERS.starvationThreshold = parseFloat(document.getElementById("starvationThreshold").value);
    PARAMETERS.k_diffusion = parseFloat(document.getElementById("k_diffusion").value);
    PARAMETERS.k_pipe = parseFloat(document.getElementById("k_pipeFlow").value);
    PARAMETERS.loss_rate = parseFloat(document.getElementById("lossRate").value);
    PARAMETERS.gridRadius = parseInt(document.getElementById("gridRadius").value);
    PARAMETERS.cellSize = parseInt(document.getElementById("cellSize").value);

    // Could calculate dependent parameters here if needed


    console.log("Parameters loaded:", PARAMETERS);
}
