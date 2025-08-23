// --- CONFIGURATION ---
const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQEfxl2DDK4ZY-pFgNMnNlzuXJKf9ysLh1u30CW0aukQVNJ3oEPXTMZ8S8g685fxGYmVv5lmve4ZLrN/pub?output=csv';
const WINNING_SCORE = 10;

// --- AUDIO SETUP ---
const sounds = {
    click: new Audio('Button_click.mp3'),
    modal: new Audio('modal_sound.mp3'),
    point: new Audio('Point_award.mp3'),
    win: new Audio('game_win.mp3'),
    countdown: new Audio('Countdown.mp3')
};

function playSound(sound) {
    if (sounds[sound]) {
        sounds[sound].currentTime = 0;
        sounds[sound].play().catch(e => console.error(`Could not play sound: ${sound}`, e));
    }
}

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
};

// --- STATE MANAGEMENT ---
function saveState() {
    try {
        localStorage.setItem('ronyGamesSession', JSON.stringify(state));
    } catch (e) {
        console.error("Failed to save state:", e);
    }
}

function loadState() {
    const savedState = localStorage.getItem('ronyGamesSession');
    if (savedState) {
        Object.assign(state, JSON.parse(savedState));
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
function updateAllUI() {
    updateScoresUI();
    updateRoundsUI();
}

// --- MODAL HANDLING ---
function showModal(modal) {
    playSound('modal');
    modal.classList.remove('hidden');
}
function hideModal(modal) {
    playSound('modal');
    modal.classList.add('hidden');
}

// --- GAME LOGIC ---
function startNewRound() {
    playSound('click');
    state.girlsScore = 0;
    state.boysScore = 0;
    state.gameActive = true;
    saveState();
    updateScoresUI();
    hideModal(elements.celebrationOverlay);
}

function startNewDay() {
    playSound('click');
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
        showWinner();
    }
}

function showWinner() {
    playSound('win');
    const winner = state.girlsScore >= WINNING_SCORE ? "البنات" : "الشباب";
    const winnerColor = winner === "البنات" ? 'var(--girls-color)' : 'var(--boys-color)';
    const winnerAvatarSrc = document.querySelector(winner === "البنات" ? '#girls-card .team-avatar' : '#boys-card .team-avatar').src;

    if (winner === "البنات") state.girlsRoundsWon++;
    else state.boysRoundsWon++;
    
    updateRoundsUI();
    saveState();

    elements.winnerNameElement.textContent = winner;
    elements.winnerNameElement.style.color = winnerColor;
    elements.winnerAvatar.src = winnerAvatarSrc;
    
    elements.winnerContainer.classList.remove('hidden');
    elements.countdownContainer.classList.add('hidden'); // Hide countdown just in case
    showModal(elements.celebrationOverlay);
    launchConfetti();
}

function launchConfetti() {
    elements.confettiContainer.innerHTML = '';
    const confettiCount = 100;
    const colors = ['#ff478a', '#00e1ff', '#ffd700', '#ffffff'];
    for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = `${Math.random() * 100}vw`;
        confetti.style.animationDelay = `${Math.random() * 2}s`;
        confetti.style.animationDuration = `${3 + Math.random() * 2}s`;
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
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

// --- EVENT LISTENERS ATTACHMENT ---
function attachEventListeners() {
    elements.nextQuestionBtn.addEventListener('click', () => {
        playSound('click');
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
            playSound('point');
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
            playSound('click');
            const team = e.target.dataset.team;
            const action = e.target.dataset.action;
            if (state.gameActive) {
                if (team === 'girls') {
                    if (action === 'add') state.girlsScore++;
                    else if (state.girlsScore > 0) state.girlsScore--;
                } else {
                    if (action === 'add') state.boysScore++;
                    else if (state.boysScore > 0) state.boysScore--;
                }
                if (action === 'add') playSound('point');
                saveState();
                updateScoresUI();
                checkWinner();
            }
        });
    });

    elements.roundControls.forEach(button => {
        button.addEventListener('click', (e) => {
            playSound('click');
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
        playSound('click');
        const supporterName = document.getElementById('supporter-name').value;
        const supporterPhotoInput = document.getElementById('supporter-photo');
        const selectedTeam = document.querySelector('input[name="team"]:checked').value;
        
        if (supporterPhotoInput.files && supporterPhotoInput.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const photoDataUrl = e.target.result;
                addSupporterToDOM(supporterName, photoDataUrl, selectedTeam);
                hideModal(elements.supporterModal);
                elements.supporterForm.reset();
            };
            reader.readAsDataURL(supporterPhotoInput.files[0]);
        }
    });

    elements.toggleAnswerBtn.addEventListener('click', () => playSound('click'));
    
    elements.addSupporterBtn.addEventListener('click', () => {
        playSound('click');
        showModal(elements.supporterModal);
    });
    
    elements.allCloseButtons.forEach(btn => btn.addEventListener('click', () => elements.allModals.forEach(hideModal)));
    
    elements.allModals.forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideModal(modal);
            }
        });
    });

    elements.resetRoundBtn.addEventListener('click', startNewRound);
    elements.newRoundBtnCelebration.addEventListener('click', startNewRound);
    elements.newDayBtn.addEventListener('click', startNewDay);
}

// --- INITIALIZATION ---
async function initializeGame() {
    loadState();
    updateAllUI();
    attachEventListeners(); // Attach main listeners immediately

    try {
        const response = await fetch(GOOGLE_SHEET_URL);
        if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
        const csvData = await response.text();
        
        const lines = csvData.trim().split(/\r\n|\n/).slice(1); // Handle both Windows and Unix line endings
        
        allQuestions = lines.map(line => {
            const values = line.split(',');
            return { id: values[0], type: values[1], question_text: values[2], image_url: values[3], answer: values[4], category: values[5] };
        }).filter(q => q.id);
        
        availableQuestions = allQuestions.filter(q => !state.usedQuestionIds.includes(q.id));
        console.log(`تم تحميل ${allQuestions.length} سؤالاً، ومتاح منها ${availableQuestions.length} سؤالاً.`);
        
    } catch (error) {
        console.error('فشل في تحميل أو تحليل بنك الأسئلة:', error);
        document.body.innerHTML = `<h1>فشل تحميل بنك الأسئلة</h1><p>تأكد من صحة الرابط وأن جدول البيانات منشور على الويب.</p><p>تفاصيل الخطأ: ${error.message}</p>`;
    }
}

initializeGame();
