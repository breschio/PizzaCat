import { songs } from './songConfig.js';

class MediaPlayer {
    constructor() {
        this.songs = {};
        this.songList = songs;
        
        // Create songs object from config
        songs.forEach(song => {
            this.songs[song.id] = `./assets/music/${song.file}`;
        });
        
        this.currentAudio = null;
        this.isPlaying = false;
        
        this.initializePlayer();
    }

    initializePlayer() {
        this.playPauseBtn = document.getElementById('play-pause');
        this.nextTrackBtn = document.getElementById('next-track');
        this.songSelect = document.getElementById('song-select');
        this.volumeSlider = document.getElementById('volume-slider');

        // Populate song select
        this.songSelect.innerHTML = this.songList.map(song => 
            `<option value="${song.id}">${song.title}</option>`
        ).join('');

        // Event listeners
        this.playPauseBtn.addEventListener('click', () => this.togglePlay());
        this.songSelect.addEventListener('change', () => this.changeSong());
        this.volumeSlider.addEventListener('input', () => this.updateVolume());
        this.nextTrackBtn.addEventListener('click', () => this.nextTrack());

        // Initialize first song
        this.loadSong(this.songs[this.songSelect.value]);
    }

    loadSong(src) {
        if (this.currentAudio) {
            this.currentAudio.pause();
        }

        this.currentAudio = new Audio(src);
        this.currentAudio.volume = this.volumeSlider.value / 100;
    }

    togglePlay() {
        if (!this.currentAudio) return;

        if (this.isPlaying) {
            this.currentAudio.pause();
            this.playPauseBtn.textContent = '▶';
        } else {
            this.currentAudio.play();
            this.playPauseBtn.textContent = '⏸';
        }
        
        this.isPlaying = !this.isPlaying;
    }

    changeSong() {
        const wasPlaying = this.isPlaying;
        this.loadSong(this.songs[this.songSelect.value]);
        if (wasPlaying) {
            this.currentAudio.play();
            this.isPlaying = true;
            this.playPauseBtn.textContent = '⏸';
        }
    }

    updateVolume() {
        if (this.currentAudio) {
            this.currentAudio.volume = this.volumeSlider.value / 100;
        }
    }

    nextTrack() {
        const currentIndex = this.songSelect.selectedIndex;
        const nextIndex = (currentIndex + 1) % this.songSelect.options.length;
        this.songSelect.selectedIndex = nextIndex;
        this.changeSong();
    }

    startGameMusic() {
        if (!this.isPlaying) {
            this.currentAudio.play()
                .then(() => {
                    this.isPlaying = true;
                    this.playPauseBtn.textContent = '⏸';
                })
                .catch(error => console.error("Error auto-playing music:", error));
        }
    }
}

export const mediaPlayer = new MediaPlayer(); 