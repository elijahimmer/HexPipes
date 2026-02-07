//GameBoard code below
function randomInt(n) {
    return Math.floor(Math.random() * n);
};

function distance(p1, p2) {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
};

function generateNormalSample(mean = 0, stdDev = 1) {
    // box-muller transform
    let u1 = Math.random();
    let u2 = Math.random();

    let z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z0 * stdDev + mean;
};

function rgb(r, g, b) {
    return "rgb(" + r + "," + g + "," + b + ")";
};

function hsl(h, s, l) {
    return "hsl(" + h + "," + s + "%," + l + "%)";
};

function download(filename, text) {
    var pom = document.createElement('a');
    pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    pom.setAttribute('download', filename);
    pom.click();
};


function databaseConnected() {
    const dbDiv = document.getElementById("db");
    dbDiv.classList.remove("db-disconnected");
    dbDiv.classList.add("db-connected");
};

function databaseDisconnected() {
    const dbDiv = document.getElementById("db");
    dbDiv.classList.remove("db-connected");
    dbDiv.classList.add("db-disconnected");
};

function assert(ok, msg) {
    if (!ok) console.error(msg);
}

// Each bucket is a species which contains all of the possible rotations of that species.
const base5order = [
    // 3 short
    ["0B1R-2B3R-4B5R", "0B5R-1B2R-3B4R"],
    // 2 long, 1 short
    ["0B5R-1B3R-2B4R", "0B1R-2B4R-3B5R", "0B2R-1B3R-4B5R", "0B2R-1B5R-3B4R", "0B4R-1B2R-3B5R", "0B4R-1B5R-2B3R"],
    // short straight
    ["0B3R-1B2R-4B5R", "0B5R-1B4R-2B3R", "0B1R-2B5R-3B4R"],
    // long straight
    ["0B4R-1B3R-2B5R", "0B2R-1B4R-3B5R", "0B3R-1B5R-2B4R"],
    // straight
    ["0B3R-1B4R-2B5R"]
];

// buckets in order
const base5colors = ["#00BB00", "#BB0000", "#00BBBB", "#F6C177", "#CCCCCC"];
// should have the same structure as `base5order`
const base15colors = [
    // 3 short
    "#00BB00", "#00BB5E",
    // 2 long, 1 short
    "#BB0000", "#BB5E00", "#BB005E", "#BEBE00", "#F10E57", "#F1360E",
    // short straight
    "#00BBBB", "#005EBB", "#00BB5E",
    // long straight
    "#F6C177", "#ECF677", "#EFE810",
    // straight
    "#CCCCCC"
];

