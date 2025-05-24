import songs from './songConfig.js';

class MediaPlayer {
    constructor() {
        // Initialize state
        this.songs = songs;
        this.currentAudio = null;
        this.currentSongIndex = 0;
        this.isMusicMuted = false;  // Changed to false by default
        this.isFXMuted = false;     // Changed to false by default
        
        // Initialize audio configuration
        this.initializeAudioConfig();
        
        // Initialize DOM elements and event listeners
        this.initializeControls();

        // Preload sounds
        this.preloadSounds().catch(error => {
            console.warn('Sound preloading failed:', error);
        });

        // Set initial state based on user interaction
        this.waitForUserInteraction();
    }

    initializeAudioConfig() {
        // Initialize Music
        this.music = {
            normal: this.createAudio('./assets/music/pawed-up.mp3', true),
            catnip: this.createAudio('./assets/music/wave-bumper.mp3', true)
        };

        // Initialize Sound Effects with corrected names
        this.fx = {
            ambient: {
                waves: this.createAudio('./assets/surf-sound-1.MP3', true)
            },
            cat: {
                meow1: this.createAudio('./assets/cat-meow-1.MP3'),
                meow2: this.createAudio('./assets/cat-meow-2.MP3'),
                bite: this.createAudio('./assets/cat-bite-1.MP3'),
                hurt: this.createAudio('./assets/meow-hurt.MP3'),
                yum1: this.createAudio('./assets/meowyum.MP3'),
                yum2: this.createAudio('./assets/meowyum-2.MP3'),
                catnip1: this.createAudio('./assets/catnip.MP3'),
                catnip2: this.createAudio('./assets/catnip-2.MP3'),
                meowabunga: this.createAudio('./assets/meowabunga.MP3'),
                pizzaCat: this.createAudio('./assets/pizza-cat.MP3')
            }
        };

        // Initialize sound groups for rotation with more variety
        this.soundGroups = {
            catnip: [this.fx.cat.catnip1, this.fx.cat.catnip2],
            yum: [this.fx.cat.yum1, this.fx.cat.yum2],
            fishCatch: [
                this.fx.cat.meow1,
                this.fx.cat.meow2,
                this.fx.cat.yum1,
                this.fx.cat.yum2
            ],
            hurt: [this.fx.cat.hurt] // Add hurt sound group for consistency
        };

        // Initialize indices for sound rotation
        this.soundIndices = {
            catnip: 0,
            yum: 0,
            fishCatch: 0,
            hurt: 0
        };

        // Set mixing ratios with adjusted volumes
        this.soundMixing = {
            ambient: 0.3,    // Slightly increased for better ambient presence
            music: 0.4,      // Slightly reduced to not overpower effects
            effects: 0.8     // Reduced from 1.0 to prevent clipping
        };

        // Set initial audio state
        this.setInitialAudioState();
        
        // Preload the hurt sound specifically
        if (this.fx.cat.hurt) {
            this.fx.cat.hurt.load();
        }
    }

    async preloadSounds() {
        const preloadPromises = [];
        
        // Preload music
        for (const [key, audio] of Object.entries(this.music)) {
            if (audio) {
                preloadPromises.push(
                    new Promise((resolve) => {
                        audio.addEventListener('canplaythrough', resolve, { once: true });
                        audio.load();
                    }).catch(error => {
                        console.warn(`Failed to preload music ${key}:`, error);
                    })
                );
            }
        }
        
        // Preload ambient sounds
        if (this.fx.ambient.waves) {
            preloadPromises.push(
                new Promise((resolve) => {
                    this.fx.ambient.waves.addEventListener('canplaythrough', resolve, { once: true });
                    this.fx.ambient.waves.load();
                }).catch(error => {
                    console.warn('Failed to preload waves sound:', error);
                })
            );
        }
        
        // Preload cat sounds
        for (const [key, sound] of Object.entries(this.fx.cat)) {
            if (sound) {
                preloadPromises.push(
                    new Promise((resolve) => {
                        sound.addEventListener('canplaythrough', resolve, { once: true });
                        sound.load();
                    }).catch(error => {
                        console.warn(`Failed to preload cat sound ${key}:`, error);
                    })
                );
            }
        }
        
        // Wait for all sounds to preload
        await Promise.allSettled(preloadPromises);
        console.log('Sound preloading complete');
    }

