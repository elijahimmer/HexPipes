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
var run_id;
const runs = [
  {
    name: "Default",
  },
  {
    name: "Enforce Max Energy",
    enforceMaxEnergy: true,
  },
  {
    name: "Tax Pipe Flow",
    taxPipeFlow: true,
  }
];

// Start at a random index so it is evenly tested
var run_index = Math.floor(Math.random() * runs.length) % runs.length;

// TODO(Elijah): Fix this to support manual runs
function reset(ctx) {
    PARAMETERS = structuredClone(DEFAULT_PARAMETERS);
    Object.assign(PARAMETERS, runs[run_index]);
    PARAMETERS.randomSeed = Math.floor(Math.random() * 0xFFFF_FFFF);

    run_index = (run_index + 1) % runs.length;
    run_id = Math.floor(Math.random() * 0xFFFF_FFFF_FFFF_FFFF);

    arng = new alea(PARAMETERS.randomSeed);
    gameEngine = new GameEngine();
    gameEngine.init(ctx);

    const grid = new HexGrid();
    gameEngine.hexGrid = grid;
    gameEngine.addEntity(new Lineage(grid));

    gameEngine.start();
}

ASSET_MANAGER.downloadAll(function () {
  console.log("starting up da sheild");
  var canvas = document.getElementById('gameWorld');
  const ctx = canvas.getContext('2d');

  reset(ctx);
});
