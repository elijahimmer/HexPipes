class Graph {
    constructor(x, y, width, height, data, label, min, max, resize = true, colors = base5Colors) {
        this.x = x;
        this.y = y;
        this.data = data;
        this.label = label;
        this.resize = resize;

        this.xSize = Math.floor(width);
        this.ySize = Math.floor(height);
        this.colors = colors;
        this.minVal = min;
        this.maxVal = max;
    }

    update() {
    }

    draw(ctx) {
        if(this.resize) this.updateMinAndMax();
        // if (!document.getElementById("graphs").checked) return;

        // Save the current context state
        ctx.save();

        // Create a clipping region that matches your graph boundaries
        ctx.beginPath();
        ctx.rect(this.x, this.y, this.xSize, this.ySize);
        ctx.clip();

        if (this.data[0].length > 1) {
            for (var j = 0; j < this.data.length; j++) {
                var data = this.data[j];

                ctx.fillStyle = ctx.strokeStyle = this.colors[j];
                ctx.lineWidth = 2;

                ctx.beginPath();
                var xPos = this.x;
                var yPos = data.length > this.xSize ?
                    this.y + this.ySize - Math.floor((data[data.length - this.xSize] - this.minVal) / (this.maxVal - this.minVal) * this.ySize) :
                    this.y + this.ySize - Math.floor((data[0] - this.minVal) / (this.maxVal - this.minVal) * this.ySize);
                ctx.moveTo(xPos, yPos);
                var length = data.length > this.xSize ?
                    this.xSize : data.length;
                for (var i = 1; i < length; i++) {
                    var index = data.length > this.xSize ?
                        data.length - this.xSize - 1 + i : i;
                    xPos++;
                    yPos = this.y + this.ySize - Math.floor((data[index] - this.minVal) / (this.maxVal - this.minVal) * this.ySize);

                    ctx.lineTo(xPos, yPos);
                }
                ctx.stroke();
                ctx.closePath();

                ctx.textAlign = "right";
                let value = data[data.length - 1];
                if(!Number.isInteger(value)) value = value.toFixed(2);
                ctx.fillText(value, this.x + this.xSize - 5, yPos + 10);
            }
        }

        ctx.restore();

        var firstTick = 0;
        firstTick = this.data[0].length > this.xSize ? this.data[0].length - this.xSize : 0;
        ctx.fillStyle = TEXT_COLOR;
        ctx.textAlign = "left";
        ctx.fillText(firstTick * PARAMETERS.reportingPeriod, this.x + 5, this.y + this.ySize + 10);
        ctx.textAlign = "right";
        ctx.fillText((this.data[0].length - 1)* PARAMETERS.reportingPeriod, this.x + this.xSize - 5, this.y + this.ySize + 10);
        ctx.textAlign = "center";
        ctx.fillText(this.label, this.x + this.xSize / 2, this.y + this.ySize + 12);

        ctx.strokeStyle = TEXT_COLOR;
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x, this.y, this.xSize, this.ySize);
    }

    updateMinAndMax() {
        this.minVal = Math.min(this.minVal, ...[].concat(...this.data));
        this.maxVal = Math.max(this.maxVal, ...[].concat(...this.data));
    }
}



