// Main application logic

import { db } from './supabase.js';
import { confetti } from './confetti.js';

class StarChartApp {
    constructor() {
        this.events = [];
        this.pendingRemoveId = null;
        this.isLoading = false;

        // DOM elements
        this.grid = document.getElementById('star-grid');
        this.progressCount = document.getElementById('progress-count');
        this.progressBar = document.getElementById('progress-bar');
        this.quinnToggle = document.getElementById('quinn-toggle');
        this.trixieToggle = document.getElementById('trixie-toggle');
        this.banner = document.getElementById('connection-banner');
        this.bannerText = document.getElementById('banner-text');

        // Modals
        this.removeModal = document.getElementById('remove-modal');
        this.celebrationModal = document.getElementById('celebration-modal');
        this.resetModal = document.getElementById('reset-modal');
        this.resetInput = document.getElementById('reset-input');
        this.confirmResetBtn = document.getElementById('confirm-reset');

        this.init();
    }

    async init() {
        // Initialize Supabase
        await db.initialize();

        // Show connection status
        this.updateConnectionBanner();

        // Create grid
        this.createGrid();

        // Load data
        await this.loadData();

        // Setup event listeners
        this.setupEventListeners();

        // Listen for data changes
        db.onChange(() => this.loadData());
    }

    updateConnectionBanner() {
        const mode = db.getMode();

        if (mode === 'localStorage') {
            this.bannerText.textContent = '💾 Running in offline mode - Connect Supabase to sync across devices';
            this.banner.classList.remove('hidden');
        } else if (mode === 'supabase') {
            this.bannerText.textContent = '☁️ Connected to Supabase - Syncing across devices';
            this.banner.classList.remove('hidden');
            // Hide after 3 seconds
            setTimeout(() => this.banner.classList.add('hidden'), 3000);
        }
    }

    createGrid() {
        // 10 rows × 6 columns = 60 stars
        for (let i = 0; i < 60; i++) {
            const slot = document.createElement('div');
            slot.className = 'star-slot';
            slot.dataset.index = i;

            // Add row label data attribute
            if (i % 6 === 0) {
                slot.dataset.row = Math.floor(i / 6) + 1;
            }

            this.grid.appendChild(slot);
        }
    }

    async loadData() {
        if (this.isLoading) return;
        this.isLoading = true;

        try {
            this.events = await db.getEvents();
            this.render();
        } catch (err) {
            console.error('Failed to load data:', err);
        } finally {
            this.isLoading = false;
        }
    }

    render() {
        const total = this.events.length;
        const today = this.getTodayDate();

        // Update progress
        this.progressCount.textContent = `${total} / 60`;
        this.progressBar.style.width = `${(total / 60) * 100}%`;

        if (total >= 60) {
            document.querySelector('.progress-bar-container').classList.add('complete');
        }

        // Update today toggles
        const quinnToday = this.events.some(e => e.child === 'quinn' && e.local_date === today);
        const trixieToday = this.events.some(e => e.child === 'trixie' && e.local_date === today);

        this.quinnToggle.classList.toggle('active', quinnToday);
        this.trixieToggle.classList.toggle('active', trixieToday);

        // Update grid
        const slots = this.grid.querySelectorAll('.star-slot');
        slots.forEach((slot, index) => {
            const event = this.events[index];

            if (event) {
                slot.classList.add('filled');
                slot.dataset.eventId = event.id;

                if (!slot.querySelector('.star-icon')) {
                    const star = document.createElement('span');
                    star.className = 'star-icon';
                    star.textContent = '⭐';
                    slot.appendChild(star);
                }
            } else {
                slot.classList.remove('filled');
                slot.innerHTML = '';
                delete slot.dataset.eventId;
            }
        });
    }

