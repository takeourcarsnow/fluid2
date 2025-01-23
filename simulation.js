const utils = {
    lerp: (start, end, amt) => (1 - amt) * start + amt * end,
    clamp: (value, min, max) => Math.min(Math.max(value, min), max),
    randomRange: (min, max) => Math.random() * (max - min) + min,
    distance: (x1, y1, x2, y2) => Math.sqrt((x2-x1)**2 + (y2-y1)**2),
    
    getRandomColor: (mode = 'rainbow', singleColor = null) => {
        if (mode === 'single' && singleColor) {
            return singleColor;
        }
        switch(mode) {
            case 'rainbow':
                return `hsl(${Math.random() * 360}, 80%, 60%)`;
            case 'neon':
                const neonColors = [
                    '#ff0088', // hot pink
                    '#00ff99', // bright green
                    '#00ffff', // cyan
                    '#ff9900', // orange
                    '#ff00ff', // magenta
                    '#ffff00'  // yellow
                ];
                return neonColors[Math.floor(Math.random() * neonColors.length)];
            case 'cool':
                return `hsl(${utils.randomRange(180, 300)}, 70%, 60%)`; // blues and purples
            case 'warm':
                return `hsl(${utils.randomRange(0, 60)}, 80%, 60%)`; // reds and yellows
            case 'pastel':
                return `hsl(${Math.random() * 360}, 70%, 80%)`; // lighter, softer colors
            case 'kinetic':
                return `hsl(0, 80%, 60%)`; // starting color, will be modified by speed
            default:
                return `hsl(${Math.random() * 360}, 70%, 60%)`;
        }
    },

    getKineticColor: (speed, maxSpeed) => {
        const hue = (speed / maxSpeed) * 240;
        const saturation = 80;
        const lightness = 60;
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }
};

