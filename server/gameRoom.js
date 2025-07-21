// Game Room class for HaxBall Clone
const PhysicsEngine = require('../client/physics');

class GameRoom {
    constructor(code, hostPlayer) {
        this.code = code;
        this.host = hostPlayer;
        this.players = new Map();
        this.maxPlayers = 10;
        this.isPublic = true;
        this.isPlaying = false;
        
        // Game state
        this.gameState = {
            ball: {
                x: 400,
                y: 200,
                vx: 0,
                vy: 0
            },
            score: {
                red: 0,
                blue: 0
            },
            gameTime: 0,
            lastUpdate: Date.now()
        };
        
        // Physics engine
        this.physics = new PhysicsEngine();
        
        // Game loop
        this.gameLoopInterval = null;
        this.tickRate = 60; // 60 FPS
        this.tickInterval = 1000 / this.tickRate;
        
        // Team management
        this.redTeamCount = 0;
        this.blueTeamCount = 0;
        this.maxTeamSize = 4;
        
        // Add host player
        this.addPlayer(hostPlayer);
    }

    // Add player to room
    addPlayer(player) {
        if (this.players.size >= this.maxPlayers) {
            return false;
        }

        this.players.set(player.id, player);
        
        // Auto-assign team
        this.autoAssignTeam(player);
        
        console.log(`Player ${player.nickname} added to room ${this.code}`);
        return true;
    }

    // Remove player from room
    removePlayer(playerId) {
        const player = this.players.get(playerId);
        if (!player) return false;

        // Update team counts
        if (player.team === 'red') {
            this.redTeamCount--;
        } else if (player.team === 'blue') {
            this.blueTeamCount--;
        }

        this.players.delete(playerId);
        
        console.log(`Player ${player.nickname} removed from room ${this.code}`);
        return true;
    }

    // Auto-assign player to team
    autoAssignTeam(player) {
        if (this.redTeamCount < this.maxTeamSize && this.redTeamCount <= this.blueTeamCount) {
            player.setTeam('red');
            this.redTeamCount++;
        } else if (this.blueTeamCount < this.maxTeamSize) {
            player.setTeam('blue');
            this.blueTeamCount++;
        } else {
            player.setTeam(null); // Spectator
        }
    }

    // Switch player team
    switchPlayerTeam(playerId, newTeam) {
        const player = this.players.get(playerId);
        if (!player) return false;

        // Update team counts
        if (player.team === 'red') {
            this.redTeamCount--;
        } else if (player.team === 'blue') {
            this.blueTeamCount--;
        }

        // Check if new team has space
        if (newTeam === 'red' && this.redTeamCount < this.maxTeamSize) {
            player.setTeam('red');
            this.redTeamCount++;
            return true;
        } else if (newTeam === 'blue' && this.blueTeamCount < this.maxTeamSize) {
            player.setTeam('blue');
            this.blueTeamCount++;
            return true;
        } else if (newTeam === 'spectator' || newTeam === null) {
            player.setTeam(null);
            return true;
        }

        // If can't switch, restore old team count
        if (player.team === 'red') {
            this.redTeamCount++;
        } else if (player.team === 'blue') {
            this.blueTeamCount++;
        }

        return false;
    }

    // Update player input
    updatePlayerInput(playerId, input) {
        const player = this.players.get(playerId);
        if (player) {
            player.updateInput(input);
        }
    }

    // Start game loop
    startGameLoop(io) {
        if (this.gameLoopInterval) {
            clearInterval(this.gameLoopInterval);
        }

        this.isPlaying = true;
        this.gameState.lastUpdate = Date.now();

        this.gameLoopInterval = setInterval(() => {
            this.updateGame();
            this.broadcastGameState(io);
        }, this.tickInterval);

        console.log(`Game loop started for room ${this.code}`);
    }

    // Stop game loop
    stopGameLoop() {
        if (this.gameLoopInterval) {
            clearInterval(this.gameLoopInterval);
            this.gameLoopInterval = null;
        }
        this.isPlaying = false;
        console.log(`Game loop stopped for room ${this.code}`);
    }

