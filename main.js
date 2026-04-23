var gameEngine = new GameEngine();

var ASSET_MANAGER = new AssetManager();

var socket = null;
if (window.io !== undefined) {
  console.log("Database connected!");

  socket = io.connect(PARAMETERS.ip);

  socket.on("connect", function () {
    databaseConnected();
  });

  socket.on("disconnect", function () {
    databaseDisconnected();
  });


  socket.addEventListener("log", console.log);
}

var arng = new alea();
const runs = [
  {
    name: "Default",
  },
  // {
  //   name: "Enforce Max Energy",
  //   enforceMaxEnergy: true,
  // },
  // {
  //   name: "Tax Pipe Flow",
  //   taxPipeFlow: true,
  // }
];

// Start at a random index so it is evenly tested
var run_index = Math.floor(Math.random() * runs.length) % runs.length;

// TODO(Elijah): Fix this to support manual runs
function reset() {
    if (gameEngine.hexGrid) gameEngine.hexGrid.dataManager.logData();

    PARAMETERS = structuredClone(DEFAULT_PARAMETERS);
    Object.assign(PARAMETERS, runs[run_index]);
    PARAMETERS.randomSeed = Math.floor(Math.random() * 0xFFFF_FFFF);

    const ctx = window.canvas.getContext("2d");
    run_index = (run_index + 1) % runs.length;
    // structure run id based on parameters

    arng = new alea(PARAMETERS.randomSeed);
    gameEngine = new GameEngine();
    gameEngine.init(ctx);

    const grid = new HexGrid();
    window.hexGrid = grid;

    gameEngine.hexGrid = grid;
    gameEngine.addEntity(new Lineage(grid));

    gameEngine.start();
}

ASSET_MANAGER.downloadAll(function () {
  console.log("starting up da sheild");
  window.canvas = document.getElementById("gameWorld");
  const ctx = canvas.getContext("2d");

  reset(ctx);
});
