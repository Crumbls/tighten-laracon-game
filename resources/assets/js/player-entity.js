// player-entity.js
// KISS: minimal, extensible player entity for movement/collision, future-proof for ghosts

export default class PlayerEntity {
    constructor(startCol, startRow, tileSize, mapData, settings, speed = 4) {
        this.col = startCol;
        this.row = startRow;
        this.tileSize = tileSize;
        this.mapData = mapData; // reference to current map
        this.direction = null; // default: no movement until input
        this.nextDirection = null;
        this.state = 'normal'; // 'normal' or 'super'
        this.defaultSpeed = settings.playerSpeed || 2;
        this.superSpeed = settings.playerSuperSpeed || 4;
        this.speed = this.defaultSpeed;
        // tileSize is fixed for logic; visual scale only
        this.x = this.col * this.tileSize;
        this.y = this.row * this.tileSize;
        this.targetX = this.x;
        this.targetY = this.y;
        this.moving = false;
        this.type = 'player'; // added type property
        this.spawnCol = startCol; // track spawn position
        this.spawnRow = startRow;
        this.hasMovedFromSpawn = false; // track if player has moved from spawn
        
        // Animation properties for mouth movement
        this.animationFrame = 0;
        this.animationSpeed = 8; // Change animation every 8 frames
        this.showMouthClosed = false;
    }

    setDirection(dir) {
        this.nextDirection = dir;
    }

    // Check if a direction is walkable (not a wall or ghost door for player)
    canMove(dir) {
        let [dCol, dRow] = PlayerEntity.directionDelta(dir);
        let nCol = this.col + dCol;
        let nRow = this.row + dRow;
        if (
            nCol < 0 || nRow < 0 ||
            nRow >= this.mapData.length || nCol >= this.mapData[0].length
        ) return false;

        const nextTile = this.mapData[nRow][nCol];

        /**
         *  Block movement into custom portal-blocker tile (e.g., 10 = PORTAL_BLOCKER)
         *  We also check siblings for out of bounds.
         */
        if (nextTile === 10) {
            return false;
        }
        if (
            nextTile === 8 && // 8 = PORTAL
            this.mapData[this.row][this.col] === 8
        ) {
            return false;
        }
        // Prevent player from entering ghost door
        if (
            nextTile === 1 || // wall
            (nextTile === 3 && this.type === 'player') // 3 = GHOST_DOOR
        ) {
            return false;
        }
        return true;
    }

    // Move one step if possible, handle direction changes
    move() {
        // If not moving, check for direction and set target
        if (!this.moving) {
            if (this.nextDirection && this.canMove(this.nextDirection)) {
                this.direction = this.nextDirection;
                this.nextDirection = null;
            }
            if (this.canMove(this.direction)) {
                let [dCol, dRow] = PlayerEntity.directionDelta(this.direction);
                // Prevent moving out of bounds
                let nextCol = this.col + dCol;
                let nextRow = this.row + dRow;
                if (
                    nextCol < 0 || nextRow < 0 ||
                    nextRow >= this.mapData.length || nextCol >= this.mapData[0].length ||
                    this.mapData[nextRow][nextCol] === 1 // wall
                ) {
                    this.moving = false;
                    return;
                }
                this.targetX = nextCol * this.tileSize;
                this.targetY = nextRow * this.tileSize;
                this.moving = true;
            }
        }
        // If moving, interpolate toward target
        if (this.moving) {
            let dx = this.targetX - this.x;
            let dy = this.targetY - this.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= this.speed) {
                // Snap to target
                this.x = this.targetX;
                this.y = this.targetY;
                let [dCol, dRow] = PlayerEntity.directionDelta(this.direction);
                this.col += dCol;
                this.row += dRow;
                this.moving = false;
                
                // Check if player has moved from spawn position
                if (!this.hasMovedFromSpawn && (this.col !== this.spawnCol || this.row !== this.spawnRow)) {
                    this.hasMovedFromSpawn = true;
                }
            } else {
                // Move toward target
                let angle = Math.atan2(dy, dx);
                this.x += this.speed * Math.cos(angle);
                this.y += this.speed * Math.sin(angle);
            }
        }
        
        // Update animation frame when moving (works in both normal and super state)
        if (this.moving) {
            this.animationFrame++;
            if (this.animationFrame >= this.animationSpeed) {
                this.showMouthClosed = !this.showMouthClosed;
                this.animationFrame = 0;
            }
        } else {
            // Reset animation when not moving - show mouth open
            this.showMouthClosed = false;
            this.animationFrame = 0;
        }
    }

    setSuperState(isSuper) {
        if (isSuper) {
            this.state = 'super';
            this.speed = this.superSpeed;
        } else {
            this.state = 'normal';
            this.speed = this.defaultSpeed;
        }
    }

    // Utility: direction string to delta
    static directionDelta(dir) {
        switch(dir) {
            case 'left': return [-1, 0];
            case 'right': return [1, 0];
            case 'up': return [0, -1];
            case 'down': return [0, 1];
            default: return [0, 0];
        }
    }

    // For collision with ghosts or dots
    isAt(col, row) {
        return this.col === col && this.row === row;
    }

    // Render Player using SVG image
    render(ctx, entityArt = null) {
        ctx.save();
        let scale = (this.state === 'super') ? 1.2 : 1;
        let centerX = this.x + this.tileSize / 2;
        let centerY = this.y + this.tileSize / 2;
        ctx.translate(centerX, centerY);
        ctx.scale(scale, scale);
        ctx.translate(-centerX, -centerY);

        // Use animation state to determine what to show (works in both normal and super state)
        const shouldShowClosed = this.moving && this.showMouthClosed;
        
        if (!shouldShowClosed && entityArt && entityArt.player && entityArt.player.image) {
            // Show pacman image (mouth open)
            const img = new window.Image();
            img.src = entityArt.player.image;
            
            const draw = () => {
                // Check if we need to flip horizontally for left movement
                const shouldFlip = this.direction === 'left';
                
                if (shouldFlip) {
                    // Save context and flip horizontally
                    ctx.save();
                    ctx.translate(this.x + this.tileSize, this.y);
                    ctx.scale(-1, 1);
                    ctx.drawImage(img, 0, 0, this.tileSize, this.tileSize);
                    ctx.restore();
                } else {
                    // Normal rendering for right, up, down, or no direction
                    ctx.drawImage(img, this.x, this.y, this.tileSize, this.tileSize);
                }
            };
            
            img.onload = draw;
            if (img.complete) draw();
        } else {
            // Show yellow circle (mouth closed or fallback)
            // The circle will automatically scale with the context transformation
            ctx.fillStyle = '#FFFF00';
            ctx.beginPath();
            ctx.arc(centerX, centerY, this.tileSize / 2 - 2, 0, 2 * Math.PI);
            ctx.fill();
        }
        
        ctx.restore();
    }
}
