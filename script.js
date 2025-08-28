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
    boysStatusIcons: document.getElementById('boys-status-icons'),
    questionModal: document.getElementById('question-modal'), modalQuestionArea: document.getElementById('modal-question-area'),
    modalAnswerArea: document.getElementById('modal-answer-area'), toggleAnswerBtn: document.getElementById('toggle-answer-btn'),
    awardButtons: document.querySelectorAll('.award-btn'),
    supporterModal: document.getElementById('supporter-modal'), addSupporterBtn: document.getElementById('add-supporter-btn'),
    supporterForm: document.getElementById('supporter-form'), girlsSupportersList: document.getElementById('girls-supporters'),
    boysSupportersList: document.getElementById('boys-supporters'),
    celebrationOverlay: document.getElementById('celebration-overlay'), countdownContainer: document.getElementById('countdown-container'),
    winnerContainer: document.getElementById('winner-container'), countdownTimer: document.getElementById('countdown-timer'),
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
};

// --- GAME STATE ---
let allQuestions = []; let allCards = [];
let availableQuestions = [];
let countdownInterval = null; let interactiveTimerInterval = null;
let state = {};

function resetState(fullReset = false) {
    const oldRounds = fullReset ? { girlsRoundsWon: 0, boysRoundsWon: 0 } : { girlsRoundsWon: state.girlsRoundsWon, boysRoundsWon: state.boysRoundsWon };
    state = {
        girlsScore: 0, boysScore: 0,
        girlsRoundsWon: oldRounds.girlsRoundsWon,
        boysRoundsWon: oldRounds.boysRoundsWon,
        gameActive: true,
        usedQuestionIds: fullReset ? [] : state.usedQuestionIds,
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
function showModal(modal, playSnd = true) { if (playSnd) playSound('modal'); modal.classList.remove('hidden'); }
function hideModal(modal, playSnd = true) { if (playSnd) playSound('modal'); modal.classList.add('hidden'); }
function hideAllModals() { elements.allModals.forEach(modal => modal.classList.add('hidden')); }

// --- CORE GAME LOGIC ---
function startNewRound() {
    playSound('click');
    resetState(false); // Resets scores and effects, but keeps rounds won
    shuffleAndPrepareCards();
    updateAllUI();
    hideModal(elements.celebrationOverlay, false);
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

function addPoints(team, points, isQuestion = false) {
    if (!state.gameActive) return;
    const opponent = team === 'girls' ? 'boys' : 'girls';
    let totalPointsToAdd = points;

    if (isQuestion) {
        if (state.activeEffects[team]?.double_next_q > 0) { totalPointsToAdd *= 2; state.activeEffects[team].double_next_q = 0; }
        if (state.activeEffects.girls?.inflation > 0) { totalPointsToAdd *= 2; }
        if (state.activeEffects[team]?.golden_goose > 0) { totalPointsToAdd += 10; }
        if (state.activeEffects[team]?.winning_streak > 0) { totalPointsToAdd += (10 * state.activeEffects[team].winning_streak); state.activeEffects[team].winning_streak++; }
        if (state.activeEffects[opponent]?.winning_streak > 0) { state.activeEffects[opponent].winning_streak = 0; }
    }

    if (totalPointsToAdd > 0 && state.activeEffects[team]?.freeze > 0) return;
    if (totalPointsToAdd > 0 && state.activeEffects[team]?.sabotage > 0) { totalPointsToAdd = Math.floor(totalPointsToAdd / 2); }
    
    if (totalPointsToAdd > 0 && state.activeEffects[opponent]?.leech > 0) {
        const leechPoints = roundToNearestFive(Math.floor(totalPointsToAdd / 2));
        state[`${opponent}Score`] += leechPoints;
    }
    
    state[`${team}Score`] += totalPointsToAdd;
    
    updateScoresUI();
    saveState();
    checkWinner();
}

function checkWinner() {
    if (!state.gameActive) return;
    if (state.girlsScore >= WINNING_SCORE || state.boysScore >= WINNING_SCORE) {
        state.gameActive = false; // Stop the game temporarily
        saveState();
        triggerWinSequence();
    }
}

function triggerWinSequence() {
    showModal(elements.celebrationOverlay, false);
    elements.winnerContainer.classList.add('hidden');
    elements.countdownContainer.classList.remove('hidden');
    
    playSound('countdown');
    let countdown = 30;
    elements.countdownTimer.textContent = countdown;
    
    countdownInterval = setInterval(() => {
        countdown--;
        elements.countdownTimer.textContent = countdown;
        if (countdown <= 0) {
            clearInterval(countdownInterval);
            stopSound('countdown');
            showWinner();
        }
    }, 1000);
}

function showWinner() {
    stopSound('countdown');
    playSound('win');
    
    const winnerTeam = state.girlsScore >= WINNING_SCORE ? "girls" : "boys";
    state[`${winnerTeam}RoundsWon`]++;
    
    updateRoundsUI();
    saveState();

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

// --- CARD GAME LOGIC ---
function shuffleAndPrepareCards() {
    let shuffled = [...allCards].sort(() => 0.5 - Math.random());
    state.shuffledCards = {};
    for (let i = 0; i < shuffled.length; i++) {
        state.shuffledCards[i + 1] = shuffled[i];
    }
    state.usedCardNumbers = [];
}

function displayCardVault(winningTeam) {
    hideAllModals();
    elements.cardGrid.innerHTML = '';
    const totalCards = allCards.length;
    for (let i = 1; i <= totalCards; i++) {
        const cardButton = document.createElement('button');
        cardButton.className = 'card-button';
        cardButton.textContent = i;
        cardButton.dataset.cardNumber = i;
        if (state.usedCardNumbers.includes(i)) {
            cardButton.classList.add('used');
            cardButton.disabled = true;
        }
        cardButton.addEventListener('click', () => handleCardClick(i, winningTeam));
        elements.cardGrid.appendChild(cardButton);
    }
    showModal(elements.cardVaultModal);
}

function handleCardClick(cardNumber, winningTeam) {
    if (state.usedCardNumbers.includes(cardNumber)) return;
    playSound('card_reveal');
    const effect = state.shuffledCards[cardNumber];
    
    elements.revealCardTitle.textContent = effect.Card_Title;
    elements.revealCardDescription.textContent = effect.Card_Description;
    
    elements.revealCardConfirmBtn.onclick = () => {
        state.usedCardNumbers.push(cardNumber);
        const cardButton = elements.cardGrid.querySelector(`[data-card-number='${cardNumber}']`);
        if(cardButton) {
            cardButton.classList.add('used');
            cardButton.disabled = true;
        }
        hideModal(elements.revealCardModal, false);
        applyCardEffect(effect, winningTeam);
    };

    hideModal(elements.cardVaultModal, false);
    showModal(elements.revealCardModal);
}

function roundToNearestFive(num) { return Math.floor(num / 5) * 5; }

function applyCardEffect(effect, team) {
    // ... same logic as previous version ...
    const opponent = team === 'girls' ? 'boys' : 'girls';
    
    const isNegative = ['SUBTRACT_POINTS', 'RESET_SCORE', 'HALVE_SCORE', 'LOSE_QUARTER_SCORE', 'REVERSE_CHARITY', 'SUBTRACT_HALF_OPPONENT_SCORE'].includes(effect.Effect_Type);
    if (isNegative && state.veto[team]) {
        if (confirm(`فريق ${team === 'girls' ? 'البنات' : 'الشباب'} يمتلك الفيتو! هل تريد استخدامه لإلغاء هذا الحكم؟`)) {
            state.veto[team] = false; playSound('positive_effect'); updateAllUI(); saveState(); return;
        }
    }

    if (effect.Sound_Effect) { playSound(effect.Sound_Effect); }
    else if(isNegative) { playSound('negative_effect'); } 
    else { playSound('positive_effect'); }
    
    if(isNegative) { state.lastNegativeEffect = { effect, team }; }

    const value = parseInt(effect.Effect_Value) || 0;
    let target = team;
    if (effect.Target === 'OPPONENT') target = opponent;

    let effectApplied = true;

    switch (effect.Effect_Type) {
        case 'ADD_POINTS':
            if (effect.Target === 'BOTH') { addPoints('girls', value); addPoints('boys', value); } 
            else { addPoints(target, value); }
            break;
        case 'SUBTRACT_POINTS': addPoints(target, -value); break;
        case 'STEAL_POINTS': addPoints(team, value); addPoints(opponent, -value); break;
        case 'SWAP_SCORES': [state.girlsScore, state.boysScore] = [state.boysScore, state.girlsScore]; break;
        case 'RESET_SCORE': state[`${target}Score`] = 0; break;
        case 'EQUALIZE_SCORES': const total = state.girlsScore + state.boysScore; const avg = roundToNearestFive(Math.floor(total / 2)); state.girlsScore = avg; state.boysScore = avg; break;
        case 'CHARITY': const higherTeam = state.girlsScore > state.boysScore ? 'girls' : 'boys'; const lowerTeam = higherTeam === 'girls' ? 'boys' : 'girls'; if(higherTeam !== lowerTeam) { const charityAmount = roundToNearestFive(Math.floor(state[`${higherTeam}Score`] / 2)); addPoints(higherTeam, -charityAmount); addPoints(lowerTeam, charityAmount); } break;
        case 'REVERSE_CHARITY': const higher = state.girlsScore > state.boysScore ? 'girls' : 'boys'; const lower = higher === 'girls' ? 'boys' : 'girls'; if(higher !== lower){ const reverseCharityAmount = roundToNearestFive(Math.floor(state[`${lower}Score`] / 2)); addPoints(lower, -reverseCharityAmount); addPoints(higher, reverseCharityAmount); } break;
        case 'SET_SCORE': state[`${target}Score`] = value; break;
        case 'HALVE_IF_OVER_100': if (state[`${team}Score`] > 100) { state[`${team}Score`] = roundToNearestFive(Math.floor(state[`${team}Score`] / 2)); } break;
        case 'HALVE_SCORE': state[`${target}Score`] = roundToNearestFive(Math.floor(state[`${target}Score`] / 2)); break;
        case 'LOSE_QUARTER_SCORE': state[`${target}Score`] = roundToNearestFive(state[`${target}Score`] * 0.75); break;
        case 'SUBTRACT_HALF_OPPONENT_SCORE': const amountToSubtract = roundToNearestFive(Math.floor(state[`${opponent}Score`] / 2)); addPoints(team, -amountToSubtract); break;
        case 'CONDITIONAL_ADD_GIRLS': addPoints(team, team === 'girls' ? 30 : 10); break;
        case 'CONDITIONAL_ADD_BOYS': addPoints(team, team === 'boys' ? 30 : 10); break;
        case 'ROBIN_HOOD': if (state[`${team}Score`] < state[`${opponent}Score`]) { const robinAmount = roundToNearestFive(Math.floor(state[`${opponent}Score`] * 0.25)); addPoints(opponent, -robinAmount); addPoints(team, robinAmount); } break;
        case 'IMMUNITY': state.activeEffects[target].immunity = value; break;
        case 'FREEZE_OPPONENT': state.activeEffects[opponent].freeze = value; break;
        case 'DOUBLE_NEXT_Q': state.activeEffects[target].double_next_q = value; break;
        case 'GRANT_VETO': state.veto[target] = true; break;
        case 'REVENGE': if(state.lastNegativeEffect) { applyCardEffect(state.lastNegativeEffect.effect, opponent); } break;
        case 'TAXES': state.activeEffects[team].taxes = value; break;
        case 'REFLECTIVE_SHIELD': state.activeEffects[target].shield = value; break;
        case 'SABOTAGE': state.activeEffects[opponent].sabotage = value; break;
        case 'GOLDEN_GOOSE': state.activeEffects[team].golden_goose = value; break;
        case 'INFLATION': state.activeEffects.girls.inflation = value; state.activeEffects.boys.inflation = value; break;
        case 'WINNING_STREAK': if(!state.activeEffects[team].winning_streak) {state.activeEffects[team].winning_streak = 0;} state.activeEffects[team].winning_streak = 1; break;
        case 'LEECH': state.activeEffects[team].leech = value; break;
        case 'GAMBLE': Math.random() < 0.5 ? addPoints(team, 50) : addPoints(team, -30); break;
        case 'PLAYER_CHOICE_RISK': case 'MANUAL_EFFECT': case 'SHOW_IMAGE':
            showInteractiveModal(effect, team);
            effectApplied = false;
            break;
        case 'NO_EFFECT': break; 
        default: console.warn('Unknown effect type:', effect.Effect_Type); break;
    }
    
    if (effectApplied) {
        updateAllUI();
        saveState();
    }
}

function showInteractiveModal(effect, team) {
    // ... same logic
}
function updateVisualAids() {
    // ... same logic
}
async function initializeGame() {
    // ... same logic
}

function attachEventListeners() {
    elements.nextQuestionBtn.addEventListener('click', () => {
        playSound('click');
        if (!state.gameActive) { alert("الجولة انتهت! ابدأ جولة جديدة."); return; }
        if (availableQuestions.length === 0) { alert("انتهت جميع الأسئلة!"); return; }
        
        ['girls', 'boys'].forEach(team => {
            if (state.activeEffects[team]) {
                for (const effect in state.activeEffects[team]) {
                    if (state.activeEffects[team][effect] > 0 && !['double_next_q', 'shield', 'winning_streak'].includes(effect)) {
                        state.activeEffects[team][effect]--;
                    }
                }
            }
        });

        state.questionNumber++;
        const randomIndex = Math.floor(Math.random() * availableQuestions.length);
        const currentQuestion = availableQuestions.splice(randomIndex, 1)[0];
        state.usedQuestionIds.push(currentQuestion.id);
        elements.modalQuestionArea.innerHTML = currentQuestion.question_text || '';
        if (currentQuestion.image_url) { const img = document.createElement('img'); img.src = currentQuestion.image_url; elements.modalQuestionArea.appendChild(img); }
        elements.modalAnswerArea.textContent = currentQuestion.answer;
        elements.modalAnswerArea.classList.add('hidden');
        elements.toggleAnswerBtn.textContent = "إظهار الإجابة";
        showModal(elements.questionModal);
        updateVisualAids(); saveState();
    });

    elements.awardButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            if (!state.gameActive) return;
            const winningTeam = event.target.dataset.team;
            playSound('point');
            addPoints(winningTeam, QUESTION_POINTS, true);
            if (state.questionNumber % 2 === 0 && state.gameActive) {
                displayCardVault(winningTeam);
            }
            hideModal(elements.questionModal, false);
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
            checkWinner();
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
        state.gameActive = true; // Resume the game
        saveState();
    });

    // ... Other listeners ...
    elements.resetRoundBtn.addEventListener('click', startNewRound);
    elements.newRoundBtnCelebration.addEventListener('click', startNewRound);
    elements.newDayBtn.addEventListener('click', startNewDay);
    elements.allCloseButtons.forEach(btn => { /* ... */ });
}

// --- INITIALIZE ---
initializeGame();
