"use strict";
let s = {} // global state
s.canvas = null
s.record_count = 0

s.number_of_entries_until_end_to_call_for_more = 10
s.expected_last_tick_of_run = PARAMETERS.maxTicks

s.page_limit = 20
s.max_runs_in_memory = s.page_limit * 3

s.page = 0
s.request_all_the_data_please_this_isnt_a_bad_idea = false

s.hex_grid = new HexGrid()
s.data_manager = new DataManager(null)

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

    s.record_count = length
    resetData()
})

socket.on("find", async (array) => {
    updateRequestingInfo("Processesing")
    for (let obj of array) {
        const obj_length = JSON.stringify(obj).length
        s.total_bytes_in_dataset += obj_length
        console.log(`Data size ${obj_length /1024/1024}MiB`)
        const data = JSON.parse(await decompress(Uint8Array.fromBase64(obj.compressed)))
        delete obj.compressed
        Object.assign(obj, data)

        processData(obj)
        updateStatsBlock()
    }

    s.data.array.push(...array)
    s.page += 1

    if (s.data.array.length > s.max_runs_in_memory) {
        const amount_dropped = s.data.array.length - s.max_runs_in_memory
        s.data.start += amount_dropped
        s.data.index = Math.max(0, s.data.index - amount_dropped)

        s.data.array = s.data.array.slice(s.data.array.length - s.max_runs_in_memory)
    }

    s.requesting_data = false

    if (array.length > 0) {
        updateDataIdx()

        s.data_manager.loadData(s.data.array[s.data.index])
        newDataset()
    }

    document.getElementById("requesting-info").innerHTML = ``

    if (s.request_all_the_data_please_this_isnt_a_bad_idea)
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

    changeRunName()
})