    createAudio(src, shouldLoop = false) {
        try {
            const audio = new Audio(src);
            audio.muted = true;
            audio.volume = 0;
            
            // Add error handling for failed loads
            audio.addEventListener('error', (e) => {
                console.warn(`Error loading audio ${src}:`, e.error);
                // Try to recover by reloading
                setTimeout(() => {
                    audio.load();
                }, 1000);
            });
            
            if (shouldLoop) {
                audio.loop = true;
            }
            return audio;
        } catch (error) {
            console.error(`Failed to create audio for ${src}:`, error);
            // Return a mock audio object that won't break the game
            return {
                play: () => Promise.resolve(),
                pause: () => {},
                muted: true,
                volume: 0,
                currentTime: 0
            };
        }
    }

    setInitialAudioState() {
        // Set music state
        Object.values(this.music).forEach(track => {
            if (track) {
                track.muted = true;
                track.volume = 0;
            }
        });

        // Set ambient sound state
        if (this.fx.ambient.waves) {
            this.fx.ambient.waves.muted = true;
            this.fx.ambient.waves.volume = 0;
        }

        // Set sound effects state
        Object.values(this.fx.cat).forEach(sound => {
            if (sound) {
                sound.muted = true;
                sound.volume = 0;
            }
        });
    }

    initializeControls() {
        try {
            // Get DOM elements
            this.musicToggle = document.getElementById('music-toggle');
            this.fxToggle = document.getElementById('fx-toggle');

            // Add event listeners if elements exist
            if (this.musicToggle) {
                this.musicToggle.addEventListener('click', () => this.toggleMusic());
            } else {
                console.warn('Music toggle button not found in DOM');
            }

            if (this.fxToggle) {
                this.fxToggle.addEventListener('click', () => this.toggleFX());
            } else {
                console.warn('FX toggle button not found in DOM');
            }

            // Update initial button states
            this.updateButtonStates();
        } catch (error) {
            console.error('Failed to initialize audio controls:', error);
        }
    }

    updateButtonStates() {
        if (this.musicToggle) {
            this.musicToggle.classList.toggle('muted', this.isMusicMuted);
        }
        if (this.fxToggle) {
            this.fxToggle.classList.toggle('muted', this.isFXMuted);
        }
    }

    toggleMusic() {
        this.isMusicMuted = !this.isMusicMuted;
        const volume = this.isMusicMuted ? 0 : 0.45;
        
        Object.values(this.music).forEach(track => {
            if (track) {
                track.muted = this.isMusicMuted;
                track.volume = volume * this.soundMixing.music;
            }
        });

        // Only try to play if we have user interaction
        if (document.body.classList.contains('user-interaction')) {
            if (this.currentAudio) {
                if (this.isMusicMuted) {
                    this.currentAudio.pause();
                } else {
                    this.currentAudio.play().catch(error => console.error("Error playing music:", error));
                }
            }
        }

        this.updateButtonStates();
    }

    toggleFX() {
        this.isFXMuted = !this.isFXMuted;
        const volume = this.isFXMuted ? 0 : 0.45;
        
        if (this.fx.ambient.waves) {
            this.fx.ambient.waves.muted = this.isFXMuted;
            this.fx.ambient.waves.volume = volume * this.soundMixing.ambient;
        }

        Object.values(this.fx.cat).forEach(sound => {
            if (sound) {
                sound.muted = this.isFXMuted;
                sound.volume = volume * this.soundMixing.effects;
            }
        });

        // Only try to play if we have user interaction
        if (document.body.classList.contains('user-interaction')) {
            if (this.fx.ambient.waves) {
                if (this.isFXMuted) {
                    this.fx.ambient.waves.pause();
                } else if (!this.fx.ambient.waves.paused) {
                    this.fx.ambient.waves.play().catch(error => console.error("Error playing wave sound:", error));
                }
            }
        }

        this.updateButtonStates();
    }

