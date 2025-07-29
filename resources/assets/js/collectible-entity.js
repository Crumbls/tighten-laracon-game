// CollectibleEntity: base class for dots and fruit
export default class CollectibleEntity {
    constructor(col, row, type = 'dot', options = {}) {
        this.col = col;
        this.row = row;
        this.type = type; // 'dot', 'superdot', 'fruit', etc.
        this.active = true;
        this.options = options; // e.g., fruit type, points, image
        this.eaten = false; // Add eaten state
        this.exploding = false;
        this.explodingAt = null;
        
        // Animation properties
        this.animating = false;
        this.animationTimer = 0;
        this.animationDuration = 30; // 0.5 seconds at 60fps
        this.scale = 1.0;
        this.targetScale = 1.5; // Scale up when eaten
    }

    startEatenAnimation() {
        this.eaten = true;
        this.animating = true;
        this.animationTimer = this.animationDuration;
    }

    startExplodingAnimation() {
        this.exploding = true;
        this.explodingAt = performance.now();
    }

    updateAnimation() {
        if (!this.animating) return false;
        
        this.animationTimer--;
        
        // Calculate scale based on animation progress
        const progress = (this.animationDuration - this.animationTimer) / this.animationDuration;
        this.scale = 1.0 + (this.targetScale - 1.0) * progress;
        
        // Animation finished
        if (this.animationTimer <= 0) {
            this.animating = false;
            this.active = false; // Mark for removal
            return true; // Animation complete
        }
        
        return false;
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
            let imgSrc = null;
            let scale = 1;
            // Explosion animation logic
            if (this.exploding && this.explodingAt) {
                const elapsed = (performance.now() - this.explodingAt) / 500; // 0.5s duration
                scale = 1 + Math.min(elapsed, 1); // scale from 1 to 2
                imgSrc = (art && art.eatenImage) ? art.eatenImage : (this.options.svgEaten || null);
            } else if (this.eaten && this.options.svgEaten) {
                imgSrc = this.options.svgEaten;
            } else if (this.options.svgNormal) {
                imgSrc = this.options.svgNormal;
            } else if (art && art.image) {
                imgSrc = art.image;
            }
            if (imgSrc) {
                const img = new window.Image();
                img.src = imgSrc;
                const draw = () => {
                    const centerX = this.col * tileSize + tileSize / 2;
                    const centerY = this.row * tileSize + tileSize / 2;
                    ctx.save();
                    ctx.translate(centerX, centerY);
                    ctx.scale(scale, scale);
                    ctx.drawImage(img, -tileSize / 2, -tileSize / 2, tileSize, tileSize);
                    ctx.restore();
                };
                img.onload = draw;
                if (img.complete) draw();
            } else {
                ctx.fillStyle = '#f00';
                ctx.beginPath();
                ctx.arc(
                    this.col * tileSize + tileSize / 2,
                    this.row * tileSize + tileSize / 2,
                    tileSize / 3 * scale,
                    0, 2 * Math.PI
                );
                ctx.fill();
            }
            ctx.restore();
        }
    }
}
