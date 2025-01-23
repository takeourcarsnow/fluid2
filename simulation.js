// Utility functions
const utils = {
    lerp: (start, end, amt) => (1 - amt) * start + amt * end,
    clamp: (value, min, max) => Math.min(Math.max(value, min), max),
    randomRange: (min, max) => Math.random() * (max - min) + min,
    requestOrientationPermission: () => {
        if (typeof DeviceOrientationEvent !== 'undefined' && 
            typeof DeviceOrientationEvent.requestPermission === 'function') {
            return DeviceOrientationEvent.requestPermission();
        }
        return Promise.resolve('granted');
    },
    createGradient: (ctx, width, height) => {
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, 'hsl(180, 50%, 50%)');
        gradient.addColorStop(0.5, 'hsl(210, 50%, 50%)');
        gradient.addColorStop(1, 'hsl(240, 50%, 50%)');
        return gradient;
    }
};

class Particle {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.options = {
            size: options.size || utils.randomRange(2, 6),
            color: options.color,
            friction: options.friction || 0.99,
            bounce: options.bounce || 0.6,
            speedLimit: options.speedLimit || 15
        };
        this.reset();
    }

    reset() {
        this.x = utils.randomRange(0, this.canvas.width);
        this.y = utils.randomRange(0, this.canvas.height);
        this.prevX = this.x;
        this.prevY = this.y;
        this.velocityX = 0;
        this.velocityY = 0;
        this.life = 1;
        this.age = 0;
    }

    limitSpeed() {
        const speed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
        if (speed > this.options.speedLimit) {
            const ratio = this.options.speedLimit / speed;
            this.velocityX *= ratio;
            this.velocityY *= ratio;
        }
    }

    update(gravityX, gravityY, deltaTime) {
        const dt = deltaTime * 0.001;

        this.velocityX += gravityX * 60 * dt;
        this.velocityY += gravityY * 60 * dt;

        this.velocityX *= this.options.friction;
        this.velocityY *= this.options.friction;

        this.limitSpeed();

        this.prevX = this.x;
        this.prevY = this.y;

        this.x += this.velocityX;
        this.y += this.velocityY;

        // Boundary collision with screen wrap
        if (this.x < 0) {
            this.x = this.canvas.width;
            this.prevX = this.x;
        } else if (this.x > this.canvas.width) {
            this.x = 0;
            this.prevX = this.x;
        }

        if (this.y < 0) {
            this.y = this.canvas.height;
            this.prevY = this.y;
        } else if (this.y > this.canvas.height) {
            this.y = 0;
            this.prevY = this.y;
        }

        this.age += dt;
        this.life = Math.sin(this.age) * 0.5 + 0.5;
    }

    draw() {
        this.ctx.beginPath();
        this.ctx.strokeStyle = this.options.color;
        this.ctx.lineWidth = this.options.size * this.life;
        this.ctx.lineCap = 'round';
        this.ctx.moveTo(this.prevX, this.prevY);
        this.ctx.lineTo(this.x, this.y);
        this.ctx.stroke();
    }
}

class ParticleSystem {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.gravityX = 0;
        this.gravityY = 0;
        this.lastTime = 0;
        this.isActive = true;
        this.options = {
            particleCount: options.particleCount || 150,
            trailOpacity: options.trailOpacity || 0.15,
            touchMultiplier: options.touchMultiplier || 2,
        };

        this.gradient = utils.createGradient(this.ctx, canvas.width, canvas.height);
        this.init();
        this.bindEvents();
    }

    init() {
        this.resize();
        for (let i = 0; i < this.options.particleCount; i++) {
            this.particles.push(new Particle(this.canvas, {
                color: this.gradient
            }));
        }
    }

    bindEvents() {
        window.addEventListener('resize', () => this.resize());
        
        window.addEventListener('deviceorientation', (e) => {
            if (!this.isActive) return;
            this.gravityX = (e.gamma || 0) * 0.1;
            this.gravityY = (e.beta || 0) * 0.1;
        });

        let touchHandler = (e) => {
            if (!this.isActive) return;
            const touch = e.touches[0];
            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2;
            this.gravityX = (touch.clientX - centerX) * 0.01 * this.options.touchMultiplier;
            this.gravityY = (touch.clientY - centerY) * 0.01 * this.options.touchMultiplier;
        };

        this.canvas.addEventListener('touchmove', touchHandler, { passive: true });
        this.canvas.addEventListener('touchstart', touchHandler, { passive: true });
        this.canvas.addEventListener('touchend', () => {
            this.gravityX = 0;
            this.gravityY = 0;
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isActive) return;
            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2;
            this.gravityX = (e.clientX - centerX) * 0.01;
            this.gravityY = (e.clientY - centerY) * 0.01;
        });
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.gradient = utils.createGradient(this.ctx, this.canvas.width, this.canvas.height);
    }

    update(timestamp) {
        if (!this.isActive) return;
        
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.ctx.fillStyle = `rgba(0, 0, 0, ${this.options.trailOpacity})`;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.particles.forEach(particle => {
            particle.update(this.gravityX, this.gravityY, deltaTime);
            particle.draw();
        });

        requestAnimationFrame((t) => this.update(t));
    }

    start() {
        this.isActive = true;
        this.update(0);
    }

    stop() {
        this.isActive = false;
    }

    reset() {
        this.particles.forEach(particle => particle.reset());
    }
}

// Initialize the application
const canvas = document.getElementById('canvas');
const permissionBtn = document.getElementById('permissionBtn');
const resetBtn = document.getElementById('resetBtn');

const particleSystem = new ParticleSystem(canvas, {
    particleCount: 150,
    trailOpacity: 0.15,
    touchMultiplier: 2
});

permissionBtn.addEventListener('click', async () => {
    try {
        const permission = await utils.requestOrientationPermission();
        if (permission === 'granted') {
            permissionBtn.style.display = 'none';
        } else {
            alert('Permission denied for device orientation');
        }
    } catch (error) {
        console.error('Error requesting permission:', error);
    }
});

resetBtn.addEventListener('click', () => {
    particleSystem.reset();
});

// Start the simulation
particleSystem.start();

// Handle visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        particleSystem.stop();
    } else {
        particleSystem.start();
    }
});