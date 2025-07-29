import settings from './settings.js';
import { debounce, throttleLeading } from './fx.js';
import InputHandler from './input-handler.js';
import MapRenderer from './map-renderer.js';
import PlayerEntity from './player-entity.js';
import GhostEntity from './ghost-entity.js';
import PF from 'pathfinding'; // Import PathFinding.js
import entityArt from './entity-art.js';
import EventEmitter from 'events';
import CollectibleEntity from './collectible-entity.js';
import CollectibleSpawner from './collectible-spawner.js';
import AudioHandler from './audio-handler.js';

// Main game coordination using modular architecture
class Game {
    ghosts = [];
    constructor() {
        this.canvas = null;
        this.mapRenderer = null;
        this.inputHandler = null;
        this.gameState = 'welcome'; // gameover, welcome, stopped, playing, paused
        this.currentMap = null;
        this.player = null;

        // Game elements initialized from settings
        this.score = settings.score;
        this.lives = settings.lives;
        this.level = settings.level;
        this.moveInc = settings.moveInc;
        this.speed = settings.speed;
        this.gameTime = settings.gameTime;
        this.mazeSource = settings.mazeSource;
        this.basicVision = settings.basicVision;
        this.resetModeOnResetGame = settings.resetModeOnResetGame;
        this.excludeReverseDirectionInRandomMode = settings.excludeReverseDirectionInRandomMode;
        this.fx = settings.fx;
        this.extras = settings.extras;
        this.maxGhosts = (settings && settings.maxGhosts) || 3;
        
        // Death message tracking
        this.lastKillerGhost = null;
        this.deathMessageTimer = 0;
        this.deathMessageDuration = 180; // 3 seconds at 60fps

        // Input handler: dump all input to console
        this.inputHandler = new InputHandler();

        // Initialize audio handler with path from view
        const audioPath = window.laraconmanAudioPath || '/assets/audio/';
        console.log(audioPath);
        this.audioHandler = new AudioHandler(audioPath);
        
        // Make audio handler available globally for debugging
        window.gameAudioHandler = this.audioHandler;

        this.resetInputHandlerCallbacks();

        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }

        // Add event emitter for tile events
        this.tileEventEmitter = new TileEventEmitter();
        this.ghostReleaseTimer = 0;
        this.ghostReleaseInterval = 200; // frames between releases (adjustable)
        this.ghostPool = [...entityArt.ghosts]; // All possible ghosts
        this.activeGhosts = []; // Ghosts currently in play
        this.collisionEmitter = new EventEmitter();

        this.ghostPenTimers = new Map(); // Track time each ghost spends in pen
        this.ghostExitTimers = new Map(); // Track how long a ghost has been trying to exit
        this.ghostExitTimeout = 2 * 60; // 2 seconds at 60fps
        // Ghost pen timeout (in frames, from settings)
        this.ghostPenTimeout = (settings.ghostPenTimeout || 2) * 60;
        this.collisionCooldowns = new Map(); // Track entity collision cooldowns
        this.collisionCooldownFrames = 30; // Half a second at 60fps
        
        // Portal teleportation cooldowns to prevent loops
        this.portalCooldowns = new Map(); // Track entity portal usage
        this.portalCooldownFrames = 30; // Half second cooldown after teleport

