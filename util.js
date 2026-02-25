//GameBoard code below
function randomInt(n) {
    return Math.floor(arng.double() * n);
}

function distance(p1, p2) {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

function generateNormalSample(mean = 0, stdDev = 1) {
    // box-muller transform
    let u1 = arng.double();
    let u2 = arng.double();

    let z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z0 * stdDev + mean;
}

function rgb(r, g, b) {
    return `rgb(${r},${g},${b})`;
}

function hsl(h, s, l) {
    return `hsl(${h},${s}%,${l}%)`;
}

function parseHexColor(hex) {
    assert(hex.length == 7, `invalid hex color "${hex}" too short`)
    assert(hex[0] == '#', `invalid hex color "${hex}" incorrect start`)

    return {
        R: parseInt(hex.slice(1,3), 16),
        G: parseInt(hex.slice(3,5), 16),
        B: parseInt(hex.slice(5,7), 16),
    };
}

function standardizeColor(str) {
    var ctx = document.createElement("canvas").getContext("2d");
    ctx.fillStyle = str;
    return ctx.fillStyle;
}

function download(filename, text) {
    var pom = document.createElement('a');
    pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    pom.setAttribute('download', filename);
    pom.click();
}


function databaseConnected() {
    const dbDiv = document.getElementById("db");
    dbDiv.classList.remove("db-disconnected");
    dbDiv.classList.add("db-connected");
}

function databaseDisconnected() {
    const dbDiv = document.getElementById("db");
    dbDiv.classList.remove("db-connected");
    dbDiv.classList.add("db-disconnected");
}

function assert(ok, msg) {
    if (!ok) console.error(msg);
}

// Each bucket is a species which contains all of the possible rotations of that species.
const base5Order = [
    // 3 short
    ["0B1R-2B3R-4B5R", "0B5R-1B2R-3B4R"],
    // 2 long, 1 short
    ["0B2R-1B3R-4B5R",  "0B5R-1B3R-2B4R", "0B1R-2B4R-3B5R", "0B4R-1B2R-3B5R", "0B4R-1B5R-2B3R", "0B2R-1B5R-3B4R"],
    // short straight
    ["0B5R-1B4R-2B3R", "0B1R-2B5R-3B4R", "0B3R-1B2R-4B5R"],
    // long straight
    ["0B4R-1B3R-2B5R", "0B2R-1B4R-3B5R", "0B3R-1B5R-2B4R"],
    // straight
    ["0B3R-1B4R-2B5R"]
];

function base15ColorFromIndex(i) {return `hsl(${i * 255.0 / 30.0}, 100%, 60.8%)`;}

// buckets in order
const base5Colors = [...[1, 9, 18, 25].map((index) => base15ColorFromIndex(index)), "#999999"];
const base5ColorsRgb = base5Colors.map((color) => parseHexColor(standardizeColor(color)));

// should have the same structure as `base5order`

const base15Colors = [...[0,2, 6,7,8,9,10,11, 16,18,20, 23,25,27].map((index) => base15ColorFromIndex(index)), "#999999"];

const base15ColorsRgb = base15Colors.map((color) => parseHexColor(standardizeColor(color)));

