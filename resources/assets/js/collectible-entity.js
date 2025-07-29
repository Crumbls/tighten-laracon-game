// CollectibleEntity: base class for dots and fruit
export default class CollectibleEntity {
    constructor(col, row, type = 'dot', options = {}) {
        this.col = col;
        this.row = row;
        this.type = type; // 'dot', 'superdot', 'fruit', etc.
        this.active = true;
        this.options = options; // e.g., fruit type, points, image
    }

    render(ctx, tileSize, art) {
        if (!this.active) return;
        if (this.type === 'dot') {
            ctx.save();
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(
                this.col * tileSize + tileSize / 2,
                this.row * tileSize + tileSize / 2,
                tileSize / 8,
                0, 2 * Math.PI
            );
            ctx.fill();
            ctx.restore();
        } else if (this.type === 'superdot') {
            ctx.save();
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.arc(
                this.col * tileSize + tileSize / 2,
                this.row * tileSize + tileSize / 2,
                tileSize / 4,
                0, 2 * Math.PI
            );
            ctx.fill();
            ctx.restore();
        } else if (this.type === 'fruit') {
            ctx.save();
            if (art && art.fruit && art.fruit.image) {
                ctx.drawImage(
                    art.fruit.image,
                    this.col * tileSize,
                    this.row * tileSize,
                    tileSize, tileSize
                );
            } else {
                ctx.fillStyle = '#f00';
                ctx.beginPath();
                ctx.arc(
                    this.col * tileSize + tileSize / 2,
                    this.row * tileSize + tileSize / 2,
                    tileSize / 3,
                    0, 2 * Math.PI
                );
                ctx.fill();
            }
            ctx.restore();
        }
    }
}
