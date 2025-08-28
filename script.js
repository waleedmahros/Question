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
    click: new Audio('sounds/click.mp3'), modal: new Audio('sounds/modal.mp3'),
    point: new Audio('sounds/point.mp3'), win: new Audio('sounds/win.mp3'),
    countdown: new Audio('sounds/countdown.mp3'), supporter: new Audio('sounds/supporter.mp3'),
    card_reveal: new Audio('sounds/card_reveal.mp3'), positive_effect: new Audio('sounds/positive_effect.mp3'),
    negative_effect: new Audio('sounds/negative_effect.mp3'), sparkle: new Audio('sounds/sparkle.mp3')
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
    awardButtons: document.querySelectorAll('.award-btn'),
    celebrationOverlay: document.getElementById('celebration-overlay'), countdownContainer: document.getElementById('countdown-container'),
    countdownText: document.getElementById('countdown-text'), winnerContainer: document.getElementById('winner-container'), countdownTimer: document.getElementById('countdown-timer'),
    winnerNameElement: document.getElementById('winner-name'), winnerAvatar: document.getElementById('winner-avatar'),
    stopCountdownBtn: document.getElementById('stop-countdown-btn'), newRoundBtnCelebration: document.getElementById('new-round-btn-celebration'),
    allModals: document.querySelectorAll('.modal-overlay'),
    allCloseButtons: document.querySelectorAll('.modal-close-btn'),
    cardVaultModal: document.getElementById('card-vault-modal'), cardGrid: document.getElementById('card-grid'),
    revealCardModal: document.getElementById('reveal-card-modal'), revealCardTitle: document.getElementById('reveal-card-title'),
    revealCardDescription: document.getElementById('reveal-card-description'), revealCardConfirmBtn: document.getElementById('reveal-card-confirm-btn'),
    chooseTeamModal: document.getElementById('choose-team-modal'),
};

// --- GAME STATE & CORE LOGIC ---
let allQuestions = [], allCards = [];
let availableQuestions = [];
let countdownInterval = null;
let state = {};

function resetState(fullReset = false) {
    const oldRounds = fullReset ? { g: 0, b: 0 } : { g: state.girlsRoundsWon || 0, b: state.boysRoundsWon || 0 };
    state = {
        girlsScore: 0, boysScore: 0,
        girlsRoundsWon: oldRounds.g, boysRoundsWon: oldRounds.b,
        gameActive: true, countdownActive: false,
        usedQuestionIds: fullReset ? [] : state.usedQuestionIds || [],
        questionNumber: 0, shuffledCards: {}, usedCardNumbers: [],
        activeEffects: { girls: {}, boys: {} },
        veto: { girls: false, boys: false }, lastNegativeEffect: null
    };
}

function saveState() { try { localStorage.setItem('ronyGamesV2', JSON.stringify(state)); } catch (e) { console.error("Failed to save state:", e); } }
function loadState() { const s = localStorage.getItem('ronyGamesV2'); if (s) { state = JSON.parse(s); } else { resetState(true); } }
function updateScoresUI() { if(elements.girlsScore) elements.girlsScore.textContent = state.girlsScore; if(elements.boysScore) elements.boysScore.textContent = state.boysScore; }
function updateRoundsUI() { if(elements.girlsRoundsCount) elements.girlsRoundsCount.textContent = state.girlsRoundsWon; if(elements.boysRoundsCount) elements.boysRoundsCount.textContent = state.boysRoundsWon; }
function updateAllUI() { updateScoresUI(); updateRoundsUI(); updateVisualAids(); }
function showModal(modal) { if (modal) { playSound('modal'); modal.classList.remove('hidden'); } }
function hideModal(modal) { if (modal) { playSound('modal'); modal.classList.add('hidden'); } }
function hideAllModals() {
    stopSound('countdown');
    if (elements.allModals) elements.allModals.forEach(modal => modal.classList.add('hidden'));
}