document.addEventListener("DOMContentLoaded", (event) => {
    s.canvas = document.getElementById("dashboard")

    console.log(`DOM loaded, connecting to database ${PARAMETERS.db}@${collectionName()}`)
    const entry = document.getElementById("collection-name").value = collectionName()

    socket.emit("distinct", {
        db: PARAMETERS.db,
        collection: collectionName(),
        key: "name"
    })

    document.getElementById("run-selection").addEventListener("input", (e) => {
        const run_selection = document.getElementById("run-selection")
        if (s.run_name != run_selection.value) {
            console.log("Changed run name from", s.run_name, "to", run_selection.value)
            changeRunName()
        }
    }, false)

    document.getElementById("prev-run").addEventListener("click", (e) => {
        if (s.data.index > 0) {
            s.data.index -= 1
            updateDataIdx()
            newDataset()
        }

        ensureMoreData()
    }, false)

    document.getElementById("next-run").addEventListener("click", (e) => {
        if (s.data.index < s.data.array.length - 1) {
            s.data.index += 1
            updateDataIdx()
            newDataset()
        }

        ensureMoreData()
    }, false)

    document.getElementById("jump-page").addEventListener("click", (e) => {
        s.data.index = s.data.array.length - 1
        updateDataIdx()
        newDataset()
        ensureMoreData()
    }, false)

    document.getElementById("jump-to").addEventListener("click", (e) => {
        const new_idx = Math.min(Math.max(new Number(document.getElementById("jump-to-amount").value).valueOf() - 1, 0), s.record_count - 1)

        s.page = Math.floor(new_idx / s.page_limit)
        s.data.start = s.page * s.page_limit

        s.data.index = new_idx - s.data.start
        s.data.array = []

        ensureMoreData()
    }, false)

    document.getElementById("request-all-the-data-please").addEventListener("click", (e) => {
        s.request_all_the_data_please_this_isnt_a_bad_idea = !s.request_all_the_data_please_this_isnt_a_bad_idea

        if (s.request_all_the_data_please_this_isnt_a_bad_idea) {
            ensureMoreData()
        }

        updateRequestingInfo()
    })

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
    const ctx = s.canvas.getContext("2d")
    ctx.fillStyle = "#181A1B"
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    s.data_manager.draw(ctx)
    s.hex_grid.draw(ctx)
}

function populateDropDown(labels) {
    console.log(`${labels.length} labels found`)

    const run_select = document.getElementById("run-selection")

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

function resetStats() {
    s.which_stats_have_we_done = new Set()
    s.total_bytes_in_dataset = 0
    s.global_stats = {
        tallied: 0,
        success_counts_base_5: Array(5).fill(0).map(() => [0,0,0,0,0]),
        success_counts_base_15: Array(15).fill(0).map(() => [0,0,0,0,0]),

        summed_success_ratio_base_5: 0.0,
        summed_success_ratio_base_15: 0.0,
    }
}
resetStats()


function processData(run_data) {
    if (s.which_stats_have_we_done.has(run_data._id)) return
    s.which_stats_have_we_done.add(run_data._id)
    s.global_stats.tallied += 1

    const number_of_last_entries_in_run_to_count = 1
    const success_ratios_base_5 = [
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
        s.global_stats.summed_success_ratio_base_5 += success_ratio

        success_ratios_base_5[dominant_species].forEach((rat, idx) => {
            if (success_ratio >= rat) {
                s.global_stats.success_counts_base_5[dominant_species][idx] += 1
            }
        })
    }

    const success_ratios_base_15 = [
        // all turns
        [.99, .95, .90, .75, 0],
        [.99, .95, .90, .75, 0],

        // 2 long
        [.99, .95, .90, .75, 0],
        [.99, .95, .90, .75, 0],
        [.99, .95, .90, .75, 0],

        [.99, .95, .90, .75, 0],
        [.99, .95, .90, .75, 0],
        [.99, .95, .90, .75, 0],

        // 1 long
        [.99, .95, .90, .75, 0],
        [.99, .95, .90, .75, 0],
        [.99, .95, .90, .75, 0],

        // 1 straight
        [.99, .95, .90, .75, 0],
        [.99, .95, .90, .75, 0],
        [.99, .95, .90, .75, 0],

        // all straight
        [.99, .95, .90, .75, 0],
    ]

    { // base 15 successes
        // I wish this was Haskell or something....
        const species_counts = run_data.base15Pops.map(cur => {
            return cur.slice(-number_of_last_entries_in_run_to_count).reduce((sum, val) => sum + val, 0)
        })
        const total_orgs = species_counts.reduce((sum, val) => sum + val, 0)

        const {dominant_species, dominant_species_count} =
            species_counts.reduce(({dominant_species_count, dominant_species}, val, idx) => {
                if (val > dominant_species_count) return {dominant_species_count: val, dominant_species: idx}
                return {dominant_species_count, dominant_species}
            }, {dominant_species_count: -1, dominant_species: -1})

        const success_ratio = dominant_species_count / (cell_count * number_of_last_entries_in_run_to_count)
        s.global_stats.summed_success_ratio_base_15 += success_ratio

        success_ratios_base_15[dominant_species].forEach((rat, idx) => {
            if (success_ratio >= rat) {
                s.global_stats.success_counts_base_15[dominant_species][idx] += 1
            }
        })
    }
}

function updateStatsBlock() {
    let successes_base_5 = s.global_stats.success_counts_base_5.map((type_array) => {
        return `
            <li>
                <strong>success count:</strong> ${type_array}
            </li>
        `
    }).join('')

    let successes_base_15 = s.global_stats.success_counts_base_15.map((type_array) => {
        return `
            <li>
                <strong>success count:</strong> ${type_array}
            </li>
        `
    }).join('')

    const dataset_gigabytes = new Intl.NumberFormat(navigator.languages, {
        style: "unit",
        unit: "gigabyte",
        maximumSignificantDigits: 3,
    }).format(s.total_bytes_in_dataset /1000/1000/1000)

    const average_success_ratio_base_5 = new Intl.NumberFormat(navigator.languages, {
        maximumSignificantDigits: 3,
    }).format(s.global_stats.summed_success_ratio_base_5 / s.global_stats.tallied * 100);

    const average_success_ratio_base_15 = new Intl.NumberFormat(navigator.languages, {
        maximumSignificantDigits: 3,
    }).format(s.global_stats.summed_success_ratio_base_15 / s.global_stats.tallied * 100);

    const stats_elem = document.getElementById("stats")
    stats_elem.innerHTML = `
        <h2>Runs Tallied: ${s.global_stats.tallied}</h2><br />
        <strong>average success ratio base 5:</strong> ${average_success_ratio_base_5}%<br />
        <ol>${successes_base_5}</ol> <br />

        <strong>average success ratio base 15:</strong> ${average_success_ratio_base_15}%<br />
        <ol>${successes_base_15}</ol> <br />


        <br /><br /><strong>Dataset Size (compressed):<strong/> ~${dataset_gigabytes}<br />
    `
}

function newDataset() {
    let local = s.data.array[s.data.index]
    s.data_manager.loadData(local)

    const end_tick = local.last_tick

    {
        const timeframe = document.getElementById("timeframe")

        timeframe.min = timeframe.step = local.params.reportingPeriod ?? PARAMETERS.reportingPeriod
        timeframe.value = timeframe.max = local.last_tick

        if (document.getElementById("play-them-all-one-by-one")) {
            timeframe.value = timeframe.min
        }
    }

    timeframeUpdated()

    console.log("dataset", local)
}

function ensureMoreData() {
    // Don't send another request while one is live
    if (s.requesting_data) return

    // Close to next page, prefetch
    if (!s.request_all_the_data_please_this_isnt_a_bad_idea
        && s.data.index < s.data.array.length - s.number_of_entries_until_end_to_call_for_more) return

    // We are at the end
    if ((s.page - 1) * s.page_limit > s.record_count) {
        s.request_all_the_data_please_this_isnt_a_bad_idea = false
        return
    }

    s.requesting_data = true

    updateRequestingInfo("Requesting")

    socket.emit("find", {
        db: PARAMETERS.db,
        collection: collectionName(),
        query: {
            name: s.run_name,
            last_tick: s.expected_last_tick_of_run
         },
        filter: s.filter,
        limit: s.page_limit,
        page: s.page,
    })
}

function updateDataIdx() {
    document.getElementById("query-info").innerHTML = `entry: ${s.data.start + s.data.index + 1} loaded: ${s.data.start + 1}-${s.data.start + s.data.array.length}`
}

s.requesting_info_tag = "THIS IS A BUG"
function updateRequestingInfo(str = s.requesting_info_tag) {
    s.requesting_info_tag = str
    const request_start = s.page_limit * s.page
    const request_end = Math.min(request_start + s.page_limit, s.record_count)
    let context = `${str} Data ${request_start + 1}-${request_end}`

    if (s.request_all_the_data_please_this_isnt_a_bad_idea)
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
    s.data_manager.setSelectedTick(selected_tick)

    let local = s.data.array[s.data.index]
    s.hex_grid.resetCells()

    if (!local || !local.boardState) return

    for (let org_data of local.boardState[selected_tick] ?? []) {
        if (org_data.q == null || org_data.r == null || org_data.id == null) continue
        const org = new Organism(s.hex_grid, org_data.id)
        org.placeInGrid(org_data.q, org_data.r)

        s.hex_grid.organisms.push(org)
        s.hex_grid.organismGraph.addOrganism(org)
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
        !s.data.array[s.data.index]?.boardState) return

    const timeframe = document.getElementById("timeframe")

    let new_value = Number(timeframe.value) + Number(timeframe.step)
    new_value = Math.min(Math.max(timeframe.min, new_value), timeframe.max)

    timeframe.value = new_value

    timeframeUpdated()

    const dashboard = document.getElementById("dashboard")

    if (s.recording?.active) {
        recording.stream.getVideoTracks()[0].requestFrame()

        if (new_value >= timeframe.max) {
            recording.active = false
        }
    }

    if (document.getElementById("play-them-all-one-by-one").checked
        && new_value >= timeframe.max) {
        document.getElementById("next-run").click()
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

    s.recording = {
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
        let local = s.data.array[s.data.index]
        link.download = `animation-${local._id}`
        link.click()
        URL.revokeObjectURL(url) // Clean up

        fps.readOnly = false
        timeframe.readOnly = false
        document.getElementById("timeframe-play").checked = false
   }
}

function changeRunName(run_selection = document.getElementById("run-selection")) {
    s.run_name = run_selection.value
    document.getElementById("query-info").innerHTML = "Query Sent. Awaiting Reply."

    s.filter = null
    s.page = 0
    resetData()
    resetStats()

    console.log(`query: ${s.run_name} filter: ${s.filter} for ${PARAMETERS.db}@${collectionName()}`)

    socket.emit("count", {
        db: PARAMETERS.db,
        collection: collectionName(),
        query: {
            name: s.run_name,
            last_tick: s.expected_last_tick_of_run
        },
    })
}

function resetData() {
    s.data = {
        array: [],
        index: 0,
        start: 0,
    }
}
resetData()


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
//
// TODO:
//
// Filter bad runs -- connectivity in
// Fix Pipe view
// Add top orgs to dashboard
// Live organisms vs available space for additional success ratio maybe
// Classify each run
// Dominant last tick
//     only 1 base 5?
//     only 1 base 15?
//     et cet.
// Taxonomy of runs
// Make buckets, then look at to refine further
//
//
// Tissue formation, Directed Mutation
//
//
// POSTER:
//
// Videos -- Grab interesting runs
//
