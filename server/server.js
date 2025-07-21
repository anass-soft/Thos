// HaxBall Clone Server
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const GameRoom = require('./gameRoom');
const Player = require('./player');

class GameServer {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketIo(this.server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });

        this.rooms = new Map();
        this.players = new Map();
        this.port = process.env.PORT || 3000;

        this.setupMiddleware();
        this.setupRoutes();
        this.setupSocketHandlers();
    }

    setupMiddleware() {
        // Enable CORS for all routes
        this.app.use(cors({
            origin: "*",
            credentials: true
        }));

        // Parse JSON bodies
        this.app.use(express.json());

        // Serve static files from client directory
        this.app.use(express.static(path.join(__dirname, '../client')));
    }

    setupRoutes() {
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                rooms: this.rooms.size,
                players: this.players.size,
                timestamp: new Date().toISOString()
            });
        });

        // Get public rooms
        this.app.get('/api/rooms', (req, res) => {
            const publicRooms = Array.from(this.rooms.values())
                .filter(room => room.isPublic)
                .map(room => ({
                    code: room.code,
                    playerCount: room.players.size,
                    maxPlayers: room.maxPlayers,
                    isPlaying: room.isPlaying
                }));

            res.json(publicRooms);
        });

        // Serve main page
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, '../client/index.html'));
        });
    }

    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`Player connected: ${socket.id}`);

            // Send player ID
            socket.emit('playerId', { id: socket.id });

            // Handle join game
            socket.on('joinGame', (data) => {
                this.handleJoinGame(socket, data);
            });

            // Handle create room
            socket.on('createRoom', (data) => {
                this.handleCreateRoom(socket, data);
            });

            // Handle join room
            socket.on('joinRoom', (data) => {
                this.handleJoinRoom(socket, data);
            });

            // Handle player input
            socket.on('playerInput', (data) => {
                this.handlePlayerInput(socket, data);
            });

            // Handle chat message
            socket.on('chatMessage', (data) => {
                this.handleChatMessage(socket, data);
            });

            // Handle leave room
            socket.on('leaveRoom', () => {
                this.handleLeaveRoom(socket);
            });

            // Handle switch team
            socket.on('switchTeam', (data) => {
                this.handleSwitchTeam(socket, data);
            });

            // Handle get public rooms
            socket.on('getPublicRooms', () => {
                this.handleGetPublicRooms(socket);
            });

            // Handle disconnect
            socket.on('disconnect', () => {
                this.handleDisconnect(socket);
            });
        });
    }

    handleJoinGame(socket, data) {
        const { nickname } = data;

        if (!nickname || nickname.trim().length < 2) {
            socket.emit('error', { message: 'Invalid nickname' });
            return;
        }

        // Create player
        const player = new Player(socket.id, nickname.trim());
        this.players.set(socket.id, player);

        console.log(`Player ${nickname} joined the game`);
    }

    handleCreateRoom(socket, data) {
        const player = this.players.get(socket.id);
        if (!player) {
            socket.emit('error', { message: 'Player not found' });
            return;
        }

        // Generate unique room code
        let roomCode;
        do {
            roomCode = this.generateRoomCode();
        } while (this.rooms.has(roomCode));

        // Create new room
        const room = new GameRoom(roomCode, player);
        this.rooms.set(roomCode, room);

        // Add player to room
        player.roomCode = roomCode;
        socket.join(roomCode);

        console.log(`Room ${roomCode} created by ${player.nickname}`);

        // Notify player
        socket.emit('roomCreated', {
            roomCode: roomCode,
            players: room.getPlayersData()
        });

        // Start game loop for this room
        room.startGameLoop(this.io);
    }

    handleJoinRoom(socket, data) {
        const { roomCode } = data;
        const player = this.players.get(socket.id);

        if (!player) {
            socket.emit('error', { message: 'Player not found' });
            return;
        }

        const room = this.rooms.get(roomCode);
        if (!room) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }

        if (room.players.size >= room.maxPlayers) {
            socket.emit('error', { message: 'Room is full' });
            return;
        }

        // Add player to room
        room.addPlayer(player);
        player.roomCode = roomCode;
        socket.join(roomCode);

        console.log(`Player ${player.nickname} joined room ${roomCode}`);

        // Notify player
        socket.emit('roomJoined', {
            roomCode: roomCode,
            players: room.getPlayersData()
        });

        // Notify other players
        socket.to(roomCode).emit('playerJoined', {
            player: player.getData()
        });

        // Send current game state
        socket.emit('gameState', room.getGameState());
    }

    handlePlayerInput(socket, data) {
        const player = this.players.get(socket.id);
        if (!player || !player.roomCode) return;

        const room = this.rooms.get(player.roomCode);
        if (!room) return;

        // Update player input
        player.input = data;
        room.updatePlayerInput(player.id, data);
    }

    handleChatMessage(socket, data) {
        const { message } = data;
        const player = this.players.get(socket.id);

        if (!player || !player.roomCode || !message) return;

        const room = this.rooms.get(player.roomCode);
        if (!room) return;

        // Broadcast chat message to room
        this.io.to(player.roomCode).emit('chatMessage', {
            playerName: player.nickname,
            message: message.trim(),
            timestamp: Date.now()
        });

        console.log(`Chat in ${player.roomCode} - ${player.nickname}: ${message}`);
    }

    handleLeaveRoom(socket) {
        const player = this.players.get(socket.id);
        if (!player || !player.roomCode) return;

        this.removePlayerFromRoom(socket, player);
    }

    handleSwitchTeam(socket, data) {
        const { team } = data;
        const player = this.players.get(socket.id);

        if (!player || !player.roomCode) return;

        const room = this.rooms.get(player.roomCode);
        if (!room) return;

        // Switch player team
        room.switchPlayerTeam(player.id, team);

        // Broadcast updated player list
        this.io.to(player.roomCode).emit('gameState', room.getGameState());
    }

    handleGetPublicRooms(socket) {
        const publicRooms = Array.from(this.rooms.values())
            .filter(room => room.isPublic)
            .map(room => ({
                code: room.code,
                playerCount: room.players.size,
                maxPlayers: room.maxPlayers,
                isPlaying: room.isPlaying
            }));

        socket.emit('publicRooms', publicRooms);
    }

    handleDisconnect(socket) {
        console.log(`Player disconnected: ${socket.id}`);

        const player = this.players.get(socket.id);
        if (player) {
            this.removePlayerFromRoom(socket, player);
            this.players.delete(socket.id);
        }
    }

    removePlayerFromRoom(socket, player) {
        if (!player.roomCode) return;

        const room = this.rooms.get(player.roomCode);
        if (!room) return;

        // Remove player from room
        room.removePlayer(player.id);
        socket.leave(player.roomCode);

        // Notify other players
        socket.to(player.roomCode).emit('playerLeft', {
            playerId: player.id,
            playerName: player.nickname
        });

        console.log(`Player ${player.nickname} left room ${player.roomCode}`);

        // Clean up empty rooms
        if (room.players.size === 0) {
            room.stopGameLoop();
            this.rooms.delete(player.roomCode);
            console.log(`Room ${player.roomCode} deleted (empty)`);
        }

        player.roomCode = null;
    }

    generateRoomCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    start() {
        this.server.listen(this.port, '0.0.0.0', () => {
            console.log(`HaxBall server running on port ${this.port}`);
            console.log(`Game available at: http://localhost:${this.port}`);
        });
    }

    // Graceful shutdown
    shutdown() {
        console.log('Shutting down server...');
        
        // Stop all room game loops
        this.rooms.forEach(room => {
            room.stopGameLoop();
        });

        this.server.close(() => {
            console.log('Server shut down successfully');
            process.exit(0);
        });
    }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
    if (gameServer) {
        gameServer.shutdown();
    }
});

process.on('SIGINT', () => {
    if (gameServer) {
        gameServer.shutdown();
    }
});

// Start server
const gameServer = new GameServer();
gameServer.start();