function addPoints(team, points, isQuestion = false) {
    if (state.countdownActive && points > 0) return;
    const opponent = team === 'girls' ? 'boys' : 'girls';
    let totalPointsToAdd = points;
    if (isQuestion) {
        if (state.activeEffects[team]?.double_next_q > 0) { totalPointsToAdd *= 2; state.activeEffects[team].double_next_q = 0; }
    }
    if (totalPointsToAdd > 0 && state.activeEffects[team]?.freeze > 0) return;
    if (totalPointsToAdd > 0 && state.activeEffects[team]?.sabotage > 0) { totalPointsToAdd = Math.floor(totalPointsToAdd / 2); }
    const newScore = state[`${team}Score`] + totalPointsToAdd;
    state[`${team}Score`] = newScore;
    updateScoresUI();
    if (newScore >= WINNING_SCORE && state.gameActive) { checkWinner(); }
    saveState();
}

function startNewRound() { playSound('click'); resetState(false); if(allCards.length > 0) shuffleAndPrepareCards(); updateAllUI(); if(elements.celebrationOverlay) hideModal(elements.celebrationOverlay); saveState(); }
function startNewDay() { playSound('click'); if (confirm("هل أنت متأكد؟ سيتم مسح كل شيء.")) { localStorage.removeItem('ronyGamesV2'); resetState(true); location.reload(); } }

function checkWinner() {
    if (state.countdownActive || !state.gameActive) return;
    if (state.girlsScore >= WINNING_SCORE || state.boysScore >= WINNING_SCORE) {
        state.gameActive = false; state.countdownActive = true;
        saveState();
        triggerWinSequence();
    }
}

