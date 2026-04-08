window.requestAnimFrame = (function () {
    return window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.oRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            function (/* function */ callback, /* DOMElement */ element) {
                window.setTimeout(callback, 0);
            };
})();

var canvas;

PARAMETERS.graphWidth = 1200;
PARAMETERS.canvasWidth = PARAMETERS.graphWidth + PARAMETERS.graphHoriPadding * 4;
window.data_manager = new DataManager(null);

console.log("Database connected!");

function collectionName() {
    const entry = document.getElementById("collection-name")
    return entry.value || PARAMETERS.collection
}

window.page = 0;
var socket = io.connect(PARAMETERS.ip);

socket.on("connect", function () {
  databaseConnected();
});

socket.on("disconnect", function () {
  databaseDisconnected();
});

socket.addEventListener("log", console.log);

document.addEventListener("DOMContentLoaded", function (event) {
    window.canvas = document.getElementById("dashboard");
    const ctx = canvas.getContext("2d");

    (function drawLoop() {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        window.data_manager.draw(ctx);
        requestAnimFrame(drawLoop, canvas);
    })();

    console.log(`DOM loaded, connecting to database ${PARAMETERS.collection}@${collectionName()}`);
    const entry = document.getElementById("collection-name").value = collectionName();

    socket.emit("distinct",
        {
            db: PARAMETERS.db,
            collection: collectionName(),
            key: "name"
        });

    document.getElementById("query").addEventListener("click", function (e) {
        query = document.getElementById("run_selection").value;
        document.getElementById("query_info").innerHTML = "Query Sent. Awaiting Reply.";

        filter = null;
        page = 0;

        console.log(`query: ${query} filter: ${filter}`);

        socket.emit("count",
            {
                db: PARAMETERS.db,
                collection: collectionName(),
                query: { "name": query },
            });

    }, false);

    document.getElementById("Next Query").addEventListener("click", function (e) {
        let selector = document.getElementById("run_selection");
        selector.selectedIndex = (selector.selectedIndex + 1) % selector.options.length;
        query = selector.value;
        document.getElementById("query_info").innerHTML = "Query Sent. Awaiting Reply.";
        filter = null;

        socket.emit("count",
            {
                db: PARAMETERS.db,
                collection: collectionName(),
                query: { "name": query },
            });
    }, false);

    document.getElementById("download").addEventListener("click", function (e) {
        console.log("Download clicked.");
        // console.log(obj);
        // if (obj.run) {

        // }
    }, false);
});

socket.on("count", function (length) {
    numRecords = length;
    document.getElementById("query_info").innerHTML = `Received ${page + 1} of ${numRecords} records.`;
    data = [];
    // for (var i = 0; i < length/page_limit; i++) {
    socket.emit("find",
        {
            db: PARAMETERS.db,
            collection: collectionName(),
            query: { "name": query },
            filter: filter,
            limit: 1,
            page: page
        });
    // }
});

socket.on("find", function (array) {
    if (array.length > 0) {
        const run = array[0];
        console.log(`Find: run #${page + 1}`, run)

        document.getElementById("query_info").innerHTML =
            `Received run #${page + 1}/${numRecords}.`;


        if(data.length < numRecords) socket.emit("find",
            {
                db: PARAMETERS.db,
                collection: collectionName(),
                query: { parameters: {name: query} },
                filter: filter,
                limit: 1,
                page: page++
            });

        window.data_manager.loadData(run);
    } else console.log("Empty data.");
});

socket.on("distinct", function (array) {
    document.getElementById("query_info").innerHTML = "Ready to Query";
    console.log(`query_info: ${array}`);

    if (array.length > 0) populateDropDown(array)
    else console.log("Empty data.");
});

function populateDropDown(labels) {
    console.log(`${labels.length} labels found`);

    const runSelect = document.getElementById("run_selection");

    // Populate the dropdown with names
    labels.forEach((label) => {
        const option = document.createElement("option");
        option.value = label;
        option.textContent = label;
        runSelect.appendChild(option);
    });
}

