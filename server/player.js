// Player class for HaxBall Clone
class Player {
    constructor(id, nickname) {
        this.id = id;
        this.nickname = nickname;
        this.roomCode = null;
        
        // Position and physics
        this.x = 100;
        this.y = 200;
        this.vx = 0;
        this.vy = 0;
        
        // Game properties
        this.team = null; // 'red', 'blue', or null (spectator)
        this.isReady = false;
        this.score = 0;
        
        // Input state
        this.input = {
            up: false,
            down: false,
            left: false,
            right: false
        };
        
        // Connection info
        this.lastSeen = Date.now();
        this.ping = 0;
    }

    // Update player position based on team assignment
    setTeam(team) {
        this.team = team;
        
        // Set starting position based on team
        if (team === 'red') {
            this.x = 100;
            this.y = 200;
        } else if (team === 'blue') {
            this.x = 700;
            this.y = 200;
        } else {
            // Spectator position
            this.x = 400;
            this.y = 50;
        }
        
        // Reset velocity
        this.vx = 0;
        this.vy = 0;
    }

    // Reset player to starting position
    resetPosition() {
        if (this.team === 'red') {
            this.x = 100;
            this.y = 200;
        } else if (this.team === 'blue') {
            this.x = 700;
            this.y = 200;
        }
        
        this.vx = 0;
        this.vy = 0;
    }

    // Update player input
    updateInput(input) {
        this.input = { ...input };
        this.lastSeen = Date.now();
    }

    // Get player data for network transmission
    getData() {
        return {
            id: this.id,
            nickname: this.nickname,
            x: this.x,
            y: this.y,
            vx: this.vx,
            vy: this.vy,
            team: this.team,
            isReady: this.isReady,
            score: this.score,
            ping: this.ping
        };
    }

    // Get minimal data for game state updates
    getGameData() {
        return {
            id: this.id,
            nickname: this.nickname,
            x: Math.round(this.x * 100) / 100, // Round to 2 decimal places
            y: Math.round(this.y * 100) / 100,
            vx: Math.round(this.vx * 100) / 100,
            vy: Math.round(this.vy * 100) / 100,
            team: this.team
        };
    }

    // Check if player is active (recently sent input)
    isActive() {
        return Date.now() - this.lastSeen < 5000; // 5 seconds timeout
    }

    // Update ping
    updatePing(ping) {
        this.ping = ping;
    }

    // Check if player is in goal area
    isInGoalArea() {
        const goalTop = (400 - 80) / 2; // (fieldHeight - goalHeight) / 2
        const goalBottom = goalTop + 80;
        
        // Left goal area
        if (this.x < 60 && this.y >= goalTop - 20 && this.y <= goalBottom + 20) {
            return 'left';
        }
        
        // Right goal area
        if (this.x > 740 && this.y >= goalTop - 20 && this.y <= goalBottom + 20) {
            return 'right';
        }
        
        return null;
    }

    // Get distance to ball
    getDistanceToBall(ball) {
        const dx = this.x - ball.x;
        const dy = this.y - ball.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Check if player can kick ball
    canKickBall(ball) {
        return this.getDistanceToBall(ball) <= 30; // Player radius + ball radius + kick range
    }

    // Serialize for JSON
    toJSON() {
        return this.getData();
    }
}

module.exports = Player;

