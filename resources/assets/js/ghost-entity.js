// ghost-entity.js
// Minimal, extensible GhostEntity class for movement, collision, and future pathfinding

import PF from 'pathfinding';

export default class GhostEntity {
    constructor(startCol, startRow, tileSize, mapData, speed = 2, color = '#FF0000', tiles = null, image = null) {
        this.col = startCol;
        this.row = startRow;
        this.tileSize = tileSize;
        this.mapData = mapData; // reference to current map
        this.direction = 'left'; // default
        this.nextDirection = null;
        this.speed = speed;
        this.x = this.col * tileSize;
        this.y = this.row * tileSize;
        this.targetX = this.x;
        this.targetY = this.y;
        this.moving = false;
        this.color = color;
        this.image = image;
        this.state = 'in_pen'; // 'in_pen', 'exiting', 'active'
        this.exitTarget = null;
        this.destination = null;
        this.path = null;
        this.pathStep = 0;
        this.TILES = tiles;
        this.lastPosition = null; // Track previous tile
    }

    setState(state, exitTarget = null) {
        this.state = state;
        this.exitTarget = exitTarget;
        // When entering 'exiting', clear previous destination if just left pen
        if(state === 'exiting' && this.destination && this.state !== 'exiting') {
            this.destination = null;
            this.path = null;
            this.pathStep = 0;
        }
    }

    setDirection(dir) {
        this.nextDirection = dir;
    }

    canMove(dir) {
        let [dCol, dRow] = GhostEntity.directionDelta(dir);
        let nCol = this.col + dCol;
        let nRow = this.row + dRow;
        if (
            nCol < 0 || nRow < 0 ||
            nRow >= this.mapData.length || nCol >= this.mapData[0].length
        ) return false;
        // Allow movement on walkable tiles always if not in_pen

        if (this.state === 'exiting') {

//            return walkable.some(Boolean);
        }

        if (this.state === 'exiting' || this.state === 'active') {
            const walkable = [
                this.mapData[nRow][nCol] === this.TILES.EMPTY,
                this.mapData[nRow][nCol] === this.TILES.DOT,
                this.mapData[nRow][nCol] === this.TILES.SUPER_DOT,
                this.mapData[nRow][nCol] === this.TILES.GHOST_DOOR,
                this.mapData[nRow][nCol] === this.TILES.GHOST_SPAWN
            ];
            return walkable.some(Boolean);
        }
        // If in_pen, only allow movement inside pen (GHOST_SPAWN)
        return this.mapData[nRow][nCol] === this.TILES.GHOST_SPAWN;
    }

