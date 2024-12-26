// Game Objects and Spawning Logic
export class GameObject {
    constructor(x, y, width, height, image, speed) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.image = image;
        this.speed = speed;
        this.shouldRemove = false;
        this.bounds = {
            left: 0,
            right: 0,
            top: 0,
            bottom: 0
        };
        this.updateBounds();
    }

    updateBounds() {
        this.bounds.left = this.x;
        this.bounds.right = this.x + this.width;
        this.bounds.top = this.y;
        this.bounds.bottom = this.y + this.height;
    }

    update(deltaTime) {
        // Move from right to left
        this.x -= this.speed * deltaTime;
        this.updateBounds();
        
        // Mark for removal if off screen
        if (this.bounds.right < 0) {
            this.shouldRemove = true;
        }
    }

    draw(ctx) {
        if (this.image && this.image.complete) {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        }
    }

    checkCollision(catX, catY, catWidth, catHeight) {
        const catBounds = {
            left: catX,
            right: catX + catWidth,
            top: catY,
            bottom: catY + catHeight
        };

        return !(this.bounds.left > catBounds.right ||
                this.bounds.right < catBounds.left ||
                this.bounds.top > catBounds.bottom ||
                this.bounds.bottom < catBounds.top);
    }
}

export class Fish extends GameObject {
    constructor(x, y, image, type) {
        const size = getFishSize(type);
        super(x, y, size.width, size.height, image, getFishSpeed(type));
        this.type = type;
        this.points = getFishPoints(type);
    }
}

function getFishSize(type) {
    switch(type) {
        case 'tuna':
            return { width: 128, height: 128 };
        case 'buffalo':
            return { width: 94, height: 47 };
        case 'salmon':
            return { width: 128, height: 128 };
        default:
            return { width: 128, height: 128 };
    }
}

function getFishSpeed(type) {
    const baseSpeed = 200;
    const variation = 50;
    
    switch(type) {
        case 'tuna':
            return baseSpeed + variation + Math.random() * 50; // Fastest
        case 'buffalo':
            return baseSpeed + Math.random() * variation; // Normal
        case 'salmon':
            return baseSpeed + (variation / 2) + Math.random() * 30; // Medium
        default:
            return baseSpeed + Math.random() * variation;
    }
}

function getFishPoints(type) {
    switch(type) {
        case 'tuna':
            return 3; // Worth more points because it's faster
        case 'buffalo':
            return 1;
        case 'salmon':
            return 2;
        default:
            return 1;
    }
}

export class Mouse extends GameObject {
    constructor(x, y, image) {
        super(x, y, 80, 80, image, 250 + Math.random() * 50); // Reduced size for better collision
        this.rotation = 0;
        this.isSpinning = false;
        this.spinSpeed = 0;
        this.upwardVelocity = 0;
        this.horizontalVelocity = 0;
    }

    startSpinning() {
        if (!this.isSpinning) {
            this.isSpinning = true;
            this.spinSpeed = Math.PI * (6 + Math.random() * 4); // Random spin speed between 6π and 10π
            this.upwardVelocity = 600 + Math.random() * 400; // Random upward velocity between 600 and 1000
            
            // Random horizontal direction and speed
            const directionMultiplier = Math.random() < 0.5 ? -1 : 1; // Randomly go left or right
            this.horizontalVelocity = (300 + Math.random() * 400) * directionMultiplier;
        }
    }

    update(deltaTime) {
        if (this.isSpinning) {
            this.rotation += this.spinSpeed * deltaTime;
            this.y -= this.upwardVelocity * deltaTime;
            this.x += this.horizontalVelocity * deltaTime;
            this.upwardVelocity -= 1200 * deltaTime; // Gravity effect
            
            this.updateBounds();
            
            // Remove when off screen in any direction
            if (this.bounds.left > window.innerWidth || 
                this.bounds.right < 0 || 
                this.bounds.bottom > window.innerHeight || 
                this.bounds.top < 0) {
                this.shouldRemove = true;
            }
        } else {
            super.update(deltaTime);
        }
    }

    draw(ctx) {
        ctx.save();
        
        if (this.isSpinning) {
            const centerX = this.x + this.width / 2;
            const centerY = this.y + this.height / 2;
            ctx.translate(centerX, centerY);
            ctx.rotate(this.rotation);
            ctx.translate(-centerX, -centerY);
        }
        
        super.draw(ctx);
        ctx.restore();
    }
}

export class Catnip extends GameObject {
    constructor(x, y, image) {
        super(x, y, 80, 80, image, 150 + Math.random() * 50); // Smaller size than fish, medium speed
        this.duration = 10000; // Catnip effect lasts 10 seconds
    }
}

export function spawnGameObject(canvas, images, type) {
    const minY = canvas.height * (1/3);
    const maxY = canvas.height * 0.9;
    const y = minY + Math.random() * (maxY - minY);
    const x = canvas.width;
    
    // Ensure images are loaded before creating objects
    if (type === 'fish' && (!images.tuna?.complete || !images.buffaloFish?.complete || !images.salmon?.complete)) {
        console.warn('Fish images not fully loaded');
        return null;
    }
    if (type === 'mouse' && !images.mouse?.complete) {
        console.warn('Mouse image not loaded');
        return null;
    }
    if (type === 'catnip' && !images.catnip?.complete) {
        console.warn('Catnip image not loaded');
        return null;
    }
    
    try {
        if (type === 'fish') {
            const fishTypes = ['tuna', 'buffalo', 'salmon'];
            const selectedType = fishTypes[Math.floor(Math.random() * fishTypes.length)];
            
            const fishImage = {
                'tuna': images.tuna,
                'buffalo': images.buffaloFish,
                'salmon': images.salmon
            }[selectedType];
            
            return new Fish(x, y, fishImage, selectedType);
        } else if (type === 'catnip') {
            return new Catnip(x, y, images.catnip);
        } else {
            return new Mouse(x, y, images.mouse);
        }
    } catch (error) {
        console.error('Error spawning game object:', error);
        return null;
    }
}

export function updateSpawnRates(currentTime, startTime, fishSpawnRate, maxFishSpawnRate, timeToMaxSpeed) {
    // Gradually increase spawn rate over time
    const timePassed = (currentTime - startTime) / 1000; // Convert to seconds
    const progressToMax = Math.min(timePassed / timeToMaxSpeed, 1);
    
    return {
        fishSpawnRate: fishSpawnRate + (maxFishSpawnRate - fishSpawnRate) * progressToMax
    };
} 