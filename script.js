// Spanish vocabulary learning functionality
let vocabulary = [];
let currentWord = null;
let currentIndex = 0;
let totalWords = 0;
let correctAnswers = 0;
let incorrectAnswers = 0;

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
            return { spanish: spanish.trim(), chinese: chinese.trim() };
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

// Display a random word
function showNextWord() {
    if (vocabulary.length === 0) return;

    currentIndex = Math.floor(Math.random() * vocabulary.length);
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
        
        // Remove the word from vocabulary to avoid repetition
        vocabulary.splice(currentIndex, 1);
        
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
    updateVisitorCount();
    loadVocabulary();
});