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
const last_tick = 200_000
window.page = 0

PARAMETERS.graphWidth = 1200
PARAMETERS.canvasWidth = PARAMETERS.graphWidth + PARAMETERS.graphHoriPadding * 4
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
            window.data_manager.loadData(data[data_idx])
            document.getElementById("query-info").innerHTML = `${data_idx}/${data.length}`
        }

    }, false)

    document.getElementById("Next Query").addEventListener("click", function (e) {
        if (data_idx < data.length) {
            data_idx += 1
            window.data_manager.loadData(data[data_idx])
            document.getElementById("query-info").innerHTML = `${data_idx}/${data.length}`
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
    numRecords = length

    window.data = []
    socket.emit("find", {
        db: PARAMETERS.db,
        collection: collectionName(),
        query: {
            name: query,
            last_tick: last_tick
         },
        filter: filter,
        page_limit: page_limit,
    })
})

socket.on("find", function (array) {
    window.data.push(...array)
    window.page += 1

    if (array.length > 0) {
        if (data.length < numRecords) {
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

        document.getElementById("query-info").innerHTML = `${data_idx}/${data.length}`

        window.data_manager.loadData(data[data_idx])
        getStats()

    }
})

socket.on("distinct", function (array) {
    document.getElementById("query-info").innerHTML = "Ready to Query"
    console.log(`query-info: ${array} for ${PARAMETERS.db}@${collectionName()}`)

    if (array.length > 0) {
        populateDropDown(array)
        document.getElementById("query-info").innerHTML = "Ready to Query"
    } else {
        document.getElementById("query-info").innerHTML = "No runs found!"
    }
})

function populateDropDown(labels) {
    console.log(`${labels.length} labels found`)

    const runSelect = document.getElementById("run_selection")

    runSelect.children.length = 0;
    // Populate the dropdown with names
    labels.forEach((label) => {
        const option = document.createElement("option")
        option.value = label
        option.textContent = label
        runSelect.appendChild(option)
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
        successes base 5: ${success_counts_base_5}<br />
        average success ratio base 5: ${success_ratio_base_5 / data.length}<br />
    `
}

// NOTES:
// Snapshot board on collection
// Replace board
// Double logging
// Hierarchy of categorization -- finish base 5 categorization
//     Create buckets