    playAudio(audio) {
        if (!audio) {
            console.warn("No audio file is available to play.");
            return Promise.resolve();
        }

        return audio.play().then(() => {
            console.log("Audio is playing successfully.");
        }).catch(error => {
            console.warn("Error playing audio:", error);
            // Try to recover by reloading and playing again
            return new Promise(resolve => {
                audio.load();
                setTimeout(() => {
                    audio.play().catch(e => {
                        console.warn("Retry failed:", e);
                    }).finally(resolve);
                }, 1000);
            });
        });
    }

    setInitialVolumes() {
        const initialVolume = 0.25;

        this.music.catnip.volume = initialVolume;
        this.music.normal.volume = initialVolume;
        this.fx.ambient.waves.volume = initialVolume;

        for (let sound in this.fx.cat) {
            this.fx.cat[sound].volume = initialVolume;
        }

        // Set initial volume for fish catch sounds
        this.soundGroups.fishCatch.forEach(sound => {
            sound.volume = initialVolume;
        });
    }

    updateVolume(volume = 0.45) { // Default to 45% volume when unmuting
        // Update music volume
        Object.values(this.music).forEach(track => {
            track.volume = volume * this.soundMixing.music;
        });

        // Update ambient sounds
        this.fx.ambient.waves.volume = volume * this.soundMixing.ambient;

        // Update sound effects volume
        Object.values(this.fx.cat).forEach(sound => {
            sound.volume = volume * this.soundMixing.effects;
        });
    }

    startNormalMusic() {
        if (this.currentAudio) {
            this.currentAudio.pause();
        }

        this.currentAudio = this.music.normal;
        this.currentAudio.currentTime = 0;
        this.playAudio(this.currentAudio);
    }

    startCatnipMusic() {
        if (this.currentAudio) {
            this.currentAudio.pause();
        }

        // Play rotating catnip sound effect
        const currentSound = this.soundGroups.catnip[this.soundIndices.catnip];
        if (currentSound.paused) {
            currentSound.currentTime = 0;
            currentSound.play().catch(error => console.error("Error playing catnip sound:", error));
            this.soundIndices.catnip = (this.soundIndices.catnip + 1) % this.soundGroups.catnip.length;
        }

        this.currentAudio = this.music.catnip;
        this.currentAudio.currentTime = 0;
        this.currentAudio.play().catch(error => console.error("Error playing catnip music:", error));
    }

    stopCatnipMusic() {
        this.music.catnip.pause();
        this.music.catnip.currentTime = 0;
        this.startNormalMusic();
    }

    playCatnipModeMusic() {
        if (this.currentAudio !== this.music.catnip) {
            if (this.currentAudio) {
                this.currentAudio.pause();
            }
            this.currentAudio = this.music.catnip;
            this.currentAudio.play();
        }
    }

    playNormalModeMusic() {
        if (this.currentAudio !== this.music.normal) {
            if (this.currentAudio) {
                this.currentAudio.pause();
            }
            this.currentAudio = this.music.normal;
            this.currentAudio.play();
        }
    }

    startWaveSound() {
        if (this.fx.ambient.waves) {
            this.fx.ambient.waves.currentTime = 0;
            this.fx.ambient.waves.play().catch(error => console.error("Error playing wave sound:", error));
        }
    }

