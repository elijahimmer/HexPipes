class Lineage {
    constructor(hexGrid) {
      this.grid = hexGrid;
      const lineageCanvas = document.getElementById('lineage');
      this.ctx = lineageCanvas.getContext('2d');
    }

    update() { }

    draw() {
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

        if (!this.grid.lineage) return;

        console.log(this.grid.lineage.organism);

        const center = {x: 100, y: 100};
        const size = 100;
        this.drawHex(this.ctx, center, size, GREY);

        const tempOrg = new Organism(this.hexGrid);

        ctx.save();

        const entries = this.livingCountsMatrix[this.getLivingCountIndex()].slice(0, 120);

        const pipe_mid_color_tmp = pipe_mid_color;
        pipe_mid_color = BLACK_RGB;
        var index = 0;
        entries.forEach(({count, pipes}) => {
            index++;

            this.drawHex(ctx, center, size, GREY);
            tempOrg.drawPipesAtPoint(ctx, center, size, pipes, false);
            ctx.font = "14px Arial";
            ctx.fillStyle = TEXT_COLOR;
            ctx.textAlign = "center";
            ctx.fillText(`${count}`, center.x, center.y + size + 16);
        });
        pipe_mid_color = pipe_mid_color_tmp;
        ctx.restore();
    }

    drawHex(ctx, center, size, color) {
        // Calculate vertices for flat-top hexagon
        const vertices = [];
        for (let i = 0; i < 6; i++) {
            const angle = Math.PI / 3 * i;
            vertices.push({
                x: center.x + size * Math.cos(angle),
                y: center.y + size * Math.sin(angle)
            });
        }

        // Draw filled hexagon
        ctx.beginPath();
        ctx.moveTo(vertices[0].x, vertices[0].y);
        for (let i = 1; i < 6; i++) {
            ctx.lineTo(vertices[i].x, vertices[i].y);
        }
        ctx.closePath();

        ctx.fillStyle = color;
        ctx.fill();

        ctx.strokeStyle = '#666666';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}
