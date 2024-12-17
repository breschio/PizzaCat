import songs from './songConfig.js';

class MediaPlayer {
    constructor() {
        this.songs = songs;
        this.currentAudio = null;
        this.currentSongIndex = 0;
        this.isMuted = false; // Start unmuted
        
        // Setup volume controls
        this.volumeSlider = document.getElementById('volume-slider');
        this.speakerIcon = document.getElementById('speaker-icon');
        this.volumeControl = document.getElementById('volume-control');
        
        // Set initial state
        this.volumeSlider.value = 25; // Start at 25% volume
        this.volumeSlider.style.display = 'block'; // Show slider initially
        this.updateSpeakerIcon();
        
        this.volumeSliderTimeout = null;
        this.SLIDER_HIDE_DELAY = 5000; // 5 seconds in milliseconds
        
        // Add event listeners
        this.volumeSlider.addEventListener('input', () => {
            this.updateVolume();
            this.resetSliderTimeout();
        });

        this.speakerIcon.addEventListener('click', () => this.toggleMute());

        this.volumeControl.addEventListener('mouseenter', () => {
            this.clearSliderTimeout();
            if (!this.isMuted) {
                this.showVolumeSlider();
            }
        });

        this.volumeControl.addEventListener('mouseleave', () => {
            if (!this.isMuted) {
                this.startSliderTimeout();
            }
        });
        
        // Initialize all game sounds
        this.waveSound = new Audio('./assets/surf-sound-1.MP3');
        this.waveSound.loop = true;

        this.catSounds = {
            meow1: new Audio('./assets/cat-meow-1.MP3'),
            meow2: new Audio('./assets/cat-meow-2.MP3'),
            bite: new Audio('./assets/cat-bite-1.MP3')
        };

        this.currentFishSoundIndex = 0;
        this.fishCatchSounds = [
            this.catSounds.meow1,
            this.catSounds.bite,
            this.catSounds.meow2
        ];

        // Load music files
        this.catnipMusic = new Audio('./assets/music/wave-bumper.mp3');
        this.catnipMusic.loop = true;

        this.normalMusic = new Audio('./assets/music/pawed-up.mp3');
        this.normalMusic.loop = true;

        // Set initial volumes
        this.setInitialVolumes();

        document.addEventListener('click', (event) => {
            const isClickInside = this.volumeControl.contains(event.target);
            if (!isClickInside && !this.isMuted) {
                this.hideVolumeSlider();
            }
        });

        this.volumeControl.addEventListener('click', (event) => {
            event.stopPropagation();
        });
    }

    toggleMute() {
        if (this.isMuted) {
            this.isMuted = false;
            this.volumeSlider.value = 25;
            this.showVolumeSlider();
            this.startSliderTimeout();
        } else {
            this.isMuted = true;
            this.volumeSlider.value = 0;
            this.hideVolumeSlider();
        }
        
        this.updateSpeakerIcon();
        this.updateVolume();
    }

    updateSpeakerIcon() {
        if (this.isMuted || this.volumeSlider.value == 0) {
            this.speakerIcon.innerHTML = '🔇';
            this.speakerIcon.title = 'Unmute';
        } else if (this.volumeSlider.value < 50) {
            this.speakerIcon.innerHTML = '🔈';
            this.speakerIcon.title = 'Mute';
        } else {
            this.speakerIcon.innerHTML = '🔊';
            this.speakerIcon.title = 'Mute';
        }
    }

    setInitialVolumes() {
        this.catnipMusic.volume = 0.25;
        this.normalMusic.volume = 0.25;
        this.waveSound.volume = 0.25;
        this.catSounds.meow1.volume = 0.25;
        this.catSounds.meow2.volume = 0.25;
        this.catSounds.bite.volume = 0.25;
    }

    updateVolume() {
        const volume = this.volumeSlider.value / 100;
        if (this.currentAudio) {
            this.currentAudio.volume = volume;
        }
        this.waveSound.volume = volume;
        this.catSounds.meow1.volume = volume;
        this.catSounds.meow2.volume = volume;
        this.catSounds.bite.volume = volume;
    }

    startNormalMusic() {
        if (this.currentAudio) {
            this.currentAudio.pause();
        }

        this.currentAudio = this.normalMusic;
        this.currentAudio.currentTime = 0;
        this.currentAudio.play().catch(error => console.error("Error playing normal music:", error));
    }

    startCatnipMusic() {
        if (this.currentAudio) {
            this.currentAudio.pause();
        }

        this.currentAudio = this.catnipMusic;
        this.currentAudio.currentTime = 0;
        this.currentAudio.play().catch(error => console.error("Error playing catnip music:", error));
    }

    stopCatnipMusic() {
        this.catnipMusic.pause();
        this.catnipMusic.currentTime = 0;

        this.startNormalMusic();
    }

    playCatnipModeMusic() {
        if (this.currentAudio !== this.catnipMusic) {
            if (this.currentAudio) {
                this.currentAudio.pause();
            }
            this.currentAudio = this.catnipMusic;
            this.currentAudio.play();
        }
    }

    playNormalModeMusic() {
        if (this.currentAudio !== this.normalMusic) {
            if (this.currentAudio) {
                this.currentAudio.pause();
            }
            this.currentAudio = this.normalMusic;
            this.currentAudio.play();
        }
    }

    startWaveSound() {
        if (this.waveSound) {
            this.waveSound.currentTime = 0;
            this.waveSound.play().catch(error => console.error("Error playing wave sound:", error));
        }
    }

    startGameMusic() {
        this.startNormalMusic();
    }

    playCatMeowSound() {
        const currentSound = this.fishCatchSounds[this.currentFishSoundIndex];
        if (currentSound.paused) {
            currentSound.currentTime = 0;
            currentSound.play().catch(e => console.error("Error playing cat meow sound:", e));
            this.currentFishSoundIndex = (this.currentFishSoundIndex + 1) % this.fishCatchSounds.length;
        }
    }

    playNextFishCatchSound() {
        const currentSound = this.fishCatchSounds[this.currentFishSoundIndex];
        if (currentSound.paused) {
            currentSound.currentTime = 0;
            currentSound.play().catch(e => console.error("Error playing fish catch sound:", e));
            this.currentFishSoundIndex = (this.currentFishSoundIndex + 1) % this.fishCatchSounds.length;
        }
    }

    playWaveSound() {
        if (this.waveSound) {
            this.waveSound.currentTime = 0;
            this.waveSound.play().catch(error => console.error("Error playing wave sound:", error));
        }
    }

    stopWaveSound() {
        if (this.waveSound) {
            this.waveSound.pause();
            this.waveSound.currentTime = 0;
        }
    }

    stopAllSounds() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
        }
        this.waveSound.pause();
        this.waveSound.currentTime = 0;
        this.catnipMusic.pause();
        this.catnipMusic.currentTime = 0;
        this.normalMusic.pause();
        this.normalMusic.currentTime = 0;
    }
}

export const mediaPlayer = new MediaPlayer(); 