    startGameMusic() {
        // Set proper volumes
        Object.values(this.music).forEach(track => {
            track.muted = this.isMusicMuted;
            track.volume = this.isMusicMuted ? 0 : this.soundMixing.music;
        });

        Object.values(this.fx.cat).forEach(sound => {
            sound.muted = this.isFXMuted;
            sound.volume = this.isFXMuted ? 0 : this.soundMixing.effects;
        });

        this.fx.ambient.waves.muted = this.isFXMuted;
        this.fx.ambient.waves.volume = this.isFXMuted ? 0 : this.soundMixing.ambient;

        // Start the normal music
        if (this.currentAudio) {
            this.currentAudio.pause();
        }
        this.currentAudio = this.music.normal;
        this.currentAudio.currentTime = 0;
        if (!this.isMusicMuted) {
            this.playAudio(this.currentAudio);
        }
    }

    playCatMeowSound() {
        console.log("Current fish sound index:", this.soundIndices.fishCatch);
        console.log("Fish catch sounds:", this.soundGroups.fishCatch);

        const currentSound = this.soundGroups.fishCatch[this.soundIndices.fishCatch];
        if (currentSound && currentSound.paused) {
            currentSound.currentTime = 0;
            currentSound.play().catch(e => console.error("Error playing cat meow sound:", e));
            this.soundIndices.fishCatch = (this.soundIndices.fishCatch + 1) % this.soundGroups.fishCatch.length;
        }
    }

    playNextFishCatchSound() {
        try {
            const sounds = this.soundGroups.fishCatch;
            if (!sounds || sounds.length === 0) {
                console.warn('No fish catch sounds available');
                return;
            }

            const currentSound = sounds[this.soundIndices.fishCatch];
            if (!currentSound) {
                console.warn('Current fish catch sound not available');
                return;
            }

            if (currentSound && currentSound.paused) {
                currentSound.currentTime = 0;
                currentSound.volume = 0.45 * this.soundMixing.effects;
                
                // Add user interaction check
                if (document.body.classList.contains('user-interaction')) {
                    currentSound.play().catch(error => {
                        console.warn("Error playing fish catch sound:", error);
                    });
                }
                
                // Rotate to next sound
                this.soundIndices.fishCatch = (this.soundIndices.fishCatch + 1) % sounds.length;
            }
        } catch (error) {
            console.warn('Error in playNextFishCatchSound:', error);
        }
    }

    playWaveSound() {
        if (this.fx.ambient.waves) {
            this.fx.ambient.waves.currentTime = 0;
            this.fx.ambient.waves.play().catch(error => console.error("Error playing wave sound:", error));
        }
    }

    stopWaveSound() {
        if (this.fx.ambient.waves) {
            this.fx.ambient.waves.pause();
            this.fx.ambient.waves.currentTime = 0;
        }
    }

    stopAllSounds() {
        // Stop current music
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
        }

        // Stop all music tracks
        Object.values(this.music).forEach(track => {
            track.pause();
            track.currentTime = 0;
        });