    setupEventListeners() {
        // Today toggles
        this.quinnToggle.addEventListener('click', () => this.handleToggle('quinn'));
        this.trixieToggle.addEventListener('click', () => this.handleToggle('trixie'));

        // Star clicks (for removal)
        this.grid.addEventListener('click', (e) => {
            const slot = e.target.closest('.star-slot.filled');
            if (slot) {
                this.handleStarClick(slot);
            }
        });

        // Remove modal
        document.getElementById('cancel-remove').addEventListener('click', () => this.closeRemoveModal());
        document.getElementById('confirm-remove').addEventListener('click', () => this.confirmRemove());

        // Celebration modal
        document.getElementById('close-celebration').addEventListener('click', () => this.closeCelebrationModal());

        // Reset button and modal
        document.getElementById('reset-btn').addEventListener('click', () => this.openResetModal());
        document.getElementById('cancel-reset').addEventListener('click', () => this.closeResetModal());
        document.getElementById('confirm-reset').addEventListener('click', () => this.confirmReset());
        this.resetInput.addEventListener('input', () => this.validateResetInput());

        // Close modals on background click
        [this.removeModal, this.celebrationModal, this.resetModal].forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                }
            });
        });
    }

    async handleToggle(child) {
        if (this.isLoading) return;

        const today = this.getTodayDate();
        const hasStarToday = this.events.some(e => e.child === child && e.local_date === today);
        const toggle = child === 'quinn' ? this.quinnToggle : this.trixieToggle;

        toggle.disabled = true;

        try {
            if (hasStarToday) {
                // Remove today's star for this child
                const event = this.events.find(e => e.child === child && e.local_date === today);
                await db.removeEvent(event.id);
                this.playSound('remove');
            } else {
                // Add today's star for this child
                const previousTotal = this.events.length;
                await db.addEvent(child, today);
                await this.loadData();

                // Animate the new star
                const newTotal = this.events.length;
                if (newTotal > previousTotal) {
                    this.animateNewStar(newTotal - 1);
                    this.playSound('add');
                    this.checkMilestones(newTotal, previousTotal);
                }
            }

            await this.loadData();
        } catch (err) {
            console.error('Toggle failed:', err);
        } finally {
            toggle.disabled = false;
        }
    }

    handleStarClick(slot) {
        const eventId = parseInt(slot.dataset.eventId);
        this.pendingRemoveId = eventId;
        this.removeModal.classList.remove('hidden');
    }

    closeRemoveModal() {
        this.removeModal.classList.add('hidden');
        this.pendingRemoveId = null;
    }

    async confirmRemove() {
        if (!this.pendingRemoveId) return;

        try {
            await db.removeEvent(this.pendingRemoveId);
            this.playSound('remove');
            await this.loadData();
        } catch (err) {
            console.error('Remove failed:', err);
        } finally {
            this.closeRemoveModal();
        }
    }

    animateNewStar(index) {
        const slot = this.grid.querySelector(`[data-index="${index}"]`);
        if (slot) {
            slot.classList.add('animate');
            setTimeout(() => slot.classList.remove('animate'), 600);
        }
    }

    checkMilestones(newTotal, previousTotal) {
        // Check for row completions (every 6 stars)
        const previousRows = Math.floor(previousTotal / 6);
        const newRows = Math.floor(newTotal / 6);

        if (newRows > previousRows) {
            // Row completed!
            confetti.burstSmall();
            this.playSound('milestone');
        }

        // Check for final completion (60 stars)
        if (newTotal >= 60 && previousTotal < 60) {
            setTimeout(() => this.showCelebration(), 500);
        }
    }

    showCelebration() {
        this.celebrationModal.classList.remove('hidden');
        confetti.burstLarge();
        this.playSound('celebration');
    }

    closeCelebrationModal() {
        this.celebrationModal.classList.add('hidden');
    }

    openResetModal() {
        this.resetInput.value = '';
        this.confirmResetBtn.disabled = true;
        this.resetModal.classList.remove('hidden');
    }

    closeResetModal() {
        this.resetModal.classList.add('hidden');
    }

    validateResetInput() {
        const isValid = this.resetInput.value === 'RESET';
        this.confirmResetBtn.disabled = !isValid;
    }

    async confirmReset() {
        if (this.resetInput.value !== 'RESET') return;

        try {
            await db.resetAllEvents();
            await this.loadData();
            this.closeResetModal();
        } catch (err) {
            console.error('Reset failed:', err);
        }
    }

    getTodayDate() {
        // Get current date in America/Los_Angeles timezone
        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Los_Angeles',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });

        return formatter.format(new Date()); // Returns YYYY-MM-DD
    }

    // Web Audio API sounds
    playSound(type) {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            if (type === 'add') {
                // Magical ding sound
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.3);
            } else if (type === 'remove') {
                // Gentle removal sound
                oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(300, audioContext.currentTime + 0.15);
                gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.15);
            } else if (type === 'milestone') {
                // Row completion sound
                const times = [0, 0.1, 0.2];
                const freqs = [600, 800, 1000];

                times.forEach((time, i) => {
                    const osc = audioContext.createOscillator();
                    const gain = audioContext.createGain();
                    osc.connect(gain);
                    gain.connect(audioContext.destination);

                    osc.frequency.setValueAtTime(freqs[i], audioContext.currentTime + time);
                    gain.gain.setValueAtTime(0.2, audioContext.currentTime + time);
                    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + time + 0.2);

                    osc.start(audioContext.currentTime + time);
                    osc.stop(audioContext.currentTime + time + 0.2);
                });
            } else if (type === 'celebration') {
                // Big celebration sound
                const times = [0, 0.1, 0.2, 0.3, 0.4];
                const freqs = [523, 659, 784, 1047, 1319]; // C major arpeggio

                times.forEach((time, i) => {
                    const osc = audioContext.createOscillator();
                    const gain = audioContext.createGain();
                    osc.connect(gain);
                    gain.connect(audioContext.destination);

                    osc.frequency.setValueAtTime(freqs[i], audioContext.currentTime + time);
                    gain.gain.setValueAtTime(0.25, audioContext.currentTime + time);
                    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + time + 0.4);

                    osc.start(audioContext.currentTime + time);
                    osc.stop(audioContext.currentTime + time + 0.4);
                });
            }
        } catch (err) {
            console.log('Audio not available:', err);
        }
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new StarChartApp());
} else {
    new StarChartApp();
}
