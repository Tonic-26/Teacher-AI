const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIO = require('socket.io');
const AIChatEngine = require('./ai-engine');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Initialize AI Engine
const aiEngine = new AIChatEngine();

// API Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/subjects', (req, res) => {
  res.json({
    subjects: aiEngine.getSubjects(),
    success: true
  });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, subject, conversationHistory } = req.body;
    const response = await aiEngine.generateResponse(message, subject, conversationHistory);
    res.json({
      success: true,
      response: response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/quiz/generate', async (req, res) => {
  try {
    const { subject, difficulty } = req.body;
    const quiz = await aiEngine.generateQuiz(subject, difficulty);
    res.json({ success: true, quiz });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Socket.IO for real-time chat
io.on('connection', (socket) => {
  console.log('New user connected:', socket.id);
  
  socket.on('user-message', async (data) => {
    try {
      const { message, subject, userId } = data;
      const response = await aiEngine.generateResponse(message, subject, []);
      socket.emit('ai-response', {
        message: response,
        timestamp: new Date().toISOString(),
        userId
      });
    } catch (error) {
      socket.emit('error', { error: error.message });
    }
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Teacher AI Rwanda Server running on http://localhost:${PORT}`);
  console.log(`📚 AI Learning Platform Active`);
});