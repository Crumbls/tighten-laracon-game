// CollectibleSpawner: generates dots and fruit on valid tiles
import CollectibleEntity from './collectible-entity.js';
import settings from './settings.js';

export default class CollectibleSpawner {
    constructor(mapData, tileTypes, options = {}) {
        this.mapData = mapData;
        this.tileTypes = tileTypes; // { EMPTY, PORTAL, GHOST_SPAWN, GHOST_DOOR, ... }
        this.options = options;
    }

    // Returns: { dots: [], fruit: [] }
    spawnCollectibles(existingEntities = []) {
        const dots = [];
        const fruit = [];
        const superdots = [];
        const occupied = new Set(existingEntities.map(e => `${e.col},${e.row}`));
        // SUPERDOTS: Place superdots at positions defined by the map (tileTypes.SUPER_DOT)
        for (let row = 0; row < this.mapData.length; row++) {
            for (let col = 0; col < this.mapData[0].length; col++) {
                if (
                    this.mapData[row][col] === this.tileTypes.SUPER_DOT &&
                    !occupied.has(`${col},${row}`) &&
                    !this._isInPen(col, row) &&
                    !this._isInPortalOrTunnel(col, row)
                ) {
                    superdots.push(new CollectibleEntity(col, row, 'superdot', { points: settings.superDotPoints || 50 }));
                    occupied.add(`${col},${row}`);
                }
            }
        }
        // Dots
        for (let row = 0; row < this.mapData.length; row++) {
            for (let col = 0; col < this.mapData[0].length; col++) {
                if (
                    this.mapData[row][col] === this.tileTypes.EMPTY &&
                    !occupied.has(`${col},${row}`) &&
                    !this._isInPen(col, row) &&
                    !this._isInPortalOrTunnel(col, row)
                ) {
                    dots.push(new CollectibleEntity(col, row, 'dot', { points: settings.dotPoints }));
                }
            }
        }
        // Fruits: Only spawn at least 5 tiles away from any superdot
        const fruitMinDistance = 5;
        const fruitCandidates = [];
        for (let row = 0; row < this.mapData.length; row++) {
            for (let col = 0; col < this.mapData[0].length; col++) {
                if (
                    this.mapData[row][col] === this.tileTypes.EMPTY &&
                    !occupied.has(`${col},${row}`) &&
                    !this._isInPen(col, row) &&
                    !this._isInPortalOrTunnel(col, row)
                ) {
                    let tooClose = false;
                    for (const sd of superdots) {
                        const dx = Math.abs(col - sd.col);
                        const dy = Math.abs(row - sd.row);
                        if (dx + dy < fruitMinDistance) {
                            tooClose = true;
                            break;
                        }
                    }
                    if (!tooClose) {
                        fruitCandidates.push({col, row});
                    }
                }
            }
        }
        // Pick a random fruit type
        const fruitType = settings.fruitTypes[Math.floor(Math.random() * settings.fruitTypes.length)];
        // Optionally, allow caller to pass fruit locations
        let fruitLocations = this.options.fruitLocations || [];
        if (fruitLocations.length === 0) {
            if (fruitCandidates.length > 0) {
                fruitLocations = [fruitCandidates[Math.floor(Math.random() * fruitCandidates.length)]];
            }
        }
        for (const loc of fruitLocations) {
            if (loc) {
                fruit.push(new CollectibleEntity(loc.col, loc.row, 'fruit', {
                    ...fruitType
                }));
                occupied.add(`${loc.col},${loc.row}`);
            }
        }
        return { superdots, dots, fruit };
    }

    _pickRandomValidTile(occupied) {
        const valid = [];
        for (let row = 0; row < this.mapData.length; row++) {
            for (let col = 0; col < this.mapData[0].length; col++) {
                if (
                    this.mapData[row][col] === this.tileTypes.EMPTY &&
                    !occupied.has(`${col},${row}`) &&
                    !this._isInPen(col, row) &&
                    !this._isInPortalOrTunnel(col, row)
                ) {
                    valid.push({ col, row });
                }
            }
        }
        if (valid.length === 0) return null;
        return valid[Math.floor(Math.random() * valid.length)];
    }

    _isInPen(col, row) {
        // Pen is GHOST_SPAWN or GHOST_DOOR
        return (
            this.mapData[row][col] === this.tileTypes.GHOST_SPAWN ||
            this.mapData[row][col] === this.tileTypes.GHOST_DOOR
        );
    }

    _isInPortalOrTunnel(col, row) {
        // Exclude portals and the empty tunnel path between them
        if (this.mapData[row][col] === this.tileTypes.PORTAL) return true;
        // Optionally: Exclude direct tunnel path (left/right edge)
        if (col === 0 || col === this.mapData[0].length - 1) return true;
        return false;
    }
}
