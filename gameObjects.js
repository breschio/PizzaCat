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
    }

    update(deltaTime) {
        // Move from right to left
        this.x -= this.speed * deltaTime;
        
        // Mark for removal if off screen
        if (this.x + this.width < 0) {
            this.shouldRemove = true;
        }
    }

    draw(ctx) {
        ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
    }

    checkCollision(catX, catY, catWidth, catHeight) {
        return !(this.x > catX + catWidth ||
                this.x + this.width < catX ||
                this.y > catY + catHeight ||
                this.y + this.height < catY);
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
        super(x, y, 128, 128, image, 250 + Math.random() * 50);
        this.rotation = 0;
        this.isSpinning = false;
        this.spinSpeed = 0;
        this.upwardVelocity = 0;
    }

    update(deltaTime) {
        if (this.isSpinning) {
            // Spin and move upward when hit during catnip mode
            this.rotation += this.spinSpeed * deltaTime;
            this.y -= this.upwardVelocity * deltaTime;
            this.x += this.speed * 2 * deltaTime; // Move faster to the right
            this.upwardVelocity -= 500 * deltaTime; // Add gravity effect
            
            // Mark for removal if off screen
            if (this.x > window.innerWidth || this.y > window.innerHeight) {
                this.shouldRemove = true;
            }
        } else {
            // Normal movement from right to left
            this.x -= this.speed * deltaTime;
            
            // Mark for removal if off screen to the left
            if (this.x + this.width < 0) {
                this.shouldRemove = true;
            }
        }
    }

    draw(ctx) {
        ctx.save();
        
        // If spinning, rotate around center
        if (this.isSpinning) {
            const centerX = this.x + this.width / 2;
            const centerY = this.y + this.height / 2;
            ctx.translate(centerX, centerY);
            ctx.rotate(this.rotation);
            ctx.translate(-centerX, -centerY);
        }
        
        ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        ctx.restore();
    }

    startSpinning() {
        this.isSpinning = true;
        this.spinSpeed = 10 + Math.random() * 5; // Random spin speed
        this.upwardVelocity = 300 + Math.random() * 200; // Random upward velocity
        this.speed = -this.speed; // Reverse horizontal direction
    }
}

export class Catnip extends GameObject {
    constructor(x, y, image) {
        super(x, y, 80, 80, image, 150 + Math.random() * 50); // Smaller size than fish, medium speed
        this.duration = 10000; // Catnip effect lasts 10 seconds
    }
}

export function spawnGameObject(canvas, images, type) {
    // Calculate spawn area: between 1/3 and 0.9 of screen height
    const minY = canvas.height * (1/3);
    const maxY = canvas.height * 0.9;
    const y = minY + Math.random() * (maxY - minY);
    const x = canvas.width;
    
    if (type === 'fish') {
        const fishTypes = ['tuna', 'buffalo', 'salmon'];
        const selectedType = fishTypes[Math.floor(Math.random() * fishTypes.length)];
        
        let fishImage;
        switch(selectedType) {
            case 'tuna':
                fishImage = images.tuna;
                break;
            case 'buffalo':
                fishImage = images.buffaloFish;
                break;
            case 'salmon':
                fishImage = images.salmon;
                break;
            default:
                fishImage = images.buffaloFish;
        }
        
        return new Fish(x, y, fishImage, selectedType);
    } else if (type === 'catnip') {
        return new Catnip(x, y, images.catnip);
    } else {
        return new Mouse(x, y, images.mouse);
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