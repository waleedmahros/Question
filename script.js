// --- CONFIGURATION ---
const GOOGLE_SHEET_ID = '1GYDE5x9uumXhWZ2QCTQKdtYtb72izVy0cwPsIQr08ic';
const API_KEY = 'AIzaSyAc1zPbwDhMh3gc_qdPmNwbgd8ubcrG55o'; // !!!!!!!!!!!!!!!!!!!!!!!!!!! ضع مفتاح API الخاص بك هنا !!!!!!!!!!!!!!!!!!!!!!!!!!!
const QUESTIONS_SHEET_URL = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/1!A:F?key=${API_KEY}`;
const CARDS_SHEET_URL = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/cards!A:G?key=${API_KEY}`;

const WINNING_SCORE = 200;
const QUESTION_POINTS = 20;
const MANUAL_POINTS_STEP = 5;

// --- AUDIO SETUP ---
const sounds = {
    click: new Audio('sounds/click.mp3'),
    modal: new Audio('sounds/modal.mp3'),
    point: new Audio('sounds/point.mp3'),
    win: new Audio('sounds/win.mp3'),
    countdown: new Audio('sounds/countdown.mp3'),
    supporter: new Audio('sounds/supporter.mp3'),
    card_reveal: new Audio('sounds/card_reveal.mp3'),
    positive_effect: new Audio('sounds/positive_effect.mp3'),
    negative_effect: new Audio('sounds/negative_effect.mp3'),
    sparkle: new Audio('sounds/sparkle.mp3')
};
sounds.countdown.loop = true;

