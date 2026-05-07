window.canvas = null
window.data = []
window.data_idx = 0
window.data_start = 0
window.total_bytes_in_dataset = 0

const number_of_entries_until_end_to_call_for_more = 10
const last_tick = PARAMETERS.maxTicks

const page_limit = 20
const max_runs_in_memory = page_limit * 3
window.page = 0
window.request_all_the_data_please_this_isnt_a_bad_idea = false

window.hex_grid = new HexGrid()
window.data_manager = new DataManager(null)

console.log("Database connected!")

function collectionName() {
    const entry = document.getElementById("collection-name")
    return entry.value || PARAMETERS.collection
}

var socket = io.connect(PARAMETERS.ip)

socket.on("connect",  databaseConnected)
socket.on("disconnect", databaseDisconnected)
socket.addEventListener("log", console.log)
socket.on("count", (length) => {
    document.getElementById("entry-count").innerText = `total entries: ${length}`
    document.getElementById("query-info").innerHTML = ""

    num_records = length
    data_idx = 0

    window.data = []
})

socket.on("find", async (array) => {
    updateRequestingInfo("Processesing")
    for (let obj of array) {
        window.total_bytes_in_dataset += obj.compressed.length
        console.log(`Data size ${obj.compressed.length / 1024 / 1024}MiB`)
        const data = JSON.parse(await decompress(Uint8Array.fromBase64(obj.compressed)))
        delete obj.compressed
        Object.assign(obj, data)

        processData(obj)
        updateStatsBlock()
    }

    window.data.push(...array)
    window.page += 1

    if (window.data.length > max_runs_in_memory) {
        const amount_dropped = data.length - max_runs_in_memory
        window.data_start += amount_dropped
        window.data_idx = Math.max(0, window.data_idx - amount_dropped)

        window.data = window.data.slice(data.length - max_runs_in_memory)
    }

    window.requesting_data = false

    if (array.length > 0) {
        updateDataIdx()

        window.data_manager.loadData(data[data_idx])
        newDataset()
    }

    document.getElementById("requesting-info").innerHTML = ``

    if (window.request_all_the_data_please_this_isnt_a_bad_idea)
        ensureMoreData()
})

socket.on("distinct", (array) => {
    const query_info = document.getElementById("query-info")
    console.log(`query-info: ${array} for ${PARAMETERS.db}@${collectionName()}`)

    if (array.length > 0) {
        populateDropDown(array)
        query_info.innerHTML = "Ready to Query"
    } else {
        query_info.innerHTML = "No runs found!"
    }

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

})

document.addEventListener("DOMContentLoaded", (event) => {
    window.canvas = document.getElementById("dashboard")

    console.log(`DOM loaded, connecting to database ${PARAMETERS.db}@${collectionName()}`)
    const entry = document.getElementById("collection-name").value = collectionName()

    socket.emit("distinct", {
        db: PARAMETERS.db,
        collection: collectionName(),
        key: "name"
    })

    document.getElementById("prev-run").addEventListener("click", (e) => {
        if (data_idx > 0) {
            data_idx -= 1
            updateDataIdx()
            newDataset()
        }

        ensureMoreData()
    }, false)

    document.getElementById("next-run").addEventListener("click", (e) => {
        if (data_idx < data.length - 1) {
            data_idx += 1
            updateDataIdx()
            newDataset()
        }

        ensureMoreData()
    }, false)

    document.getElementById("jump-page").addEventListener("click", (e) => {
        data_idx = data.length - 1
        updateDataIdx()
        newDataset()
        ensureMoreData()
    }, false)

    document.getElementById("request-all-the-data-please").addEventListener("click", (e) => {
        window.request_all_the_data_please_this_isnt_a_bad_idea = !window.request_all_the_data_please_this_isnt_a_bad_idea

        if (window.request_all_the_data_please_this_isnt_a_bad_idea) {
            ensureMoreData()
        }

        updateRequestingInfo()
    })

    document.getElementById("jump-to").addEventListener("click", (e) => {
        const new_idx = Math.min(Math.max(new Number(document.getElementById("Jump To Amount").value).valueOf() - 1, 0), num_records - 1)

        window.page = Math.floor(new_idx / page_limit)
        window.data_start = window.page * page_limit

        window.data_idx = new_idx - window.data_start
        window.data = []

        ensureMoreData()
    }, false)

    document.getElementById("collection-name-search").addEventListener("click", (e) => {
        console.log("Collection name updated!")
        socket.emit("distinct", {
            db: PARAMETERS.db,
            collection: collectionName(),
            key: "name"
        })
    }, false)
})

