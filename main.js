"use strict";

window.gameEngine = new GameEngine();

const ASSET_MANAGER = new AssetManager();

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

  socket.addEventListener("error", console.error)
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

function reset() {
    if (window.gameEngine.hexGrid) gameEngine.hexGrid.dataManager.logData();
    if (window.gameEngine) {
      window.gameEngine.stop();
    }

    PARAMETERS = structuredClone(DEFAULT_PARAMETERS);
    Object.assign(PARAMETERS, runs[run_index]);
    PARAMETERS.randomSeed = Math.floor(Math.random() * 0xFFFF_FFFF);

    const ctx = window.canvas.getContext("2d");

    run_index = (run_index + 1) % runs.length;
    // structure run id based on parameters

    window.arng = new alea(PARAMETERS.randomSeed);
    window.gameEngine = new GameEngine();
    window.gameEngine.init(ctx);

    window.hexGrid = new HexGrid();
    window.gameEngine.hexGrid = hexGrid;

    window.dataManager = new DataManager(hexGrid);
    window.gameEngine.addEntity(dataManager);

    window.lineage = new Lineage(hexGrid);
    window.gameEngine.addEntity(lineage);

    window.gameEngine.start();
}

ASSET_MANAGER.downloadAll(function () {
  console.log("starting up da sheild");
  window.canvas = document.getElementById("gameWorld");
  window.canvas.addEventListener('click', (e) => window.gameEngine.input(e));

  reset();
});
