window.requestAnimFrame = (function () {
    return window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.oRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            function (/* function */ callback, /* DOMElement */ element) {
                window.setTimeout(callback, 0)
            }
})()

window.canvas = null
window.data = []
window.data_idx = 0

const page_limit = 100
const last_tick = PARAMETERS.lastTick
window.page = 0

window.hex_grid = new HexGrid();
window.data_manager = new DataManager(null)

console.log("Database connected!")

function collectionName() {
    const entry = document.getElementById("collection-name")
    return entry.value || PARAMETERS.collection
}

var socket = io.connect(PARAMETERS.ip)

socket.on("connect", function () {
  databaseConnected()
})

socket.on("disconnect", function () {
  databaseDisconnected()
})

socket.addEventListener("log", console.log)

document.addEventListener("DOMContentLoaded", function (event) {
    window.canvas = document.getElementById("dashboard")
    const ctx = canvas.getContext("2d");

    (function drawLoop() {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
        window.data_manager.draw(ctx)
        window.hex_grid.draw(ctx)
        requestAnimFrame(drawLoop, canvas)
    })()

    console.log(`DOM loaded, connecting to database ${PARAMETERS.db}@${collectionName()}`)
    const entry = document.getElementById("collection-name").value = collectionName()

    socket.emit("distinct", {
        db: PARAMETERS.db,
        collection: collectionName(),
        key: "name"
    })

    document.getElementById("query").addEventListener("click", function (e) {
        query = document.getElementById("run_selection").value
        document.getElementById("query-info").innerHTML = "Query Sent. Awaiting Reply."

        filter = null
        page = 0

        console.log(`query: ${query} filter: ${filter} for ${PARAMETERS.db}@${collectionName()}`)

        socket.emit("count", {
            db: PARAMETERS.db,
            collection: collectionName(),
            query: {
                name: query,
                last_tick: last_tick
            },
        })

    }, false)

    document.getElementById("Prev Query").addEventListener("click", function (e) {
        if (data_idx > 0) {
            data_idx -= 1
            document.getElementById("query-info").innerHTML = `${data_idx + 1}/${data.length}`
            newDataset();
        }

    }, false)

    document.getElementById("Next Query").addEventListener("click", function (e) {
        if (data_idx < data.length - 1) {
            data_idx += 1
            document.getElementById("query-info").innerHTML = `${data_idx + 1}/${data.length}`
            newDataset();
        }
    }, false)

    document.getElementById("download").addEventListener("click", function (e) {
        console.log("Download clicked.")
    }, false)

    document.getElementById("collection-name-search").addEventListener("click", function (e) {
        console.log("Collection name updated!")
        socket.emit("distinct", {
            db: PARAMETERS.db,
            collection: collectionName(),
            key: "name"
        })
    }, false)

})

socket.on("count", function (length) {
    document.getElementById("entry-count").innerText = `total entries: ${length}`
    num_records = length
    data_idx = 0;

    window.data = []
    socket.emit("find", {
        db: PARAMETERS.db,
        collection: collectionName(),
        query: {
            name: query,
            // last_tick: last_tick
         },
        filter: filter,
        page_limit: page_limit,
    })
})

socket.on("find", async function (array) {
    for (let obj of array) {
        const data = JSON.parse(await decompress(Uint8Array.fromBase64(obj.compressed)));
        delete obj.compressed;
        Object.assign(obj, data);
    }

    window.data.push(...array)
    window.page += 1

    if (array.length > 0) {
        if (data.length < num_records) {
            socket.emit("find", {
                db: PARAMETERS.db,
                collection: collectionName(),
                query: {
                    name: query,
                    last_tick: last_tick
                 },
                filter: window.filter,
                limit: window.page_limit,
                page: window.page,
            })
        }

        document.getElementById("query-info").innerHTML = `${data_idx + 1}/${data.length}`

        window.data_manager.loadData(data[data_idx])
        getStats()

    }
})

socket.on("distinct", function (array) {
    const query_info = document.getElementById("query-info");
    console.log(`query-info: ${array} for ${PARAMETERS.db}@${collectionName()}`)

    if (array.length > 0) {
        populateDropDown(array)
        query_info.innerHTML = "Ready to Query"
    } else {
        query_info.innerHTML = "No runs found!"
    }
})

function populateDropDown(labels) {
    console.log(`${labels.length} labels found`)

    const run_select = document.getElementById("run_selection")

    while (run_select.firstChild) {
        run_select.removeChild(run_select.firstChild);
    }

    // Populate the dropdown with names
    labels.forEach((label) => {
        const option = document.createElement("option")
        option.value = label
        option.textContent = label
        run_select.appendChild(option)
    })
}

function getStats() {
    console.log("Stats!")

    const entry_count = 200
    const success_ratios = [.99, .95, .90, .75, 0]

    let success_counts_base_5 = [0, 0, 0, 0, 0]
    let success_ratio_base_5 = 0.0

    let success_counts_base_15 = [0, 0, 0, 0, 0]

    data.forEach((entry) => {
        const radius = entry.params.gridRadius - 1
        const cell_count = 3 * (radius * radius - radius) - 1

        { // base 5 successes
            const dominant_species_count = entry.base5Pops.reduce((acc, cur) => {
                const cur_count = cur.slice(-entry_count).reduce((sum, val) => sum + val, 0)

                if (cur_count > acc) return cur_count
                return acc
            }, 0)

            const success_ratio = dominant_species_count / (cell_count * entry_count)
            success_ratio_base_5 += success_ratio

            let counts = success_ratios.map((ratio) => success_ratio >= ratio)

            for (const [idx, element] of success_counts_base_5.entries()) {
                success_counts_base_5[idx] += counts[idx]
            }
        }
    })

    const stats = document.getElementById("stats")
    stats.innerHTML = `
        <strong>successes base 5:</strong> ${success_counts_base_5}<br />
        <strong>average success ratio base 5:</strong> ${success_ratio_base_5 / data.length}<br />
    `
}

function newDataset() {
    let local = data[data_idx];
    window.data_manager.loadData(local)
    window.hex_grid = new HexGrid();

    const end_tick = local.last_tick;

    if (local.boardState) {
        for (let org_data of local.boardState[local.boardState.length - 1] ?? []) {
            if (org_data.q == null || org_data.r == null || org_data.id == null) continue
            const org = new Organism(hex_grid, org_data.id)
            org.placeInGrid(org_data.q, org_data.r);

            hex_grid.organisms.push(org);
            hex_grid.organismGraph.addOrganism(org);
        }
    }

    console.log("dataset", local)
}

// NOTES:
// Replace board
// Hierarchy of categorization -- finish base 5 categorization
//     Create buckets
// Other category for anything that isn't dominant
// Move state every tick
//
// pause/play for viewer
//
