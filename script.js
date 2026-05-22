// Spanish vocabulary learning functionality
let vocabulary = [];
let currentWord = null;
let currentIndex = 0;
let totalWords = 0;
let correctAnswers = 0;
let incorrectAnswers = 0;

// Theme management
const THEME_KEY = 'spanish-learning-theme';

function getStoredTheme() {
    return localStorage.getItem(THEME_KEY) || 'default';
}

function setStoredTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
}

function toggleTheme() {
    const body = document.body;
    const toggleBtn = document.getElementById('theme-toggle');
    const currentTheme = getStoredTheme();

    // Cycle: spring → default → christmas → spring
    let newTheme;
    if (currentTheme === 'spring') {
        newTheme = 'default';
        body.classList.remove('spring-theme');
        toggleBtn.innerHTML = '<span class="theme-icon">🎄</span><span class="theme-text">圣诞主题</span>';
    } else if (currentTheme === 'default') {
        newTheme = 'christmas';
        body.classList.add('christmas-theme');
        toggleBtn.innerHTML = '<span class="theme-icon">🧧</span><span class="theme-text">春节主题</span>';
    } else {
        // christmas → spring
        newTheme = 'spring';
        body.classList.remove('christmas-theme');
        body.classList.add('spring-theme');
        toggleBtn.innerHTML = '<span class="theme-icon">🎊</span><span class="theme-text">默认主题</span>';
    }

    setStoredTheme(newTheme);
}

// Speech pronunciation management
class SpanishPronunciationManager {
    constructor() {
        this.voices = [];
        this.selectedVoice = null;
        this.speechRate = 0.8; // Slightly slower for learning
        this.isSupported = 'speechSynthesis' in window;
        this.initialize();
    }

    initialize() {
        if (this.isSupported) {
            // Load voices when they become available
            if (speechSynthesis.onvoiceschanged !== undefined) {
                speechSynthesis.onvoiceschanged = () => this.loadVoices();
            }
            // Try to load voices immediately
            this.loadVoices();
        } else {
            console.warn('Speech synthesis not supported in this browser');
            // Hide pronunciation button if not supported
            const pronounceBtn = document.getElementById('pronounce-btn');
            if (pronounceBtn) {
                pronounceBtn.style.display = 'none';
            }
        }
    }

    loadVoices() {
        this.voices = speechSynthesis.getVoices();
        // Prefer Spanish voices from Spain
        const spanishVoices = this.voices.filter(voice =>
            voice.lang.startsWith('es-ES')
        );

        if (spanishVoices.length > 0) {
            this.selectedVoice = spanishVoices[0];
        } else {
            // Fallback to any Spanish voice
            const anySpanish = this.voices.find(voice =>
                voice.lang.startsWith('es')
            );
            this.selectedVoice = anySpanish || this.voices[0];
        }
    }

    pronounce(text, options = {}) {
        if (!this.isSupported || !text) {
            console.warn('Speech synthesis not available or no text provided');
            return;
        }

        // Cancel any ongoing speech
        speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        // Configure utterance
        utterance.voice = this.selectedVoice;
        utterance.rate = options.rate || this.speechRate;
        utterance.pitch = options.pitch || 1.0;
        utterance.volume = options.volume || 1.0;
        utterance.lang = 'es-ES';

        // Add event listeners for debugging
        utterance.onstart = () => {
            console.log('Speaking:', text);
            // Visual feedback for button
            const btn = document.getElementById('pronounce-btn');
            if (btn) {
                btn.style.opacity = '0.5';
                btn.disabled = true;
            }
        };

        utterance.onend = () => {
            console.log('Finished speaking');
            // Reset button state
            const btn = document.getElementById('pronounce-btn');
            if (btn) {
                btn.style.opacity = '0.7';
                btn.disabled = false;
            }
        };

        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event);
            // Reset button state
            const btn = document.getElementById('pronounce-btn');
            if (btn) {
                btn.style.opacity = '0.7';
                btn.disabled = false;
            }
        };

        speechSynthesis.speak(utterance);
    }

    // Get available Spanish voices for settings
    getSpanishVoices() {
        return this.voices.filter(voice => voice.lang.startsWith('es'));
    }

    // Set speech rate for learning preferences
    setSpeechRate(rate) {
        this.speechRate = Math.max(0.1, Math.min(10, rate));
    }

    // Set preferred voice
    setVoice(voice) {
        this.selectedVoice = voice;
    }
}

