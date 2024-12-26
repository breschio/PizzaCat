import songs from './songConfig.js';

class MediaPlayer {
    constructor() {
        this.songs = songs;
        this.currentAudio = null;
        this.currentSongIndex = 0;
        this.isMuted = true; // Start muted
        
        // Setup volume controls
        this.volumeSlider = document.getElementById('volume-slider');
        this.speakerIcon = document.getElementById('speaker-icon');
        this.volumeControl = document.getElementById('volume-control');
        
        // Set initial state
        this.volumeSlider.value = 0; // Start at 0% volume
        this.volumeSlider.style.display = 'block'; // Show slider initially
        this.updateSpeakerIcon();
        
        this.volumeSliderTimeout = null;
        this.SLIDER_HIDE_DELAY = 5000; // 5 seconds in milliseconds
        
        // Initialize all game sounds
        this.waveSound = new Audio('./assets/surf-sound-1.MP3');
        this.waveSound.loop = true;
        this.waveSound.muted = true; // Start muted

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

        // Mute all cat sounds initially
        for (let sound in this.catSounds) {
            this.catSounds[sound].muted = true;
        }

        // Initialize sound indices
        this.currentCatnipSoundIndex = 0;
        this.currentYumSoundIndex = 0;
        this.currentFishSoundIndex = 0;

        // Initialize sound arrays
        this.catnipSounds = [
            this.catSounds.catnip1,
            this.catSounds.catnip2
        ];

        this.yumSounds = [
            this.catSounds.yum1,
            this.catSounds.yum2
        ];

        this.fishCatchSounds = [
            this.catSounds.meow1,
            this.catSounds.bite,
            this.catSounds.meow2
        ];

        // Load music files
        this.catnipMusic = new Audio('./assets/music/wave-bumper.mp3');
        this.catnipMusic.loop = true;
        this.catnipMusic.muted = true; // Start muted

        this.normalMusic = new Audio('./assets/music/pawed-up.mp3');
        this.normalMusic.loop = true;
        this.normalMusic.muted = true; // Start muted

        // Set initial volumes
        this.setInitialVolumes();

        // Add event listeners
        document.addEventListener('click', (event) => {
            const isClickInside = this.volumeControl.contains(event.target);
            if (!isClickInside && !this.isMuted) {
                this.hideVolumeSlider();
            }
        });

        this.volumeControl.addEventListener('click', (event) => {
            event.stopPropagation();
        });

        this.speakerIcon.addEventListener('click', () => this.toggleMute());
    }

    toggleMute() {
        this.isMuted = !this.isMuted;

        // Set volume to 45% when unmuted
        if (!this.isMuted) {
            const volume = 0.45;
            this.volumeSlider.value = volume * 100; // Update slider to 45%
            this.updateVolume(volume);

            // Unmute all sounds
            this.normalMusic.muted = false;
            this.waveSound.muted = false;
            this.catnipMusic.muted = false;
            for (let sound in this.catSounds) {
                this.catSounds[sound].muted = false;
            }

            this.startNormalMusic();
        } else {
            if (this.currentAudio) {
                this.currentAudio.pause();
            }
        }

        this.updateSpeakerIcon(); // Ensure icon updates immediately
        this.showVolumeSlider();
        this.startSliderTimeout();
    }

    playAudio(audio) {
        if (audio) {
            audio.play().then(() => {
                console.log("Audio is playing successfully.");
            }).catch(error => {
                console.error("Error playing audio:", error);
                // Additional error handling logic can be added here
            });
        } else {
            console.warn("No audio file is available to play.");
        }
    }

    updateSpeakerIcon() {
        console.log("Updating speaker icon. Muted:", this.isMuted, "Volume:", this.volumeSlider.value);
        if (this.isMuted) {
            this.speakerIcon.innerHTML = '🔇'; // Muted icon
            this.speakerIcon.title = 'Unmute';
        } else {
            const volume = this.volumeSlider.value;
            if (volume == 0) {
                this.speakerIcon.innerHTML = '🔇'; // Muted icon
            } else {
                this.speakerIcon.innerHTML = '🔉'; // Sound on icon
            }
            this.speakerIcon.title = 'Mute';
        }
    }

    setInitialVolumes() {
        const initialVolume = 0.25;

        this.catnipMusic.volume = initialVolume;
        this.normalMusic.volume = initialVolume;
        this.waveSound.volume = initialVolume;

        for (let sound in this.catSounds) {
            this.catSounds[sound].volume = initialVolume;
        }
    }

    updateVolume(volume = this.volumeSlider.value / 100) {
        if (this.currentAudio) {
            this.currentAudio.volume = volume;
        }
        this.waveSound.volume = volume;

        for (let sound in this.catSounds) {
            this.catSounds[sound].volume = volume;
        }
    }

    startNormalMusic() {
        if (this.currentAudio) {
            this.currentAudio.pause();
        }

        this.currentAudio = this.normalMusic;
        this.currentAudio.currentTime = 0;
        this.playAudio(this.currentAudio);
    }

    startCatnipMusic() {
        if (this.currentAudio) {
            this.currentAudio.pause();
        }

        // Play rotating catnip sound effect
        const currentSound = this.catnipSounds[this.currentCatnipSoundIndex];
        if (currentSound.paused) {
            currentSound.currentTime = 0;
            currentSound.play().catch(error => console.error("Error playing catnip sound:", error));
            this.currentCatnipSoundIndex = (this.currentCatnipSoundIndex + 1) % this.catnipSounds.length;
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
        try {
            if (!this.fishCatchSounds || this.fishCatchSounds.length === 0) {
                console.warn('No fish catch sounds available');
                return;
            }

            const currentSound = this.fishCatchSounds[this.currentFishSoundIndex];
            if (!currentSound) {
                console.warn('Invalid fish catch sound index');
                return;
            }

            if (currentSound.paused) {
                currentSound.currentTime = 0;
                currentSound.play().catch(e => console.error("Error playing fish catch sound:", e));
                this.currentFishSoundIndex = (this.currentFishSoundIndex + 1) % this.fishCatchSounds.length;
            }
        } catch (error) {
            console.error('Error in playNextFishCatchSound:', error);
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

    playLevelUpSound() {
        // Play mewoabunga sound for level completion
        this.catSounds.mewoabunga.currentTime = 0;
        this.catSounds.mewoabunga.play().catch(e => console.error("Error playing level up sound:", e));
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
}

export const mediaPlayer = new MediaPlayer(); 