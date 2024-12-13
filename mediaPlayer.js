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

        // Add the missing click event listener for the speaker icon
        this.speakerIcon.addEventListener('click', () => this.toggleMute());

        // Add mouse enter/leave events for the volume control
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

        // Set initial volumes
        this.setInitialVolumes();

        // Add click outside listener
        document.addEventListener('click', (event) => {
            const isClickInside = this.volumeControl.contains(event.target);
            if (!isClickInside && !this.isMuted) {
                this.hideVolumeSlider();
            }
        });

        // Prevent clicks on volume control from triggering the document click handler
        this.volumeControl.addEventListener('click', (event) => {
            event.stopPropagation();
        });
    }

    toggleMute() {
        if (this.isMuted) {
            // Unmute - set to 25%
            this.isMuted = false;
            this.volumeSlider.value = 25;
            this.showVolumeSlider();
            this.startSliderTimeout();
        } else {
            // Mute
            this.isMuted = true;
            this.volumeSlider.value = 0;
            this.hideVolumeSlider();
        }
        
        this.updateSpeakerIcon();
        this.updateVolume();
    }

    updateSpeakerIcon() {
        // Update speaker icon based on volume level
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
        const volume = this.isMuted ? 0 : this.volumeSlider.value / 100;
        this.waveSound.volume = volume * 0.5;
        
        Object.values(this.catSounds).forEach(sound => {
            sound.volume = volume;
        });
    }

    updateVolume() {
        const volume = this.isMuted ? 0 : this.volumeSlider.value / 100;
        
        // Update the slider's fill visualization
        this.volumeSlider.style.setProperty('--value', this.volumeSlider.value + '%');
        
        if (this.currentAudio) {
            this.currentAudio.volume = volume;
        }

        this.waveSound.volume = volume * 0.5;

        Object.values(this.catSounds).forEach(sound => {
            sound.volume = volume;
        });

        this.updateSpeakerIcon();
    }

    startGameMusic() {
        // Get current song
        const currentSong = this.songs[this.currentSongIndex];
        
        // If there's currently playing audio, stop it
        if (this.currentAudio) {
            this.currentAudio.pause();
        }

        // Create and play new audio
        this.currentAudio = new Audio(`./assets/music/${currentSong.file}`);
        this.currentAudio.volume = this.volumeSlider.value / 100;
        
        // Add ended event listener to play next song
        this.currentAudio.addEventListener('ended', () => {
            this.playNextSong();
        });
        
        this.currentAudio.play().catch(error => console.error("Error playing music:", error));
    }

    playNextSong() {
        // Move to next song, loop back to start if at end
        this.currentSongIndex = (this.currentSongIndex + 1) % this.songs.length;
        this.startGameMusic();
    }

    startWaveSound() {
        this.waveSound.currentTime = 0;
        this.waveSound.play().catch(error => console.error("Error playing wave sound:", error));
    }

    stopWaveSound() {
        this.waveSound.pause();
        this.waveSound.currentTime = 0;
    }

    playNextFishCatchSound() {
        const currentSound = this.fishCatchSounds[this.currentFishSoundIndex];
        
        if (currentSound.paused) {
            currentSound.currentTime = 0;
            currentSound.play().catch(e => console.error("Error playing fish catch sound:", e));
            this.currentFishSoundIndex = (this.currentFishSoundIndex + 1) % this.fishCatchSounds.length;
        }
    }

    playCatMeowSound() {
        // Use meow2 for damage sounds
        const meowSound = this.catSounds.meow2;
        meowSound.currentTime = 0;
        meowSound.play().catch(e => console.error("Error playing cat meow sound:", e));
    }

    stopAllSounds() {
        // Stop background music
        if (this.currentAudio) {
            // Remove ended event listener to prevent memory leaks
            this.currentAudio.removeEventListener('ended', this.playNextSong);
            this.currentAudio.pause();
            this.currentAudio = null;
        }

        // Stop wave sound
        this.stopWaveSound();

        // Stop all cat sounds
        Object.values(this.catSounds).forEach(sound => {
            sound.pause();
            sound.currentTime = 0;
        });
    }

    showVolumeSlider() {
        this.volumeSlider.style.display = 'block';
        // Force a reflow to ensure the transition works
        void this.volumeSlider.offsetWidth;
        this.volumeSlider.style.opacity = '1';
        this.volumeSlider.style.width = '80px';
    }

    hideVolumeSlider() {
        // Don't hide if user is currently interacting with the slider
        if (document.activeElement === this.volumeSlider) {
            return;
        }
        
        this.volumeSlider.style.opacity = '0';
        this.volumeSlider.style.width = '0';
        setTimeout(() => {
            if (this.volumeSlider.style.opacity === '0') {
                this.volumeSlider.style.display = 'none';
            }
        }, 300);
    }

    startSliderTimeout() {
        this.clearSliderTimeout();
        this.volumeSliderTimeout = setTimeout(() => {
            if (!this.isMuted) {
                this.hideVolumeSlider();
            }
        }, this.SLIDER_HIDE_DELAY);
    }

    clearSliderTimeout() {
        if (this.volumeSliderTimeout) {
            clearTimeout(this.volumeSliderTimeout);
            this.volumeSliderTimeout = null;
        }
    }

    resetSliderTimeout() {
        if (!this.isMuted) {
            this.startSliderTimeout();
        }
    }
}

export const mediaPlayer = new MediaPlayer(); 