        // Listen for superdot pickup events
        this.tileEventEmitter.on(event => {
            if (event.type === 'superdot') {
                console.log('Superdot event triggered:', event);
                // Set player super state
                if (this.player && typeof this.player.setSuperState === 'function') {
                    this.player.setSuperState(true);
                    setTimeout(() => {
                        this.player.setSuperState(false);
                    }, (settings.megaPelletDuration || 5) * 1000);
                }
                // For each ghost not in pen, pick a random destination away from player
                const player = this.player;
                const ghosts = this.ghosts || [];
                const mapData = this.mapRenderer.mapData;
                const minDistance = 6; // tiles away from player
                const usedSpots = new Set();
                ghosts.forEach((ghost, idx) => {
                    if (ghost.state !== 'in_pen' && ghost.state !== 'exiting') {
                        let tries = 0;
                        let dest;
                        do {
                            const angle = Math.random() * 2 * Math.PI;
                            const dist = minDistance + Math.floor(Math.random() * 4) + idx;
                            const col = Math.max(1, Math.min(mapData[0].length - 2, player.col + Math.round(Math.cos(angle) * dist)));
                            const row = Math.max(1, Math.min(mapData.length - 2, player.row + Math.round(Math.sin(angle) * dist)));
                            dest = {col, row};
                            tries++;
                        } while (
                            (mapData[dest.row][dest.col] !== this.mapRenderer.TILES.EMPTY || usedSpots.has(`${dest.col},${dest.row}`)) && tries < 10
                        );
                        usedSpots.add(`${dest.col},${dest.row}`);
                        ghost.setDestination(dest, mapData);
                        // Immediately update ghost direction and path
                        if (typeof ghost.moveToDestination === 'function') {
                            ghost.pathStep = 1;
                            ghost.moveToDestination();
                        }
                    }
                });
            }
        });
    }

    /**
     * Initialize the game
     */
    init() {
        this.canvas = document.getElementById('gameCanvas');

        if (!this.canvas) {
            console.error('Game canvas not found');
            return;
        }
        this.gameState = 'welcome';

        this.audioHandler.playGameStart();

        // --- Maze rendering integration ---
        this.level = 1;
        this.score = settings.score;
        this.startRandomMap();
        this.initEventListeners();
        this.gameLoop();

        console.log('Game initialized');
    }

    /**
     * Utility: Parse and adapt CSV maze data from Blade
     * Converts pass-through tunnel (4) to renderer's tunnel (5) if needed
     */
    static parseAndAdaptMazeCsv(csvString) {
        const rows = csvString.trim().split('\n');
        return rows.map(row =>
            row.trim().split(',').map(val => {
                let n = Number(val.trim());
                // Example: adapt 4 to 5 if renderer expects 5 for tunnel
                // If MapRenderer expects 4 for tunnel, no change needed
                return n;
            })
        );
    }

    /**
     * Set up UI event listeners
     */
    setupUI() {
        const startBtn = document.getElementById('startBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        const resetBtn = document.getElementById('resetBtn');

        if (startBtn) {
            startBtn.addEventListener('click', () => this.startGame());
        }

        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => this.togglePause());
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetGame());
        }
    }

    /**
     * Load map data from DOM (passed from PHP)
     */
    loadMapFromDOM() {
        // Look for map data in a script tag or data attribute
        const mapDataScript = document.getElementById('mapData');
        if (mapDataScript) {
            try {
                this.currentMap = JSON.parse(mapDataScript.textContent);
                this.loadMap(this.currentMap);
            } catch (e) {
                console.error('Failed to parse map data:', e);
            }
        } else {
            // Fallback: look for global window variable
            if (window.gameMapData) {
                this.currentMap = window.gameMapData;
                this.loadMap(this.currentMap);
            } else {
                console.warn('No map data found. Using test map.');
                this.loadTestMap();
            }
        }
    }

    /**
     * Load a map into the renderer
     * @param {object} mapData - Map data from database
     */
    loadMap(mapData) {
        if (!mapData || !mapData.design) {
            console.error('Invalid map data');
            return;
        }

        console.log('Loading map:', mapData.name);

        // Load map into renderer
        this.mapRenderer.loadMap(mapData.design, mapData.width, mapData.height);

        // Render the map
        this.mapRenderer.render();

        // Update UI
        this.updateUI();
    }

    /**
     * Load a test map for development
     */
    loadTestMap() {
        const testMap = {
            name: 'Test Map',
            width: 19,
            height: 21,
            design: `1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
1,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,1
1,2,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,2,1
1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1
1,2,1,1,2,1,2,1,1,1,1,1,2,1,2,1,1,2,1
1,2,2,2,2,1,2,2,2,1,2,2,2,1,2,2,2,2,1
1,1,1,1,2,1,1,1,0,1,0,1,1,1,2,1,1,1,1
0,0,0,1,2,1,0,0,0,0,0,0,0,1,2,1,0,0,0
1,1,1,1,2,1,0,1,3,3,3,1,0,1,2,1,1,1,1
4,0,0,0,2,0,0,1,0,0,0,1,0,0,2,0,0,0,4
1,1,1,1,2,1,0,1,1,1,1,1,0,1,2,1,1,1,1
0,0,0,1,2,1,0,0,0,0,0,0,0,1,2,1,0,0,0
1,1,1,1,2,1,1,1,0,1,0,1,1,1,2,1,1,1,1
1,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,1
1,2,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,2,1
1,2,2,1,2,2,2,2,2,2,2,2,2,2,2,1,2,2,1
1,1,2,1,2,1,2,1,1,1,1,1,2,1,2,1,2,1,1
1,2,2,2,2,1,2,2,2,1,2,2,2,1,2,2,2,2,1
1,2,1,1,1,1,1,1,2,1,2,1,1,1,1,1,1,2,1
1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1
1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1`
        };

        this.currentMap = testMap;
        this.loadMap(testMap);
    }

    /**
     * Start the game
     */
    startGame() {
        if (this.gameState === 'stopped') {
            this.gameState = 'playing';
            this.updateUI();
            console.log('Game started');

            // Initialize entities if we have a map
            if (this.mapRenderer && this.mapRenderer.mapData) {
                this.initPlayer(this.mapRenderer.mapData, this.mapRenderer.tileSize);
                this.initCollectibles();
            }
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            this.updateUI();
            console.log('Game resumed');
        }
    }

    resetInputHandlerCallbacks() {
        let $this = this;
        this.inputHandler.setCallbacks({
            onDirectionChange: dir => console.log('Direction:', dir),
                onDirectionChange: dir => {
                    if (this.player) {
                        $this.player.setDirection(dir);
                    }
                    },
            onEnter: function() {
                if ($this.gameState === 'welcome') {
console.log('line 1');
                    /**
                     * stop welcome audio. start munching audio.
                     */
                    $this.audioHandler.stop('beginning'); // Stop the initial game start music
                    $this.gameState = 'playing';
                    return;
                } else if ($this.gameState === 'gameover') {
                    console.log('line 2');
                    $this.restartGame();
                } else {
                    console.log('line 3');

                    console.log($this.gameState);
                    $this.audioHandler.stopAll();
                }
            },
            onPause:function() {
                if ($this.gameState == 'paused') {
                    $this.gameState = 'playing';
                } else if ($this.gameState == 'playing') {
                    $this.gameState = 'paused';
                    $this.audioHandler.stopAll();
                }
            },
            onReset: function() {
                if ($this.gameState === 'gameover') {
                    $this.restartGame();
                } else {
                    console.log('Reset requested');
                }
            }
        });
    }

    /**
     * Toggle pause state
     */
    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            console.log('Game paused');
        } else if (this.gameState === 'paused') {  
            this.gameState = 'playing';
            console.log('Game resumed');
        }
        this.updateUI();
    }

    /**
     * Reset the game
     */
    resetGame() {
        this.gameState = 'stopped';
        this.score = 0;
        this.lives = settings.lives;

        // Reset input handler
        this.inputHandler.reset();

        // Reload current map
        if (this.currentMap) {
            this.loadMap(this.currentMap);
        }

        this.updateUI();
        console.log('Game reset');
    }

    /**
     * Restart game from game over screen
     */
    restartGame() {
        // Reset game values
        this.score = 0;
        this.lives = settings.lives;

        
        // Clear ghosts
        this.ghosts = [];
        this.activeGhosts = [];
        this.ghostPenTimers.clear();
        this.ghostExitTimers.clear();
        this.collisionCooldowns.clear();
        this.portalCooldowns.clear();
        this.ghostReleaseTimer = 0;
        
        // Reinitialize game components
        this.initPlayer(this.mapRenderer.mapData, this.mapRenderer.tileSize);
        this.initCollectibles();


        console.log(this.gameState);
        this.gameState = 'welcome';
        // Update UI
        this.updateUI();

        console.log(this.gameState);
        
        console.log('Game restarted');
    }

    /**
     * Handle direction changes from input
     * @param {string} direction - New movement direction
     */
    handleDirectionChange(direction) {
        if (this.gameState !== 'playing') return;

        console.log('Direction changed:', direction);
        // TODO: Update player movement direction
    }

    /**
     * Update UI elements
     */
    updateUI() {
        // Update score and lives - show "-" when game is over or in welcome state
        const scoreElement = document.getElementById('score');
        const livesElement = document.getElementById('lives');
        
        if (this.gameState === 'gameover' || this.gameState === 'welcome') {
            if (scoreElement) {
                scoreElement.textContent = '-';
            }
            if (livesElement) {
                livesElement.textContent = '-';
            }
        } else {
            if (scoreElement) {
                scoreElement.textContent = this.score;
            }
            if (livesElement) {
                livesElement.textContent = this.lives;
            }
        }

        // Update button states
        const startBtn = document.getElementById('startBtn');
        const pauseBtn = document.getElementById('pauseBtn');

        if (startBtn) {
            startBtn.textContent = this.gameState === 'stopped' ? 'Start Game' : 'Resume';
            startBtn.disabled = this.gameState === 'playing';
        }

        if (pauseBtn) {
            pauseBtn.textContent = this.gameState === 'paused' ? 'Resume' : 'Pause';
            pauseBtn.disabled = this.gameState === 'stopped';
        }
    }

    /**
     * Get current game state
     * @returns {string} Current game state
     */
    getGameState() {
        return this.gameState;
    }

    /**
     * Get current map data
     * @returns {object} Current map data
     */
    getCurrentMap() {
        return this.currentMap;
    }

    /**
     * Initialize player entity
     * @param {array} mapData - Map data
     * @param {number} tileSize - Tile size
     */
    initPlayer(mapData, tileSize) {
        // Find ghost pen tiles
        let penTiles = [];
        for (let r = 0; r < mapData.length; r++) {
            for (let c = 0; c < mapData[0].length; c++) {
                if (mapData[r][c] === this.mapRenderer.TILES.GHOST_SPAWN) {
                    penTiles.push({col: c, row: r});
                }
            }
        }
        // Find center-most tile below the pen that is EMPTY
        let playerStart = { col: 1, row: 1 };
        if (penTiles.length > 0) {
            // Compute center col of pen
            let penCols = penTiles.map(t => t.col);
            let penRows = penTiles.map(t => t.row);
            let minCol = Math.min(...penCols), maxCol = Math.max(...penCols);
            let centerCol = Math.round((minCol + maxCol) / 2);
            // Search downward from just below pen, only at centerCol
            for (let r = Math.max(...penRows) + 1; r < mapData.length-1; r++) {
                if (mapData[r][centerCol] === this.mapRenderer.TILES.EMPTY) {
                    playerStart = {col: centerCol, row: r};
                    break;
                }
            }
        } else {
            // fallback to old logic
            outer: for (let r = 1; r < mapData.length-1; r++) {
                for (let c = 1; c < mapData[0].length-1; c++) {
                    if (mapData[r][c] === 0) {
                        playerStart = { col: c, row: r };
                        break outer;
                    }
                }
            }
        }
        const speed = 2;
        this.player = new PlayerEntity(playerStart.col, playerStart.row, tileSize, mapData, settings);
        this.resetInputHandlerCallbacks();
    }

    /**
     * --- COLLISION DETECTION: ALL COLLISION LOGIC HERE ---
     * Check for item collision and emit event
     */
    checkCollisions(entity) {
        if (!entity.hasMovedFromSpawn) {
            return;
        }

        // Ghost collision
        for (const ghost of this.ghosts) {
            if (ghost.col === entity.col && ghost.row === entity.row) {
                if (entity.state == 'normal') {
                    // Player is not super: lose a life, respawn, etc.
                    const points = settings.playerDeathPoints || 0; // Usually 0 for player death
                    this.collisionEmitter.emit('player-eaten', {
                        player: entity,
                        ghost,
                        points
                    });
                } else {
                    // Player is super: eat the ghost, award points
                    const points = ghost.options?.points || settings.ghostPoints || 200;
                    this.collisionEmitter.emit('ghost-eaten', {
                        player: entity,
                        ghost,
                        points
                    });
                    this.score += points;
                }
                this.updateUI && this.updateUI();
                return;
            }
        }
        // Fruit collision
        for (const fruit of this.fruit || []) {
            if (fruit.col === entity.col && fruit.row === entity.row && !fruit.eaten && !fruit.animating) {
                fruit.type = this.mapRenderer.TILES.FRUIT;
                this.collisionEmitter.emit('collision-consumable', {
                    player: entity,
                    consumed: fruit
                });
                return;
            }
        }
        // Dot collision
        for (let i = this.dots.length - 1; i >= 0; i--) {

            const sprite = this.dots[i];
            if (sprite.col === entity.col && sprite.row === entity.row) {
                // Handle dot collision (fire event, remove dot, etc.)
                sprite.type = this.mapRenderer.TILES.DOT;
                this.collisionEmitter.emit('collision-consumable', {
                    player: entity,
                    consumed: sprite
                });
                return;
            }
        }
        // Superdot collision
        if (this.superdots && this.superdots.length) {
            for (let i = this.superdots.length - 1; i >= 0; i--) {
                const sprite = this.superdots[i];
                if (sprite.col === entity.col && sprite.row === entity.row) {
//                    console.log('superdot collision');
                    // Handle superdot collision
                    sprite.type = this.mapRenderer.TILES.SUPER_DOT;
                    this.collisionEmitter.emit('collision-consumable', {
                        player: entity,
                        consumed: sprite
                    });
                    return;

                }
            }
        }

        // Portal collision
        const tile = this.mapRenderer.mapData[entity.row][entity.col];
        if (tile === this.mapRenderer.TILES.PORTAL) {
            let entityType = entity.type;
            const portalKey = `${entityType}:portal:${entity.col},${entity.row}`;
            const cooldown = this.portalCooldowns.get(portalKey) || 0;

            if (cooldown === 0) {
                const dest = this.findOppositePortal(entity.col, entity.row);
                if (dest) {
                    // Set cooldown for both entry and exit portal
                    const destKey = `${entityType}:portal:${dest.col},${dest.row}`;
                    this.portalCooldowns.set(portalKey, this.portalCooldownFrames);
                    this.portalCooldowns.set(destKey, this.portalCooldownFrames);
                    // Move entity one block away from portal exit toward map center
                    let dCol = 0, dRow = 0;
                    const centerCol = Math.floor(this.mapRenderer.mapData[0].length / 2);
                    if (dest.col < centerCol) dCol = 1;
                    else if (dest.col > centerCol) dCol = -1;
                    // If vertical tunnel, bias row
                    const centerRow = Math.floor(this.mapRenderer.mapData.length / 2);
                    if (dest.row < centerRow) dRow = 1;
                    else if (dest.row > centerRow) dRow = -1;
                    let newCol = dest.col + dCol;
                    let newRow = dest.row + dRow;
                    // Only move if new tile is walkable
                    const walkable = [this.mapRenderer.TILES.EMPTY, this.mapRenderer.TILES.DOT, this.mapRenderer.TILES.SUPER_DOT];
                    if (
                        newCol >= 0 && newCol < this.mapRenderer.mapData[0].length &&
                        newRow >= 0 && newRow < this.mapRenderer.mapData.length &&
                        walkable.includes(this.mapRenderer.mapData[newRow][newCol])
                    ) {
                        this.teleportEntity(entity, {col: newCol, row: newRow});
                        // Set cooldown for the ejection tile as well
                        const ejectionKey = `${entityType}:portal:${newCol},${newRow}`;
                        this.portalCooldowns.set(ejectionKey, this.portalCooldownFrames);
                    } else {
                        this.teleportEntity(entity, dest);
                    }
                    // Emit appropriate event
                    let col = entity.col, row = entity.row;
                    if (entityType === 'player') {
                        if (dCol !== 0) col += dCol;
                        this.collisionEmitter.emit('player-portal', {
                            player: entity,
                            from: { col, row },
                            to: dest
                        });
                    } else if (entityType === 'ghost') {
                        this.collisionEmitter.emit('ghost-portal', {
                            ghost: entity,
                            from: { col, row },
                            to: dest
                        });
                        entity.destination = null;
                        entity.path = null;
                        entity.pathStep = 0;
                    }
                }
            }
        }
    }

    /**
     * Spawn a ghost at a random ghost spawn tile INSIDE THE PEN
     */
    spawnGhost() {
        if (this.ghosts.length >= this.maxGhosts) return;
        if (this.gameState !== 'playing') return; // Don't spawn when paused or stopped

        // Find all ghost spawn tiles inside the pen (classic: 2 rows x 4 cols above door)
        const spawns = [];
        const data = this.mapRenderer.mapData;
        for (let r = 0; r < data.length; r++) {
            for (let c = 0; c < data[0].length; c++) {
                if (data[r][c] === this.mapRenderer.TILES.GHOST_SPAWN) spawns.push({col: c, row: r});
            }
        }
        if (spawns.length === 0) return;
        // Pick a random pen tile for each new ghost
        const idx = Math.floor(Math.random() * spawns.length);
        const spawn = spawns[idx];
        const usedNames = this.activeGhosts.map(g => g.name);
        const available = this.ghostPool.filter(g => !usedNames.includes(g.name));
        if (available.length === 0 || this.ghosts.length >= this.maxGhosts) return;
        const ghostConfig = available[Math.floor(Math.random() * available.length)];
        const ghostSpeed = 2;
        const ghostColor = ghostConfig.color || '#FF0000';
        const ghost = new GhostEntity(
            spawn.col,
            spawn.row,
            this.mapRenderer.tileSize,
            this.mapRenderer.mapData,
            ghostSpeed,
            ghostColor,
            this.mapRenderer.TILES
        );
        ghost.image = ghostConfig.image;
        ghost.displayName = ghostConfig.name;
        this.ghosts.push(ghost);
        this.activeGhosts.push(ghostConfig);
    }

    /**
     * Move ghosts with pathfinding to a random destination outside the pen
     */
    moveGhosts() {
        if (this.gameState !== 'playing') {
            return; // Don't move ghosts when stopped or paused
        }
        const data = this.mapRenderer.mapData;
        const penTiles = [];
        for (let r = 0; r < data.length; r++) {
            for (let c = 0; c < data[0].length; c++) {
                if (data[r][c] === this.mapRenderer.TILES.GHOST_SPAWN) penTiles.push(`${c},${r}`);
            }
        }
        for (const ghost of this.ghosts) {
            if (ghost.state === 'in_pen') {
                // Move randomly within pen
                const dirs = ['up','down','left','right'].filter(dir => ghost.canMove(dir));
                if (dirs.length > 0) {
                    const dir = dirs[Math.floor(Math.random()*dirs.length)];
                    ghost.setDirection(dir);
                }
                // Fallback: force-evict after timeout
                const t = this.ghostPenTimers.get(ghost) || 0;
                this.ghostPenTimers.set(ghost, t + 1);
                if (t + 1 > this.ghostPenTimeout) {
                    ghost.setState('exiting');
                    this.ghostPenTimers.delete(ghost);
                    // Pick a destination OUTSIDE the pen ONLY if not already set
                    if (!ghost.destination) {
                        let candidates = [];
                        for (let r = 0; r < data.length; r++) {
                            for (let c = 0; c < data[0].length; c++) {
                                const tile = data[r][c];
                                if ((tile === this.mapRenderer.TILES.EMPTY || tile === this.mapRenderer.TILES.DOT || tile === this.mapRenderer.TILES.SUPER_DOT)
                                    && !penTiles.includes(`${c},${r}`)
                                    && !(ghost.col === c && ghost.row === r)) {
                                    candidates.push({col: c, row: r});
                                }
                            }
                        }
                        if (candidates.length > 0) {
                            const dest = candidates[Math.floor(Math.random()*candidates.length)];
                            ghost.setDestination(dest, data);
                        }
                    }
                    ghost.moveToDestination();
                } else {
                    ghost.move();
                }
            } else if (ghost.state === 'exiting') {
                // Always move to destination if exiting
                ghost.moveToDestination();
                if (ghost.atDestination() && !penTiles.includes(`${ghost.col},${ghost.row}`)) {
                    ghost.setState('active');
                }
            } else if (ghost.state === 'active') {
                // If ghost is active and has no destination or has reached its destination, pick a new one
                if (!ghost.destination || ghost.atDestination()) {
                    let candidates = [];
                    for (let r = 0; r < data.length; r++) {
                        for (let c = 0; c < data[0].length; c++) {
                            const tile = data[r][c];
                            if ((tile === this.mapRenderer.TILES.EMPTY || tile === this.mapRenderer.TILES.DOT || tile === this.mapRenderer.TILES.SUPER_DOT)
                                && !penTiles.includes(`${c},${r}`)) {
                                candidates.push({col: c, row: r});
                            }
                        }
                    }
                    if (candidates.length > 0) {
                        const dest = candidates[Math.floor(Math.random()*candidates.length)];
                        ghost.setDestination(dest, data);
                    }
                }
                ghost.moveToDestination();
            } else {
                this.ghostPenTimers.delete(ghost);
                ghost.move();
            }
        }
    }

    /**
     * Game loop only
     */
    oldGameLoop() {
        this.mapRenderer.render();
        this.renderCollectibles(this.mapRenderer.ctx);
        if (this.player) {
            this.player.render(this.mapRenderer.ctx, entityArt);

            if (this.gameState == 'playing') {
                this.player.move();
                this.checkCollisions(this.player);
            }
        }
        if (this.gameState === 'welcome') {
            this.drawWelcomeScreen();
        } else if (this.gameState === 'gameover') {
            this.drawGameOverScreen();
        } else if (this.gameState == 'highscore') {
            alert('even more bad words');
        } else if (this.gameState === 'paused') {
            // When paused, still render ghosts but don't move or spawn them
            for (const ghost of this.ghosts) ghost.render(this.mapRenderer.ctx);
            this.drawOverlay('PAUSED', 'Press P to Resume');
        } else {
            // Only move and spawn ghosts when playing
            this.moveGhosts();
            for (const ghost of this.ghosts) ghost.render(this.mapRenderer.ctx);

            // Ghost release logic
            this.ghostReleaseTimer++;
            if (this.ghostReleaseTimer >= this.ghostReleaseInterval) {
                this.spawnGhost();
                this.ghostReleaseTimer = 0;
            }

            // Update collision cooldowns
            this.updateCollisionCooldowns();
        }
        
        requestAnimationFrame(() => this.gameLoop());
    }

    drawWelcomeScreen() {
        this.drawOverlay('WakaWaka', 'Press Enter to Start');
    }

    drawPauseScreen() {
        this.drawOverlay('PAUSED', 'Press P to Resume');
    }

    drawGameOverScreen() {
        const ctx = this.mapRenderer.ctx;
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', ctx.canvas.width / 2, ctx.canvas.height / 2 - 60);
        
        ctx.fillStyle = 'white';
        ctx.font = '24px Arial';
        ctx.fillText(`Final Score: ${this.score}`, ctx.canvas.width / 2, ctx.canvas.height / 2 - 10);
        ctx.font = '20px Arial';
        ctx.fillText('Press R to Restart', ctx.canvas.width / 2, ctx.canvas.height / 2 + 30);
        ctx.restore();
    }

    drawOverlay(title, subtitle) {
        const ctx = this.mapRenderer.ctx;
        ctx.save();
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = 'white';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(title, ctx.canvas.width / 2, ctx.canvas.height / 2 - 20);
        ctx.font = '24px Arial';
        ctx.fillText(subtitle, ctx.canvas.width / 2, ctx.canvas.height / 2 + 30);
        ctx.restore();
    }

    drawDeathMessage() {
        if (this.deathMessageTimer <= 0 || !this.lastKillerGhost) return;
        
        const ctx = this.mapRenderer.ctx;
        ctx.save();
        
        // Semi-transparent background
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        // Death message
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('ELIMINATED BY', ctx.canvas.width / 2, ctx.canvas.height / 2 - 30);
        
        ctx.fillStyle = '#ffff00';
        ctx.font = 'bold 28px Arial';
        ctx.fillText(this.lastKillerGhost, ctx.canvas.width / 2, ctx.canvas.height / 2 + 10);
        
        // Fade effect based on remaining time
        const fadeRatio = this.deathMessageTimer / this.deathMessageDuration;
        ctx.globalAlpha = fadeRatio;
        
        ctx.restore();
    }

    renderCollectibles(ctx) {
        if (this.fruit) this.fruit.forEach((fruit) => {
            // Find the correct art based on the fruit's name
            const artForFruit = entityArt.fruit.find(art => art.name === fruit.options.name);
            fruit.render(ctx, this.mapRenderer.tileSize, artForFruit);
        });
        if (this.dots) this.dots.forEach(dot => dot.render(ctx, this.mapRenderer.tileSize));
    }

    updateCollectibleAnimations() {
        if (this.fruit) {
            // Update fruit animations and remove completed ones
            this.fruit = this.fruit.filter(fruit => {
                fruit.updateAnimation();
                return fruit.active; // Keep only active fruits
            });
        }
    }
    /**
     * Get everything at a specific coordinate
     */
    getWhatIsAt(col, row) {
        const result = {
            tile: this.mapRenderer.mapData[row] ? this.mapRenderer.mapData[row][col] : null,
            entities: []
        };

        // Check for other entities at this position
        if (this.player && this.player.col === col && this.player.row === row) {
            result.entities.push({ type: 'player', entity: this.player });
        }

        for (const ghost of this.ghosts) {
            if (ghost.col === col && ghost.row === row) {
                result.entities.push({ type: 'ghost', entity: ghost });
            }
        }

        if (this.pellets) {
            for (const pellet of this.pellets) {
                if (pellet.col === col && pellet.row === row) {
                    result.entities.push({ type: 'pellet', entity: pellet });
                }
            }
        }

        if (this.fruits) {
            for (const fruit of this.fruits) {
                if (fruit.col === col && fruit.row === row) {
                    result.entities.push({ type: 'fruit', entity: fruit });
                }
            }
        }

        return result;
    }

    /**
     * Fire collision events for entity hitting something
     */
    fireCollisionEvents(entity, collisions) {
        const entityType = this.getEntityType(entity);
        
        // Handle entity vs entity collisions
        for (const collision of collisions.entities) {
            if (collision.entity === entity) continue; // Don't collide with self
            
            const key = `${entityType}:${collision.type}:${collision.entity.id || collision.entity.displayName || collision.entity.color}`;

            if (entityType == 'ghost' && collision.type === 'ghost') {
                return;
            }

            if (entityType === 'ghost' && collision.type === 'player') {
                /**
                 * We ignore this one.
                 */
                return;
            } else if (entityType === 'player' && collision.type === 'ghost') {
                // Player collided with ghost
                const isSuper = typeof entity.isSuperState === 'function' ? entity.isSuperState() : false;
                if (isSuper) {
                    console.log('super user');
                    // Player wins: ghost should go to pen, award points
                    const points = collision.entity.options?.points || settings.ghostPoints || 200;
                    this.collisionEmitter.emit('ghost-eaten', {
                        player: entity,
                        ghost: collision.entity,
                        points
                    });
                } else {
                    console.log(
                        'ghosty!'
                    )
                    // Ghost wins: player should respawn, lose life
                    const points = settings.playerDeathPoints || 0; // Usually 0 for player death
                    this.collisionEmitter.emit('player-eaten', {
                        player: entity,
                        ghost: collision.entity,
                        points
                    });
                }
                this.setEventCooldown(key);
                continue;
            }
            if (this.shouldFireEvent(key)) {
                this.collisionEmitter.emit(`${entityType}-${collision.type}`, {
                    [entityType]: entity,
                    [collision.type]: collision.entity
                });
                this.setEventCooldown(key);
            } else {
                console.log(key);
            }
        }
        // Handle tile collisions (portals, collectibles on map)
        if (collisions.tile) {
            this.handleTileCollision(entity, collisions.tile, entity.col, entity.row);
        }
    }

    /**
     * Teleport entity to destination
     */
    teleportEntity(entity, dest) {
        entity.col = dest.col;
        entity.row = dest.row;
        entity.x = dest.col * entity.tileSize;
        entity.y = dest.row * entity.tileSize;
        entity.targetX = entity.x;
        entity.targetY = entity.y;
        entity.moving = false;
    }

    /**
     * Get entity type string
     */
    getEntityType(entity) {
        if (entity === this.player) return 'player';
        if (this.ghosts.includes(entity)) return 'ghost';
        return 'unknown';
    }

    /**
     * Check if event should fire (not in cooldown)
     */
    shouldFireEvent(key) {
        const cooldown = this.collisionCooldowns.get(key) || 0;
        return cooldown === 0;
    }

    /**
     * Set event cooldown
     */
    setEventCooldown(key) {
        this.collisionCooldowns.set(key, this.collisionCooldownFrames);
    }

    /**
     * Update collision cooldowns each frame
     */
    updateCollisionCooldowns() {
        // Decrement collision cooldowns
        for (const [key, value] of this.collisionCooldowns.entries()) {
            if (value > 0) {
                this.collisionCooldowns.set(key, value - 1);
            }
        }
        // Decrement portal cooldowns
        for (const [key, value] of this.portalCooldowns.entries()) {
            if (value > 0) {
                this.portalCooldowns.set(key, value - 1);
            }
        }
    }

    // Find the portal/tunnel tile on the opposite side
    findOppositePortal(col, row) {
        const portals = [];
        const map = this.mapRenderer.mapData;
        for (let r = 0; r < map.length; r++) {
            for (let c = 0; c < map[0].length; c++) {
                if (map[r][c] === this.mapRenderer.TILES.PORTAL && (c !== col || r !== row)) {
                    portals.push({ col: c, row: r });
                }
            }
        }
        if (portals.length === 0) return null;
        if (portals.length === 1) return portals[0];
        // Try to match by row (left/right tunnels)
        for (const p of portals) {
            if (p.row === row) return p;
        }
        // If not found, try to match by column (top/bottom tunnels)
        for (const p of portals) {
            if (p.col === col) return p;
        }
        // Fallback: pick the farthest (classic Pac-Man: left/right edge)
        let maxDist = -1, best = null;
        for (const p of portals) {
            const dist = Math.abs(p.col - col) + Math.abs(p.row - row);
            if (dist > maxDist) {
                maxDist = dist;
                best = p;
            }
        }
        return best;
    }

    // Helper: bounding-box collision for entities
    isEntityColliding(a, b) {
        const size = Math.min(a.tileSize, b.tileSize) * 0.6; // 60% of tile size for hitbox
        return (
            Math.abs(a.x - b.x) < size &&
            Math.abs(a.y - b.y) < size
        );
    }

    setScore(val) {
        this.score = val;
        console.log('Score updated:', val);
        this.updateUI && this.updateUI();
    }
    getScore() {
        return this.score;
    }

    /**
     * Game loop 2 wtf
     */
    gameLoop() {
        this.mapRenderer.render();
        
        // Update collectible animations
        this.updateCollectibleAnimations();
        
        this.renderCollectibles(this.mapRenderer.ctx);
        if (this.player) {
            this.player.render(this.mapRenderer.ctx, entityArt);

            if (this.gameState == 'playing' && this.deathMessageTimer <= 0) {
                this.player.move();
                this.checkCollisions(this.player);
            }
        }

        if (this.gameState === 'welcome') {
            this.drawWelcomeScreen();
        } else if (this.gameState === 'paused') {
            // When paused, still render ghosts but don't move or spawn them
            for (const ghost of this.ghosts) ghost.render(this.mapRenderer.ctx);
            this.drawPauseScreen();
        } else if (this.gameState === 'gameover') {
            this.drawGameOverScreen();
        } else if (this.gameState == 'highscore') {
        } else {

            // Only move and spawn ghosts when playing
            this.moveGhosts();
            for (const ghost of this.ghosts) ghost.render(this.mapRenderer.ctx);

            // Ghost release logic
            this.ghostReleaseTimer++;
            if (this.ghostReleaseTimer >= this.ghostReleaseInterval) {
                this.spawnGhost();
                this.ghostReleaseTimer = 0;
            }

            // Update collision cooldowns
            this.updateCollisionCooldowns();
        }
        
        // Handle death message display and timer
        if (this.deathMessageTimer > 0) {
            this.drawDeathMessage();
            this.deathMessageTimer--;
        }
        
        requestAnimationFrame(() => this.gameLoop());
    }

    pickRandomMap() {
        if (window.laraconmanMazeCsvs) {
            const mapKeys = Object.keys(window.laraconmanMazeCsvs);
            console.log('Available maps:', mapKeys.length);
            let playedMaps = [];
            let idx;
            do {
                idx = Math.floor(Math.random() * mapKeys.length);
            } while (playedMaps.includes(idx) && playedMaps.length < mapKeys.length);
            playedMaps.push(idx);
            const selectedKey = mapKeys[idx];
            return window.laraconmanMazeCsvs[selectedKey];
        }
        return null;
    }

    startRandomMap() {
        const csv = this.pickRandomMap();
        if (!csv) return;
        const mapArray = Game.parseAndAdaptMazeCsv(csv);
        const width = mapArray[0]?.length || 0;
        const height = mapArray.length;
        this.mapRenderer = new MapRenderer(this.canvas);
        const normalizedCsv = mapArray.map(row => row.join(',')).join('\n');
        this.mapRenderer.loadMap(normalizedCsv, width, height);
        this.mapRenderer.render();
        this.initPlayer(this.mapRenderer.mapData, this.mapRenderer.tileSize);
        this.initCollectibles();
        this.level = (this.level || 1);
        this.updateUI();
    }

    checkLevelComplete() {
        // No more dots, superdots, or fruit
        if ((this.dots && this.dots.length === 0) && (this.superdots && this.superdots.length === 0) && (this.fruit && this.fruit.length === 0)) {
            this.level = (this.level || 1) + 1;
            this.updateUI();
            this.startRandomMap();
        }
    }

    initCollectibles() {
        // Use the map and tile types from mapRenderer
        const mapData = this.mapRenderer.mapData;
        const tileTypes = this.mapRenderer.TILES;
        const spawner = new CollectibleSpawner(mapData, tileTypes);
        const { superdots, dots, fruit } = spawner.spawnCollectibles();
        this.dots = dots;
        console.log('Fruit spawned:', fruit.length);
        console.log(fruit);
        // Fruit now comes directly from entityArt, so no need to override
        this.fruit = fruit;
        this.superdots = superdots;
        console.log('Final fruit array length:', this.fruit.length);
        if (this.fruit.length > 0) {
            console.log('First fruit:', this.fruit[0]);
        }
        this.checkLevelComplete();
    }

    initEventListeners() {
      this.collisionEmitter.on('collision-consumable', ({ player, consumed }) => {
          if (!consumed || !consumed.type) {
              return;
          }
          if (!consumed.options.points) {
              if (consumed.type === this.mapRenderer.TILES.FRUIT) {
                  // Pac-Man fruit score progression: 100, 300, 500, 700, 1000, 2000, 3000, 5000
                  if (!this.fruitScoreIndex) this.fruitScoreIndex = 0;
                  const fruitScores = [100, 300, 500, 700, 1000, 2000, 3000, 5000];
                  consumed.options.points = fruitScores[Math.min(this.fruitScoreIndex, fruitScores.length - 1)];
                  this.fruitScoreIndex++;
                  console.log(`Fruit score set to ${consumed.options.points}`);
              }
          }
          this.setScore(this.getScore() + consumed.options.points);
            // Remove dot from this.dots if it is a dot
            if (consumed.type === this.mapRenderer.TILES.DOT) {
                this.dots = this.dots.filter(dot => !(dot.col === consumed.col && dot.row === consumed.row));
                this.audioHandler.playChomp();
                return;
            } else if (consumed.type === this.mapRenderer.TILES.SUPER_DOT) {
                this.superdots = this.superdots.filter(dot => !(dot.col === consumed.col && dot.row === consumed.row));

                if (this.mapRenderer && this.mapRenderer.mapData) {
                    this.mapRenderer.mapData[consumed.row][consumed.col] = this.mapRenderer.TILES.EMPTY;
                }

                if (player && typeof player.setSuperState === 'function') {
                    player.setSuperState(true);
                    setTimeout(() => {
                        player.setSuperState(false);
                    }, (settings.megaPelletDuration || 5) * 1000);
                    console.log('user is a super dot!');
                } else {
                    console.log('fn or player no exist.');
                }

            } else if (consumed.type === this.mapRenderer.TILES.FRUIT) {
              const fruit = this.fruit.find(f => f.col === consumed.col && f.row === consumed.row);
              if (fruit) {
                  this.setScore(this.getScore() + fruit.options.points); // Ensure score increments on fruit eaten
                  fruit.startExplodingAnimation();
                  // Remove after explosion animation (0.5s)
                  setTimeout(() => {
                      fruit.eaten = true;
                      this.fruit = this.fruit.filter(f => f !== fruit);
                  }, 500);
                  this.audioHandler.playFruitEaten();
              }
          }
          this.checkLevelComplete();
      });
        // Add default event handlers for collisions
        this.collisionEmitter.on('collision-ghost', ({player, ghost}) => {
            console.log('Player collided with ghost:', ghost.displayName || ghost.color);
        });

        // Debounced player-eaten event handler
        this.collisionEmitter.on('player-eaten', throttleLeading(({ player, ghost }) => {
            // Store killer ghost info and start death message timer
            this.lastKillerGhost = ghost.displayName || ghost.name || 'Unknown Ghost';
            this.deathMessageTimer = this.deathMessageDuration;
            
            // Animate player death, decrement lives, respawn player
            this.lives -=1;
            if (player && typeof player.die === 'function') {
                player.die();
            }
            this.audioHandler.playPlayerDeath();
            this.gameState = 'stopped';
            this.updateUI && this.updateUI();
            if (this.lives > 0) {
                if (typeof this.initPlayer === 'function') {
                    this.initPlayer(this.mapRenderer.mapData, this.mapRenderer.tileSize);

                    this.resetInputHandlerCallbacks()
                    /*
                    this.inputHandler.setCallbacks({
                        onDirectionChange: dir => this.player.setDirection(dir)
                    });
                     */
                }
                this.gameState = 'playing';

            } else {
                this.gameState = 'gameover';
                this.updateUI && this.updateUI();
            }
            console.log(this.gameState);
        }, 1500));

        this.collisionEmitter.on('ghost-eaten', ({ player, ghost, points }) => {
            // Example: Animate ghost death, award points
            if (ghost && typeof ghost.die === 'function') {
                ghost.die(); // You may want to implement this
            }
            this.audioHandler.playGhostEaten();
            // Banish ghost to pen (set to first GHOST_SPAWN tile found)
            const map = this.mapRenderer.mapData;
            let found = false;
            for (let r = 0; r < map.length; r++) {
                for (let c = 0; c < map[0].length; c++) {
                    if (map[r][c] === this.mapRenderer.TILES.GHOST_SPAWN) {
                        ghost.col = c;
                        ghost.row = r;
                        ghost.x = c * this.mapRenderer.tileSize;
                        ghost.y = r * this.mapRenderer.tileSize;
                        ghost.state = 'in_pen';
                        found = true;
                        break;
                    }
                }
            }
            this.score += points;
            this.updateUI && this.updateUI();
        });
    }
}

// Utility to convert mapData to PathFinding.js grid format
function makePFGrid(mapData, walkableTiles) {
    const grid = [];
    for (let r = 0; r < mapData.length; r++) {
        const row = [];
        for (let c = 0; c < mapData[0].length; c++) {
            // 0 = walkable, 1 = blocked
            row.push(walkableTiles.includes(mapData[r][c]) ? 0 : 1);
        }
        grid.push(row);
    }
    return new PF.Grid(grid);
}

// Add event emitter for tile events
class TileEventEmitter {
    constructor() {
        this.listeners = [];
    }
    on(cb) { this.listeners.push(cb); }
    emit(event) { this.listeners.forEach(cb => cb(event)); }
}

// Initialize game when script loads
const game = new Game();