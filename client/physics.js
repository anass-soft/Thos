// Physics Engine for HaxBall Clone
class PhysicsEngine {
    constructor() {
        this.gravity = 0;
        this.friction = 0.98;
        this.bounceRestitution = 0.8;
        this.playerRadius = 15;
        this.ballRadius = 10;
        this.maxSpeed = 5;
        this.acceleration = 0.5;
    }

    // Vector operations
    static distance(obj1, obj2) {
        const dx = obj1.x - obj2.x;
        const dy = obj1.y - obj2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    static normalize(vector) {
        const magnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
        if (magnitude === 0) return { x: 0, y: 0 };
        return {
            x: vector.x / magnitude,
            y: vector.y / magnitude
        };
    }

    static dotProduct(v1, v2) {
        return v1.x * v2.x + v1.y * v2.y;
    }

    // Update player physics
    updatePlayer(player, input, deltaTime) {
        // Apply input forces
        if (input.up) player.vy -= this.acceleration;
        if (input.down) player.vy += this.acceleration;
        if (input.left) player.vx -= this.acceleration;
        if (input.right) player.vx += this.acceleration;

        // Limit max speed
        const speed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
        if (speed > this.maxSpeed) {
            player.vx = (player.vx / speed) * this.maxSpeed;
            player.vy = (player.vy / speed) * this.maxSpeed;
        }

        // Apply friction
        player.vx *= this.friction;
        player.vy *= this.friction;

        // Update position
        player.x += player.vx * deltaTime;
        player.y += player.vy * deltaTime;

        // Keep player in bounds
        this.constrainToBounds(player, this.playerRadius);
    }

    // Update ball physics
    updateBall(ball, deltaTime) {
        // Apply friction
        ball.vx *= this.friction;
        ball.vy *= this.friction;

        // Update position
        ball.x += ball.vx * deltaTime;
        ball.y += ball.vy * deltaTime;

        // Keep ball in bounds
        this.constrainToBounds(ball, this.ballRadius);
    }

    // Constrain object to field bounds
    constrainToBounds(obj, radius) {
        const fieldWidth = 800;
        const fieldHeight = 400;
        const goalWidth = 100;
        const goalHeight = 80;
        const goalDepth = 20;

        // Left and right walls (with goal openings)
        if (obj.x - radius < 0) {
            // Check if in goal area
            const goalTop = (fieldHeight - goalHeight) / 2;
            const goalBottom = goalTop + goalHeight;
            
            if (obj.y >= goalTop && obj.y <= goalBottom) {
                // In goal area - allow deeper penetration
                if (obj.x - radius < -goalDepth) {
                    obj.x = -goalDepth + radius;
                    obj.vx = Math.abs(obj.vx) * this.bounceRestitution;
                }
            } else {
                // Hit wall
                obj.x = radius;
                obj.vx = Math.abs(obj.vx) * this.bounceRestitution;
            }
        }

        if (obj.x + radius > fieldWidth) {
            // Check if in goal area
            const goalTop = (fieldHeight - goalHeight) / 2;
            const goalBottom = goalTop + goalHeight;
            
            if (obj.y >= goalTop && obj.y <= goalBottom) {
                // In goal area
                if (obj.x + radius > fieldWidth + goalDepth) {
                    obj.x = fieldWidth + goalDepth - radius;
                    obj.vx = -Math.abs(obj.vx) * this.bounceRestitution;
                }
            } else {
                // Hit wall
                obj.x = fieldWidth - radius;
                obj.vx = -Math.abs(obj.vx) * this.bounceRestitution;
            }
        }

        // Top and bottom walls
        if (obj.y - radius < 0) {
            obj.y = radius;
            obj.vy = Math.abs(obj.vy) * this.bounceRestitution;
        }

        if (obj.y + radius > fieldHeight) {
            obj.y = fieldHeight - radius;
            obj.vy = -Math.abs(obj.vy) * this.bounceRestitution;
        }
    }

    // Check collision between two circular objects
    checkCollision(obj1, obj2, radius1, radius2) {
        const distance = PhysicsEngine.distance(obj1, obj2);
        return distance < (radius1 + radius2);
    }

    // Resolve collision between two objects
    resolveCollision(obj1, obj2, radius1, radius2, mass1 = 1, mass2 = 1) {
        const distance = PhysicsEngine.distance(obj1, obj2);
        const minDistance = radius1 + radius2;

        if (distance >= minDistance) return;

        // Calculate collision normal
        const dx = obj2.x - obj1.x;
        const dy = obj2.y - obj1.y;
        const normal = PhysicsEngine.normalize({ x: dx, y: dy });

        // Separate objects
        const overlap = minDistance - distance;
        const separation = overlap / 2;

        obj1.x -= normal.x * separation;
        obj1.y -= normal.y * separation;
        obj2.x += normal.x * separation;
        obj2.y += normal.y * separation;

        // Calculate relative velocity
        const relativeVelocity = {
            x: obj2.vx - obj1.vx,
            y: obj2.vy - obj1.vy
        };

        // Calculate relative velocity along normal
        const velocityAlongNormal = PhysicsEngine.dotProduct(relativeVelocity, normal);

        // Don't resolve if velocities are separating
        if (velocityAlongNormal > 0) return;

        // Calculate restitution
        const restitution = this.bounceRestitution;

        // Calculate impulse scalar
        const impulseScalar = -(1 + restitution) * velocityAlongNormal / (1/mass1 + 1/mass2);

        // Apply impulse
        const impulse = {
            x: impulseScalar * normal.x,
            y: impulseScalar * normal.y
        };

        obj1.vx -= impulse.x / mass1;
        obj1.vy -= impulse.y / mass1;
        obj2.vx += impulse.x / mass2;
        obj2.vy += impulse.y / mass2;
    }

    // Check if ball is in goal
    checkGoal(ball) {
        const fieldWidth = 800;
        const fieldHeight = 400;
        const goalHeight = 80;
        const goalTop = (fieldHeight - goalHeight) / 2;
        const goalBottom = goalTop + goalHeight;

        // Left goal (Red team scores)
        if (ball.x < 0 && ball.y >= goalTop && ball.y <= goalBottom) {
            return 'blue'; // Blue team scored
        }

        // Right goal (Blue team scores)
        if (ball.x > fieldWidth && ball.y >= goalTop && ball.y <= goalBottom) {
            return 'red'; // Red team scored
        }

        return null;
    }

    // Reset ball to center
    resetBall(ball) {
        ball.x = 400; // Center X
        ball.y = 200; // Center Y
        ball.vx = 0;
        ball.vy = 0;
    }

    // Apply kick force from player to ball
    applyKick(player, ball, kickForce = 8) {
        const distance = PhysicsEngine.distance(player, ball);
        const maxKickDistance = this.playerRadius + this.ballRadius + 5;

        if (distance <= maxKickDistance) {
            // Calculate kick direction
            const dx = ball.x - player.x;
            const dy = ball.y - player.y;
            const direction = PhysicsEngine.normalize({ x: dx, y: dy });

            // Apply force to ball
            ball.vx += direction.x * kickForce;
            ball.vy += direction.y * kickForce;

            // Add player velocity to ball
            ball.vx += player.vx * 0.3;
            ball.vy += player.vy * 0.3;
        }
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PhysicsEngine;
}