class Particle {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.options = {
            size: options.size || utils.randomRange(4, 32),
            color: options.color || utils.getRandomColor(options.colorMode, options.singleColor),
            friction: 0.97,
            bounce: 0.85,
            mode: options.mode || 'normal',
            type: options.type || 'circle',
            speedMultiplier: options.speedMultiplier || 0.5,
            colorMode: options.colorMode || 'rainbow',
            singleColor: options.singleColor
        };
        this.mass = this.options.size * 0.1;
        this.rotation = 0;
        this.rotationSpeed = utils.randomRange(-0.02, 0.02) * this.options.speedMultiplier;
        this.reset();
    }

    reset() {
        this.x = utils.randomRange(0, this.canvas.width);
        this.y = utils.randomRange(0, this.canvas.height);
        this.velocityX = utils.randomRange(-2, 2) * this.options.speedMultiplier;
        this.velocityY = utils.randomRange(-2, 2) * this.options.speedMultiplier;
        this.rotation = utils.randomRange(0, Math.PI * 2);
    }

    updateColor() {
        if (this.options.colorMode === 'kinetic') {
            const speed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
            const maxSpeed = 15 * this.options.speedMultiplier;
            this.options.color = utils.getKineticColor(speed, maxSpeed);
        }
    }
	
	update(gravityX, gravityY, deltaTime, mouseX, mouseY, particles = []) {
        const dt = deltaTime * 0.001;
        const speed = this.options.speedMultiplier;

        switch(this.options.mode) {
            case 'vortex':
                const dx = mouseX - this.x;
                const dy = mouseY - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 150) {
                    const force = (150 - dist) / 150;
                    this.velocityX += dy * force * 0.05 * speed;
                    this.velocityY -= dx * force * 0.05 * speed;
                }
                break;

            case 'attract':
                const ax = mouseX - this.x;
                const ay = mouseY - this.y;
                const aDist = Math.sqrt(ax * ax + ay * ay);
                if (aDist < 200) {
                    const force = (200 - aDist) / 200;
                    this.velocityX += ax * force * 0.02 * speed;
                    this.velocityY += ay * force * 0.02 * speed;
                }
                break;

            case 'repel':
                const rx = this.x - mouseX;
                const ry = this.y - mouseY;
                const rDist = Math.sqrt(rx * rx + ry * ry);
                if (rDist < 150) {
                    const force = (150 - rDist) / 150;
                    this.velocityX += rx * force * 0.05 * speed;
                    this.velocityY += ry * force * 0.05 * speed;
                }
                break;

            case 'fluid':
                for (let other of particles) {
                    if (other === this) continue;
                    const fx = other.x - this.x;
                    const fy = other.y - this.y;
                    const fDist = Math.sqrt(fx * fx + fy * fy);
                    if (fDist < 50 && fDist > 0) {
                        const force = (1 - fDist / 50) * speed;
                        this.velocityX += (fx / fDist) * force * 0.2;
                        this.velocityY += (fy / fDist) * force * 0.2;
                    }
                }
                break;

            case 'springs':
                for (let other of particles) {
                    if (other === this) continue;
                    const sx = other.x - this.x;
                    const sy = other.y - this.y;
                    const sDist = Math.sqrt(sx * sx + sy * sy);
                    if (sDist < 50 && sDist > 0) {
                        const force = (sDist - 25) * 0.03 * speed;
                        this.velocityX += (sx / sDist) * force;
                        this.velocityY += (sy / sDist) * force;
                    }
                }
                break;

            default:
                this.velocityX += gravityX * 30 * dt * speed;
                this.velocityY += gravityY * 30 * dt * speed;
        }

        // Apply physics
        this.velocityX *= this.options.friction;
        this.velocityY *= this.options.friction;

        // Limit speed
        const currentSpeed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
        const maxSpeed = 15 * speed;
        if (currentSpeed > maxSpeed) {
            const ratio = maxSpeed / currentSpeed;
            this.velocityX *= ratio;
            this.velocityY *= ratio;
        }

        // Update position
        this.x += this.velocityX;
        this.y += this.velocityY;

        // Update rotation for non-circular shapes
        if (this.options.type !== 'circle') {
            this.rotation += this.rotationSpeed;
        }

        // Update color if in kinetic mode
        this.updateColor();

        // Handle collisions
        this.handleCollisions(particles);
        this.handleBoundaries();
    }

    handleCollisions(particles) {
        for (let other of particles) {
            if (other === this) continue;

            const dx = other.x - this.x;
            const dy = other.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Adjust collision distance based on shape
            let thisRadius = this.options.size;
            let otherRadius = other.options.size;
            
            if (this.options.type === 'square') thisRadius *= Math.SQRT2;
            if (other.options.type === 'square') otherRadius *= Math.SQRT2;
            if (this.options.type === 'triangle') thisRadius *= 1.5;
            if (other.options.type === 'triangle') otherRadius *= 1.5;

            const minDistance = thisRadius + otherRadius;

            if (distance < minDistance && distance > 0) {
                // Calculate collision response
                const angle = Math.atan2(dy, dx);
                const sin = Math.sin(angle);
                const cos = Math.cos(angle);

                // Rotate velocities
                const vx1 = this.velocityX * cos + this.velocityY * sin;
                const vy1 = this.velocityY * cos - this.velocityX * sin;
                const vx2 = other.velocityX * cos + other.velocityY * sin;
                const vy2 = other.velocityY * cos - other.velocityX * sin;

                // Collision reaction
                const m1 = this.mass;
                const m2 = other.mass;
                const u1 = ((m1 - m2) * vx1 + 2 * m2 * vx2) / (m1 + m2);
                const u2 = ((m2 - m1) * vx2 + 2 * m1 * vx1) / (m1 + m2);

                // Update velocities
                this.velocityX = (u1 * cos - vy1 * sin) * this.options.bounce;
                this.velocityY = (vy1 * cos + u1 * sin) * this.options.bounce;
                other.velocityX = (u2 * cos - vy2 * sin) * other.options.bounce;
                other.velocityY = (vy2 * cos + u2 * sin) * other.options.bounce;

                // Prevent overlapping
                const overlap = minDistance - distance;
                const separationX = (dx / distance) * overlap * 0.5;
                const separationY = (dy / distance) * overlap * 0.5;

                this.x -= separationX;
                this.y -= separationY;
                other.x += separationX;
                other.y += separationY;

                // Add rotation transfer for non-circular shapes
                if (this.options.type !== 'circle' || other.options.type !== 'circle') {
                    const rotationTransfer = 0.2;
                    const avgRotation = (this.rotationSpeed + other.rotationSpeed) * 0.5;
                    this.rotationSpeed = avgRotation * (1 + rotationTransfer);
                    other.rotationSpeed = avgRotation * (1 - rotationTransfer);
                }
            }
        }
    }
	
	handleBoundaries() {
        let margin = this.options.size;
        
        // Adjust margin based on shape
        if (this.options.type === 'square') margin *= Math.SQRT2;
        if (this.options.type === 'triangle') margin *= 1.5;
        
        if (this.x < margin) {
            this.x = margin;
            this.velocityX *= -this.options.bounce;
            this.rotationSpeed *= 0.8;
        } else if (this.x > this.canvas.width - margin) {
            this.x = this.canvas.width - margin;
            this.velocityX *= -this.options.bounce;
            this.rotationSpeed *= 0.8;
        }

        if (this.y < margin) {
            this.y = margin;
            this.velocityY *= -this.options.bounce;
            this.rotationSpeed *= 0.8;
        } else if (this.y > this.canvas.height - margin) {
            this.y = this.canvas.height - margin;
            this.velocityY *= -this.options.bounce;
            this.rotationSpeed *= 0.8;
        }
    }

    draw() {
        const { ctx } = this;
        ctx.save();
        ctx.fillStyle = this.options.color;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        switch(this.options.type) {
            case 'circle':
                ctx.beginPath();
                ctx.arc(0, 0, this.options.size, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'triangle':
                ctx.beginPath();
                const size = this.options.size * 1.5;
                ctx.moveTo(-size, size/2);
                ctx.lineTo(size, size/2);
                ctx.lineTo(0, -size);
                ctx.closePath();
                ctx.fill();
                break;
            default: // square
                ctx.fillRect(
                    -this.options.size,
                    -this.options.size,
                    this.options.size * 2,
                    this.options.size * 2
                );
        }
        
        ctx.restore();
    }
}

class ParticleSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false });
        this.particles = [];
        this.gravityX = 0;
        this.gravityY = 0;
        this.mouseX = 0;
        this.mouseY = 0;
        this.lastTime = 0;
        this.fpsTime = 0;
        this.frameCount = 0;
        this.fps = 0;
        this.isRunning = true;
        
        this.options = {
            particleCount: 100,
            colorMode: 'rainbow',
            singleColor: '#00ff88',
            particleType: 'circle',
            physicsMode: 'normal',
            sizeMode: 'uniform',
            sizeRange: [4, 32],
            speedMultiplier: 0.5,
            gravity: 0,
            windForce: 0,
            explosionForce: 5.0
        };

        this.init();
        this.bindEvents();
        this.bindControls();
    }

    init() {
        this.resize();
        this.createParticles();
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    createParticles() {
        this.particles = [];
        for (let i = 0; i < this.options.particleCount; i++) {
            const size = this.options.sizeMode === 'uniform' 
                ? this.options.sizeRange[1] 
                : utils.randomRange(...this.options.sizeRange);
                
            this.particles.push(new Particle(this.canvas, {
                size: size,
                colorMode: this.options.colorMode,
                singleColor: this.options.singleColor,
                type: this.options.particleType,
                mode: this.options.physicsMode,
                speedMultiplier: this.options.speedMultiplier
            }));
        }
    }

    explodeAtPoint(x, y, radius = 200) {
        this.particles.forEach(particle => {
            const dx = particle.x - x;
            const dy = particle.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < radius) {
                const force = (1 - distance / radius) * this.options.explosionForce;
                const angle = Math.atan2(dy, dx);
                particle.velocityX += Math.cos(angle) * force * 20 + utils.randomRange(-1, 1);
                particle.velocityY += Math.sin(angle) * force * 20 + utils.randomRange(-1, 1);
            }
        });
    }
	
	bindEvents() {
        window.addEventListener('resize', () => this.resize());
        
        const moveHandler = (x, y) => {
            this.mouseX = x;
            this.mouseY = y;
            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2;
            this.gravityX = (x - centerX) * 0.005;
            this.gravityY = (y - centerY) * 0.005;
        };

        this.canvas.addEventListener('mousemove', (e) => {
            moveHandler(e.clientX, e.clientY);
        });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            moveHandler(touch.clientX, touch.clientY);
        }, { passive: false });

        document.addEventListener('keydown', (e) => {
            switch(e.key.toLowerCase()) {
                case 'h':
                    this.toggleUI();
                    break;
                case ' ':
                    e.preventDefault();
                    this.isRunning = !this.isRunning;
                    if (this.isRunning) this.update(0);
                    break;
                case 'r':
                    this.reset();
                    break;
                case 'm':
                    const physicsMode = document.getElementById('physicsMode');
                    const nextIndex = (physicsMode.selectedIndex + 1) % physicsMode.options.length;
                    physicsMode.selectedIndex = nextIndex;
                    physicsMode.dispatchEvent(new Event('change'));
                    break;
                case 'e':
                    this.explodeAtPoint(this.mouseX, this.mouseY);
                    break;
            }
        });
    }

    bindControls() {
        const particleSlider = document.getElementById('particleSlider');
        particleSlider.addEventListener('input', (e) => {
            const avgSize = (this.options.sizeRange[0] + this.options.sizeRange[1]) / 2;
            const sizeMultiplier = Math.max(0.2, 16 / avgSize);
            const adjustedMax = Math.floor(1000 * sizeMultiplier);
            
            let count = parseInt(e.target.value);
            count = Math.min(count, adjustedMax);
            
            this.options.particleCount = count;
            document.getElementById('particleValue').textContent = count;
            this.createParticles();
        });

        const sizeSlider = document.getElementById('sizeSlider');
        sizeSlider.addEventListener('input', (e) => {
            const maxSize = parseInt(e.target.value);
            const minSize = Math.max(2, maxSize / 8);
            this.options.sizeRange = [minSize, maxSize];
            document.getElementById('sizeValue').textContent = `${minSize.toFixed(1)}-${maxSize}`;
            
            const avgSize = (minSize + maxSize) / 2;
            const sizeMultiplier = Math.max(0.2, 16 / avgSize);
            const adjustedMax = Math.floor(1000 * sizeMultiplier);
            
            if (this.options.particleCount > adjustedMax) {
                this.options.particleCount = adjustedMax;
                document.getElementById('particleValue').textContent = adjustedMax;
                particleSlider.value = adjustedMax;
            }
            
            this.createParticles();
        });

        const sizeMode = document.getElementById('sizeMode');
        sizeMode.addEventListener('change', (e) => {
            this.options.sizeMode = e.target.value;
            this.createParticles();
        });

        const speedSlider = document.getElementById('speedSlider');
        speedSlider.addEventListener('input', (e) => {
            this.options.speedMultiplier = parseFloat(e.target.value);
            document.getElementById('speedValue').textContent = 
                this.options.speedMultiplier.toFixed(1);
            this.particles.forEach(p => {
                p.options.speedMultiplier = this.options.speedMultiplier;
            });
        });

        const gravitySlider = document.getElementById('gravitySlider');
        gravitySlider.addEventListener('input', (e) => {
            this.options.gravity = parseFloat(e.target.value);
            document.getElementById('gravityValue').textContent = 
                this.options.gravity.toFixed(1);
        });

        const windSlider = document.getElementById('windSlider');
        windSlider.addEventListener('input', (e) => {
            this.options.windForce = parseFloat(e.target.value);
            document.getElementById('windValue').textContent = 
                this.options.windForce.toFixed(1);
        });

        const particleType = document.getElementById('particleType');
        particleType.addEventListener('change', (e) => {
            this.options.particleType = e.target.value;
            this.particles.forEach(p => {
                p.options.type = e.target.value;
            });
        });

        const colorMode = document.getElementById('colorMode');
        const colorPicker = document.getElementById('colorPicker');
        
        colorMode.addEventListener('change', (e) => {
            this.options.colorMode = e.target.value;
            colorPicker.style.display = e.target.value === 'single' ? 'block' : 'none';
            this.particles.forEach(p => {
                p.options.colorMode = e.target.value;
                p.options.color = e.target.value === 'single' 
                    ? this.options.singleColor 
                    : utils.getRandomColor(e.target.value);
            });
        });

        colorPicker.addEventListener('input', (e) => {
            this.options.singleColor = e.target.value;
            if (this.options.colorMode === 'single') {
                this.particles.forEach(p => {
                    p.options.color = e.target.value;
                });
            }
        });

        const physicsMode = document.getElementById('physicsMode');
        physicsMode.addEventListener('change', (e) => {
            this.options.physicsMode = e.target.value;
            document.getElementById('currentMode').textContent = 
                e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1);
            this.particles.forEach(p => {
                p.options.mode = e.target.value;
            });
        });

        document.getElementById('resetBtn').addEventListener('click', () => this.reset());
        document.getElementById('explodeBtn').addEventListener('click', () => {
            this.explodeAtPoint(this.mouseX, this.mouseY);
        });
        document.getElementById('modeBtn').addEventListener('click', () => {
            const event = new Event('change');
            physicsMode.selectedIndex = (physicsMode.selectedIndex + 1) % physicsMode.options.length;
            physicsMode.dispatchEvent(event);
        });
        document.getElementById('toggleUI').addEventListener('click', () => this.toggleUI());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    updateFPS(timestamp) {
        this.frameCount++;
        if (timestamp - this.fpsTime >= 1000) {
            this.fps = this.frameCount;
            document.getElementById('fps').textContent = `FPS: ${this.fps}`;
            this.frameCount = 0;
            this.fpsTime = timestamp;
        }
    }

    update(timestamp) {
        if (!this.isRunning) return;
        
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.updateFPS(timestamp);

        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.particles.forEach(particle => {
            particle.update(
                this.gravityX + this.options.windForce, 
                this.gravityY + this.options.gravity,
                deltaTime, 
                this.mouseX, 
                this.mouseY,
                this.particles
            );
            particle.draw();
        });

        requestAnimationFrame((t) => this.update(t));
    }

    reset() {
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.particles.forEach(particle => particle.reset());
    }

    toggleUI() {
        document.body.classList.toggle('ui-hidden');
    }
}

// Initialize
const canvas = document.getElementById('canvas');
const particleSystem = new ParticleSystem(canvas);
particleSystem.update(0);
