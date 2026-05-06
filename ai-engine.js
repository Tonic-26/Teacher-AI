const natural = require('natural');
const tokenizer = new natural.WordTokenizer();
const TfIdf = natural.TfIdf;

class AIChatEngine {
  constructor() {
    this.subjects = {
      mathematics: {
        name: "Mathematics",
        keywords: ['math', 'algebra', 'geometry', 'calculus', 'equation', 'number', 'fraction', 'solve', 'calculate'],
        responses: {
          basics: "Mathematics is the study of numbers, patterns, and logical reasoning. Let me help you understand step by step.",
          algebra: "Algebra uses variables to represent numbers. For example: 2x + 5 = 15 → 2x = 10 → x = 5",
          geometry: "Geometry deals with shapes, sizes, and spaces. Key formulas: Area of circle = πr², Triangle angles sum to 180°",
          practice: "Here's a practice problem: Solve for x: 3(x - 4) = 21. Take your time and let me know your answer!"
        }
      },
      english: {
        name: "English Language",
        keywords: ['english', 'grammar', 'vocabulary', 'writing', 'reading', 'speak', 'essay', 'sentence'],
        responses: {
          basics: "English has 8 parts of speech: nouns, pronouns, verbs, adjectives, adverbs, prepositions, conjunctions, interjections.",
          grammar: "Subject-verb agreement: 'He runs' vs 'They run'. Past tense adds -ed, but irregular verbs change form.",
          vocabulary: "Root words help build vocabulary: 'spect' (look) → inspect, respect, spectator",
          writing: "Good paragraphs have topic sentences, supporting details, and concluding sentences."
        }
      },
      science: {
        name: "Science",
        keywords: ['science', 'biology', 'chemistry', 'physics', 'experiment', 'atom', 'cell', 'force', 'energy'],
        responses: {
          basics: "Science is the systematic study of the natural world through observation and experimentation.",
          biology: "Cells are the basic unit of life. Plant cells have cell walls and chloroplasts for photosynthesis.",
          chemistry: "The periodic table organizes 118 elements. Water is H₂O, combining hydrogen and oxygen.",
          physics: "Newton's Laws: 1) Inertia, 2) F=ma, 3) Action-reaction. Gravity pulls at 9.8 m/s²."
        }
      },
      kinyarwanda: {
        name: "Kinyarwanda",
        keywords: ['kinyarwanda', 'rwanda', 'ururimi', 'ikinyarwanda', 'muraho', 'amakuru'],
        responses: {
          basics: "Ikinyarwanda ni ururimi rw'igihugu cy'u Rwanda. Gifite inyuguti 24.",
          grammar: "Ubwoko bw'izina: umuntu/abantu, igikoresho/ibikoresho. Inshinga: ndakora, urakora, arakora.",
          culture: "Imigani: 'Akabando k'inyana ntikamara ubusa' - Savings matter, no matter how small.",
          conversation: "Amagambo nshingiro: Muraho (Hello), Amakuru? (How are you?), Murakoze (Thank you)"
        }
      },
      history: {
        name: "History",
        keywords: ['history', 'rwanda', 'kingdom', 'colonial', 'independence', 'genocide', 'unity', 'africa'],
        responses: {
          basics: "Rwanda's history spans centuries, from the Kingdom of Rwanda to modern-day development.",
          kingdom: "The Kingdom of Rwanda united under Mwami (king) by the 18th century, with a structured monarchy.",
          independence: "Rwanda gained independence from Belgium on July 1, 1962.",
          modern: "Post-1994, Rwanda rebuilt through Gacaca courts, Umuganda, and Vision 2050 for sustainable development."
        }
      },
      general: {
        name: "General Knowledge",
        keywords: ['learn', 'study', 'education', 'skill', 'knowledge', 'help', 'explain', 'teach'],
        responses: {
          basics: "I'm your AI teacher! I can help you learn any subject effectively.",
          study: "Effective study techniques: Active recall, spaced repetition, Pomodoro method (25 min study + 5 min break)",
          motivation: "Growth mindset: Intelligence grows with effort. Mistakes are learning opportunities!",
          skills: "21st century skills: Critical thinking, creativity, collaboration, communication, digital literacy."
        }
      }
    };
    
    this.conversationMemory = new Map();
  }
  