// Initialize pronunciation manager
const pronunciationManager = new SpanishPronunciationManager();

// Visitor count functionality (Node.js server-side)
async function updateVisitorCount() {
    try {
        const response = await fetch('/api/visitor-count');
        const data = await response.json();
        if (data.error) {
            throw new Error(data.error);
        }
        document.getElementById('visitor-count').textContent = data.count;
    } catch (error) {
        console.error('Error fetching visitor count:', error);
        document.getElementById('visitor-count').textContent = '--';
    }
}

// Load CSV data and initialize the app
async function loadVocabulary() {
    try {
        const response = await fetch('spanish_vocab_8000_zh.csv');
        const text = await response.text();
        
        // Parse CSV content
        const lines = text.trim().split('\n');
        vocabulary = lines.map(line => {
            const [spanish, chinese] = line.split(',');
            return {
                spanish: spanish.trim(),
                chinese: chinese.trim(),
                difficulty: 5,
                consecutiveCorrect: 0,
                lastReviewed: null,
                nextReview: null,
                timesReviewed: 0,
                timesCorrect: 0,
                timesIncorrect: 0,
                consecutiveIncorrect: 0
            };
        });
        
        totalWords = vocabulary.length;
        updateStats();
        showNextWord();
    } catch (error) {
        console.error('Error loading vocabulary:', error);
        document.querySelector('.feedback').innerHTML = 
            '<div class="feedback incorrect">Error loading vocabulary. Please check the CSV file.</div>';
    }
}

// Calculate word weight for spaced repetition
// Error words get dramatically higher weight to ensure they appear more frequently
function calculateWordWeight(word) {
    // If word has incorrect answers, give it extremely high weight
    if (word.timesIncorrect > 0) {
        // Base 400x weight + incorrect count bonus + consecutive incorrect bonus
        return 400 + (word.timesIncorrect * 100) + (word.consecutiveIncorrect * 50);
    }
    // New words get minimal weight (1)
    return 1;
}

// Display a word using weighted random selection
function showNextWord() {
    if (vocabulary.length === 0) return;

    // Weighted random selection - error words get dramatically higher weight
    const weights = vocabulary.map(word => calculateWordWeight(word));
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;

    currentIndex = 0;
    for (let i = 0; i < vocabulary.length; i++) {
        random -= weights[i];
        if (random <= 0) {
            currentIndex = i;
            break;
        }
    }

    currentWord = vocabulary[currentIndex];

    document.getElementById('spanish-word').textContent = currentWord.spanish;
    document.getElementById('chinese-input').value = '';
    document.getElementById('chinese-input').focus();

    // Hide previous feedback
    document.getElementById('feedback').innerHTML = '';

    // Auto-pronounce the new word (optional - can be disabled if too frequent)
    // setTimeout(() => {
    //     if (pronunciationManager.isSupported && currentWord) {
    //         pronunciationManager.pronounce(currentWord.spanish);
    //     }
    // }, 500);
}

// Check the user's answer
function checkAnswer() {
    const userInput = document.getElementById('chinese-input').value.trim();
    const feedback = document.getElementById('feedback');

    if (!userInput) {
        feedback.innerHTML = '<div class="feedback incorrect">请输入翻译！</div>';
        return;
    }

    const isCorrect = userInput.toLowerCase() === currentWord.chinese.toLowerCase();

    if (isCorrect) {
        correctAnswers++;
        feedback.innerHTML = '<div class="feedback correct">✓ 正确！</div>';

        // Update SRS fields
        currentWord.consecutiveCorrect++;
        currentWord.consecutiveIncorrect = 0;
        currentWord.difficulty = Math.max(0, currentWord.difficulty - 1);
        currentWord.timesCorrect++;

        // Remove only if mastered (difficulty 0 + 3+ consecutive correct)
        if (currentWord.difficulty === 0 && currentWord.consecutiveCorrect >= 3) {
            vocabulary.splice(currentIndex, 1);
        }

        setTimeout(() => {
            if (vocabulary.length > 0) {
                showNextWord();
            } else {
                showCompletionMessage();
            }
        }, 1500);
    } else {
        incorrectAnswers++;
        feedback.innerHTML =
            `<div class="feedback incorrect">
                ✗ 错误！<br>
                正确答案是：<strong>${currentWord.chinese}</strong>
            </div>`;

        // Update SRS fields for incorrect answer
        currentWord.consecutiveCorrect = 0;
        currentWord.consecutiveIncorrect++;
        currentWord.timesIncorrect++;
        currentWord.difficulty = Math.min(5, currentWord.difficulty + 1);

        setTimeout(() => {
            showNextWord();
        }, 3000);
    }

    updateStats();
}

