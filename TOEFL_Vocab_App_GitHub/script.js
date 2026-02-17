// vocabulary data is loaded from vocab.js

class QuizApp {
    constructor() {
        this.currentRank = 'all';
        this.currentWord = null;
        this.score = 0;
        this.questionCount = 0;
        this.totalQuestionsInSession = 10;
        this.isSessionActive = false;
        this.isWaiting = false;
        this.sessionQueue = [];
        this.wrongAnswers = []; // Store incorrect attempts
        this.wordMemory = {};

        this.initElements();
        this.loadMemory();
        this.setupListeners();

        // Start on Home View logic
        this.switchView('quiz');
    }

    initElements() {
        // Views
        this.quizView = document.getElementById('quiz-view');
        this.homeView = document.getElementById('home-view');
        this.statsView = document.getElementById('stats-view');
        this.historyView = document.getElementById('history-view');
        this.wordListView = document.getElementById('word-list-view');

        // Navigation
        this.navBtns = document.querySelectorAll('.nav-btn');
        this.quitHeaderBtn = document.getElementById('quit-header-btn');
        this.closeListBtn = document.getElementById('close-list-btn');

        // Quiz Elements
        this.questionWordEl = document.getElementById('question-word');
        this.optionsContainer = document.getElementById('options-container');
        this.scoreEl = document.getElementById('score');
        this.questionCounterEl = document.getElementById('question-counter');
        this.progressBar = document.getElementById('progress-bar');
        this.progressContainer = document.getElementById('progress-container');
        this.feedbackArea = document.getElementById('feedback-area');
        this.feedbackText = document.getElementById('feedback-text');
        this.feedbackText = document.getElementById('feedback-text');
        this.nextBtn = document.getElementById('next-btn');
        this.audioHint = document.getElementById('audio-hint');
        this.memoryMeterEl = document.getElementById('memory-meter');

        // Course Cards
        this.courseCards = document.querySelectorAll('.course-card');
        this.listBtns = document.querySelectorAll('.list-btn');

        // Stats Elements
        this.statsContainer = document.getElementById('stats-container');

        // History Elements
        this.historyList = document.getElementById('history-list-view');
        this.clearHistoryBtn = document.getElementById('clear-history-btn-view');
        this.exportHistoryBtn = document.getElementById('export-history-btn-view');

        // Word List Elements
        this.wordListContainer = document.getElementById('word-list-container');
        this.wordListTitle = document.getElementById('word-list-title');

        // Quit Modal Elements
        this.quitModal = document.getElementById('quit-modal');
        this.confirmQuitBtn = document.getElementById('confirm-quit-btn');
        this.cancelQuitBtn = document.getElementById('cancel-quit-btn');
    }