function draw() {
    const ctx = canvas.getContext("2d")
    ctx.fillStyle = "#181A1B"
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    window.data_manager.draw(ctx)
    window.hex_grid.draw(ctx)
}

function populateDropDown(labels) {
    console.log(`${labels.length} labels found`)

    const run_select = document.getElementById("run_selection")

    while (run_select.firstChild) {
        run_select.removeChild(run_select.firstChild)
    }

    // Populate the dropdown with names
    labels.forEach((label) => {
        const option = document.createElement("option")
        option.value = label
        option.textContent = label
        run_select.appendChild(option)
    })
}

window.which_stats_have_we_done = new Set()
window.global_stats = {
    tallied: 0,
    success_counts_base_5: Array(5).fill(0).map(() => [0,0,0,0,0]),
    summed_success_ratio_base_5: 0.0,
}

function processData(run_data) {
    if (window.which_stats_have_we_done.has(run_data._id)) return
    window.which_stats_have_we_done.add(run_data._id)
    window.global_stats.tallied += 1

    const number_of_last_entries_in_run_to_count = 1
    const success_ratios = [
        [.99, .95, .90, .75, 0], // all turns
        [.99, .95, .90, .75, 0], // 2 long
        [.99, .95, .90, .75, 0], // 1 long
        [.99, .95, .90, .75, 0], // 1 straight
        [.99, .95, .90, .75, 0], // all straight
    ]

    const radius = run_data.params.gridRadius - 1
    const cell_count = 3 * (radius * radius - radius) - 1

    { // base 5 successes
        // I wish this was Haskell or something....
        const species_counts = run_data.base5Pops.map(cur => {
            return cur.slice(-number_of_last_entries_in_run_to_count).reduce((sum, val) => sum + val, 0)
        })
        const total_orgs = species_counts.reduce((sum, val) => sum + val, 0)

        const {dominant_species, dominant_species_count} =
            species_counts.reduce(({dominant_species_count, dominant_species}, val, idx) => {
                if (val > dominant_species_count) return {dominant_species_count: val, dominant_species: idx}
                return {dominant_species_count, dominant_species}
            }, {dominant_species_count: -1, dominant_species: -1})

        const success_ratio = dominant_species_count / (cell_count * number_of_last_entries_in_run_to_count)
        window.global_stats.summed_success_ratio_base_5 += success_ratio

        success_ratios[dominant_species].forEach((rat, idx) => {
            if (success_ratio >= rat) {
                window.global_stats.success_counts_base_5[dominant_species][idx] += 1
            }
        })
    }
}

function updateStatsBlock() {
    let successes_base_5 = window.global_stats.success_counts_base_5.map((type_array) => {
        return `
            <li>
                <strong>success count:</strong> ${type_array}
            </li>
        `
    }).join('')

    const dataset_gigabytes = new Intl.NumberFormat("en-IN", {
        style: "unit",
        unit: "gigabyte",
        maximumSignificantDigits: 3,
    }).format(window.total_bytes_in_dataset /1000/1000/1000)

    const stats_elem = document.getElementById("stats")
    stats_elem.innerHTML = `
        <h2>Runs Tallied: ${window.global_stats.tallied}</h2><br />
        <strong>average success ratio base 5:</strong> ${window.global_stats.summed_success_ratio_base_5 / window.global_stats.tallied}<br />
        <ol>${successes_base_5}</ol> <br />


        <br /><br /><strong>Dataset Size:<strong/> ~${dataset_gigabytes}<br />
    `
}

function newDataset() {
    let local = data[data_idx]
    window.data_manager.loadData(local)

    const end_tick = local.last_tick

    {
        const timeframe = document.getElementById("timeframe")

        timeframe.min = timeframe.step = local.params.reportingPeriod ?? PARAMETERS.reportingPeriod
        timeframe.value = timeframe.max = local.last_tick
    }

    timeframeUpdated()

    console.log("dataset", local)
}

function ensureMoreData() {
    if (window.requesting_data) return
    if (!request_all_the_data_please_this_isnt_a_bad_idea
        && window.data_idx < data.length - number_of_entries_until_end_to_call_for_more) return
    if ((window.page - 1) * page_limit > num_records) {
        window.request_all_the_data_please_this_isnt_a_bad_idea = false
        return
    }

    window.requesting_data = true

    updateRequestingInfo("Requesting")

    socket.emit("find", {
        db: PARAMETERS.db,
        collection: collectionName(),
        query: {
            name: query,
            last_tick: last_tick
         },
        filter: window.filter,
        limit: page_limit,
        page: window.page,
    })
}