// Update statistics display
function updateStats() {
    const total = correctAnswers + incorrectAnswers;
    const percentage = total > 0 ? Math.round((correctAnswers / total) * 100) : 0;
    
    document.getElementById('total-attempts').textContent = total;
    document.getElementById('correct-count').textContent = correctAnswers;
    document.getElementById('incorrect-count').textContent = incorrectAnswers;
    document.getElementById('accuracy').textContent = percentage;
    
    const progressBar = document.querySelector('.progress-fill');
    const progress = totalWords > 0 ? ((totalWords - vocabulary.length) / totalWords) * 100 : 0;
    progressBar.style.width = `${progress}%`;
}

// Show completion message
function showCompletionMessage() {
    const container = document.querySelector('.container');
    const total = correctAnswers + incorrectAnswers;
    const percentage = Math.round((correctAnswers / total) * 100);
    
    container.innerHTML = `
        <h1>🎉 完成！</h1>
        <div style="text-align: center; padding: 30px;">
            <h2>恭喜！你已经完成了所有单词的学习！</h2>
            <div style="margin: 20px 0;">
                <p><strong>总答题数：</strong>${total}</p>
                <p><strong>正确：</strong>${correctAnswers}</p>
                <p><strong>错误：</strong>${incorrectAnswers}</p>
                <p><strong>正确率：</strong>${percentage}%</p>
            </div>
            <button class="btn btn-primary" onclick="location.reload()">重新开始</button>
        </div>
    `;
}

// Event listeners
document.getElementById('chinese-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        checkAnswer();
    }
});

document.getElementById('check-btn').addEventListener('click', checkAnswer);
document.getElementById('next-btn').addEventListener('click', showNextWord);

// Pronunciation button event listener
document.getElementById('pronounce-btn').addEventListener('click', function() {
    if (currentWord && pronunciationManager.isSupported) {
        pronunciationManager.pronounce(currentWord.spanish);
    }
});

// Initialize the app when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Initialize theme (default to spring if none saved)
    const savedTheme = getStoredTheme();
    const toggleBtn = document.getElementById('theme-toggle');

    if (savedTheme === 'christmas') {
        document.body.classList.add('christmas-theme');
        toggleBtn.innerHTML = '<span class="theme-icon">🧧</span><span class="theme-text">春节主题</span>';
    } else if (savedTheme === 'spring') {
        document.body.classList.add('spring-theme');
        toggleBtn.innerHTML = '<span class="theme-icon">🎊</span><span class="theme-text">默认主题</span>';
    } else {
        // Default to spring theme
        document.body.classList.add('spring-theme');
        setStoredTheme('spring');
        toggleBtn.innerHTML = '<span class="theme-icon">🎊</span><span class="theme-text">默认主题</span>';
    }

    // Add theme toggle button event listener
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

    // Initialize hamburger menu
    initHamburgerMenu();

    // Initialize the app
    updateVisitorCount();
    loadVocabulary();
});

// AI Chat functionality
let aiConversationHistory = [
    {
        role: 'system',
        content: '你是一个西班牙语学习助手，可以帮助用户学习西班牙语词汇、语法和对话。请用中文回复，如果用户用西班牙语提问，可以适当用西班牙语回答并翻译解释。用户正在学习西班牙语，请给予鼓励和帮助。'
    }
];

document.getElementById('ai-chat-btn').addEventListener('click', function() {
    showSection('ai-chat');
});

// AI message handling
const aiInput = document.getElementById('ai-input');
const aiSendBtn = document.getElementById('ai-send-btn');
const aiMessages = document.getElementById('ai-messages');