    setupListeners() {
        // Course Selection (Main Card Click)
        this.courseCards.forEach(card => {
            card.addEventListener('click', (e) => {
                // Prevent click if clicking the list button
                if (e.target.closest('.list-btn')) return;

                const rank = card.getAttribute('data-rank');
                this.startSession(rank);
            });
        });

        // Word List Button Click
        this.listBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Stop bubbling to card click
                const rank = btn.getAttribute('data-rank');
                this.showWordList(rank);
            });
        });

        this.closeListBtn.addEventListener('click', () => {
            this.wordListView.classList.add('hidden');
            this.homeView.classList.remove('hidden');
        });

        // Quiz Interaction
        this.nextBtn.addEventListener('click', () => {
            if (this.questionCount < this.totalQuestionsInSession) {
                this.nextQuestion();
            } else {
                this.finishSession();
            }
        });

        this.quitHeaderBtn.addEventListener('click', () => this.quitSession());

        this.audioHint.addEventListener('click', () => {
            this.speakWord();
        });

        // Navigation
        this.navBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.currentTarget.getAttribute('data-view');
                this.switchView(view);
            });
        });

        // History Actions
        this.clearHistoryBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all history?')) {
                localStorage.removeItem('quizHistory');
                this.renderHistory();
            }
        });

        this.exportHistoryBtn.addEventListener('click', () => {
            this.exportHistoryToCSV();
        });


        // Quit Modal Listeners
        this.confirmQuitBtn.addEventListener('click', () => {
            this.isSessionActive = false;
            this.switchView('quiz'); // Will show home because session inactive
            this.quitModal.classList.remove('visible');
            this.quitHeaderBtn.style.display = 'block'; // Ensure back button is reset if needed
        });

        this.cancelQuitBtn.addEventListener('click', () => {
            this.quitModal.classList.remove('visible');
        });
    }

    quitSession() {
        this.quitModal.classList.add('visible');
    }

    switchView(viewName) {
        // Update Nav UI
        this.navBtns.forEach(btn => {
            if (btn.getAttribute('data-view') === viewName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Hide all views first
        this.quizView.classList.add('hidden');
        this.homeView.classList.add('hidden');
        this.statsView.classList.add('hidden');
        this.historyView.classList.add('hidden');
        this.wordListView.classList.add('hidden');

        // Show selected
        if (viewName === 'quiz') {
            if (this.isSessionActive) {
                this.quizView.classList.remove('hidden');
            } else {
                this.homeView.classList.remove('hidden');
            }
        } else if (viewName === 'stats') {
            this.statsView.classList.remove('hidden');
            this.renderStats();
        } else if (viewName === 'history') {
            this.historyView.classList.remove('hidden');
            this.renderHistory();
        }
    }

    // --- Quiz Logic ---

    startSession(rank) {
        this.currentRank = rank === 'all' ? 'all' : parseInt(rank);
        this.score = 0;
        this.questionCount = 0;
        this.isSessionActive = true;
        this.wrongAnswers = []; // Reset wrong answers

        // Show Quiz View logic
        this.homeView.classList.add('hidden');
        this.quizView.classList.remove('hidden');
        this.progressContainer.style.display = 'block';

        const allWords = this.filterVocabulary();
        if (allWords.length === 0) {
            alert("No words found for this rank!");
            this.isSessionActive = false;
            this.switchView('quiz');
            return;
        }

        this.sessionQueue = this.shuffleArray([...allWords]).slice(0, this.totalQuestionsInSession);
        this.totalQuestionsInSession = Math.min(10, allWords.length);

        this.updateScoreBoard();
        this.nextQuestion();
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    filterVocabulary() {
        if (typeof vocabulary === 'undefined' || !vocabulary.length) {
            console.error("Vocabulary not loaded");
            return [];
        }
        if (this.currentRank === 'all') {
            return vocabulary;
        }
        return vocabulary.filter(v => v.rank === this.currentRank);
    }

    speakWord() {
        if (!this.currentWord) return;
        const utterance = new SpeechSynthesisUtterance(this.currentWord.word);
        utterance.lang = 'en-US';
        speechSynthesis.speak(utterance);
    }

    nextQuestion() {
        this.isWaiting = false;
        this.feedbackArea.classList.remove('visible');
        this.feedbackArea.classList.add('hidden');
        this.optionsContainer.innerHTML = '';

        if (this.sessionQueue.length === 0) {
            this.finishSession();
            return;
        }

        this.currentWord = this.sessionQueue.pop();
        this.questionCount++;

        this.updateScoreBoard();
        this.renderMemoryMeter();

        this.questionWordEl.textContent = this.currentWord.word;
        this.questionWordEl.classList.remove('fade-in');
        void this.questionWordEl.offsetWidth; // trigger reflow
        this.questionWordEl.classList.add('fade-in');

        const options = this.generateOptions(this.currentWord);
        this.renderOptions(options);

        this.nextBtn.textContent = this.sessionQueue.length === 0 ? "Finish" : "Next Word";
    }

    generateOptions(correctWord) {
        const allWords = this.filterVocabulary();
        let pool = allWords.filter(w => w.word !== correctWord.word);

        if (pool.length < 3) {
            if (this.currentRank !== 'all') {
                pool = vocabulary.filter(w => w.word !== correctWord.word);
            }
        }

        const distractors = [];
        while (distractors.length < 3 && pool.length > 0) {
            const idx = Math.floor(Math.random() * pool.length);
            distractors.push(pool[idx]);
            pool.splice(idx, 1);
        }

        const options = [...distractors, correctWord];
        return this.shuffleArray(options);
    }

    renderOptions(options) {
        options.forEach(opt => {
            const btn = document.createElement('div');
            btn.className = 'option-btn';
            btn.textContent = opt.meaning;
            btn.addEventListener('click', () => this.handleAnswer(opt, btn));
            this.optionsContainer.appendChild(btn);
        });
    }

    handleAnswer(selectedOption, btnElement) {
        if (this.isWaiting) return;
        this.isWaiting = true;

        const isCorrect = selectedOption.word === this.currentWord.word;

        if (this.currentRank !== 'all') {
            const wordKey = this.currentWord.word;
            let level = this.wordMemory[wordKey] || 0;

            if (isCorrect) {
                if (level < 3) level++;
            } else {
                if (level > 0) level--;
            }

            this.wordMemory[wordKey] = level;
            this.saveMemory();
            this.renderMemoryMeter();
        }

        if (isCorrect) {
            btnElement.classList.add('correct');
            this.score++;
            this.feedbackText.textContent = "Correct!";
            this.feedbackText.style.color = "var(--success-color)";
        } else {
            btnElement.classList.add('wrong');
            this.feedbackText.textContent = `Wrong! It means: ${this.currentWord.meaning}`;
            this.feedbackText.style.color = "var(--error-color)";

            this.wrongAnswers.push({
                word: this.currentWord.word,
                meaning: this.currentWord.meaning
            });

            const buttons = this.optionsContainer.querySelectorAll('.option-btn');
            buttons.forEach(b => {
                if (b.textContent === this.currentWord.meaning) {
                    b.classList.add('correct');
                }
            });
        }

        this.updateScoreBoard();
        this.feedbackArea.classList.remove('hidden');
        this.feedbackArea.classList.add('visible');
    }

    updateScoreBoard() {
        this.scoreEl.textContent = this.score;
        this.questionCounterEl.textContent = `Question: ${this.questionCount} / ${this.totalQuestionsInSession}`;

        const progress = (this.questionCount / this.totalQuestionsInSession) * 100;
        this.progressBar.style.width = `${progress}%`;
    }

    renderMemoryMeter() {
        const wordKey = this.currentWord.word;
        const level = this.wordMemory[wordKey] || 0;

        this.memoryMeterEl.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('div');
            dot.className = 'memory-dot';
            if (i < level) {
                dot.classList.add('filled');
            }
            this.memoryMeterEl.appendChild(dot);
        }
    }

    loadMemory() {
        const data = localStorage.getItem('vocabMemory');
        if (data) {
            this.wordMemory = JSON.parse(data);
        }
    }

    saveMemory() {
        localStorage.setItem('vocabMemory', JSON.stringify(this.wordMemory));
    }

    finishSession() {
        this.saveResult();
        this.isSessionActive = false;
        this.quitHeaderBtn.style.display = 'none'; // Hide header back button on result

        this.questionWordEl.textContent = "Session Complete!";
        this.memoryMeterEl.innerHTML = '';

        // Build Review List HTML
        let reviewHtml = '';
        if (this.wrongAnswers.length > 0) {
            reviewHtml += `<div class="review-list">`;
            this.wrongAnswers.forEach(item => {
                reviewHtml += `
                    <div class="review-item">
                        <div>
                            <span class="review-word">${item.word}</span>
                            <span class="review-meaning">${item.meaning}</span>
                        </div>
                        <span class="review-badge">Review</span>
                    </div>
                `;
            });
            reviewHtml += `</div>`;
        } else {
            reviewHtml = `<p style="margin-top:20px; color:var(--success-color);">Perfect Score! No mistakes.</p>`;
        }

        this.optionsContainer.innerHTML = `
            <div style="grid-column: 1 / -1; font-size: 1.5rem; margin-top: 10px;">
                Final Score: ${this.score} / ${this.totalQuestionsInSession}
            </div>
            <div style="grid-column: 1 / -1;">
                ${reviewHtml}
            </div>
            <div class="action-buttons" style="grid-column: 1 / -1;">
                <button id="back-to-courses-btn" class="rank-btn" style="width: auto;">Back to Courses</button>
                <button id="once-again-btn" class="rank-btn active" style="width: auto;">Once Again</button>
            </div>
        `;

        document.getElementById('back-to-courses-btn').addEventListener('click', () => {
            this.switchView('quiz');
            this.quitHeaderBtn.style.display = 'block'; // Restore
        });

        document.getElementById('once-again-btn').addEventListener('click', () => {
            this.startSession(this.currentRank);
            this.quitHeaderBtn.style.display = 'block'; // Restore
        });

        this.feedbackArea.classList.add('hidden');
        this.audioHint.style.display = 'none';
        this.progressContainer.style.display = 'none';
    }

    saveResult() {
        const history = JSON.parse(localStorage.getItem('quizHistory') || '[]');
        const result = {
            date: new Date().toISOString(),
            rank: this.currentRank,
            score: this.score,
            total: this.totalQuestionsInSession
        };
        history.unshift(result);
        localStorage.setItem('quizHistory', JSON.stringify(history));
    }

    // --- Word List Logic ---
    showWordList(rank) {
        // Switch view
        this.homeView.classList.add('hidden');
        this.wordListView.classList.remove('hidden');
        this.wordListView.style.display = 'flex'; // Ensure flex layout

        const rankInt = rank === 'all' ? 'all' : parseInt(rank);
        const titleRank = rank === 'all' ? 'All Ranks' : `Rank ${rank}`;
        this.wordListTitle.textContent = `${titleRank} Words`;

        // Filter words
        let words = [];
        if (rankInt === 'all') {
            words = vocabulary;
        } else {
            words = vocabulary.filter(w => w.rank === rankInt);
        }

        this.wordListContainer.innerHTML = '';

        if (words.length === 0) {
            this.wordListContainer.innerHTML = '<p>No words found.</p>';
            return;
        }

        words.forEach(w => {
            const level = this.wordMemory[w.word] || 0;
            let dotsHtml = '';
            for (let i = 0; i < 3; i++) {
                dotsHtml += `<div class="status-dot ${i < level ? 'filled' : ''}"></div>`;
            }

            const item = document.createElement('div');
            item.className = 'word-list-item';
            item.innerHTML = `
                <div>
                    <div class="word-list-head">${w.word}</div>
                    <div class="word-list-meaning">${w.meaning}</div>
                </div>
                <div class="word-list-status" title="Memory Level: ${level}">
                    ${dotsHtml}
                </div>
            `;
            this.wordListContainer.appendChild(item);
        });
    }

    // --- Stats Logic ---

    renderStats() {
        if (typeof vocabulary === 'undefined') return;

        this.statsContainer.innerHTML = '';
        const ranks = [1, 2, 3, 4];

        ranks.forEach(rank => {
            const rankWords = vocabulary.filter(w => w.rank === rank);
            const totalWords = rankWords.length;

            let masteredCount = 0;
            rankWords.forEach(w => {
                if ((this.wordMemory[w.word] || 0) === 3) {
                    masteredCount++;
                }
            });

            const percentage = totalWords === 0 ? 0 : Math.round((masteredCount / totalWords) * 100);

            const card = document.createElement('div');
            card.className = 'stat-card';
            card.innerHTML = `
                <div class="stat-header">
                    <span>Rank ${rank}</span>
                    <span>${percentage}% (${masteredCount}/${totalWords})</span>
                </div>
                <div class="stat-bar-bg">
                    <div class="stat-bar-fill" style="width: ${percentage}%"></div>
                </div>
                <div style="font-size: 0.8rem; color: #94a3b8; margin-top: 5px;">
                    Mastered (3 dots)
                </div>
            `;
            this.statsContainer.appendChild(card);
        });
    }

    renderHistory() {
        const history = JSON.parse(localStorage.getItem('quizHistory') || '[]');
        this.historyList.innerHTML = '';

        if (history.length === 0) {
            this.historyList.innerHTML = '<p style="text-align:center; color:#94a3b8;">No history yet.</p>';
        } else {
            history.forEach(item => {
                const date = new Date(item.date).toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
                const rankText = item.rank === 'all' ? 'All Ranks' : `Rank ${item.rank}`;

                const div = document.createElement('div');
                div.className = 'history-item';
                div.innerHTML = `
                    <div>
                        <span style="font-weight:bold; color:var(--accent-color);">${rankText}</span>
                        <span class="history-date">${date}</span>
                    </div>
                    <div style="text-align:right;">
                        <span style="font-size:1.2rem; font-weight:bold;">${item.score}/${item.total}</span>
                        <span style="font-size:0.8rem; color:${item.score === item.total ? 'var(--success-color)' : '#94a3b8'}">Score</span>
                    </div>
                `;
                this.historyList.appendChild(div);
            });
        }
    }

    exportHistoryToCSV() {
        const history = JSON.parse(localStorage.getItem('quizHistory') || '[]');
        if (history.length === 0) {
            alert("No history to export!");
            return;
        }

        let csvContent = "data:text/csv;charset=utf-8,Date,Rank,Score,Total\n";
        history.forEach(item => {
            const date = new Date(item.date).toISOString();
            const rank = item.rank;
            csvContent += `${date},${rank},${item.score},${item.total}\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "toefl_quiz_history.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof vocabulary !== 'undefined') {
        new QuizApp();
    } else {
        document.getElementById('question-word').textContent = "Error loading data";
    }
});
