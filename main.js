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

function reset() {
    loadParameters();
    run_id = Math.floor(Math.random() * 0xFFFF_FFFF_FFFF_FFFF);

    const data = {
        db: PARAMETERS.db,
        collection: PARAMETERS.collection,
        data: {
            run_id: run_id,
            seed: PARAMETERS.randomSeed,
            params: PARAMETERS
        }
    };

    if (socket) socket.emit("insert", data);

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
