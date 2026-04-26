class Histogram {
    constructor(x, y, data, options) {
        this.x = x;
        this.y = y;
        this.data = data;
        this.maxEntries = 0;

        const defaults = {
            label: "",
            width: PARAMETERS.graphWidth,
            height: PARAMETERS.graphHeight,
        };
        Object.assign(this, defaults, options);
        this.width = Math.floor(this.width);
        this.height = Math.floor(this.height);

        this.maxVal = 0;
    }

    update() {
    }

    draw(ctx) {
        var length = this.data.length > (this.width) ?
            Math.floor(this.width) : this.data.length;
        var start = this.data.length > (this.width) ?
            this.data.length - this.width : 0;

        const maxEntries = this.data.slice(start).reduce(function (acc, x) {
            return Math.max(acc, x.length);
        }, 0);
        this.maxEntries = maxEntries;

        for (const [index, entry] of this.data.slice(start).entries()) {
            var maxVal = entry.reduce(function (acc, x) {
                return acc + x;
            }, 0);
            for (let j = 0; j < entry.length; j++) {
                this.fill(ctx, entry[j] / maxVal, index, j);
            }
        }
        ctx.fillStyle = TEXT_COLOR;
        ctx.textAlign = "center";
        ctx.fillText(this.label, this.x + this.width / 2, this.y + this.height + 10);

        ctx.strokeStyle = TEXT_COLOR;
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
    }

    fill(ctx, color, x, fromTop) {
        const y = this.maxEntries - 1 - fromTop;

        ctx.fillStyle = BACKGROUND_COLOR;
        var c = color * 99 + 1;
        c = 511 - Math.floor(Math.log(c) / Math.log(100) * 512);
        if (c > 255) {
            c = c - 256;
            ctx.fillStyle = rgb(c, c, 255);
        }
        else {
            //c = 255 - c;
            ctx.fillStyle = rgb(0, 0, c);
        }

        var width = 1;
        var height = Math.floor(this.height / this.maxEntries);
        ctx.fillRect(this.x + (x * width),
            this.y + (y * height),
            width,
            height);
    }
};



