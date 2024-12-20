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
            bite: new Audio('./assets/cat-bite-1.MP3'),
            hurt: new Audio('./assets/meow-hurt.MP3'),
            yum1: new Audio('./assets/meowyum.MP3'),
            yum2: new Audio('./assets/meowyum-2.MP3'),
            catnip1: new Audio('./assets/catnip.MP3'),
            catnip2: new Audio('./assets/catnip-2.MP3'),
            mewoabunga: new Audio('./assets/meowabunga.MP3'),
            pizzaCat: new Audio('./assets/pizza-cat.MP3')
        };

        this.currentCatnipSoundIndex = 0;
        this.catnipSounds = [
            this.catSounds.catnip1,
            this.catSounds.catnip2
        ];

        this.currentYumSoundIndex = 0;
        this.yumSounds = [
            this.catSounds.yum1,
            this.catSounds.yum2
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

        this.fishCatchSounds = [
            this.catSounds.meow1,
            this.catSounds.bite,
            this.catSounds.meow2
        ];

        console.log("Cat sounds:", {
            meow1: this.catSounds.meow1.src,
            meow2: this.catSounds.meow2.src,
            bite: this.catSounds.bite.src,
            hurt: this.catSounds.hurt.src,
            yum1: this.catSounds.yum1.src,
            yum2: this.catSounds.yum2.src,
            catnip1: this.catSounds.catnip1.src,
            catnip2: this.catSounds.catnip2.src,
            mewoabunga: this.catSounds.mewoabunga.src,
            pizzaCat: this.catSounds.pizzaCat.src
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
        console.log("Current fish sound index:", this.currentFishSoundIndex);
        console.log("Fish catch sounds:", this.fishCatchSounds);

        const currentSound = this.fishCatchSounds[this.currentFishSoundIndex];
        if (currentSound && currentSound.paused) {
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

    playHurtSound() {
        this.catSounds.hurt.currentTime = 0;
        this.catSounds.hurt.play().catch(e => console.error("Error playing hurt sound:", e));
    }

    playYumSound() {
        const currentSound = this.yumSounds[this.currentYumSoundIndex];
        currentSound.currentTime = 0;
        currentSound.play().catch(e => console.error("Error playing yum sound:", e));
        this.currentYumSoundIndex = (this.currentYumSoundIndex + 1) % this.yumSounds.length;
    }

    playCatnipSound() {
        const currentSound = this.catnipSounds[this.currentCatnipSoundIndex];
        console.log("Attempting to play catnip sound:", currentSound.src);
        currentSound.currentTime = 0;
        currentSound.play().catch(e => console.error("Error playing catnip sound:", e));
        this.currentCatnipSoundIndex = (this.currentCatnipSoundIndex + 1) % this.catnipSounds.length;
    }

    playMewoabungaSound() {
        this.catSounds.mewoabunga.currentTime = 0;
        this.catSounds.mewoabunga.play().catch(e => console.error("Error playing mewoabunga sound:", e));
    }

    playPizzaCatSound() {
        this.catSounds.pizzaCat.currentTime = 0;
        this.catSounds.pizzaCat.play().catch(e => console.error("Error playing pizza-cat sound:", e));
    }

    hideVolumeSlider() {
        this.volumeSlider.style.display = 'none';
    }
}

export const mediaPlayer = new MediaPlayer(); 