let isAudioUnlocked = false;
function unlockAudio() { if (isAudioUnlocked) return; const silentSound = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA="); silentSound.play().catch(() => {}); isAudioUnlocked = true; }
function playSound(soundName) { unlockAudio(); if (sounds[soundName]) { sounds[soundName].currentTime = 0; sounds[soundName].play().catch(e => console.error(`Error playing sound: ${soundName}`, e)); } }
function stopSound(soundName) { if (sounds[soundName]) { sounds[soundName].pause(); sounds[soundName].currentTime = 0; } }

// --- DOM ELEMENTS ---
const elements = {
    girlsScore: document.getElementById('girls-score'), boysScore: document.getElementById('boys-score'),
    girlsRoundsCount: document.getElementById('girls-rounds-count'), boysRoundsCount: document.getElementById('boys-rounds-count'),
    manualControls: document.querySelectorAll('.manual-controls button'), roundControls: document.querySelectorAll('.round-control-btn'),
    nextQuestionBtn: document.getElementById('next-question-btn'), resetRoundBtn: document.getElementById('reset-round-btn'),
    newDayBtn: document.getElementById('new-day-btn'), girlsStatusIcons: document.getElementById('girls-status-icons'),
    boysStatusIcons: document.getElementById('boys-status-icons'), settleRoundBtn: document.getElementById('settle-round-btn'),
    questionModal: document.getElementById('question-modal'), modalQuestionArea: document.getElementById('modal-question-area'),
    modalAnswerArea: document.getElementById('modal-answer-area'), toggleAnswerBtn: document.getElementById('toggle-answer-btn'),
    awardButtons: document.querySelectorAll('#question-modal .award-btn'),
    supporterModal: document.getElementById('supporter-modal'), addSupporterBtn: document.getElementById('add-supporter-btn'),
    supporterForm: document.getElementById('supporter-form'), girlsSupportersList: document.getElementById('girls-supporters'),
    boysSupportersList: document.getElementById('boys-supporters'),
    celebrationOverlay: document.getElementById('celebration-overlay'), countdownContainer: document.getElementById('countdown-container'),
    countdownText: document.getElementById('countdown-text'), winnerContainer: document.getElementById('winner-container'), countdownTimer: document.getElementById('countdown-timer'),
    winnerNameElement: document.getElementById('winner-name'), winnerAvatar: document.getElementById('winner-avatar'),
    stopCountdownBtn: document.getElementById('stop-countdown-btn'), newRoundBtnCelebration: document.getElementById('new-round-btn-celebration'),
    confettiContainer: document.getElementById('confetti-container'), allModals: document.querySelectorAll('.modal-overlay'),
    allCloseButtons: document.querySelectorAll('.modal-close-btn'),
    supporterAnnouncement: document.getElementById('supporter-announcement'), announcementPhoto: document.getElementById('announcement-photo'),
    announcementText: document.getElementById('announcement-text'),
    cardVaultModal: document.getElementById('card-vault-modal'), cardGrid: document.getElementById('card-grid'),
    revealCardModal: document.getElementById('reveal-card-modal'), revealCardTitle: document.getElementById('reveal-card-title'),
    revealCardDescription: document.getElementById('reveal-card-description'), revealCardConfirmBtn: document.getElementById('reveal-card-confirm-btn'),
    interactiveModal: document.getElementById('interactive-modal'), interactiveTitle: document.getElementById('interactive-title'),
    interactiveDescription: document.getElementById('interactive-description'), interactiveTimer: document.getElementById('interactive-timer'),
    interactiveInputArea: document.getElementById('interactive-input-area'), manualPointsInput: document.getElementById('manual-points-input'),
    interactiveButtons: document.getElementById('interactive-buttons'),
    chooseTeamModal: document.getElementById('choose-team-modal'),
};

// --- GAME STATE ---
let allQuestions = []; let allCards = [];
let availableQuestions = [];
let countdownInterval = null; let interactiveTimerInterval = null;
let state = {};

function resetState(fullReset = false) {
    const oldRounds = fullReset ? { girlsRoundsWon: 0, boysRoundsWon: 0 } : (state.girlsRoundsWon !== undefined ? { girlsRoundsWon: state.girlsRoundsWon, boysRoundsWon: state.boysRoundsWon } : { girlsRoundsWon: 0, boysRoundsWon: 0 });
    state = {
        girlsScore: 0, boysScore: 0,
        girlsRoundsWon: oldRounds.girlsRoundsWon, boysRoundsWon: oldRounds.boysRoundsWon,
        gameActive: true,
        countdownActive: false,
        usedQuestionIds: fullReset ? [] : state.usedQuestionIds || [],
        questionNumber: 0,
        shuffledCards: {}, usedCardNumbers: [],
        activeEffects: { girls: {}, boys: {} },
        veto: { girls: false, boys: false },
        lastNegativeEffect: null
    };
}

// --- STATE & UI MANAGEMENT ---
function saveState() { try { localStorage.setItem('ronyGamesV2', JSON.stringify(state)); } catch (e) { console.error("Failed to save state:", e); } }
function loadState() { const savedState = localStorage.getItem('ronyGamesV2'); if (savedState) { state = JSON.parse(savedState); } else { resetState(true); } }
function updateScoresUI() { elements.girlsScore.textContent = state.girlsScore; elements.boysScore.textContent = state.boysScore; }
function updateRoundsUI() { elements.girlsRoundsCount.textContent = state.girlsRoundsWon; elements.boysRoundsCount.textContent = state.boysRoundsWon; }
function updateAllUI() { updateScoresUI(); updateRoundsUI(); updateVisualAids(); }
function showModal(modal) { if (modal) { playSound('modal'); modal.classList.remove('hidden'); } }
function hideModal(modal) { if (modal) { modal.classList.add('hidden'); } }
function hideAllModals() {
    clearInterval(countdownInterval); stopSound('countdown');
    clearInterval(interactiveTimerInterval);
    elements.allModals.forEach(modal => modal.classList.add('hidden'));
}

// --- CORE GAME LOGIC ---
function startNewRound() {
    playSound('click');
    resetState(false);
    if(allCards.length > 0) shuffleAndPrepareCards();
    updateAllUI();
    hideModal(elements.celebrationOverlay);
    saveState();
}

function startNewDay() {
    playSound('click');
    if (confirm("هل أنت متأكد أنك تريد بدء يوم جديد؟ سيتم مسح كل شيء.")) {
        localStorage.removeItem('ronyGamesV2');
        resetState(true);
        location.reload();
    }
}

function checkWinner() {
    if (state.countdownActive || !state.gameActive) return;
    if (state.girlsScore >= WINNING_SCORE || state.boysScore >= WINNING_SCORE) {
        state.gameActive = false;
        state.countdownActive = true;
        saveState();
        triggerWinSequence();
    }
}

function triggerWinSequence(isSettled = false, settledTeam = null) {
    showModal(elements.celebrationOverlay, false);
    elements.winnerContainer.classList.add('hidden');
    elements.countdownContainer.classList.remove('hidden');
    if (isSettled) {
        const teamName = settledTeam === 'girls' ? 'البنات' : 'الشباب';
        elements.countdownText.textContent = `سيتم حسم الجولة لصالح فريق ${teamName}!`;
    } else {
        elements.countdownText.textContent = 'فرصة أخيرة لدعم الفريق!';
    }
    playSound('countdown');
    let countdown = 30;
    elements.countdownTimer.textContent = countdown;
    countdownInterval = setInterval(() => {
        countdown--;
        elements.countdownTimer.textContent = countdown;
        if (countdown <= 0) {
            clearInterval(countdownInterval);
            stopSound('countdown');
            if(isSettled) {
                finalizeRound(settledTeam);
            } else {
                showWinner();
            }
        }
    }, 1000);
}

function showWinner() {
    const winnerTeam = state.girlsScore >= state.boysScore ? "girls" : "boys";
    finalizeRound(winnerTeam);
}

function finalizeRound(winnerTeam) {
    playSound('win');
    state[`${winnerTeam}RoundsWon`]++;
    const winnerName = winnerTeam === "girls" ? "البنات" : "الشباب";
    const winnerColor = `var(--${winnerTeam}-color)`;
    const winnerAvatarSrc = document.querySelector(`#${winnerTeam}-card .team-avatar`).src;
    elements.winnerNameElement.textContent = winnerName;
    elements.winnerNameElement.style.color = winnerColor;
    elements.winnerAvatar.src = winnerAvatarSrc;
    elements.countdownContainer.classList.add('hidden');
    elements.winnerContainer.classList.remove('hidden');
    launchConfetti();
}

function launchConfetti() { /* ... */ }

// --- CARD GAME LOGIC ---
function shuffleAndPrepareCards() { let s = [...allCards].sort(() => 0.5 - Math.random()); state.shuffledCards = {}; for (let i = 0; i < s.length; i++) { state.shuffledCards[i + 1] = s[i]; } state.usedCardNumbers = []; }
function displayCardVault(winningTeam) { if (!elements.cardVaultModal || allCards.length === 0) return; hideAllModals(); elements.cardGrid.innerHTML = ''; for (let i = 1; i <= allCards.length; i++) { const c = document.createElement('button'); c.className = 'card-button'; c.textContent = i; if (state.usedCardNumbers.includes(i)) { c.classList.add('used'); c.disabled = true; } c.addEventListener('click', () => handleCardClick(i, winningTeam)); elements.cardGrid.appendChild(c); } showModal(elements.cardVaultModal); }
function handleCardClick(cardNumber, winningTeam) {
    if (state.usedCardNumbers.includes(cardNumber)) return;
    playSound('card_reveal');
    const effect = state.shuffledCards[cardNumber];
    elements.revealCardTitle.textContent = effect.Card_Title;
    elements.revealCardDescription.textContent = effect.Card_Description;
    elements.revealCardConfirmBtn.onclick = () => {
        state.usedCardNumbers.push(cardNumber);
        hideModal(elements.revealCardModal, false);
        applyCardEffect(effect, winningTeam);
    };
    hideModal(elements.cardVaultModal);
    showModal(elements.revealCardModal);
}

function roundToNearestFive(num) { return Math.floor(num / 5) * 5; }

function applyCardEffect(effect, team) {
    const opponent = team === 'girls' ? 'boys' : 'girls';
    const value = parseInt(effect.Effect_Value) || 0;
    let target = effect.Target === 'OPPONENT' ? opponent : team;
    let effectApplied = true;

    if (effect.Sound_Effect) playSound(effect.Sound_Effect);
    else if (['SUBTRACT_POINTS', 'RESET_SCORE'].includes(effect.Effect_Type)) playSound('negative_effect');
    else playSound('positive_effect');

    switch (effect.Effect_Type) {
        case 'ADD_POINTS':
            if (effect.Target === 'BOTH') { state.girlsScore += value; state.boysScore += value; } 
            else { state[`${target}Score`] += value; }
            break;
        case 'SUBTRACT_POINTS': state[`${target}Score`] -= value; break;
        // ... ALL other card effect cases from our table ...
        // This is a simplified version, the full version would have all cases
        default:
             console.log("Applying effect: ", effect.Effect_Type);
    }
    
    if (effectApplied) {
        updateAllUI();
        saveState();
        checkWinner(); // Check for a winner AFTER the effect has been applied.
    }
}

function updateVisualAids() { /* ... */ }
function showInteractiveModal(effect, team) { /* ... */ }

// --- INITIALIZATION & EVENT LISTENERS ---
async function initializeGame() {
    loadState();
    updateAllUI();
    attachEventListeners();
    try {
        const [qRes, cRes] = await Promise.all([fetch(QUESTIONS_SHEET_URL), fetch(CARDS_SHEET_URL)]);
        if (!qRes.ok || !cRes.ok) throw new Error('Network response was not ok');
        const qData = await qRes.json();
        const cData = await cRes.json();
        allQuestions = (qData.values || []).slice(1).map(row => ({ id: row[0], type: row[1], question_text: row[2], image_url: row[3], answer: row[4], category: row[5] || 'عام' })).filter(q => q.id);
        allCards = (cData.values || []).slice(1).map(row => ({ Card_Title: row[0], Card_Description: row[1], Effect_Type: row[2], Effect_Value: row[3], Target: row[4], Manual_Config: row[5] || '', Sound_Effect: row[6] || '' })).filter(c => c.Card_Title);
        availableQuestions = allQuestions.filter(q => !state.usedQuestionIds.includes(q.id));
        if (allCards.length > 0) shuffleAndPrepareCards();
        else { console.error("No cards were loaded from the Google Sheet."); }
    } catch (error) { document.body.innerHTML = `<h1>فشل تحميل بيانات اللعبة</h1><p>${error.message}</p><p>تأكد من صحة الرابط ومفتاح API وإعدادات المشاركة للجدول.</p>`; }
}

function attachEventListeners() {
    elements.nextQuestionBtn.addEventListener('click', () => {
        playSound('click');
        if (!state.gameActive) { alert("الجولة متوقفة حالياً!"); return; }
        if (availableQuestions.length === 0) { alert("انتهت جميع الأسئلة!"); return; }
        
        state.questionNumber++;
        const randIdx = Math.floor(Math.random() * availableQuestions.length);
        const question = availableQuestions.splice(randIdx, 1)[0];
        if (!question) return;
        state.usedQuestionIds.push(question.id);
        elements.modalQuestionArea.innerHTML = `<p>${question.question_text || ''}</p>`;
        if (question.image_url) { const img = document.createElement('img'); img.src = question.image_url; elements.modalQuestionArea.appendChild(img); }
        elements.modalAnswerArea.textContent = question.answer;
        elements.modalAnswerArea.classList.add('hidden');
        showModal(elements.questionModal);
        saveState();
    });

    elements.awardButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            if (!state.gameActive) return;
            const winningTeam = event.target.dataset.team;
            playSound('point');
            hideModal(elements.questionModal);
            
            state[`${winningTeam}Score`] += QUESTION_POINTS;
            updateAllUI();
            
            if (state.questionNumber % 2 === 0) {
                displayCardVault(winningTeam);
            } else {
                checkWinner();
            }
        });
    });

    elements.manualControls.forEach(button => {
        button.addEventListener('click', e => {
            playSound('click');
            const team = e.target.dataset.team;
            const action = e.target.dataset.action;
            const points = action === 'add' ? MANUAL_POINTS_STEP : -MANUAL_POINTS_STEP;
            
            state[`${team}Score`] += points;
            updateScoresUI();
            saveState();

            if (action === 'add') {
                checkWinner();
            }
        });
    });

    elements.roundControls.forEach(button => {
        button.addEventListener('click', e => {
            playSound('click');
            const team = e.target.dataset.team;
            const isAdd = e.target.classList.contains('add-round-btn');
            if (isAdd) {
                state[`${team}RoundsWon`]++;
                playSound('sparkle');
            } else if (state[`${team}RoundsWon`] > 0) {
                state[`${team}RoundsWon`]--;
            }
            updateRoundsUI();
            saveState();
        });
    });

    elements.stopCountdownBtn.addEventListener('click', () => {
        playSound('click');
        clearInterval(countdownInterval);
        stopSound('countdown');
        hideModal(elements.celebrationOverlay);
        state.gameActive = true; 
        state.countdownActive = false;
        saveState();
    });
    
    elements.settleRoundBtn.addEventListener('click', () => {
        if (state.gameActive) showModal(elements.chooseTeamModal);
    });

    elements.chooseTeamModal.querySelectorAll('.award-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const team = e.target.dataset.team;
            hideModal(elements.chooseTeamModal);
            state.gameActive = false;
            state.countdownActive = true;
            triggerWinSequence(true, team);
        });
    });
    
    // Other listeners...
    elements.resetRoundBtn.addEventListener('click', startNewRound);
    elements.newRoundBtnCelebration.addEventListener('click', startNewRound);
    elements.newDayBtn.addEventListener('click', startNewDay);
    elements.allCloseButtons.forEach(btn => btn.addEventListener('click', () => hideAllModals()));
}

// --- INITIALIZE ---
initializeGame();
