// Simple canvas-based confetti animation

class ConfettiParticle {
    constructor(canvas) {
        this.canvas = canvas;
        this.reset();
        // Start from random position for initial burst
        this.y = Math.random() * canvas.height;
    }

    reset() {
        this.x = Math.random() * this.canvas.width;
        this.y = -10;
        this.size = Math.random() * 8 + 4;
        this.speedY = Math.random() * 3 + 2;
        this.speedX = Math.random() * 2 - 1;
        this.color = this.randomColor();
        this.rotation = Math.random() * 360;
        this.rotationSpeed = Math.random() * 10 - 5;
        this.opacity = 1;
    }

    randomColor() {
        const colors = [
            '#ef4444', // red
            '#f97316', // orange
            '#eab308', // yellow
            '#22c55e', // green
            '#3b82f6', // blue
            '#a855f7', // purple
            '#ec4899', // pink
            '#fbbf24', // gold
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    update() {
        this.y += this.speedY;
        this.x += this.speedX;
        this.rotation += this.rotationSpeed;
        this.opacity -= 0.005;

        if (this.y > this.canvas.height || this.opacity <= 0) {
            return false; // Particle is dead
        }
        return true; // Particle is alive
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate((this.rotation * Math.PI) / 180);
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = this.color;

        // Draw a small rectangle (confetti piece)
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size / 2);

        ctx.restore();
    }
}

class ConfettiEffect {
    constructor() {
        this.canvas = document.getElementById('confetti-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.animationFrame = null;
        this.isActive = false;

        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    // Small burst for row completions
    burstSmall() {
        this.addParticles(30);
        this.start();
    }

    // Large burst for final celebration
    burstLarge() {
        this.addParticles(150);
        this.start();
    }

    addParticles(count) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new ConfettiParticle(this.canvas));
        }
    }

    start() {
        if (this.isActive) return;
        this.isActive = true;
        this.animate();
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Update and draw all particles
        this.particles = this.particles.filter(particle => {
            const alive = particle.update();
            if (alive) {
                particle.draw(this.ctx);
            }
            return alive;
        });

        if (this.particles.length > 0) {
            this.animationFrame = requestAnimationFrame(() => this.animate());
        } else {
            this.stop();
        }
    }

    stop() {
        this.isActive = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

// Export singleton instance
export const confetti = new ConfettiEffect();
