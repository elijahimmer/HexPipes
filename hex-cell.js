"use strict";

function drawHex(ctx) {
    // Draw filled hexagon
    ctx.beginPath()

    ctx.moveTo(
      center.x + size * Math.cos(0),
      center.y + size * Math.sin(0)
    );

    for (let i = 1; i < 6; i++) {
      const angle = Math.PI / 3 * i
      ctx.lineTo(center.x + size * Math.cos(angle),
                 center.y + size * Math.sin(angle))
    }
    ctx.closePath();

    ctx.fillStyle = "#777777"
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fill()
}

function drawOrg(org, ctx) {
    // reset color of cell
    pipe_mid_color = BLACK_RGB
    ctx.lineWidth = 40

    org.drawPipesAtPoint(ctx, center, size, org.pipes, false, 50)

    ctx.lineWidth = 1
    for (const pipe of org.pipes) {
        const inputColor = org.getColorRGB(pipe.inputColor);
        const outputColor = org.getColorRGB(pipe.outputColor);
        org.drawDirectionIndicators(ctx, pipe, center, size, inputColor, outputColor);
    }
}

const canvas = document.getElementById("display");
const ctx = canvas.getContext("2d");
ctx.width = canvas.width;
ctx.height = canvas.height;

const center = {x: ctx.width / 2, y: ctx.height / 2}
const size = ctx.width / 2

const org = new Organism({
    cellSize: ctx.width / 2,
    directions: [
        {q: +1, r:  0},  // Side 0: 30°
        {q:  0, r: +1},  // Side 1: 90°
        {q: -1, r: +1},  // Side 2: 150°
        {q: -1, r:  0},  // Side 3: 210°
        {q:  0, r: -1},  // Side 4: 270°
        {q: +1, r: -1},  // Side 5: 330°
    ],

    getCell: () => true
}, "3B0Y-5M1C-4R2G")

PARAMETERS.circleRadius = 30
PARAMETERS.arrowLength = 80

drawOrg(org, ctx)
drawHex(ctx)
drawOrg(org, ctx)

