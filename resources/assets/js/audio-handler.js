import Pizzicato from 'pizzicato';

/**
 * Audio handler for game sound effects using Pizzicato
 * Manages loading, playing, and controlling audio for the game
 */
class AudioHandler {
    constructor(audioPath = '/vendor/laraconman/audio/') {
        this.sounds = new Map();
        this.enabled = true;
        this.volume = 0.7;
        this.currentMusic = null;
        this.musicLoop = null;
        this.audioContextStarted = false;

        if (audioPath.substr(-1) != '/') audioPath += '/';

        this.audioPath = audioPath;
        
        // Initialize audio files
        this.initializeSounds();
        
        // Try to start audio context on first user interaction
        this.setupAudioContext();
    }

    /**
     * Setup audio context for browser compatibility
     */
    setupAudioContext() {
        const startAudioContext = () => {
            if (!this.audioContextStarted) {
                // Resume or create audio context
                if (Pizzicato.context.state === 'suspended') {
                    Pizzicato.context.resume().then(() => {
                        this.audioContextStarted = true;
                    });
                } else {
                    this.audioContextStarted = true;
                }
            }
        };

        // Add event listeners for user interaction
        const events = ['click', 'keydown', 'touchstart'];
        events.forEach(event => {
            document.addEventListener(event, startAudioContext, { once: true });
        });
    }

    /**
     * Initialize and load all game sounds
     */
    initializeSounds() {
        const audioPath = this.audioPath;
        
        // Define all game sounds
        const soundDefinitions = {
            beginning: {
                file: 'pacman_beginning.mp3',
                volume: 0.8,
                loop: false
            },
            chomp: {
                file: 'pacman_chomp.mp3',
                volume: 0.6,
                loop: false
            },
            death: {
                file: 'pacman_death.mp3',
                volume: 0.8,
                loop: false
            },
            eatfruit: {
                file: 'pacman_eatfruit.mp3',
                volume: 0.7,
                loop: false
            },
            eatghost: {
                file: 'pacman_eatghost.mp3',
                volume: 0.8,
                loop: false
            },
            intermission: {
                file: 'pacman_intermission.mp3',
                volume: 0.6,
                loop: true
            }
        };

        // Load each sound
        Object.entries(soundDefinitions).forEach(([key, config]) => {
            const fullPath = audioPath + config.file;

            try {
                const sound = new Pizzicato.Sound(fullPath, () => {
                    // Success callback
                    const soundData = this.sounds.get(key);
                    if (soundData) {
                        soundData.loading = false;
                        soundData.sound.volume = config.volume * this.volume;
                        soundData.sound.loop = config.loop;
                    }
                }, (error) => {
                    // Error callback
                    this.sounds.delete(key);
                });

                // Store sound with its configuration
                this.sounds.set(key, {
                    sound,
                    config,
                    loading: true
                });

            } catch (error) {
                console.error(`Error initializing sound: ${key}`, error);
            }
        });
    }

    /**
     * Play a sound effect
     * @param {string} soundName - Name of the sound to play
     * @param {object} options - Optional playback options
     */
    play(soundName, options = {}) {
        if (!this.enabled) {
            console.log(`Audio disabled, not playing: ${soundName}`);
            return;
        }

        // Check audio context state
        if (Pizzicato.context.state === 'suspended') {
            console.warn(`Audio context suspended, attempting to resume for: ${soundName}`);
            Pizzicato.context.resume().then(() => {
                this.audioContextStarted = true;
                this.play(soundName, options);
            });
            return;
        }

        const soundData = this.sounds.get(soundName);

        if (!soundData) {
            console.warn(`Sound not found: ${soundName}`);
            console.log('Available sounds:', this.getAvailableSounds());
            return;
        }

        if (soundData.loading) {
            console.warn(`Sound still loading: ${soundName}, will retry in 100ms`);
            // Retry after a short delay (max 10 retries)
            const retries = options.retries || 0;
            if (retries < 10) {
                setTimeout(() => this.play(soundName, { ...options, retries: retries + 1 }), 100);
            } else {
                console.error(`Sound failed to load after 10 retries: ${soundName}`);
            }
            return;
        }

        const { sound } = soundData;

        try {
            // Stop if already playing (for non-looping sounds)
            if (sound.playing && !soundData.config.loop) {
                sound.stop();
            }

            // Apply any volume override
            if (options.volume !== undefined) {
                sound.volume = options.volume * this.volume;
            }

            sound.play();
            
        } catch (error) {
            console.error(`Error playing sound: ${soundName}`, error);
        }
    }