    move() {
        if (!this.moving) {
            if (this.nextDirection && this.canMove(this.nextDirection)) {
                this.direction = this.nextDirection;
                this.nextDirection = null;
            }
            if (this.canMove(this.direction)) {
                let [dCol, dRow] = GhostEntity.directionDelta(this.direction);
                this.targetX = (this.col + dCol) * this.tileSize;
                this.targetY = (this.row + dRow) * this.tileSize;
                this.moving = true;
            }
        }
        if (this.moving) {
            let dx = this.targetX - this.x;
            let dy = this.targetY - this.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= this.speed) {
                this.x = this.targetX;
                this.y = this.targetY;
                let [dCol, dRow] = GhostEntity.directionDelta(this.direction);
                this.col += dCol;
                this.row += dRow;
                this.moving = false;
            } else {
                let angle = Math.atan2(dy, dx);
                this.x += this.speed * Math.cos(angle);
                this.y += this.speed * Math.sin(angle);
            }
        }
    }

    static directionDelta(dir) {
        switch(dir) {
            case 'left': return [-1, 0];
            case 'right': return [1, 0];
            case 'up': return [0, -1];
            case 'down': return [0, 1];
            default: return [0, 0];
        }
    }

    isAt(col, row) {
        return this.col === col && this.row === row;
    }

    render(ctx) {
        ctx.save();
        if (this.image) {
            // Draw PNG/SVG art
            const img = this._artImg || (this._artImg = new Image());
            if (!img.src) img.src = this.image;
            if (img.complete) {
                ctx.drawImage(
                    img,
                    this.x,
                    this.y,
                    this.tileSize,
                    this.tileSize
                );
            } else {
                img.onload = () => {
                    ctx.drawImage(img, this.x, this.y, this.tileSize, this.tileSize);
                };
            }
        } else {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(
                this.x + this.tileSize / 2,
                this.y + this.tileSize / 2,
                this.tileSize / 2 - 2,
                0, 2 * Math.PI
            );
            ctx.fill();
        }
        ctx.restore();
    }

    static bfsPath(mapData, start, goal, walkableTiles = [0, 1, 3, 5]) {
        const queue = [[start]];
        const visited = new Set();
        const key = (c, r) => `${c},${r}`;
        visited.add(key(start.col, start.row));
        const height = mapData.length;
        const width = mapData[0].length;
        while (queue.length) {
            const path = queue.shift();
            const {col, row} = path[path.length - 1];
            if (col === goal.col && row === goal.row) return path;
            for (const [dc, dr] of [[0,1],[1,0],[0,-1],[-1,0]]) {
                const nc = col + dc, nr = row + dr;
                if (nc < 0 || nr < 0 || nc >= width || nr >= height) continue;
                if (!walkableTiles.includes(mapData[nr][nc])) continue;
                const k = key(nc, nr);
                if (visited.has(k)) continue;
                visited.add(k);
                queue.push([...path, {col: nc, row: nr}]);
            }
        }
        return null;
    }

    setDestination(dest, mapData) {
        if (this.lastPosition && dest.col === this.lastPosition.col && dest.row === this.lastPosition.row) {
            // Don't allow immediate reversal to previous position
            return;
        }
        this.destination = dest;
        // Convert mapData to PF grid for full maze
        const walkable = [this.TILES.EMPTY, this.TILES.DOT, this.TILES.SUPER_DOT, this.TILES.GHOST_DOOR, this.TILES.GHOST_SPAWN];
        const pfGrid = makePFGrid(mapData, walkable);
        const finder = new PF.AStarFinder();
        const pathArr = finder.findPath(this.col, this.row, dest.col, dest.row, pfGrid);
        // Convert [col,row] array to [{col,row}] for compatibility
        this.path = pathArr.map(([c, r]) => ({col: c, row: r}));
        this.pathStep = 1;
    }

    moveToDestination() {
        // If path is missing or blocked, try to recompute a new path
        if (!this.path || this.pathStep >= this.path.length) {

            if (this.destination) {
                this.path = GhostEntity.bfsPath(this.mapData, {col: this.col, row: this.row}, this.destination);
                this.pathStep = 1;
            }
            // If still no path, abandon destination
            if (!this.path || this.path.length < 2) {
                this.destination = null;
                this.path = null;
                this.pathStep = 0;
                return;
            }
        }

        // --- FORCE EXIT LOGIC ---
        if (this.state === 'exiting') {
            // If the next step is a GHOST_DOOR or EMPTY, always take it immediately
            const next = this.path[this.pathStep];
            if (!next) return;
            const nextType = this.mapData[next.row][next.col];
            if (nextType === this.TILES.GHOST_DOOR || nextType === this.TILES.EMPTY) {
                if (next.col > this.col) this.setDirection('right');
                else if (next.col < this.col) this.setDirection('left');
                else if (next.row > this.row) this.setDirection('down');
                else if (next.row < this.row) this.setDirection('up');
                this.move();
                if (this.col === next.col && this.row === next.row) this.pathStep++;
                return;
            }
        }
        // Default: follow path
        const next = this.path[this.pathStep];
        if (!next) return;
        if (this.col === next.col && this.row === next.row) {
            this.lastPosition = { col: this.col, row: this.row };
        }
        if (next.col > this.col) this.setDirection('right');
        else if (next.col < this.col) this.setDirection('left');
        else if (next.row > this.row) this.setDirection('down');
        else if (next.row < this.row) this.setDirection('up');
        this.move();
        if (this.col === next.col && this.row === next.row) this.pathStep++;
    }

    atDestination() {
        return this.destination && this.col === this.destination.col && this.row === this.destination.row;
    }
}

function makePFGrid(mapData, walkableTiles) {
    const grid = [];
    for (let r = 0; r < mapData.length; r++) {
        const row = [];
        for (let c = 0; c < mapData[0].length; c++) {
            row.push(walkableTiles.includes(mapData[r][c]) ? 0 : 1);
        }
        grid.push(row);
    }
    return new PF.Grid(grid);
}