  getSubjects() {
    return Object.keys(this.subjects).map(key => ({
      id: key,
      name: this.subjects[key].name
    }));
  }
  
  detectSubject(message) {
    const tokens = tokenizer.tokenize(message.toLowerCase());
    let bestMatch = 'general';
    let highestScore = 0;
    
    for (const [subjectId, subject] of Object.entries(this.subjects)) {
      let score = 0;
      for (const keyword of subject.keywords) {
        if (message.toLowerCase().includes(keyword)) {
          score += 2;
        }
      }
      for (const token of tokens) {
        if (subject.keywords.some(kw => kw.includes(token) || token.includes(kw))) {
          score += 1;
        }
      }
      if (score > highestScore) {
        highestScore = score;
        bestMatch = subjectId;
      }
    }
    return bestMatch;
  }
  
  detectIntent(message) {
    const msg = message.toLowerCase();
    if (msg.includes('quiz') || msg.includes('practice') || msg.includes('test me')) return 'quiz';
    if (msg.includes('step by step') || msg.includes('guide')) return 'stepbystep';
    if (msg.includes('example') || msg.includes('real life')) return 'example';
    if (msg.includes('summary') || msg.includes('explain')) return 'explain';
    if (msg.includes('hello') || msg.includes('hi') || msg.includes('muraho')) return 'greeting';
    return 'general';
  }
  
  async generateResponse(message, explicitSubject, history = []) {
    const subject = explicitSubject || this.detectSubject(message);
    const intent = this.detectIntent(message);
    const subjectData = this.subjects[subject];
    
    // Store in memory
    if (!this.conversationMemory.has(subject)) {
      this.conversationMemory.set(subject, []);
    }
    const memory = this.conversationMemory.get(subject);
    memory.push({ role: 'user', content: message, timestamp: Date.now() });
    if (memory.length > 10) memory.shift();
    
    let response = '';
    
    switch(intent) {
      case 'greeting':
        const greetings = [
          `Muraho! Welcome to ${subjectData.name}. How can I help you learn today?`,
          `Hello! I'm your AI teacher for ${subjectData.name}. What would you like to explore?`,
          `Hi there! Ready to learn ${subjectData.name}? Ask me anything!`
        ];
        response = greetings[Math.floor(Math.random() * greetings.length)];
        break;
        
      case 'quiz':
        response = await this.generateQuiz(subject, 'medium');
        break;
        
      case 'stepbystep':
        response = this.generateStepByStep(subject, message);
        break;
        
      case 'example':
        response = this.generateRealExample(subject);
        break;
        
      default:
        // Intelligent response based on keywords
        const lowerMsg = message.toLowerCase();
        let foundTopic = null;
        
        for (const [topic, content] of Object.entries(subjectData.responses)) {
          if (lowerMsg.includes(topic) && topic !== 'basics') {
            foundTopic = content;
            break;
          }
        }
        
        if (foundTopic) {
          response = foundTopic;
        } else {
          response = subjectData.responses.basics || "I'm here to help you learn. Could you please ask a more specific question?";
        }
    }
    
    // Add follow-up encouragement
    if (Math.random() > 0.6 && !response.includes('?')) {
      response += "\n\n✨ Would you like me to give you practice questions or more examples?";
    }
    
    memory.push({ role: 'ai', content: response, timestamp: Date.now() });
    
    return response;
  }
  
