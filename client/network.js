// Network Manager for HaxBall Clone
class NetworkManager {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.playerId = null;
        this.roomCode = null;
        this.serverUrl = 'ws://localhost:3000'; // Will be updated for production
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000;
        
        // Event callbacks
        this.onConnect = null;
        this.onDisconnect = null;
        this.onGameState = null;
        this.onPlayerJoined = null;
        this.onPlayerLeft = null;
        this.onChatMessage = null;
        this.onRoomCreated = null;
        this.onRoomJoined = null;
        this.onError = null;
    }

    // Connect to server
    connect() {
        try {
            this.socket = new WebSocket(this.serverUrl);
            this.setupEventListeners();
        } catch (error) {
            console.error('Failed to connect to server:', error);
            this.handleConnectionError();
        }
    }

    // Setup WebSocket event listeners
    setupEventListeners() {
        this.socket.onopen = () => {
            console.log('Connected to server');
            this.connected = true;
            this.reconnectAttempts = 0;
            this.updateConnectionStatus('connected');
            if (this.onConnect) this.onConnect();
        };

        this.socket.onclose = () => {
            console.log('Disconnected from server');
            this.connected = false;
            this.updateConnectionStatus('disconnected');
            if (this.onDisconnect) this.onDisconnect();
            this.attemptReconnect();
        };

        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.handleConnectionError();
        };

        this.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleMessage(data);
            } catch (error) {
                console.error('Failed to parse message:', error);
            }
        };
    }

    // Handle incoming messages
    handleMessage(data) {
        switch (data.type) {
            case 'gameState':
                if (this.onGameState) this.onGameState(data.payload);
                break;
            
            case 'playerJoined':
                if (this.onPlayerJoined) this.onPlayerJoined(data.payload);
                break;
            
            case 'playerLeft':
                if (this.onPlayerLeft) this.onPlayerLeft(data.payload);
                break;
            
            case 'chatMessage':
                if (this.onChatMessage) this.onChatMessage(data.payload);
                break;
            
            case 'roomCreated':
                this.roomCode = data.payload.roomCode;
                if (this.onRoomCreated) this.onRoomCreated(data.payload);
                break;
            
            case 'roomJoined':
                this.roomCode = data.payload.roomCode;
                if (this.onRoomJoined) this.onRoomJoined(data.payload);
                break;
            
            case 'error':
                console.error('Server error:', data.payload.message);
                if (this.onError) this.onError(data.payload);
                break;
            
            case 'playerId':
                this.playerId = data.payload.id;
                break;
            
            default:
                console.warn('Unknown message type:', data.type);
        }
    }

    // Send message to server
    send(type, payload = {}) {
        if (!this.connected || !this.socket) {
            console.warn('Cannot send message: not connected');
            return false;
        }

        try {
            const message = JSON.stringify({ type, payload });
            this.socket.send(message);
            return true;
        } catch (error) {
            console.error('Failed to send message:', error);
            return false;
        }
    }

    // Join game with nickname
    joinGame(nickname) {
        return this.send('joinGame', { nickname });
    }

    // Create new room
    createRoom() {
        return this.send('createRoom');
    }

    // Join existing room
    joinRoom(roomCode) {
        return this.send('joinRoom', { roomCode });
    }

    // Send player input
    sendInput(input) {
        return this.send('playerInput', input);
    }

    // Send chat message
    sendChatMessage(message) {
        return this.send('chatMessage', { message });
    }

    // Leave current room
    leaveRoom() {
        return this.send('leaveRoom');
    }

    // Switch team
    switchTeam(team) {
        return this.send('switchTeam', { team });
    }

    // Get public rooms list
    getPublicRooms() {
        return this.send('getPublicRooms');
    }

    // Attempt to reconnect
    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('Max reconnection attempts reached');
            return;
        }

        this.reconnectAttempts++;
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        
        setTimeout(() => {
            this.connect();
        }, this.reconnectDelay);
    }

    // Handle connection errors
    handleConnectionError() {
        this.connected = false;
        this.updateConnectionStatus('disconnected');
        
        if (this.onError) {
            this.onError({ message: 'Connection failed' });
        }
    }

    // Update connection status UI
    updateConnectionStatus(status) {
        const statusElement = document.getElementById('connection-status');
        const statusText = document.getElementById('status-text');
        
        if (statusElement && statusText) {
            statusElement.className = `connection-status ${status}`;
            
            switch (status) {
                case 'connected':
                    statusText.textContent = 'Connected';
                    break;
                case 'disconnected':
                    statusText.textContent = 'Disconnected';
                    break;
                case 'connecting':
                    statusText.textContent = 'Connecting...';
                    break;
                default:
                    statusText.textContent = 'Unknown';
            }
        }
    }

    // Disconnect from server
    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        this.connected = false;
        this.playerId = null;
        this.roomCode = null;
    }

    // Check if connected
    isConnected() {
        return this.connected && this.socket && this.socket.readyState === WebSocket.OPEN;
    }

    // Get current room code
    getCurrentRoom() {
        return this.roomCode;
    }

    // Get player ID
    getPlayerId() {
        return this.playerId;
    }
}

// Fallback for offline mode (for testing without server)
class OfflineNetworkManager extends NetworkManager {
    constructor() {
        super();
        this.connected = true;
        this.playerId = 'offline-player';
        this.roomCode = 'OFFLINE';
    }

    connect() {
        setTimeout(() => {
            this.updateConnectionStatus('connected');
            if (this.onConnect) this.onConnect();
        }, 100);
    }

    send(type, payload = {}) {
        // Simulate server responses for testing
        setTimeout(() => {
            switch (type) {
                case 'joinGame':
                    if (this.onRoomJoined) {
                        this.onRoomJoined({
                            roomCode: 'OFFLINE',
                            players: [{ id: this.playerId, nickname: payload.nickname, team: 'red' }]
                        });
                    }
                    break;
                
                case 'createRoom':
                    if (this.onRoomCreated) {
                        this.onRoomCreated({ roomCode: 'OFFLINE' });
                    }
                    break;
            }
        }, 50);
        return true;
    }

    isConnected() {
        return true;
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NetworkManager, OfflineNetworkManager };
}