function triggerWinSequence(isSettled = false, settledTeam = null) {
    if (!elements.celebrationOverlay) return;
    showModal(elements.celebrationOverlay);
    elements.winnerContainer.classList.add('hidden');
    elements.countdownContainer.classList.remove('hidden');
    elements.countdownText.textContent = isSettled ? `سيتم حسم الجولة لصالح فريق ${settledTeam === 'girls' ? 'البنات' : 'الشباب'}!` : 'فرصة أخيرة لدعم الفريق!';
    playSound('countdown');
    let count = 30;
    elements.countdownTimer.textContent = count;
    countdownInterval = setInterval(() => {
        count--;
        elements.countdownTimer.textContent = count;
        if (count <= 0) {
            clearInterval(countdownInterval);
            stopSound('countdown');
            isSettled ? finalizeRound(settledTeam) : showWinner();
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
    elements.winnerNameElement.textContent = winnerName;
    elements.winnerAvatar.src = document.querySelector(`#${winnerTeam}-card .team-avatar`).src;
    elements.countdownContainer.classList.add('hidden');
    elements.winnerContainer.classList.remove('hidden');
}

function shuffleAndPrepareCards() { let s = [...allCards].sort(() => 0.5 - Math.random()); state.shuffledCards = {}; for (let i = 0; i < s.length; i++) { state.shuffledCards[i + 1] = s[i]; } state.usedCardNumbers = []; }
function displayCardVault(winningTeam) { if (!elements.cardVaultModal) return; hideAllModals(); elements.cardGrid.innerHTML = ''; for (let i = 1; i <= allCards.length; i++) { const c = document.createElement('button'); c.className = 'card-button'; c.textContent = i; if (state.usedCardNumbers.includes(i)) { c.classList.add('used'); c.disabled = true; } c.addEventListener('click', () => handleCardClick(i, winningTeam)); elements.cardGrid.appendChild(c); } showModal(elements.cardVaultModal); }
function handleCardClick(cardNumber, winningTeam) { playSound('card_reveal'); const effect = state.shuffledCards[cardNumber]; elements.revealCardTitle.textContent = effect.Card_Title; elements.revealCardDescription.textContent = effect.Card_Description; elements.revealCardConfirmBtn.onclick = () => { state.usedCardNumbers.push(cardNumber); hideModal(elements.revealCardModal); applyCardEffect(effect, winningTeam); }; hideModal(elements.cardVaultModal); showModal(elements.revealCardModal); }
function applyCardEffect(effect, team) { /* ... Your full applyCardEffect logic ... */ updateAllUI(); saveState(); }
function updateVisualAids() { /* ... Your full updateVisualAids logic ... */ }

async function initializeGame() {
    loadState();
    updateAllUI();
    attachEventListeners();
    try {
        const [qRes, cRes] = await Promise.all([fetch(QUESTIONS_SHEET_URL), fetch(CARDS_SHEET_URL)]);
        if (!qRes.ok || !cRes.ok) throw new Error('Network response was not ok');
        const qData = await qRes.json();
        const cData = await cRes.json();
        allQuestions = (qData.values || []).slice(1).map(r => ({ id: r[0], q: r[2], a: r[4] })).filter(i => i.id);
        allCards = (cData.values || []).slice(1).map(r => ({ Card_Title: r[0], Card_Description: r[1], Effect_Type: r[2], Effect_Value: r[3], Target: r[4] })).filter(i => i.Card_Title);
        availableQuestions = allQuestions.filter(q => !state.usedQuestionIds.includes(q.id));
        if (allCards.length > 0) shuffleAndPrepareCards();
    } catch (error) { document.body.innerHTML = `<h1>فشل تحميل بيانات اللعبة</h1><p>${error.message}</p>`; }
}

// ############### The Robust Event Listeners ###############
function attachEventListeners() {
    if (elements.nextQuestionBtn) elements.nextQuestionBtn.addEventListener('click', () => {
        if (!state.gameActive) { alert("الجولة متوقفة!"); return; }
        if (availableQuestions.length === 0) { alert("انتهت الأسئلة!"); return; }
        playSound('click');
        state.questionNumber++;
        const randIdx = Math.floor(Math.random() * availableQuestions.length);
        const question = availableQuestions.splice(randIdx, 1)[0];
        state.usedQuestionIds.push(question.id);
        elements.modalQuestionArea.innerHTML = `<p>${question.q || ''}</p>`;
        elements.modalAnswerArea.textContent = question.a;
        elements.modalAnswerArea.classList.add('hidden');
        elements.toggleAnswerBtn.textContent = "إظهار الإجابة";
        showModal(elements.questionModal);
        saveState();
    });

    if (elements.awardButtons) elements.awardButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            if (!state.gameActive) return;
            const winningTeam = event.target.dataset.team;
            playSound('point');
            hideModal(elements.questionModal);
            addPoints(winningTeam, QUESTION_POINTS, true);
            if (state.questionNumber % 2 === 0 && !state.countdownActive) {
                displayCardVault(winningTeam);
            }
        });
    });

    if (elements.manualControls) elements.manualControls.forEach(button => {
        button.addEventListener('click', e => {
            const team = e.target.dataset.team;
            const action = e.target.dataset.action;
            const points = action === 'add' ? MANUAL_POINTS_STEP : -MANUAL_POINTS_STEP;
            if (!state.gameActive && action === 'add') return;
            playSound('click');
            addPoints(team, points, false);
        });
    });

    if (elements.stopCountdownBtn) elements.stopCountdownBtn.addEventListener('click', () => {
        playSound('click');
        clearInterval(countdownInterval);
        stopSound('countdown');
        hideModal(elements.celebrationOverlay);
        state.gameActive = true; state.countdownActive = false;
        saveState();
    });
    
    // Add other listeners with checks
    if (elements.resetRoundBtn) elements.resetRoundBtn.addEventListener('click', startNewRound);
    if (elements.newDayBtn) elements.newDayBtn.addEventListener('click', startNewDay);
    if (elements.newRoundBtnCelebration) elements.newRoundBtnCelebration.addEventListener('click', startNewRound);
    if (elements.toggleAnswerBtn) elements.toggleAnswerBtn.addEventListener('click', () => { elements.modalAnswerArea.classList.toggle('hidden'); });
    if (elements.settleRoundBtn) elements.settleRoundBtn.addEventListener('click', () => { if(state.gameActive) showModal(elements.chooseTeamModal); });
    if (elements.chooseTeamModal) elements.chooseTeamModal.querySelectorAll('.award-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const team = e.target.dataset.team;
            hideModal(elements.chooseTeamModal);
            if (state.gameActive) triggerWinSequence(true, team);
        });
    });
    if (elements.allCloseButtons) elements.allCloseButtons.forEach(btn => {
        btn.addEventListener('click', () => hideAllModals());
    });
}

// --- INITIALIZE ---
initializeGame();