  generateStepByStep(subject, question) {
    const steps = {
      mathematics: "Step 1: Read the problem carefully\nStep 2: Identify what is given and what to find\nStep 3: Choose the right formula or method\nStep 4: Solve step by step\nStep 5: Check your answer\n\nExample: If asked to solve 2x + 3 = 11, subtract 3 from both sides → 2x = 8 → divide by 2 → x = 4",
      english: "Step 1: Read the sentence/text\nStep 2: Identify the main idea\nStep 3: Note supporting details\nStep 4: Analyze grammar/structure\nStep 5: Draw conclusions\n\nExample: For grammar correction, first find the subject and verb, then check agreement.",
      science: "Step 1: Observe the phenomenon\nStep 2: Form a hypothesis\nStep 3: Design an experiment\nStep 4: Collect and analyze data\nStep 5: Draw conclusions\n\nExample: Testing plant growth - control light, measure height daily, compare results.",
      kinyarwanda: "Intambwe 1: Soma ikibazo\nIntambwe 2: Menya ijambo ry'ibanze\nIntambwe 3: Koresha amategeko y'ikinyarwanda\nIntambwe 4: Reba uko ijambo rivugwa\nIntambwe 5: Andika igisubizo",
      history: "Step 1: Identify the time period\nStep 2: Understand the context\nStep 3: Analyze causes and effects\nStep 4: Connect to broader events\nStep 5: Draw lessons for today"
    };
    return steps[subject] || steps.general;
  }
  
  generateRealExample(subject) {
    const examples = {
      mathematics: "📐 Real-life example: When budgeting your monthly allowance of 50,000 RWF, if you spend 30,000 RWF on food and 15,000 RWF on transport, how much remains? Answer: 5,000 RWF for savings!",
      english: "✍️ Real-life example: Writing a job application email in Rwanda. Start with 'Dear Hiring Manager,' use formal language, state your qualifications clearly, and end with 'Sincerely, [Your Name]'",
      science: "🔬 Real-life example: In Rwanda's agriculture, farmers use photosynthesis knowledge to know that plants need sunlight. Coffee plants grow best at certain altitudes due to temperature and soil chemistry!",
      kinyarwanda: "🇷🇼 Urugero: Mu Rwanda, iyo ujyanye n'umuhango w'ubukwe, ukoresha amagambo nka 'Murakaza neza' no guha ibyishimo abashyingiranywe.",
      history: "🏛️ Real-life example: Umuganda community work happens every last Saturday. This tradition dates back to pre-colonial Rwanda and now builds schools, cleans neighborhoods, and strengthens unity."
    };
    return examples[subject] || "💡 Real-life application: Connect what you learn to daily experiences in Rwanda. Ask me for specific examples!";
  }
  
  async generateQuiz(subject, difficulty = 'medium') {
    const quizzes = {
      mathematics: {
        easy: "What is 25 × 4? (A) 80 (B) 100 (C) 120",
        medium: "Solve: 3x - 7 = 14. What is x? (A) 5 (B) 7 (C) 9",
        hard: "A rectangle has length 12cm and area 96cm². What is its width? (A) 6cm (B) 8cm (C) 10cm"
      },
      english: {
        easy: "What is the past tense of 'go'? (A) Goed (B) Went (C) Gone",
        medium: "Choose correct sentence: (A) She don't like coffee (B) She doesn't like coffee (C) She not like coffee",
        hard: "Identify the subordinate clause: 'The student who studied hard passed the exam.' (A) who studied hard (B) The student passed (C) the exam"
      },
      science: {
        easy: "Which planet is closest to the Sun? (A) Venus (B) Mercury (C) Earth",
        medium: "What process do plants use to make food? (A) Respiration (B) Photosynthesis (C) Digestion",
        hard: "What is the chemical symbol for Gold? (A) Go (B) Gd (C) Au"
      }
    };
    
    const subjectQuiz = quizzes[subject] || quizzes.mathematics;
    const question = subjectQuiz[difficulty] || subjectQuiz.medium;
    
    return `📝 QUIZ TIME! (${difficulty} difficulty)\n\n${question}\n\nType your answer and I'll check it for you! 🎯`;
  }
}

module.exports = AIChatEngine;