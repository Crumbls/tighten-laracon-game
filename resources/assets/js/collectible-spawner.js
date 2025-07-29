// CollectibleSpawner: generates dots and fruit on valid tiles
import CollectibleEntity from './collectible-entity.js';
import settings from './settings.js';
import entityArt from './entity-art.js';

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

        // FRUIT: Determine fruit locations FIRST before placing dots
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
        
        // Spawn 2 fruit automatically
        let fruitLocations = this.options.fruitLocations || [];
        if (fruitLocations.length === 0) {
            // Pick 2 random locations if we have enough candidates
            const numFruit = Math.min(2, fruitCandidates.length);
            const selectedLocations = [];
            const usedIndices = new Set();
            
            for (let i = 0; i < numFruit; i++) {
                let idx;
                do {
                    idx = Math.floor(Math.random() * fruitCandidates.length);
                } while (usedIndices.has(idx));
                
                usedIndices.add(idx);
                selectedLocations.push(fruitCandidates[idx]);
            }
            fruitLocations = selectedLocations;
        }
        
        // Create fruit entities and mark their positions as occupied
        for (let i = 0; i < fruitLocations.length; i++) {
            const loc = fruitLocations[i];
            if (loc) {
                // Pick a random fruit type for each fruit
                const fruitType = entityArt.fruit[Math.floor(Math.random() * entityArt.fruit.length)];
                fruit.push(new CollectibleEntity(loc.col, loc.row, 'fruit', {
                    ...fruitType
                }));
                occupied.add(`${loc.col},${loc.row}`);
                console.log(`Fruit placed at ${loc.col},${loc.row} - marked as occupied`);
            }
        }

        // DOTS: Place dots AFTER fruit locations are determined and occupied
        console.log('Occupied positions before placing dots:', Array.from(occupied));
        for (let row = 0; row < this.mapData.length; row++) {
            for (let col = 0; col < this.mapData[0].length; col++) {
                const posKey = `${col},${row}`;
                if (
                    this.mapData[row][col] === this.tileTypes.EMPTY &&
                    !occupied.has(posKey) &&
                    !this._isInPen(col, row) &&
                    !this._isInPortalOrTunnel(col, row)
                ) {
                    dots.push(new CollectibleEntity(col, row, 'dot', { points: settings.dotPoints }));
                } else if (this.mapData[row][col] === this.tileTypes.EMPTY && occupied.has(posKey)) {
                    console.log(`Skipping dot at ${col},${row} - position is occupied`);
                }
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
