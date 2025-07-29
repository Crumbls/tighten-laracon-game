// Modern ES6 InputHandler module for laraconman
class InputHandler {
    constructor() {
        this.keys = {};
        this.currentDirection = null;
        this.queuedDirection = null;

        // Direction constants
        this.DIRECTIONS = {
            UP: 'up',
            DOWN: 'down',
            LEFT: 'left',
            RIGHT: 'right'
        };

        // Key mapping for navigation
        this.keyMap = {
            'ArrowUp': this.DIRECTIONS.UP,
            'KeyW': this.DIRECTIONS.UP,
            'ArrowDown': this.DIRECTIONS.DOWN,
            'KeyS': this.DIRECTIONS.DOWN,
            'ArrowLeft': this.DIRECTIONS.LEFT,
            'KeyA': this.DIRECTIONS.LEFT,
            'ArrowRight': this.DIRECTIONS.RIGHT,
            'KeyD': this.DIRECTIONS.RIGHT
        };

        this.callbacks = {
            onDirectionChange: null,
            onKeyPress: null, // NEW: generic key press
            onPause: null,
            onReset: null
        };

        this.setupEventListeners();
    }

    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    getCurrentDirection() {
        return this.currentDirection;
    }

    getQueuedDirection() {
        return this.queuedDirection;
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            // Prevent browser scroll for arrow keys
            if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
                e.preventDefault();
            }
            // Navigation keys
            if (this.keyMap[e.code]) {
                this.handleDirectionInput(e.code);
            }
            // Pause (Escape)
            else if (e.code === 'Escape' && this.callbacks.onPause) {
                this.callbacks.onPause();
            }
            // Reset (R)
            else if ((e.code === 'KeyR' || e.code === 'F5') && this.callbacks.onReset) {
                this.callbacks.onReset();
            }
            // Enter/Return
            else if ((e.code === 'Enter' || e.code === 'NumpadEnter') && this.callbacks.onKeyPress) {
                this.callbacks.onKeyPress('enter', e);
            }
            // Any other key
            else if (this.callbacks.onKeyPress) {
                this.callbacks.onKeyPress(e.code, e);
            }
        }, { passive: false });
    }

    handleDirectionInput(code) {
        const direction = this.keyMap[code];
        if (direction && direction !== this.currentDirection) {
            this.queuedDirection = direction;
            this.currentDirection = direction;
            if (this.callbacks.onDirectionChange) {
                this.callbacks.onDirectionChange(direction);
            }
        }
    }
}

export default InputHandler;