    // Update game physics and logic
    updateGame() {
        const now = Date.now();
        const deltaTime = now - this.gameState.lastUpdate;
        this.gameState.lastUpdate = now;

        // Normalize delta time for consistent physics
        const dt = deltaTime / 16.67; // Normalize to 60fps

        // Update players
        this.players.forEach(player => {
            if (player.team && player.isActive()) {
                this.physics.updatePlayer(player, player.input, dt);
            }
        });

        // Update ball
        this.physics.updateBall(this.gameState.ball, dt);

        // Check collisions
        this.checkCollisions();

        // Check for goals
        const goalScored = this.physics.checkGoal(this.gameState.ball);
        if (goalScored) {
            this.handleGoal(goalScored);
        }

        // Update game time
        this.gameState.gameTime += deltaTime;
    }

    // Check all collisions
    checkCollisions() {
        // Player-ball collisions
        this.players.forEach(player => {
            if (player.team && this.physics.checkCollision(player, this.gameState.ball, 15, 10)) {
                this.physics.resolveCollision(player, this.gameState.ball, 15, 10, 1, 0.5);
            }
        });

        // Player-player collisions
        const playerArray = Array.from(this.players.values()).filter(p => p.team);
        for (let i = 0; i < playerArray.length; i++) {
            for (let j = i + 1; j < playerArray.length; j++) {
                const player1 = playerArray[i];
                const player2 = playerArray[j];
                
                if (this.physics.checkCollision(player1, player2, 15, 15)) {
                    this.physics.resolveCollision(player1, player2, 15, 15, 1, 1);
                }
            }
        }
    }

    // Handle goal scored
    handleGoal(team) {
        this.gameState.score[team]++;
        
        // Reset ball to center
        this.physics.resetBall(this.gameState.ball);
        
        // Reset all players to starting positions
        this.players.forEach(player => {
            if (player.team) {
                player.resetPosition();
            }
        });

        console.log(`Goal scored in room ${this.code}! ${team.toUpperCase()} team: ${this.gameState.score[team]}`);
    }

    // Broadcast game state to all players
    broadcastGameState(io) {
        const gameState = this.getGameState();
        io.to(this.code).emit('gameState', gameState);
    }

    // Get current game state
    getGameState() {
        return {
            players: Array.from(this.players.values()).map(p => p.getGameData()),
            ball: {
                x: Math.round(this.gameState.ball.x * 100) / 100,
                y: Math.round(this.gameState.ball.y * 100) / 100,
                vx: Math.round(this.gameState.ball.vx * 100) / 100,
                vy: Math.round(this.gameState.ball.vy * 100) / 100
            },
            score: { ...this.gameState.score },
            gameTime: this.gameState.gameTime,
            isPlaying: this.isPlaying,
            roomCode: this.code
        };
    }

    // Get players data for room info
    getPlayersData() {
        return Array.from(this.players.values()).map(p => p.getData());
    }

    // Get room info
    getRoomInfo() {
        return {
            code: this.code,
            playerCount: this.players.size,
            maxPlayers: this.maxPlayers,
            isPublic: this.isPublic,
            isPlaying: this.isPlaying,
            host: this.host.nickname,
            redTeamCount: this.redTeamCount,
            blueTeamCount: this.blueTeamCount
        };
    }

    // Reset game
    resetGame() {
        // Reset ball
        this.gameState.ball = {
            x: 400,
            y: 200,
            vx: 0,
            vy: 0
        };

        // Reset score
        this.gameState.score = {
            red: 0,
            blue: 0
        };

        // Reset game time
        this.gameState.gameTime = 0;

        // Reset all players
        this.players.forEach(player => {
            if (player.team) {
                player.resetPosition();
                player.score = 0;
            }
        });

        console.log(`Game reset in room ${this.code}`);
    }

    // Check if room is empty
    isEmpty() {
        return this.players.size === 0;
    }

    // Check if room is full
    isFull() {
        return this.players.size >= this.maxPlayers;
    }

    // Get active players count
    getActivePlayersCount() {
        return Array.from(this.players.values()).filter(p => p.isActive()).length;
    }
}

module.exports = GameRoom;