function sendAiMessage() {
    const message = aiInput.value.trim();
    if (!message) return;

    // Add user message to UI
    const userMsg = document.createElement('div');
    userMsg.className = 'ai-message user';
    userMsg.textContent = message;
    aiMessages.appendChild(userMsg);

    // Add user message to history
    aiConversationHistory.push({
        role: 'user',
        content: message
    });

    // Clear input
    aiInput.value = '';

    // Scroll to bottom
    aiMessages.scrollTop = aiMessages.scrollHeight;

    // Show loading indicator
    const loadingMsg = document.createElement('div');
    loadingMsg.className = 'ai-message ai loading';
    loadingMsg.textContent = '思考中...';
    aiMessages.appendChild(loadingMsg);

    // Call API
    fetch('/api/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            messages: aiConversationHistory
        })
    })
    .then(response => response.json())
    .then(data => {
        // Remove loading indicator
        loadingMsg.remove();

        if (data.error) {
            const errorMsg = document.createElement('div');
            errorMsg.className = 'ai-message ai';
            errorMsg.textContent = '抱歉：' + data.error;
            aiMessages.appendChild(errorMsg);
            return;
        }

        // Clean AI response: remove thinking tags with content, and convert markdown bold
        let aiContent = data.choices?.[0]?.message?.content || '抱歉，我没有收到有效的回复。';
        aiContent = aiContent.replace(/<think>[\s\S]*?<\/think>/g, '').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/^### (.+)$/gm, '<h4>$1</h4>').replace(/^## (.+)$/gm, '<h3>$1</h3>').replace(/^# (.+)$/gm, '<h2>$1</h2>').replace(/\|(.+)\|\s*\n\|[-:\s|]+\|\n((?:\|.+\|\s*\n?)+)/g, (match, header, body) => {
            const headers = header.split('|').map(h => h.trim()).filter(Boolean);
            const rows = body.trim().split('\n').map(row => row.split('|').map(c => c.trim()).filter(Boolean));
            const thead = headers.map(h => `<th>${h}</th>`).join('');
            const tbody = rows.map(row => `<tr>${row.map(c => `<td>${c}</td>`).join('')}</tr>`).join('');
            return `<table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>`;
        });

        // Add AI response to UI
        const aiMsg = document.createElement('div');
        aiMsg.className = 'ai-message ai';
        aiMsg.innerHTML = aiContent;
        aiMessages.appendChild(aiMsg);

        // Add AI response to history
        aiConversationHistory.push({
            role: 'assistant',
            content: aiContent
        });

        // Scroll to bottom
        aiMessages.scrollTop = aiMessages.scrollHeight;
    })
    .catch(error => {
        loadingMsg.remove();
        const errorMsg = document.createElement('div');
        errorMsg.className = 'ai-message ai';
        errorMsg.textContent = '网络错误，请稍后重试。';
        aiMessages.appendChild(errorMsg);
        aiMessages.scrollTop = aiMessages.scrollHeight;
    });
}

aiSendBtn.addEventListener('click', sendAiMessage);

aiInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendAiMessage();
    }
});

document.querySelectorAll('.ai-hint-item').forEach(btn => {
    btn.addEventListener('click', () => {
        aiInput.value = btn.dataset.question;
        sendAiMessage();
    });
});

// Hamburger menu functionality
function initHamburgerMenu() {
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const dropdown = document.getElementById('hamburger-dropdown');

    // Toggle menu on button click
    hamburgerBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        dropdown.classList.toggle('show');
        hamburgerBtn.classList.toggle('active');
    });

    // Close menu when clicking outside
    document.addEventListener('click', function() {
        dropdown.classList.remove('show');
        hamburgerBtn.classList.remove('active');
    });

    // Prevent menu from closing when clicking inside
    dropdown.addEventListener('click', function(e) {
        e.stopPropagation();
    });

    // Handle menu item clicks
    document.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const target = this.getAttribute('href').substring(1);
            showSection(target);
            dropdown.classList.remove('show');
            hamburgerBtn.classList.remove('active');
        });
    });

    // Handle back buttons
    document.querySelectorAll('.back-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            hideAllSections();
        });
    });
}

// Show specific section
function showSection(sectionId) {
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => section.style.display = 'none');

    if (sectionId) {
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.style.display = 'block';
            document.getElementById('content-sections').style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    }
}

// Hide all sections and return to main app
function hideAllSections() {
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => section.style.display = 'none');
    document.getElementById('content-sections').style.display = 'none';
    document.body.style.overflow = 'auto';
}