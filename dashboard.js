const page_limit = 50;

var socket = null;

console.log("Database connected!");

socket = io.connect(PARAMETERS.ip);

socket.on("connect", function () {
  databaseConnected();
});

socket.on("disconnect", function () {
  databaseDisconnected();
});


socket.addEventListener("log", console.log);


document.addEventListener("DOMContentLoaded", function (event) {
    context = document.getElementById("chart").getContext("2d");

    console.log(`DOM loaded, connecting to database ${PARAMETERS.collection}@${PARAMETERS.db}`);

    socket.emit("distinct",
        {
            db: PARAMETERS.db,
            collection: PARAMETERS.collection,
            key: "name"
        });

    document.getElementById("query").addEventListener("click", function (e) {
        query = document.getElementById("run_selection").value;
        document.getElementById("query_info").innerHTML = "Query Sent. Awaiting Reply.";

        filter = null;

        console.log(`query: ${query} filter: ${filter}`);

        socket.emit("count",
            {
                db: PARAMETERS.db,
                collection: PARAMETERS.collection,
                query: { "run": query },
            });

    }, false);

    document.getElementById("Next Query").addEventListener("click", function (e) {
        let selector = document.getElementById("run_selection");
        selector.selectedIndex = (selector.selectedIndex + 1) % selector.options.length;
        query = selector.value;
        document.getElementById("query_info").innerHTML = "Query Sent. Awaiting Reply.";
        filter = null;

        console.log(query);
        console.log(filter);

        socket.emit("count",
            {
                db: PARAMETERS.db,
                collection: PARAMETERS.collection,
                query: { "run": query },
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
    document.getElementById("query_info").innerHTML = `Received 0 of ${numRecords} records.`;
    page = 0;
    data = [];
    // for (var i = 0; i < length/page_limit; i++) {
    socket.emit("find",
        {
            db: PARAMETERS.db,
            collection: PARAMETERS.collection,
            query: { run: query },
            filter: filter,
            limit: 100,
            page: page
        });
    console.log(`Requesting page ${page} of size ${page_limit}.`);
    // }
});

socket.on("find", function (array) {
    if (array.length > 0) {
        console.log("Find: data received.")

        data.push(...array);
        document.getElementById("query_info").innerHTML = `Received ${data.length} of ${numRecords} records.`;

        parseData(data);

        if(data.length < numRecords) socket.emit("find",
            {
                db: PARAMETERS.db,
                collection: PARAMETERS.collection,
                query: { parameters: {name: query} },
                filter: filter,
                limit: page_limit,
                page: page++
            });
        console.log(`Requesting page ${page} of size ${page_limit}.`);

    }
    else console.log("Empty data.");
});

socket.on("distinct", function (array) {
    document.getElementById("query_info").innerHTML = "Ready to Query";
    console.log(`query_info: ${array}`);

    if (array.length > 0) populateDropDown(array)
    else console.log("Empty data.");
});

function populateDropDown(labels) {
    const runSelect = document.getElementById("run_selection");

    // Populate the dropdown with names
    labels.forEach((label) => {
        const option = document.createElement("option");
        option.value = label;
        option.textContent = label;
        runSelect.appendChild(option);
    });
}
