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

function reset() {
    loadParameters();
    arng = new alea(PARAMETERS.randomSeed);
    gameEngine.entities = [];
    gameEngine.graphs = [];

    const grid = new HexGrid();
    gameEngine.addEntity(grid); // Using HexGrid instead of Tumbler
    gameEngine.addEntity(new Lineage(grid));
}

ASSET_MANAGER.downloadAll(function () {
	console.log("starting up da sheild");
	var canvas = document.getElementById('gameWorld');
	var ctx = canvas.getContext('2d');

	gameEngine.init(ctx);

	reset();

	gameEngine.start();
});
