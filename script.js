// Spanish vocabulary learning functionality
let vocabulary = [];
let currentWord = null;
let currentIndex = 0;
let totalWords = 0;
let correctAnswers = 0;
let incorrectAnswers = 0;

// Visitor count functionality
function updateVisitorCount() {
    let count = localStorage.getItem('visitorCount');
    if (count === null) {
        count = 0;
    }
    count = parseInt(count) + 1;
    localStorage.setItem('visitorCount', count);
    document.getElementById('visitor-count').textContent = count;
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

// Initialize the app when page loads
document.addEventListener('DOMContentLoaded', function() {
    updateVisitorCount();
    loadVocabulary();
});