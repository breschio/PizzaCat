import { songs } from './songConfig.js';

class MediaPlayer {
    constructor() {
        this.songs = songs;
        this.currentAudio = null;
        this.volumeSlider = document.getElementById('volume-slider');
        this.volumeSlider.addEventListener('input', () => this.updateVolume());
    }

    startGameMusic() {
        // Pick a random song
        const randomSong = this.songs[Math.floor(Math.random() * this.songs.length)];
        
        // If there's currently playing audio, stop it
        if (this.currentAudio) {
            this.currentAudio.pause();
        }

        // Create and play new audio
        this.currentAudio = new Audio(`./assets/music/${randomSong.file}`);
        this.currentAudio.volume = this.volumeSlider.value / 100;
        this.currentAudio.play().catch(error => console.error("Error playing music:", error));
    }

    updateVolume() {
        if (this.currentAudio) {
            this.currentAudio.volume = this.volumeSlider.value / 100;
        }
    }

    stopMusic() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }
    }
}

export const mediaPlayer = new MediaPlayer(); 