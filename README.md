# HaxBall Clone - Multiplayer Soccer Game

A physics-based multiplayer soccer game inspired by HaxBall, built with simple web technologies for easy hosting and deployment.

## 🎮 Game Features

- **No Login Required**: Just enter a nickname and play
- **Real-time Multiplayer**: Up to 10 players per room
- **Physics-based Gameplay**: Realistic ball and player physics
- **Team-based Soccer**: Red vs Blue teams with goals and scoring
- **Room System**: Create or join rooms with unique codes
- **Chat System**: In-game text chat
- **Responsive Design**: Works on desktop and mobile devices

## 🚀 Live Demo

**Frontend (Game Client)**: https://tszmtazu.manus.space

*Note: The backend server needs to be deployed separately for full multiplayer functionality. The frontend includes offline mode for testing.*

## 🛠️ Technology Stack

### Frontend
- **HTML5 Canvas**: Game rendering and graphics
- **CSS3**: Styling and responsive design
- **JavaScript ES6+**: Game logic and physics
- **WebSocket API**: Real-time communication

### Backend
- **Node.js**: Server runtime
- **Express.js**: Web server framework
- **Socket.io**: WebSocket library for real-time multiplayer
- **CORS**: Cross-origin resource sharing

## 📁 Project Structure

```
haxball-game/
├── client/                 # Frontend files
│   ├── index.html         # Main HTML file
│   ├── styles.css         # Game styling
│   ├── game.js           # Main game engine
│   ├── physics.js        # Physics engine
│   ├── network.js        # Network manager
│   └── ui.js             # UI manager
├── server/                # Backend files
│   ├── server.js         # Main server file
│   ├── gameRoom.js       # Game room management
│   ├── player.js         # Player class
│   └── package.json      # Node.js dependencies
├── start-server.sh       # Server startup script
└── README.md            # This file
```

## 🚀 Deployment Options

### Option 1: Free Hosting (Recommended)

#### Frontend Deployment
Deploy the `client/` folder to any static hosting service:

1. **Netlify** (Recommended)
   - Drag and drop the `client/` folder to Netlify
   - Or connect your GitHub repository
   - Automatic HTTPS and CDN

2. **Vercel**
   - Import project from GitHub
   - Set build command to: `echo "Static site"`
   - Set output directory to: `client`

3. **GitHub Pages**
   - Push code to GitHub repository
   - Enable GitHub Pages in repository settings
   - Set source to `client/` folder

#### Backend Deployment
Deploy the `server/` folder to a Node.js hosting service:

1. **Railway** (Recommended)
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login and deploy
   railway login
   cd server
   railway deploy
   ```

2. **Render**
   - Connect your GitHub repository
   - Set build command: `npm install`
   - Set start command: `node server.js`
   - Set environment: Node.js

3. **Heroku**
   ```bash
   # Install Heroku CLI
   cd server
   heroku create your-app-name
   git init
   git add .
   git commit -m "Initial commit"
   git push heroku main
   ```

### Option 2: VPS/Cloud Server

1. **DigitalOcean Droplet**
2. **AWS EC2**
3. **Google Cloud Compute Engine**
4. **Linode**

#### VPS Setup Commands:
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Clone and setup project
git clone <your-repo-url>
cd haxball-game/server
npm install

# Start with PM2
pm2 start server.js --name "haxball-server"
pm2 startup
pm2 save

# Setup Nginx (optional)
sudo apt install nginx
# Configure reverse proxy for port 3000
```

## 🔧 Local Development

### Prerequisites
- Node.js 14+ installed
- Modern web browser

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd haxball-game
   ```

2. **Install server dependencies**
   ```bash
   cd server
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   # Or: node server.js
   ```

4. **Open the game**
   - Navigate to `http://localhost:3000` in your browser
   - Enter a nickname and start playing!

### Development Commands

```bash
# Start server in development mode
cd server && npm run dev

# Start server with auto-restart (install nodemon first)
npm install -g nodemon
cd server && nodemon server.js
```

## 🎮 How to Play

1. **Enter Nickname**: Type your desired nickname (2-20 characters)
2. **Create or Join Room**: 
   - Click "Create Room" to start a new game
   - Enter a 6-character room code to join existing game
3. **Game Controls**:
   - **Movement**: WASD or Arrow Keys
   - **Objective**: Score goals by getting the ball into the opponent's goal
   - **Teams**: Red vs Blue (auto-assigned)
4. **Chat**: Type messages to communicate with other players

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the `server/` directory:

```env
PORT=3000
NODE_ENV=production
CORS_ORIGIN=https://your-frontend-domain.com
```

### Frontend Configuration

Update the WebSocket URL in `client/network.js`:

```javascript
// For production deployment
this.serverUrl = 'wss://your-backend-domain.com';

// For local development
this.serverUrl = 'ws://localhost:3000';
```

## 🐛 Troubleshooting

### Common Issues

1. **Connection Failed**
   - Check if backend server is running
   - Verify WebSocket URL in frontend
   - Check CORS configuration

2. **Game Not Loading**
   - Ensure all files are served over HTTPS in production
   - Check browser console for JavaScript errors

3. **Players Not Moving**
   - Verify WebSocket connection
   - Check network connectivity
   - Try refreshing the page

### Debug Mode

Enable debug logging by adding to `server/server.js`:

```javascript
// Add at the top
const DEBUG = process.env.DEBUG === 'true';

// Use throughout code
if (DEBUG) console.log('Debug message');
```

## 📊 Performance Optimization

### Frontend Optimizations
- Minify CSS and JavaScript files
- Optimize images and assets
- Enable gzip compression
- Use CDN for static assets

### Backend Optimizations
- Enable compression middleware
- Implement connection pooling
- Add rate limiting
- Monitor memory usage

## 🔒 Security Considerations

- Input validation for nicknames and chat messages
- Rate limiting for WebSocket connections
- CORS configuration for production
- Sanitize user-generated content

## 📈 Scaling

### Horizontal Scaling
- Use Redis for session storage
- Implement load balancing
- Deploy multiple server instances

### Monitoring
- Add health check endpoints
- Implement logging
- Monitor WebSocket connections
- Track game metrics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - feel free to use this project for learning or commercial purposes.

## 🙏 Acknowledgments

- Inspired by the original HaxBall game
- Built with modern web technologies
- Designed for easy deployment and hosting

---

**Enjoy playing HaxBall Clone! ⚽**
