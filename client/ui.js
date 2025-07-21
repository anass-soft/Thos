// UI Manager for HaxBall Clone
class UIManager {
    constructor() {
        this.currentScreen = 'nickname-screen';
        this.nickname = '';
        this.setupEventListeners();
    }

    // Setup all UI event listeners
    setupEventListeners() {
        // Nickname screen
        const nicknameInput = document.getElementById('nickname-input');
        const nicknameSubmit = document.getElementById('nickname-submit');

        if (nicknameInput && nicknameSubmit) {
            nicknameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.submitNickname();
                }
            });

            nicknameSubmit.addEventListener('click', () => {
                this.submitNickname();
            });
        }

        // Room screen
        const createRoomBtn = document.getElementById('create-room-btn');
        const joinRoomBtn = document.getElementById('join-room-btn');
        const roomCodeInput = document.getElementById('room-code-input');

        if (createRoomBtn) {
            createRoomBtn.addEventListener('click', () => {
                this.createRoom();
            });
        }

        if (joinRoomBtn && roomCodeInput) {
            joinRoomBtn.addEventListener('click', () => {
                this.joinRoom();
            });

            roomCodeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.joinRoom();
                }
            });

            // Auto-uppercase room code input
            roomCodeInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.toUpperCase();
            });
        }

        // Chat system
        const chatInput = document.getElementById('chat-input');
        const chatSend = document.getElementById('chat-send');

        if (chatInput && chatSend) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendChatMessage();
                }
            });

            chatSend.addEventListener('click', () => {
                this.sendChatMessage();
            });
        }

        // Keyboard controls for game
        document.addEventListener('keydown', (e) => {
            this.handleKeyDown(e);
        });

        document.addEventListener('keyup', (e) => {
            this.handleKeyUp(e);
        });
    }

    // Switch between screens
    showScreen(screenId) {
        // Hide all screens
        const screens = document.querySelectorAll('.screen');
        screens.forEach(screen => {
            screen.classList.remove('active');
        });

        // Show target screen
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
            this.currentScreen = screenId;
        }
    }

    // Submit nickname and proceed to room selection
    submitNickname() {
        const nicknameInput = document.getElementById('nickname-input');
        const nickname = nicknameInput.value.trim();

        if (nickname.length < 2) {
            this.showError('Nickname must be at least 2 characters long');
            return;
        }

        if (nickname.length > 20) {
            this.showError('Nickname must be less than 20 characters');
            return;
        }

        this.nickname = nickname;
        
        // Connect to server and join game
        if (window.game && window.game.network) {
            window.game.network.joinGame(nickname);
        }

        this.showScreen('room-screen');
    }

    // Create new room
    createRoom() {
        if (window.game && window.game.network) {
            window.game.network.createRoom();
        }
    }

    // Join existing room
    joinRoom() {
        const roomCodeInput = document.getElementById('room-code-input');
        const roomCode = roomCodeInput.value.trim().toUpperCase();

        if (roomCode.length !== 6) {
            this.showError('Room code must be 6 characters long');
            return;
        }

        if (window.game && window.game.network) {
            window.game.network.joinRoom(roomCode);
        }
    }

    // Send chat message
    sendChatMessage() {
        const chatInput = document.getElementById('chat-input');
        const message = chatInput.value.trim();

        if (message.length === 0) return;

        if (window.game && window.game.network) {
            window.game.network.sendChatMessage(message);
        }

        chatInput.value = '';
    }

    // Handle keyboard input for game controls
    handleKeyDown(e) {
        if (this.currentScreen !== 'game-screen') return;

        // Prevent default for game keys
        const gameKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'];
        if (gameKeys.includes(e.code)) {
            e.preventDefault();
        }

        if (window.game) {
            window.game.handleKeyDown(e);
        }
    }

    handleKeyUp(e) {
        if (this.currentScreen !== 'game-screen') return;

        if (window.game) {
            window.game.handleKeyUp(e);
        }
    }

    // Update game HUD
    updateScore(redScore, blueScore) {
        const redScoreElement = document.getElementById('red-score');
        const blueScoreElement = document.getElementById('blue-score');

        if (redScoreElement) redScoreElement.textContent = redScore;
        if (blueScoreElement) blueScoreElement.textContent = blueScore;
    }

    updateTimer(timeString) {
        const timerElement = document.getElementById('game-timer');
        if (timerElement) timerElement.textContent = timeString;
    }

    updateRoomInfo(roomCode, playerCount) {
        const roomCodeElement = document.getElementById('current-room-code');
        const playerCountElement = document.getElementById('player-count');

        if (roomCodeElement) roomCodeElement.textContent = roomCode;
        if (playerCountElement) playerCountElement.textContent = playerCount;
    }

    // Update player lists
    updatePlayerList(players) {
        const redTeamElement = document.getElementById('red-team-players');
        const blueTeamElement = document.getElementById('blue-team-players');
        const spectatorElement = document.getElementById('spectator-players');

        if (!redTeamElement || !blueTeamElement || !spectatorElement) return;

        // Clear existing lists
        redTeamElement.innerHTML = '';
        blueTeamElement.innerHTML = '';
        spectatorElement.innerHTML = '';

        // Sort players by team
        players.forEach(player => {
            const playerElement = document.createElement('div');
            playerElement.className = `player ${player.team}`;
            playerElement.textContent = player.nickname;

            switch (player.team) {
                case 'red':
                    redTeamElement.appendChild(playerElement);
                    break;
                case 'blue':
                    blueTeamElement.appendChild(playerElement);
                    break;
                default:
                    spectatorElement.appendChild(playerElement);
            }
        });
    }

    // Add chat message to chat window
    addChatMessage(playerName, message, isSystem = false) {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;

        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message';

        if (isSystem) {
            messageElement.innerHTML = `<span style="color: #FFD700;">${message}</span>`;
        } else {
            messageElement.innerHTML = `<strong>${playerName}:</strong> ${message}`;
        }

        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Limit chat history
        while (chatMessages.children.length > 50) {
            chatMessages.removeChild(chatMessages.firstChild);
        }
    }

    // Show error message
    showError(message) {
        // Create error popup
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-popup';
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(244, 67, 54, 0.9);
            color: white;
            padding: 1rem 2rem;
            border-radius: 8px;
            z-index: 10000;
            font-weight: bold;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        `;
        errorDiv.textContent = message;

        document.body.appendChild(errorDiv);

        // Remove after 3 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 3000);
    }

    // Show success message
    showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-popup';
        successDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(76, 175, 80, 0.9);
            color: white;
            padding: 1rem 2rem;
            border-radius: 8px;
            z-index: 10000;
            font-weight: bold;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        `;
        successDiv.textContent = message;

        document.body.appendChild(successDiv);

        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 2000);
    }

    // Update public rooms list
    updatePublicRooms(rooms) {
        const roomsList = document.getElementById('public-rooms-list');
        if (!roomsList) return;

        roomsList.innerHTML = '';

        if (rooms.length === 0) {
            roomsList.innerHTML = '<p>No public rooms available</p>';
            return;
        }

        rooms.forEach(room => {
            const roomElement = document.createElement('div');
            roomElement.className = 'public-room';
            roomElement.style.cssText = `
                background: rgba(255, 255, 255, 0.1);
                padding: 0.5rem;
                margin: 0.5rem 0;
                border-radius: 4px;
                cursor: pointer;
                transition: background 0.3s;
            `;

            roomElement.innerHTML = `
                <strong>${room.code}</strong> - ${room.playerCount}/10 players
            `;

            roomElement.addEventListener('click', () => {
                if (window.game && window.game.network) {
                    window.game.network.joinRoom(room.code);
                }
            });

            roomElement.addEventListener('mouseenter', () => {
                roomElement.style.background = 'rgba(255, 255, 255, 0.2)';
            });

            roomElement.addEventListener('mouseleave', () => {
                roomElement.style.background = 'rgba(255, 255, 255, 0.1)';
            });

            roomsList.appendChild(roomElement);
        });
    }

    // Get current nickname
    getNickname() {
        return this.nickname;
    }

    // Get current screen
    getCurrentScreen() {
        return this.currentScreen;
    }
}

// Initialize UI manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.uiManager = new UIManager();
});

