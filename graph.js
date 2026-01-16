class Graph {
    constructor(x, y, data, label, min, max, resize = true) {
        this.x = x;
        this.y = y;
        this.data = data;
        this.label = label;
        this.resize = resize;

        this.xSize = PARAMETERS.graphWidth;
        this.ySize = PARAMETERS.graphHeight;
        this.ctx = gameEngine.ctx;
        this.colors = ["#00BB00", "#BB0000", "#00BBBB", "#CCCCCC"];
        this.minVal = min;
        this.maxVal = max;
    }
    update() {
    }
    draw(ctx) {
        if(this.resize) this.updateMinAndMax();
        // if (!document.getElementById("graphs").checked) return;

        // Save the current context state
        this.ctx.save();

        // Create a clipping region that matches your graph boundaries
        this.ctx.beginPath();
        this.ctx.rect(this.x, this.y, this.xSize, this.ySize);
        this.ctx.clip();

        if (this.data[0].length > 1) {
            for (var j = 0; j < this.data.length; j++) {
                var data = this.data[j];

                this.ctx.strokeStyle = this.colors[j];
                this.ctx.lineWidth = 2;

                this.ctx.beginPath();
                var xPos = this.x;
                var yPos = data.length > this.xSize ? this.y + this.ySize - Math.floor((data[data.length - this.xSize] - this.minVal) / (this.maxVal - this.minVal) * this.ySize)
                : this.y + this.ySize - Math.floor((data[0] - this.minVal) / (this.maxVal - this.minVal) * this.ySize);
                this.ctx.moveTo(xPos, yPos);
                var length = data.length > this.xSize ?
                    this.xSize : data.length;
                for (var i = 1; i < length; i++) {
                    var index = data.length > this.xSize ?
                        data.length - this.xSize - 1 + i : i;
                    xPos++;
                    yPos = this.y + this.ySize - Math.floor((data[index] - this.minVal) / (this.maxVal - this.minVal) * this.ySize);

                    this.ctx.lineTo(xPos, yPos);
                }
                this.ctx.stroke();
                this.ctx.closePath();

                this.ctx.strokeStyle = TEXT_COLOR;
                this.ctx.fillSytle = TEXT_COLOR;
                this.ctx.textAlign = "right";
                let value = data[data.length - 1];
                if(!Number.isInteger(value)) value = value.toFixed(2);
                this.ctx.fillText(value, this.x + this.xSize - 5, yPos + 10);
            }
        }

        this.ctx.restore();

        var firstTick = 0;
        firstTick = this.data[0].length > this.xSize ? this.data[0].length - this.xSize : 0;
        this.ctx.fillStyle = TEXT_COLOR;
        this.ctx.textAlign = "left";
        this.ctx.fillText(firstTick * PARAMETERS.reportingPeriod, this.x + 5, this.y + this.ySize + 10);
        this.ctx.textAlign = "right";
        this.ctx.fillText((this.data[0].length - 1)* PARAMETERS.reportingPeriod, this.x + this.xSize - 5, this.y + this.ySize + 10);
        this.ctx.textAlign = "center";
        this.ctx.fillText(this.label, this.x + this.xSize / 2, this.y + this.ySize + 12);

        this.ctx.strokeStyle = TEXT_COLOR;
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(this.x, this.y, this.xSize, this.ySize);
    }
    updateMinAndMax() {
        this.minVal = Math.min(this.minVal, ...[].concat(...this.data));
        this.maxVal = Math.max(this.maxVal, ...[].concat(...this.data));
    }
}



