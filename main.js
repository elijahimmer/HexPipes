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
var run_index = 0;
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

// TODO(Elijah): Fix this to support manual runs
function reset() {
    PARAMETERS = structuredClone(DEFAULT_PARAMETERS);
    Object.assign(PARAMETERS, runs[run_index]);
    PARAMETERS.seed = Math.floor(Math.random() * 0xFFFF_FFFF);
    run_index = (run_index + 1) % runs.length;
    run_id = Math.floor(Math.random() * 0xFFFF_FFFF_FFFF_FFFF);

    arng = new alea(PARAMETERS.randomSeed);
    const ctx = gameEngine.ctx;
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

  gameEngine.init(ctx);

  reset();

  gameEngine.start();
});
