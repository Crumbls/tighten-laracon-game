class MapRenderer {
    constructor(canvas, tileSize = 24, config = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.tileSize = tileSize;
        this.mapData = null;
        this.rawMapData = null; // Store the original map data before border enforcement
        this.width = 0;
        this.height = 0;
        
        // Tile type constants (matching your factory)
        this.TILES = {
            EMPTY: 0,
            WALL: 1,
            DOT: 2, 
            GHOST_DOOR: 3,
            TUNNEL: 4,
            CORNER: 6,
            GHOST_SPAWN: 7,
            PORTAL: 8,
            SUPER_DOT: 9,
            PORTAL_BLOCKER: 10,
            FRUIT: 11
        };
        
        // Colors for different tile types
        this.colors = {
            wall: '#0031FF', // Pac-Man blue
            dot: '#FFFFB8', // Pac-Man dot yellow
            ghostDoor: '#FF69B4',
            tunnel: '#000000', // tunnel is background color
            background: '#000000',
            path: '#000080',
            corner: '#FF0000',
            ghostSpawn: '#000080', // Match path/tunnel background
            portal: '#0000FF',
            superDot: '#FFFF00'
        };
        this.applyConfig(config);
    }
    
    /**
     * Accepts a config object to override colors.
     * @param {object} config - Optional config object with color overrides
     */
    applyConfig(config = {}) {
        if (config.colors) {
            this.colors = { ...this.colors, ...config.colors };
        }
    }
    
    /**
     * Load map data from CSV string format
     * @param {string} csvData - CSV formatted map data
     * @param {number} width - Map width in tiles
     * @param {number} height - Map height in tiles
     */
    loadMap(csvData, width, height) {
        this.width = width + 2;
        this.height = height + 2;
        const rows = csvData.trim().split('\n');
        const raw = rows.map(row => row.split(',').map(cell => this.mapTileCode(parseInt(cell.trim(), 10))));
        // Find portal columns/rows on edges
        const portalColsTop = [];
        const portalColsBottom = [];
        const portalRowsLeft = [];
        const portalRowsRight = [];
        for (let c = 0; c < width; c++) {
            if (raw[0][c] === this.TILES.PORTAL) portalColsTop.push(c);
            if (raw[height-1][c] === this.TILES.PORTAL) portalColsBottom.push(c);
        }
        for (let r = 0; r < height; r++) {
            if (raw[r][0] === this.TILES.PORTAL) portalRowsLeft.push(r);
            if (raw[r][width-1] === this.TILES.PORTAL) portalRowsRight.push(r);
        }
        // Build bordered map
        this.mapData = [];
        // Top border
        const topRow = [];
        for (let c = 0; c < width + 2; c++) {
            if (c > 0 && c < width + 1 && portalColsTop.includes(c-1)) topRow.push(this.TILES.PORTAL_BLOCKER);
            else topRow.push(this.TILES.WALL);
        }
        this.mapData.push(topRow);
        // Middle rows
        for (let r = 0; r < height; r++) {
            const row = [];
            // Left border
            if (portalRowsLeft.includes(r)) row.push(this.TILES.PORTAL_BLOCKER);
            else row.push(this.TILES.WALL);
            // Original row
            for (let c = 0; c < width; c++) row.push(raw[r][c]);
            // Right border
            if (portalRowsRight.includes(r)) row.push(this.TILES.PORTAL_BLOCKER);
            else row.push(this.TILES.WALL);
            this.mapData.push(row);
        }
        // Bottom border
        const bottomRow = [];
        for (let c = 0; c < width + 2; c++) {
            if (c > 0 && c < width + 1 && portalColsBottom.includes(c-1)) bottomRow.push(this.TILES.PORTAL_BLOCKER);
            else bottomRow.push(this.TILES.WALL);
        }
        this.mapData.push(bottomRow);

        // --- Add PORTAL_BLOCKER behind each portal ---
        // Only place blocker if the tile is truly EMPTY (do not overwrite super dots, dots, fruit, etc)
        const blockableTiles = [this.TILES.EMPTY];
        // Top portals: place blocker below
        for (const c of portalColsTop) {
            if (blockableTiles.includes(this.mapData[1][c+1])) {
                this.mapData[1][c+1] = this.TILES.PORTAL_BLOCKER;
            }
        }
        // Bottom portals: place blocker above
        for (const c of portalColsBottom) {
            if (blockableTiles.includes(this.mapData[this.mapData.length-2][c+1])) {
                this.mapData[this.mapData.length-2][c+1] = this.TILES.PORTAL_BLOCKER;
            }
        }
        // Left portals: place blocker right
        for (const r of portalRowsLeft) {
            if (blockableTiles.includes(this.mapData[r+1][1])) {
                this.mapData[r+1][1] = this.TILES.PORTAL_BLOCKER;
            }
        }
        // Right portals: place blocker left
        for (const r of portalRowsRight) {
            if (blockableTiles.includes(this.mapData[r+1][this.mapData[0].length-2])) {
                this.mapData[r+1][this.mapData[0].length-2] = this.TILES.PORTAL_BLOCKER;
            }
        }

        this.canvas.width = this.width * this.tileSize;
        this.canvas.height = this.height * this.tileSize;
        console.log(`Map loaded with border: ${this.width}x${this.height}`, this.mapData);
    }
    
    /**
     * Map legacy/demo tile codes to internal tile types
     * @param {number} code - raw tile code from CSV
     * @returns {number} mapped tile code
     */
    mapTileCode(code) {
        // Tile code meanings:
        // 0 = wall, 1 = empty/path, 2 = super dot (corners), 3 = ghost spawn, 4 = portal, 5 = ghost door
        switch(code) {
            case 0:
                return this.TILES.WALL;
            case 1:
                return this.TILES.EMPTY;
            case 2:
                return this.TILES.SUPER_DOT;
            case 3:
                return this.TILES.GHOST_SPAWN;
            case 4:
                return this.TILES.PORTAL;
            case 5:
                return this.TILES.GHOST_DOOR;
            default:
                return this.TILES.EMPTY;
        }
    }
    
    /**
     * Ensure there is always a border of walls around the map,
     * except for tunnel/portal tiles (TUNNEL) at the border.
     * This modifies mapData in-place after loading.
     */
    ensureWallBorder() {
        if (!this.mapData) return;
        const h = this.mapData.length;
        const w = this.mapData[0].length;
        for (let r = 0; r < h; r++) {
            for (let c = 0; c < w; c++) {
                const isEdge = (r === 0 || r === h-1 || c === 0 || c === w-1);
                if (isEdge) {
                    // If this is a tunnel/portal, preserve it
                    if (this.mapData[r][c] === this.TILES.TUNNEL) continue;
                    // Otherwise, enforce wall
                    this.mapData[r][c] = this.TILES.WALL;
                }
            }
        }
    }
    
    /**
     * Render the entire map to canvas
     */
    render() {
        if (!this.mapData) {
            console.error('No map data loaded');
            return;
        }
        
        // Clear canvas
        this.ctx.fillStyle = this.colors.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Render each tile
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const tileType = this.mapData[row][col];
                this.renderTile(col, row, tileType);
            }
        }
    }
    
    /**
     * Render a single tile at the specified position
     * @param {number} col - Column position
     * @param {number} row - Row position  
     * @param {number} tileType - Type of tile to render
     */
    renderTile(col, row, tileType) {
        const x = col * this.tileSize;
        const y = row * this.tileSize;

        // If this is a wall at the border and the *original* tile was a tunnel, skip rendering (transparent)
        const isEdge = (row === 0 || row === this.height-1 || col === 0 || col === this.width-1);
        // Use the raw map data (before wall border enforcement) to check for tunnel
        if (tileType === this.TILES.WALL && isEdge && this.rawMapData && this.rawMapData[row][col] === this.TILES.TUNNEL) {
            return; // Don't render wall at tunnel/portal
        }
        if (tileType === this.TILES.WALL) {
            this.renderWall(x, y);
        } else switch(tileType) {
            case this.TILES.DOT:
                this.renderPath(x, y);
                this.renderDot(x, y);
                break;
            case this.TILES.GHOST_DOOR:
                this.renderPath(x, y);
                this.renderGhostDoor(x, y);
                break;
            case this.TILES.TUNNEL:
                this.renderPath(x, y);
                break;
            case this.TILES.CORNER:
                this.renderPath(x, y);
                this.renderCorner(x, y);
                break;
            case this.TILES.GHOST_SPAWN:
                this.renderPath(x, y);
                this.renderGhostSpawn(x, y);
                break;
            case this.TILES.PORTAL:
                this.renderPath(x, y);
                this.renderPortal(x, y);
                break;
            case this.TILES.SUPER_DOT:
                this.renderPath(x, y);
                this.renderSuperDot(x, y);
                break;
            default:
                this.renderPath(x, y);
        }
    }
    
    /**
     * Render a wall tile
     */
    renderWall(x, y) {
        this.ctx.fillStyle = this.colors.wall;
        this.ctx.fillRect(x, y, this.tileSize, this.tileSize);
        
        // Add wall border for definition
        this.ctx.strokeStyle = '#4444FF';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, this.tileSize, this.tileSize);
    }
    
    /**
     * Render a path/corridor background
     */
    renderPath(x, y) {
        this.ctx.fillStyle = this.colors.path;
        this.ctx.fillRect(x, y, this.tileSize, this.tileSize);
    }
    
    /**
     * Render a dot (pellet)
     */
    renderDot(x, y) {
        const centerX = x + this.tileSize / 2;
        const centerY = y + this.tileSize / 2;
        const radius = Math.max(2, this.tileSize / 8);
        
        this.ctx.fillStyle = this.colors.dot;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    /**
     * Render a ghost door (special gate)
     */
    renderGhostDoor(x, y) {
        // Horizontal line across the middle
        this.ctx.strokeStyle = this.colors.ghostDoor;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y + this.tileSize / 2);
        this.ctx.lineTo(x + this.tileSize, y + this.tileSize / 2);
        this.ctx.stroke();
    }
    
    /**
     * Render a tunnel entrance
     */
    renderTunnel(x, y) {
        this.ctx.fillStyle = this.colors.tunnel;
        this.ctx.fillRect(x, y, this.tileSize, this.tileSize);
        
        // Add some tunnel indicators
        this.ctx.fillStyle = '#008888';
        this.ctx.fillRect(x + 2, y + 2, this.tileSize - 4, this.tileSize - 4);
    }
    
    /**
     * Render a corner
     */
    renderCorner(x, y) {
        this.ctx.fillStyle = this.colors.corner;
        this.ctx.fillRect(x, y, this.tileSize, this.tileSize);
    }
    
    /**
     * Render a ghost spawn
     */
    renderGhostSpawn(x, y) {
        this.ctx.fillStyle = this.colors.ghostSpawn;
        this.ctx.fillRect(x, y, this.tileSize, this.tileSize);
    }
    
    /**
     * Render a portal
     */
    renderPortal(x, y) {
        this.ctx.fillStyle = this.colors.portal;
        this.ctx.fillRect(x, y, this.tileSize, this.tileSize);
    }
    
    /**
     * Render a super dot
     */
    renderSuperDot(x, y) {
        const centerX = x + this.tileSize / 2;
        const centerY = y + this.tileSize / 2;
        const radius = Math.max(4, this.tileSize / 4);
        
        this.ctx.fillStyle = this.colors.superDot;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    /**
     * Get tile type at world coordinates
     * @param {number} worldX - X coordinate in pixels
     * @param {number} worldY - Y coordinate in pixels
     * @returns {number} Tile type
     */
    getTileAt(worldX, worldY) {
        const col = Math.floor(worldX / this.tileSize);
        const row = Math.floor(worldY / this.tileSize);
        
        if (row < 0 || row >= this.height || col < 0 || col >= this.width) {
            return this.TILES.WALL; // Treat out-of-bounds as walls
        }
        
        return this.mapData[row][col];
    }
    
    /**
     * Convert grid coordinates to world coordinates
     * @param {number} col - Column
     * @param {number} row - Row
     * @returns {object} World coordinates {x, y}
     */
    gridToWorld(col, row) {
        return {
            x: col * this.tileSize + this.tileSize / 2,
            y: row * this.tileSize + this.tileSize / 2
        };
    }
    
    /**
     * Convert world coordinates to grid coordinates
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     * @returns {object} Grid coordinates {col, row}
     */
    worldToGrid(worldX, worldY) {
        return {
            col: Math.floor(worldX / this.tileSize),
            row: Math.floor(worldY / this.tileSize)
        };
    }
    
    /**
     * Find all tiles of a specific type
     * @param {number} tileType - Type to search for
     * @returns {Array} Array of {col, row} positions
     */
    findTiles(tileType) {
        const positions = [];
        
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.mapData[row][col] === tileType) {
                    positions.push({col, row});
                }
            }
        }
        
        return positions;
    }
}

export default MapRenderer;