// Main Game Engine for HaxBall Clone
class Game {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.physics = new PhysicsEngine();
        this.network = null;
        this.isOffline = false;
        
        // Game state
        this.gameState = {
            players: new Map(),
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
            isPlaying: false
        };

        // Local player state
        this.localPlayer = {
            id: null,
            input: {
                up: false,
                down: false,
                left: false,
                right: false
            }
        };

        // Rendering
        this.lastFrameTime = 0;
        this.animationId = null;

        // Field dimensions
        this.fieldWidth = 800;
        this.fieldHeight = 400;
        this.goalWidth = 100;
        this.goalHeight = 80;

        this.init();
    }

    // Initialize the game
    init() {
        this.setupCanvas();
        this.setupNetwork();
        this.startGameLoop();
    }

    // Setup canvas and rendering context
    setupCanvas() {
        this.canvas = document.getElementById('game-canvas');
        if (!this.canvas) {
            console.error('Game canvas not found');
            return;
        }

        this.ctx = this.canvas.getContext('2d');
        
        // Set canvas size
        this.canvas.width = this.fieldWidth;
        this.canvas.height = this.fieldHeight;

        // Setup canvas styling
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
    }

    // Setup network connection
    setupNetwork() {
        // Try to connect to server, fallback to offline mode
        this.network = new NetworkManager();
        
        // Setup network event handlers
        this.network.onConnect = () => {
            console.log('Connected to game server');
            this.isOffline = false;
        };

        this.network.onDisconnect = () => {
            console.log('Disconnected from server');
            // Switch to offline mode for testing
            this.switchToOfflineMode();
        };

        this.network.onGameState = (state) => {
            this.updateGameState(state);
        };

        this.network.onRoomCreated = (data) => {
            console.log('Room created:', data.roomCode);
            window.uiManager.showSuccess(`Room created: ${data.roomCode}`);
            window.uiManager.showScreen('game-screen');
            this.startGame();
        };

        this.network.onRoomJoined = (data) => {
            console.log('Joined room:', data.roomCode);
            window.uiManager.showSuccess(`Joined room: ${data.roomCode}`);
            window.uiManager.showScreen('game-screen');
            this.startGame();
        };

        this.network.onChatMessage = (data) => {
            window.uiManager.addChatMessage(data.playerName, data.message);
        };

        this.network.onError = (error) => {
            console.error('Network error:', error);
            window.uiManager.showError(error.message);
        };

        // Attempt to connect
        this.network.connect();
    }

    // Switch to offline mode for testing
    switchToOfflineMode() {
        console.log('Switching to offline mode');
        this.isOffline = true;
        this.network = new OfflineNetworkManager();
        this.setupNetworkHandlers();
        this.network.connect();
    }

    // Setup network handlers for offline mode
    setupNetworkHandlers() {
        this.network.onRoomCreated = (data) => {
            window.uiManager.showSuccess('Offline mode - Room created');
            window.uiManager.showScreen('game-screen');
            this.startGame();
        };

        this.network.onRoomJoined = (data) => {
            window.uiManager.showSuccess('Offline mode - Game started');
            window.uiManager.showScreen('game-screen');
            this.startGame();
        };
    }

    // Start the game
    startGame() {
        this.gameState.isPlaying = true;
        this.localPlayer.id = this.network.getPlayerId();
        
        // Add local player to game state
        if (this.isOffline) {
            this.gameState.players.set(this.localPlayer.id, {
                id: this.localPlayer.id,
                nickname: window.uiManager.getNickname(),
                x: 100,
                y: 200,
                vx: 0,
                vy: 0,
                team: 'red'
            });
        }

        // Update UI
        window.uiManager.updateRoomInfo(
            this.network.getCurrentRoom() || 'OFFLINE',
            this.gameState.players.size
        );
    }

    // Main game loop
    gameLoop(currentTime) {
        const deltaTime = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;

        // Update game logic
        this.update(deltaTime);

        // Render game
        this.render();

        // Continue loop
        this.animationId = requestAnimationFrame((time) => this.gameLoop(time));
    }

    // Start the game loop
    startGameLoop() {
        this.animationId = requestAnimationFrame((time) => this.gameLoop(time));
    }

    // Update game logic
    update(deltaTime) {
        if (!this.gameState.isPlaying) return;

        // In offline mode, update physics locally
        if (this.isOffline) {
            this.updateOfflinePhysics(deltaTime);
        }

        // Send input to server
        if (this.network && this.network.isConnected()) {
            this.network.sendInput(this.localPlayer.input);
        }

        // Update game timer
        this.gameState.gameTime += deltaTime;
        const minutes = Math.floor(this.gameState.gameTime / 60000);
        const seconds = Math.floor((this.gameState.gameTime % 60000) / 1000);
        window.uiManager.updateTimer(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    }

    // Update physics in offline mode
    updateOfflinePhysics(deltaTime) {
        const dt = deltaTime / 16.67; // Normalize to 60fps

        // Update local player
        const localPlayer = this.gameState.players.get(this.localPlayer.id);
        if (localPlayer) {
            this.physics.updatePlayer(localPlayer, this.localPlayer.input, dt);
        }

        // Update ball
        this.physics.updateBall(this.gameState.ball, dt);

        // Check collisions
        this.gameState.players.forEach(player => {
            // Player-ball collision
            if (this.physics.checkCollision(player, this.gameState.ball, 15, 10)) {
                this.physics.resolveCollision(player, this.gameState.ball, 15, 10, 1, 0.5);
            }
        });

        // Check for goals
        const goalScored = this.physics.checkGoal(this.gameState.ball);
        if (goalScored) {
            this.handleGoal(goalScored);
        }
    }

    // Handle goal scored
    handleGoal(team) {
        this.gameState.score[team]++;
        window.uiManager.updateScore(this.gameState.score.red, this.gameState.score.blue);
        window.uiManager.addChatMessage('System', `${team.toUpperCase()} TEAM SCORED!`, true);
        
        // Reset ball
        this.physics.resetBall(this.gameState.ball);
    }

    // Update game state from server
    updateGameState(state) {
        // Update players
        this.gameState.players.clear();
        state.players.forEach(player => {
            this.gameState.players.set(player.id, player);
        });

        // Update ball
        if (state.ball) {
            this.gameState.ball = state.ball;
        }

        // Update score
        if (state.score) {
            this.gameState.score = state.score;
            window.uiManager.updateScore(state.score.red, state.score.blue);
        }

        // Update player list
        window.uiManager.updatePlayerList(Array.from(this.gameState.players.values()));
        window.uiManager.updateRoomInfo(
            this.network.getCurrentRoom(),
            this.gameState.players.size
        );
    }

    // Render the game
    render() {
        if (!this.ctx) return;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.fieldWidth, this.fieldHeight);

        // Draw field
        this.drawField();

        // Draw players
        this.gameState.players.forEach(player => {
            this.drawPlayer(player);
        });

        // Draw ball
        this.drawBall(this.gameState.ball);

        // Draw UI elements
        this.drawGameUI();
    }

    // Draw the soccer field
    drawField() {
        const ctx = this.ctx;

        // Field background
        ctx.fillStyle = '#2E7D32';
        ctx.fillRect(0, 0, this.fieldWidth, this.fieldHeight);

        // Field lines
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;

        // Outer boundary
        ctx.strokeRect(0, 0, this.fieldWidth, this.fieldHeight);

        // Center line
        ctx.beginPath();
        ctx.moveTo(this.fieldWidth / 2, 0);
        ctx.lineTo(this.fieldWidth / 2, this.fieldHeight);
        ctx.stroke();

        // Center circle
        ctx.beginPath();
        ctx.arc(this.fieldWidth / 2, this.fieldHeight / 2, 50, 0, Math.PI * 2);
        ctx.stroke();

        // Goals
        const goalTop = (this.fieldHeight - this.goalHeight) / 2;
        
        // Left goal
        ctx.strokeRect(-20, goalTop, 20, this.goalHeight);
        
        // Right goal
        ctx.strokeRect(this.fieldWidth, goalTop, 20, this.goalHeight);

        // Goal areas
        ctx.strokeRect(0, goalTop - 20, 60, this.goalHeight + 40);
        ctx.strokeRect(this.fieldWidth - 60, goalTop - 20, 60, this.goalHeight + 40);
    }

    // Draw a player
    drawPlayer(player) {
        const ctx = this.ctx;

        // Player circle
        ctx.beginPath();
        ctx.arc(player.x, player.y, 15, 0, Math.PI * 2);
        
        // Team colors
        if (player.team === 'red') {
            ctx.fillStyle = '#FF4444';
        } else if (player.team === 'blue') {
            ctx.fillStyle = '#4444FF';
        } else {
            ctx.fillStyle = '#888888';
        }
        
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Player name
        ctx.fillStyle = 'white';
        ctx.font = '10px Arial';
        ctx.fillText(player.nickname, player.x, player.y - 25);

        // Highlight local player
        if (player.id === this.localPlayer.id) {
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(player.x, player.y, 18, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    // Draw the ball
    drawBall(ball) {
        const ctx = this.ctx;

        // Ball shadow
        ctx.beginPath();
        ctx.arc(ball.x + 2, ball.y + 2, 10, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fill();

        // Ball
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, 10, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Ball pattern
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(ball.x - 7, ball.y);
        ctx.lineTo(ball.x + 7, ball.y);
        ctx.moveTo(ball.x, ball.y - 7);
        ctx.lineTo(ball.x, ball.y + 7);
        ctx.stroke();
    }

    // Draw game UI elements
    drawGameUI() {
        // This can be used for additional canvas-based UI elements
        // Most UI is handled by HTML/CSS
    }

    // Handle keyboard input
    handleKeyDown(e) {
        switch (e.code) {
            case 'ArrowUp':
            case 'KeyW':
                this.localPlayer.input.up = true;
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.localPlayer.input.down = true;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                this.localPlayer.input.left = true;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.localPlayer.input.right = true;
                break;
        }
    }

    handleKeyUp(e) {
        switch (e.code) {
            case 'ArrowUp':
            case 'KeyW':
                this.localPlayer.input.up = false;
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.localPlayer.input.down = false;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                this.localPlayer.input.left = false;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.localPlayer.input.right = false;
                break;
        }
    }

    // Cleanup
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        if (this.network) {
            this.network.disconnect();
        }
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});