        // Stop ambient sounds
        this.fx.ambient.waves.pause();
        this.fx.ambient.waves.currentTime = 0;
    }

    playHurtSound() {
        try {
            if (!this.fx.cat.hurt) {
                console.warn('Hurt sound not available');
                return;
            }

            // Only play if not muted and we have user interaction
            if (!this.isFXMuted && document.body.classList.contains('user-interaction')) {
                this.fx.cat.hurt.currentTime = 0;
                this.fx.cat.hurt.volume = 0.45 * this.soundMixing.effects;
                this.fx.cat.hurt.play().catch(error => {
                    console.warn("Error playing hurt sound:", error);
                    // Try to reload and play again
                    this.fx.cat.hurt.load();
                    setTimeout(() => {
                        this.fx.cat.hurt.play().catch(e => 
                            console.warn("Retry failed:", e)
                        );
                    }, 100);
                });
            }
        } catch (error) {
            console.warn('Error in playHurtSound:', error);
        }
    }

    playYumSound() {
        const currentSound = this.soundGroups.yum[this.soundIndices.yum];
        currentSound.currentTime = 0;
        currentSound.play().catch(e => console.error("Error playing yum sound:", e));
        this.soundIndices.yum = (this.soundIndices.yum + 1) % this.soundGroups.yum.length;
    }

    playCatnipSound() {
        try {
            const sounds = this.soundGroups.catnip;
            if (!sounds || sounds.length === 0) {
                console.warn('No catnip sounds available');
                return;
            }

            const currentSound = sounds[this.soundIndices.catnip];
            if (!currentSound) {
                console.warn('Current catnip sound not available');
                return;
            }

            if (currentSound.paused) {
                currentSound.currentTime = 0;
                currentSound.volume = 0.45 * this.soundMixing.effects;
                
                // Add user interaction check
                if (document.body.classList.contains('user-interaction')) {
                    currentSound.play().catch(error => {
                        console.warn("Error playing catnip sound:", error);
                    });
                }
                
                // Rotate to next sound
                this.soundIndices.catnip = (this.soundIndices.catnip + 1) % sounds.length;
            }
        } catch (error) {
            console.warn('Error in playCatnipSound:', error);
        }
    }

    playMeowabunga() {
        if (this.fx.cat.meowabunga) {
            this.fx.cat.meowabunga.currentTime = 0;
            this.fx.cat.meowabunga.play().catch(e => console.error("Error playing meowabunga sound:", e));
        }
    }

    playPizzaCatSound() {
        this.fx.cat.pizzaCat.currentTime = 0;
        this.fx.cat.pizzaCat.play().catch(e => console.error("Error playing pizza-cat sound:", e));
    }

    playLevelUpSound() {
        if (this.fx.cat.meowabunga) {
            this.fx.cat.meowabunga.currentTime = 0;
            this.fx.cat.meowabunga.play().catch(e => console.error("Error playing level up sound:", e));
        }
    }

    showVolumeSlider() {
        this.volumeSlider.style.display = 'block';
    }

    hideVolumeSlider() {
        this.volumeSlider.style.display = 'none';
    }

    startSliderTimeout() {
        this.clearSliderTimeout();
        this.volumeSliderTimeout = setTimeout(() => {
            this.hideVolumeSlider();
        }, this.SLIDER_HIDE_DELAY);
    }

    clearSliderTimeout() {
        if (this.volumeSliderTimeout) {
            clearTimeout(this.volumeSliderTimeout);
            this.volumeSliderTimeout = null;
        }
    }

    waitForUserInteraction() {
        const handleFirstInteraction = () => {
            // Only try to play sounds if not muted
            if (!this.isMusicMuted || !this.isFXMuted) {
                // Try to play a silent sound to unlock audio
                const silentSound = new Audio("data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQBUSVQyAAAABgAAAzIyMzUAVFNTRQAAAA8AAANMYXZmNTcuODMuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV");
                silentSound.play().catch(console.error);
                
                // Start any background sounds that should be playing
                if (!this.isFXMuted) {
                    this.startWaveSound();
                }
                if (!this.isMusicMuted) {
                    this.startGameMusic();
                }
            }
            
            // Remove listeners after first interaction
            document.removeEventListener('click', handleFirstInteraction);
            document.removeEventListener('touchstart', handleFirstInteraction);
            document.removeEventListener('keydown', handleFirstInteraction);
        };

        // Add listeners for user interaction
        document.addEventListener('click', handleFirstInteraction);
        document.addEventListener('touchstart', handleFirstInteraction);
        document.addEventListener('keydown', handleFirstInteraction);
    }
}

// Create and export a singleton instance
let mediaPlayerInstance = null;

export const mediaPlayer = {
    getInstance() {
        if (!mediaPlayerInstance) {
            try {
                mediaPlayerInstance = new MediaPlayer();
            } catch (error) {
                console.error('Failed to initialize MediaPlayer:', error);
                // Return a dummy media player that won't break the game
                return this.createDummyPlayer();
            }
        }
        return mediaPlayerInstance;
    },

    createDummyPlayer() {
        // Return a non-functional but safe media player
        return {
            toggleMusic: () => {},
            toggleFX: () => {},
            startGameMusic: () => {},
            stopAllSounds: () => {},
            // ... implement all other methods as no-ops
        };
    }
}; 