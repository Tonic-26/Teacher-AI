// Teacher AI Rwanda - Frontend Application
class TeacherAIApp {
    constructor() {
        this.currentSubject = 'general';
        this.messageCount = 0;
        this.sessionStart = Date.now();
        this.isLoading = false;
        this.speechEnabled = false;
        this.recognition = null;
        this.synth = window.speechSynthesis;
        
        this.init();
    }
    
    init() {
        this.cacheElements();
        this.bindEvents();
        this.initSpeechRecognition();
        this.startSessionTimer();
        this.loadTheme();
    }
    
    cacheElements() {
        this.elements = {
            messagesContainer: document.getElementById('messagesContainer'),
            messageInput: document.getElementById('messageInput'),
            sendBtn: document.getElementById('sendBtn'),
            subjectSelect: document.getElementById('subjectSelect'),
            currentSubjectBadge: document.getElementById('currentSubjectBadge'),
            clearChatBtn: document.getElementById('clearChat'),
            themeToggle: document.getElementById('themeToggle'),
            voiceBtn: document.getElementById('voiceBtn'),
            speakBtn: document.getElementById('speakBtn'),
            loadingOverlay: document.getElementById('loadingOverlay'),
            messageCount: document.getElementById('messageCount'),
            sessionTime: document.getElementById('sessionTime'),
            welcomeMsg: document.getElementById('welcomeMsg')
        };
    }
    
    bindEvents() {
        // Send message on button click
        this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
        
        // Send message on Enter (Shift+Enter for new line)
        this.elements.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Auto-resize textarea
        this.elements.messageInput.addEventListener('input', () => {
            this.elements.messageInput.style.height = 'auto';
            this.elements.messageInput.style.height = Math.min(this.elements.messageInput.scrollHeight, 120) + 'px';
        });
        
        // Subject change
        this.elements.subjectSelect.addEventListener('change', (e) => {
            this.currentSubject = e.target.value;
            const subjectNames = {
                general: 'General Knowledge',
                mathematics: 'Mathematics',
                english: 'English',
                science: 'Science',
                kinyarwanda: 'Kinyarwanda',
                history: 'History'
            };
            this.elements.currentSubjectBadge.textContent = subjectNames[this.currentSubject];
            this.addSystemMessage(`📚 Switched to ${subjectNames[this.currentSubject]}. How can I help you learn today?`);
        });
        
        // Quick action buttons
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const msg = btn.getAttribute('data-msg');
                if (msg) {
                    this.elements.messageInput.value = msg;
                    this.sendMessage();
                }
            });
        });
        
        // Clear chat
        this.elements.clearChatBtn.addEventListener('click', () => this.clearChat());
        
        // Theme toggle
        this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());
        
        // Voice input
        this.elements.voiceBtn.addEventListener('click', () => this.toggleVoiceInput());
        
        // Text to speech
        this.elements.speakBtn.addEventListener('click', () => this.toggleSpeech());
    }
    
    initSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';
            
            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                this.elements.messageInput.value = transcript;
                this.sendMessage();
                this.elements.voiceBtn.classList.remove('active');
            };
            
            this.recognition.onerror = () => {
                this.elements.voiceBtn.classList.remove('active');
            };
        }
    }
    
    toggleVoiceInput() {
        if (!this.recognition) {
            alert('Speech recognition is not supported in your browser');
            return;
        }
        
        if (this.elements.voiceBtn.classList.contains('active')) {
            this.recognition.stop();
            this.elements.voiceBtn.classList.remove('active');
        } else {
            this.recognition.start();
            this.elements.voiceBtn.classList.add('active');
        }
    }
    
    toggleSpeech() {
        this.speechEnabled = !this.speechEnabled;
        this.elements.speakBtn.classList.toggle('active', this.speechEnabled);
        
        if (this.speechEnabled) {
            this.addSystemMessage('🔊 Voice output enabled. I will read my responses aloud.');
        } else {
            this.synth.cancel();
            this.addSystemMessage('🔇 Voice output disabled.');
        }
    }
    
    speakText(text) {
        if (!this.speechEnabled) return;
        
        this.synth.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        
        if (this.currentSubject === 'kinyarwanda') {
            utterance.lang = 'rw-RW';
        }
        
        this.synth.speak(utterance);
    }
    
    async sendMessage() {
        const message = this.elements.messageInput.value.trim();
        if (!message || this.isLoading) return;
        
        // Hide welcome message
        if (this.elements.welcomeMsg) {
            this.elements.welcomeMsg.style.display = 'none';
        }
        
        // Add user message to chat
        this.addMessage('user', message);
        
        // Clear input
        this.elements.messageInput.value = '';
        this.elements.messageInput.style.height = 'auto';
        
        // Update stats
        this.messageCount++;
        this.elements.messageCount.textContent = this.messageCount;
        
        // Show loading
        this.showLoading(true);
        this.isLoading = true;
        
        try {
            // Call backend API
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message,
                    subject: this.currentSubject,
                    conversationHistory: []
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.addMessage('ai', data.response);
                this.speakText(data.response);
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Error:', error);
            this.addMessage('ai', 'I apologize, but I encountered an error. Please check if the server is running and try again.');
        } finally {
            this.showLoading(false);
            this.isLoading = false;
        }
    }
    
    addMessage(sender, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        
        const header = document.createElement('div');
        header.className = 'message-header';
        header.textContent = sender === 'user' ? '👤 You' : '🤖 AI Teacher';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.innerHTML = this.formatMessage(content);
        
        messageDiv.appendChild(header);
        messageDiv.appendChild(contentDiv);
        
        this.elements.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }
    
    addSystemMessage(content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message ai';
        
        const header = document.createElement('div');
        header.className = 'message-header';
        header.textContent = 'ℹ️ System';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = content;
        
        messageDiv.appendChild(header);
        messageDiv.appendChild(contentDiv);
        
        this.elements.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }
    
    formatMessage(content) {
        // Convert markdown-like syntax
        let formatted = content
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/Step \d:/g, '<br><strong>$&</strong>')
            .replace(/🎯/g, '<br>🎯');
        
        return formatted;
    }
    
    scrollToBottom() {
        this.elements.messagesContainer.scrollTop = this.elements.messagesContainer.scrollHeight;
    }
    
    clearChat() {
        this.elements.messagesContainer.innerHTML = '';
        this.messageCount = 0;
        this.elements.messageCount.textContent = '0';
        
        // Re-add welcome message
        this.elements.messagesContainer.innerHTML = `
            <div class="welcome-message" id="welcomeMsg">
                <div class="welcome-icon">🇷🇼🤖</div>
                <h2>Chat Cleared!</h2>
                <p>Ready to continue learning? Ask me anything about ${this.elements.currentSubjectBadge.textContent}.</p>
            </div>
        `;
        this.elements.welcomeMsg = document.getElementById('welcomeMsg');
    }
    
    showLoading(show) {
        if (show) {
            this.elements.loadingOverlay.classList.add('active');
        } else {
            this.elements.loadingOverlay.classList.remove('active');
        }
    }
    
    toggleTheme() {
        document.body.classList.toggle('dark');
        const isDark = document.body.classList.contains('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        this.elements.themeToggle.textContent = isDark ? '☀️' : '🌙';
    }
    
    loadTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark');
            this.elements.themeToggle.textContent = '☀️';
        }
    }
    
    startSessionTimer() {
        setInterval(() => {
            const minutes = Math.floor((Date.now() - this.sessionStart) / 60000);
            this.elements.sessionTime.textContent = minutes;
        }, 60000);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TeacherAIApp();
});