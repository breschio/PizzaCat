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
    }
}

export function spawnGameObject(canvas, images, type) {
    // Calculate spawn area: between 1/3 and 0.9 of screen height
    // Using 0.9 instead of 1.0 to keep objects from spawning too close to bottom
    const minY = canvas.height * (1/3); // Start below trick zone
    const maxY = canvas.height * 0.9;  // Keep slightly above bottom
    const y = minY + Math.random() * (maxY - minY); // Random position in valid range
    const x = canvas.width; // Start from the right edge
    
    if (type === 'fish') {
        // Randomly select fish type
        const fishTypes = ['tuna', 'buffalo', 'salmon'];
        const selectedType = fishTypes[Math.floor(Math.random() * fishTypes.length)];
        
        // Get corresponding image based on fish type
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