function updateDataIdx() {
    document.getElementById("query-info").innerHTML = `entry: ${data_start + data_idx + 1} loaded: ${data_start + 1}-${data_start + data.length}`
}

window.window.requesting_info_tag = "THIS IS A BUG"
function updateRequestingInfo(str = window.requesting_info_tag) {
    window.requesting_info_tag = str
    const request_start = page_limit * window.page
    const request_end = Math.min(request_start + page_limit, num_records)
    let context = `${str} Data ${request_start + 1}-${request_end}`

    if (window.request_all_the_data_please_this_isnt_a_bad_idea)
        context = `ALL THE DATA!!!!<br/>${context}`

    document.getElementById("requesting-info").innerHTML = context
    console.log(context.replace("<br/>", "\n"))
}

function timeframeUpdated() {
    const timeframe = document.getElementById("timeframe")

    {
        const timeframe_value = document.getElementById("timeframe-value")
        timeframe_value.innerHTML = `tick: ${timeframe.value}`
    }

    const selected_tick = timeframe.value / timeframe.step - 1
    window.data_manager.setSelectedTick(selected_tick)

    let local = data[data_idx]
    window.hex_grid.resetCells()

    if (!local || !local.boardState) return

    for (let org_data of local.boardState[selected_tick] ?? []) {
        if (org_data.q == null || org_data.r == null || org_data.id == null) continue
        const org = new Organism(hex_grid, org_data.id)
        org.placeInGrid(org_data.q, org_data.r)

        hex_grid.organisms.push(org)
        hex_grid.organismGraph.addOrganism(org)
    }

    draw()
}

function timeframeFpsUpdated() {
    const fps = document.getElementById("timeframe-fps")

    {
        const fps_value = document.getElementById("timeframe-fps-value")
        fps_value.innerHTML = `fps: ${fps.value}`
    }

    window.clearInterval(timeframeAnimationLoop)
    window.setInterval(timeframeAnimationLoop, 1000/fps.value)
}

function timeframeAnimationLoop() {
    const fps = document.getElementById("timeframe-fps")

    if (!document.getElementById("timeframe-play").checked ||
        !data[data_idx]?.boardState) return

    const timeframe = document.getElementById("timeframe")

    let new_value = Number(timeframe.value) + Number(timeframe.step)
    new_value = Math.min(Math.max(timeframe.min, new_value), timeframe.max)

    timeframe.value = new_value

    timeframeUpdated()

    const dashboard = document.getElementById("dashboard")

    if (window.recording?.active) {
        recording.stream.getVideoTracks()[0].requestFrame()

        if (new_value >= timeframe.max) {
            recording.active = false
        }
    }
}

window.setInterval(timeframeAnimationLoop, 1000 / 60)

async function recordData() {
    document.getElementById("timeframe-play").checked = true
    const fps = document.getElementById("timeframe-fps")
    const timeframe = document.getElementById("timeframe")
    fps.readOnly = true
    timeframe.readOnly = true
    timeframe.value = timeframe.min

    const dashboard = document.getElementById("dashboard")
    const stream = dashboard.captureStream(0)
    const recorder = new MediaRecorder(stream, {
        mimeType: "video/mp4"
    })

    window.recording = {
        active: true,
        stopped: false,
        stream: stream,
        recorder: recorder
    }

    recorder.start()

    let chunks = []

    recorder.ondataavailable = (e) => {
        chunks.push(e.data)

        if (!recording.active && !recording.stopped) {
            recording.stopped = true
            recorder.stop()
        }
    }

    recorder.onstop = (e) => {
        const blob = new Blob(chunks, { type: "video/mp4" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        let local = data[data_idx]
        link.download = `animation-${local._id}`
        link.click()
        URL.revokeObjectURL(url) // Clean up

        fps.readOnly = false
        timeframe.readOnly = false
        document.getElementById("timeframe-play").checked = false
    }
}

// NOTES:
// Hierarchy of categorization -- finish base 5 categorization
//     Create buckets
// Other category for anything that isn't dominant
// Projecting to only get specific data
// Check co-dominance/tiling
// Non attachers -- or differ mutation rate `inputConnect`, `outputConnect`, `isLegalAdjacentPlacement`
// Start on paper?
// Look for different runs
// Skip ahead-- Identify runs
// Classify runs after they are run and store that
// Chase stories -- make tools as you think they will be helpful
