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