    /**
     * Stop a specific sound
     * @param {string} soundName - Name of the sound to stop
     */
    stop(soundName) {
        const soundData = this.sounds.get(soundName);
        if (soundData && soundData.sound.playing) {
            soundData.sound.stop();
        }
    }

    /**
     * Stop all currently playing sounds
     */
    stopAll() {
        this.sounds.forEach((soundData) => {
            if (soundData.sound.playing) {
                soundData.sound.stop();
            }
        });
    }

    /**
     * Set master volume
     * @param {number} volume - Volume level (0.0 to 1.0)
     */
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        
        // Update volume for all loaded sounds
        this.sounds.forEach((soundData, key) => {
            if (!soundData.loading) {
                soundData.sound.volume = soundData.config.volume * this.volume;
            }
        });
    }

    /**
     * Enable/disable audio
     * @param {boolean} enabled - Whether audio should be enabled
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            this.stopAll();
        }
    }

    /**
     * Play background music
     * @param {string} soundName - Name of the music to play
     */
    playMusic(soundName) {
        // Stop current music
        if (this.currentMusic) {
            this.stop(this.currentMusic);
        }

        this.currentMusic = soundName;
        this.play(soundName);
    }

    /**
     * Stop background music
     */
    stopMusic() {
        if (this.currentMusic) {
            this.stop(this.currentMusic);
            this.currentMusic = null;
        }
    }

    /**
     * Game-specific audio methods
     */
    
    playGameStart() {
        // Stop any existing music before starting
        this.stopMusic();
        this.currentMusic = 'beginning';
        this.play('beginning');
    }

    playChomp() {
        this.play('chomp');
    }

    playPlayerDeath() {
        this.stopMusic();
        this.play('death');
    }

    playFruitEaten() {
        this.play('eatfruit');
    }

    playGhostEaten() {
        this.play('eatghost');
    }

    playIntermission() {
        this.playMusic('intermission');
    }

    /**
     * Check if a sound is currently playing
     * @param {string} soundName - Name of the sound to check
     * @returns {boolean}
     */
    isPlaying(soundName) {
        const soundData = this.sounds.get(soundName);
        return soundData && soundData.sound.playing;
    }

    /**
     * Get list of available sounds
     * @returns {string[]}
     */
    getAvailableSounds() {
        return Array.from(this.sounds.keys());
    }

    /**
     * Get loading status of all sounds
     * @returns {object}
     */
    getLoadingStatus() {
        const status = {};
        this.sounds.forEach((soundData, key) => {
            status[key] = {
                loading: soundData.loading,
                hasSound: !!soundData.sound
            };
        });
        return status;
    }

    /**
     * Check if all sounds are loaded
     * @returns {boolean}
     */
    allSoundsLoaded() {
        for (const [key, soundData] of this.sounds) {
            if (soundData.loading) {
                return false;
            }
        }
        return true;
    }

    /**
     * Get detailed debug information
     * @returns {object}
     */
    getDebugInfo() {
        return {
            enabled: this.enabled,
            volume: this.volume,
            audioPath: this.audioPath,
            audioContextState: Pizzicato.context.state,
            audioContextStarted: this.audioContextStarted,
            soundsCount: this.sounds.size,
            loadingStatus: this.getLoadingStatus(),
            allLoaded: this.allSoundsLoaded()
        };
    }
}

export default AudioHandler;