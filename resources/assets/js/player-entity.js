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
            } else {
                // Move toward target
                let angle = Math.atan2(dy, dx);
                this.x += this.speed * Math.cos(angle);
                this.y += this.speed * Math.sin(angle);
            }
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

    // Render Player (simple yellow circle for now)
    render(ctx) {
        ctx.save();
        let scale = (this.state === 'super') ? 1.2 : 1;
        let centerX = this.x + this.tileSize / 2;
        let centerY = this.y + this.tileSize / 2;
        ctx.translate(centerX, centerY);
        ctx.scale(scale, scale);
        ctx.translate(-centerX, -centerY);
        ctx.fillStyle = '#FFFF00';
        ctx.beginPath();
        ctx.arc(centerX, centerY, this.tileSize / 2 - 2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
    }
}
