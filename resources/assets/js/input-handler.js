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
            'arrowup': this.DIRECTIONS.UP,
            'keyw': this.DIRECTIONS.UP,
            'arrowdown': this.DIRECTIONS.DOWN,
            'keys': this.DIRECTIONS.DOWN,
            'arrowleft': this.DIRECTIONS.LEFT,
            'keya': this.DIRECTIONS.LEFT,
            'arrowright': this.DIRECTIONS.RIGHT,
            'keyd': this.DIRECTIONS.RIGHT
        };

        this.callbacks = {
            onDirectionChange: null,
            onKeyPress: null,
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

            let code = e.code.toLowerCase();
            // Navigation keys
            if (this.keyMap[code]) {
                this.handleDirectionInput(code);
            }
            // Pause (Escape)
            else if (code === 'keyp' && this.callbacks.onPause) {

                this.callbacks.onPause();
            }
            else if ((code === 'keyr' || code === 'f5') && this.callbacks.onReset) {
                this.callbacks.onReset();
            }
            // Enter/Return
            else if ((code === 'enter' || code === 'numpadenter' || code === 'return') && this.callbacks.onEnter) {
                this.callbacks.onEnter();
            }
            // Any other key
            else if (this.callbacks.onKeyPress) {
                this.callbacks.onKeyPress(e.code, e);
            }
        }, { passive: false });
    }

    handleDirectionInput(code) {
        console.log(code);
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