document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION ---
    const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQEfxl2DDK4ZY-pFgNMnNlzuXJKf9ysLh1u30CW0aukQVNJ3oEPXTMZ8S8g685fxGYmVv5lmve4ZLrN/pub?output=csv';
    const WINNING_SCORE = 10;

    // --- DOM ELEMENTS ---
    const elements = {
        girlsScore: document.getElementById('girls-score'),
        boysScore: document.getElementById('boys-score'),
        girlsRoundsCount: document.getElementById('girls-rounds-count'),
        boysRoundsCount: document.getElementById('boys-rounds-count'),
        manualControls: document.querySelectorAll('.manual-controls button'),
        roundControls: document.querySelectorAll('.round-control-btn'),
        nextQuestionBtn: document.getElementById('next-question-btn'),
        resetRoundBtn: document.getElementById('reset-round-btn'),
        newDayBtn: document.getElementById('new-day-btn'),
        
        questionModal: document.getElementById('question-modal'),
        modalQuestionArea: document.getElementById('modal-question-area'),
        modalAnswerArea: document.getElementById('modal-answer-area'),
        toggleAnswerBtn: document.getElementById('toggle-answer-btn'),
        awardButtons: document.querySelectorAll('.award-btn'),
        
        supporterModal: document.getElementById('supporter-modal'),
        addSupporterBtn: document.getElementById('add-supporter-btn'),
        supporterForm: document.getElementById('supporter-form'),
        girlsSupportersList: document.getElementById('girls-supporters'),
        boysSupportersList: document.getElementById('boys-supporters'),

        celebrationOverlay: document.getElementById('celebration-overlay'),
        countdownContainer: document.getElementById('countdown-container'),
        winnerContainer: document.getElementById('winner-container'),
        countdownTimer: document.getElementById('countdown-timer'),
        winnerNameElement: document.getElementById('winner-name'),
        winnerAvatar: document.getElementById('winner-avatar'),
        stopCountdownBtn: document.getElementById('stop-countdown-btn'),
        newRoundBtnCelebration: document.getElementById('new-round-btn-celebration'),
        confettiContainer: document.getElementById('confetti-container'),

        allModals: document.querySelectorAll('.modal-overlay'),
        allCloseButtons: document.querySelectorAll('.modal-close-btn')
    };

    // --- GAME STATE ---
    let allQuestions = [];
    let availableQuestions = [];
    let countdownInterval = null;

    let state = {
        girlsScore: 0,
        boysScore: 0,
        girlsRoundsWon: 0,
        boysRoundsWon: 0,
        gameActive: true,
        usedQuestionIds: [],
        supporters: { girls: [], boys: [] }
    };

    // --- STATE MANAGEMENT ---
    function saveState() {
        localStorage.setItem('ronyGamesSession', JSON.stringify(state));
    }

    function loadState() {
        const savedState = localStorage.getItem('ronyGamesSession');
        if (savedState) {
            state = JSON.parse(savedState);
        }
    }

    // --- UI FUNCTIONS ---
    function updateScoresUI() {
        elements.girlsScore.textContent = state.girlsScore;
        elements.boysScore.textContent = state.boysScore;
    }
    
    function updateRoundsUI() {
        elements.girlsRoundsCount.textContent = state.girlsRoundsWon;
        elements.boysRoundsCount.textContent = state.boysRoundsWon;
    }

    function renderSupporters() {
        elements.girlsSupportersList.innerHTML = '<h3>👑 درع الفريق 👑</h3>';
        elements.boysSupportersList.innerHTML = '<h3>👑 درع الفريق 👑</h3>';
        state.supporters.girls.forEach(s => addSupporterToDOM(s.name, s.photo, 'girls'));
        state.supporters.boys.forEach(s => addSupporterToDOM(s.name, s.photo, 'boys'));
    }

    function updateAllUI() {
        updateScoresUI();
        updateRoundsUI();
        renderSupporters();
    }

    // --- MODAL HANDLING ---
    function showModal(modal) {
        modal.classList.remove('hidden');
    }

    function hideModal(modal) {
        modal.classList.add('hidden');
    }

    // --- GAME LOGIC ---
    function startNewRound() {
        state.girlsScore = 0;
        state.boysScore = 0;
        state.gameActive = true;
        saveState();
        updateScoresUI();
        hideModal(elements.celebrationOverlay);
    }
    
    function startNewDay() {
        if (confirm("هل أنت متأكد أنك تريد بدء يوم جديد؟ سيتم مسح جميع النقاط والجولات والأسئلة المستخدمة.")) {
            localStorage.removeItem('ronyGamesSession');
            location.reload();
        }
    }

    function checkWinner() {
        if (!state.gameActive) return;
        if (state.girlsScore >= WINNING_SCORE || state.boysScore >= WINNING_SCORE) {
            state.gameActive = false;
            saveState();
            triggerWinSequence();
        }
    }

    function triggerWinSequence() {
        showModal(elements.celebrationOverlay);
        elements.countdownContainer.classList.remove('hidden');
        elements.winnerContainer.classList.add('hidden');
        let countdown = 30;
        elements.countdownTimer.textContent = countdown;
        
        countdownInterval = setInterval(() => {
            countdown--;
            elements.countdownTimer.textContent = countdown;
            if (countdown <= 0) {
                clearInterval(countdownInterval);
                showWinner();
            }
        }, 1000);
    }

    function showWinner() {
        elements.countdownContainer.classList.add('hidden');
        elements.winnerContainer.classList.remove('hidden');
        
        const winner = state.girlsScore >= WINNING_SCORE ? "البنات" : "الشباب";
        const winnerColor = winner === "البنات" ? 'var(--girls-color)' : 'var(--boys-color)';
        const winnerAvatarSrc = document.querySelector(winner === "البنات" ? '#girls-card .team-avatar' : '#boys-card .team-avatar').src;

        if (winner === "البنات") {
            state.girlsRoundsWon++;
        } else {
            state.boysRoundsWon++;
        }
        
        updateRoundsUI();
        saveState();

        elements.winnerNameElement.textContent = winner;
        elements.winnerNameElement.style.color = winnerColor;
        elements.winnerAvatar.src = winnerAvatarSrc;
        
        launchConfetti();
    }
    
    function launchConfetti() {
        elements.confettiContainer.innerHTML = '';
        const confettiCount = 100;
        const colors = [ 'var(--girls-color)', 'var(--boys-color)', 'var(--gold-color)', '#ffffff'];
        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            if (Math.random() > 0.5) confetti.classList.add('triangle');
            
            confetti.style.left = `${Math.random() * 100}vw`;
            confetti.style.animationDelay = `${Math.random() * 5}s`;
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            if (confetti.classList.contains('triangle')) {
                 confetti.style.borderBottomColor = color;
            } else {
                confetti.style.backgroundColor = color;
            }
            elements.confettiContainer.appendChild(confetti);
        }
    }

    function addSupporterToDOM(name, photoDataUrl, team) {
        const supporterCard = document.createElement('div');
        supporterCard.className = 'supporter-card';
        supporterCard.innerHTML = `<img src="${photoDataUrl}" alt="${name}"><p>👑 ${name}</p>`;
        const list = team === 'girls' ? elements.girlsSupportersList : elements.boysSupportersList;
        list.appendChild(supporterCard);
    }

    // --- EVENT LISTENERS ---
    elements.nextQuestionBtn.addEventListener('click', () => {
        if (!state.gameActive) return;
        if (availableQuestions.length === 0) {
            alert("انتهت جميع الأسئلة المتاحة لهذا اليوم!");
            return;
        }
        
        const randomIndex = Math.floor(Math.random() * availableQuestions.length);
        const currentQuestion = availableQuestions[randomIndex];
        
        availableQuestions.splice(randomIndex, 1);
        state.usedQuestionIds.push(currentQuestion.id);
        saveState();
        
        elements.modalQuestionArea.innerHTML = '';
        if (currentQuestion.question_text) {
            const textElement = document.createElement('p');
            textElement.textContent = currentQuestion.question_text;
            elements.modalQuestionArea.appendChild(textElement);
        }
        if (currentQuestion.type === 'image' && currentQuestion.image_url) {
            const imgElement = document.createElement('img');
            imgElement.src = currentQuestion.image_url;
            elements.modalQuestionArea.appendChild(imgElement);
        }

        elements.modalAnswerArea.textContent = currentQuestion.answer;
        elements.modalAnswerArea.classList.add('hidden');
        elements.toggleAnswerBtn.textContent = "إظهار الإجابة";

        showModal(elements.questionModal);
    });

    elements.awardButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            if (!state.gameActive) return;
            const winningTeam = event.target.dataset.team;
            if (winningTeam === 'girls') state.girlsScore++;
            else if (winningTeam === 'boys') state.boysScore++;
            
            saveState();
            updateScoresUI();
            checkWinner();
            hideModal(elements.questionModal);
        });
    });
    
    elements.manualControls.forEach(button => {
        button.addEventListener('click', (e) => {
            if (!state.gameActive) return;
            const team = e.target.dataset.team;
            const action = e.target.dataset.action;
            if (team === 'girls') {
                if (action === 'add') state.girlsScore++;
                else if (state.girlsScore > 0) state.girlsScore--;
            } else {
                if (action === 'add') state.boysScore++;
                else if (state.boysScore > 0) state.boysScore--;
            }
            saveState();
            updateScoresUI();
            checkWinner();
        });
    });

    elements.roundControls.forEach(button => {
        button.addEventListener('click', (e) => {
            const team = e.target.dataset.team;
            const isAdd = e.target.classList.contains('add-round-btn');
            if(team === 'girls') {
                if (isAdd) state.girlsRoundsWon++;
                else if (state.girlsRoundsWon > 0) state.girlsRoundsWon--;
            } else {
                if (isAdd) state.boysRoundsWon++;
                else if (state.boysRoundsWon > 0) state.boysRoundsWon--;
            }
            saveState();
            updateRoundsUI();
        });
    });
    
    elements.supporterForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const supporterName = document.getElementById('supporter-name').value;
        const supporterPhotoInput = document.getElementById('supporter-photo');
        const selectedTeam = document.querySelector('input[name="team"]:checked').value;
        
        if (supporterPhotoInput.files && supporterPhotoInput.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const photoDataUrl = e.target.result;
                addSupporterToDOM(supporterName, photoDataUrl, selectedTeam);
                
                state.supporters[selectedTeam].push({name: supporterName, photo: photoDataUrl});
                saveState();

                hideModal(elements.supporterModal);
                elements.supporterForm.reset();
            };
            reader.readAsDataURL(supporterPhotoInput.files[0]);
        }
    });

    // General Modal Controls
    elements.toggleAnswerBtn.addEventListener('click', () => {
        elements.modalAnswerArea.classList.toggle('hidden');
        elements.toggleAnswerBtn.textContent = elements.modalAnswerArea.classList.contains('hidden') ? "إظهار الإجابة" : "إخفاء الإجابة";
    });
    elements.addSupporterBtn.addEventListener('click', () => showModal(elements.supporterModal));
    elements.allCloseButtons.forEach(btn => btn.addEventListener('click', () => elements.allModals.forEach(hideModal)));
    elements.allModals.forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideModal(modal);
            }
        });
    });

    // Game Flow Buttons
    elements.resetRoundBtn.addEventListener('click', startNewRound);
    elements.newRoundBtnCelebration.addEventListener('click', startNewRound);
    elements.newDayBtn.addEventListener('click', startNewDay);
    elements.stopCountdownBtn.addEventListener('click', () => {
        clearInterval(countdownInterval);
        hideModal(elements.celebrationOverlay);
        state.gameActive = true;
        saveState();
    });


    // --- INITIALIZATION ---
    async function initializeGame() {
        loadState();
        updateAllUI();

        try {
            const response = await fetch(GOOGLE_SHEET_URL);
            if (!response.ok) throw new Error('Network response was not ok');
            const csvData = await response.text();
            
            const lines = csvData.trim().split('\n');
            const headers = lines[0].split(',').map(h => h.trim());
            
            allQuestions = lines.slice(1).map(line => {
                const values = line.split(',');
                let obj = {};
                headers.forEach((header, index) => {
                    obj[header] = values[index] ? values[index].trim() : '';
                });
                return obj;
            });
            
            availableQuestions = allQuestions.filter(q => !state.usedQuestionIds.includes(q.id));
            console.log(`تم تحميل ${allQuestions.length} سؤالاً، ومتاح منها ${availableQuestions.length} سؤالاً.`);
        } catch (error) {
            console.error('فشل في تحميل أو تحليل بنك الأسئلة:', error);
            document.body.innerHTML = '<h1>حدث خطأ فادح أثناء تحميل بنك الأسئلة. تأكد من صحة الرابط ومن وجود اتصال بالإنترنت.</h1>';
        }
    }

    initializeGame();
});
