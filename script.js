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
    click: new Audio('sounds/click.mp3'), modal: new Audio('sounds/modal.mp3'), point: new Audio('sounds/point.mp3'),
    win: new Audio('sounds/win.mp3'), countdown: new Audio('sounds/countdown.mp3'), supporter: new Audio('sounds/supporter.mp3'),
    card_reveal: new Audio('sounds/card_reveal.mp3'), positive_effect: new Audio('sounds/positive_effect.mp3'),
    negative_effect: new Audio('sounds/negative_effect.mp3'), sparkle: new Audio('sounds/sparkle.mp3')
};
sounds.countdown.loop = true;

let isAudioUnlocked = false;
function unlockAudio() { if (isAudioUnlocked) return; const silentSound = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA="); silentSound.play().catch(() => {}); isAudioUnlocked = true; }
function playSound(soundName) {
    if(!soundName) return;
    unlockAudio();
    if (!sounds[soundName]) {
        sounds[soundName] = new Audio(`sounds/${soundName}.mp3`);
    }
    sounds[soundName].currentTime = 0;
    sounds[soundName].play().catch(e => console.error(`Error playing sound: ${soundName}`, e));
}
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
    summaryModal: document.getElementById('summary-modal'), summaryTitle: document.getElementById('summary-title'),
    summaryText: document.getElementById('summary-text'), summaryConfirmBtn: document.getElementById('summary-confirm-btn'),
};

// --- GAME STATE ---
let allQuestions = []; let allCards = [];
let availableQuestions = [];
let countdownInterval = null; let interactiveTimerInterval = null; let confettiInterval = null;
let state = {};

function resetState(fullReset = false) {
    const oldRounds = fullReset ? { girlsRoundsWon: 0, boysRoundsWon: 0 } : (state.girlsRoundsWon !== undefined ? { girlsRoundsWon: state.girlsRoundsWon, boysRoundsWon: state.boysRoundsWon } : { girlsRoundsWon: 0, boysRoundsWon: 0 });
    state = {
        girlsScore: 0, boysScore: 0,
        girlsRoundsWon: oldRounds.girlsRoundsWon, boysRoundsWon: oldRounds.boysRoundsWon,
        gameActive: true, countdownActive: false,
        usedQuestionIds: fullReset ? [] : state.usedQuestionIds || [],
        questionNumber: 0, shuffledCards: {}, usedCardNumbers: [],
        activeEffects: { girls: {}, boys: {} },
        veto: { girls: false, boys: false }, lastNegativeEffect: null,
        questionHistory: []
    };
}

// --- STATE & UI MANAGEMENT ---
function saveState() { try { localStorage.setItem('ronyGamesV2', JSON.stringify(state)); } catch (e) { console.error("Failed to save state:", e); } }
function loadState() { const savedState = localStorage.getItem('ronyGamesV2'); if (savedState) { state = JSON.parse(savedState); if(!state.questionHistory) state.questionHistory = []; if(!state.activeEffects) state.activeEffects = { girls: {}, boys: {} };} else { resetState(true); } }
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
    if (confettiInterval) clearInterval(confettiInterval);
    elements.winnerAvatar.classList.remove('winner-avatar-celebrate');
    playSound('click'); 
    resetState(false); 
    if (allCards.length > 0) {
        shuffleAndPrepareCards();
    }
    elements.settleRoundBtn.disabled = false;
    elements.resetRoundBtn.disabled = false;
    state.gameActive = true;
    updateAllUI(); 
    hideModal(elements.celebrationOverlay); 
    saveState(); 
}
function startNewDay() {
    playSound('click');
    showSummary("هل أنت متأكد؟ سيتم مسح كل شيء.", () => {
        localStorage.removeItem('ronyGamesV2');
        resetState(true);
        location.reload();
    });
}

function checkWinner() {
    if (state.countdownActive || !state.gameActive) return;
    if (state.girlsScore >= WINNING_SCORE || state.boysScore >= WINNING_SCORE) {
        state.gameActive = false; state.countdownActive = true;
        saveState();
        triggerWinSequence();
    }
}

function triggerWinSequence(isSettled = false, settledTeam = null) {
    elements.settleRoundBtn.disabled = true;
    elements.resetRoundBtn.disabled = true;
    showModal(elements.celebrationOverlay, false);
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
    const finalScore = state[`${winnerTeam}Score`];
    const roundsWon = Math.floor(finalScore / WINNING_SCORE);
    state[`${winnerTeam}RoundsWon`] += roundsWon > 0 ? roundsWon : 1;
    const winnerName = winnerTeam === "girls" ? "البنات" : "الشباب";
    elements.winnerNameElement.textContent = winnerName;
    elements.winnerAvatar.src = document.querySelector(`#${winnerTeam}-card .team-avatar`).src;
    elements.winnerAvatar.classList.add('winner-avatar-celebrate');
    elements.countdownContainer.classList.add('hidden');
    elements.winnerContainer.classList.remove('hidden');
    launchConfetti();
    confettiInterval = setInterval(launchConfetti, 4000);
}

function launchConfetti() {
    elements.confettiContainer.innerHTML = '';
    for (let i = 0; i < 100; i++) {
        const c = document.createElement('div');
        c.className = 'confetti';
        c.style.left = `${Math.random()*100}vw`; c.style.animationDelay = `${Math.random()*2}s`;
        c.style.backgroundColor=['#ff478a', '#00e1ff', '#ffd700', '#ffffff'][Math.floor(Math.random()*4)];
        elements.confettiContainer.appendChild(c);
    }
}

function showSummary(text, onConfirm) {
    elements.summaryText.innerHTML = text;
    elements.summaryConfirmBtn.onclick = () => {
        hideModal(elements.summaryModal);
        if (onConfirm) onConfirm();
    };
    showModal(elements.summaryModal);
}

// --- CARD GAME LOGIC ---
function shuffleAndPrepareCards() { let s = [...allCards].sort(() => 0.5 - Math.random()); state.shuffledCards = {}; for (let i = 0; i < s.length; i++) { state.shuffledCards[i + 1] = s[i]; } state.usedCardNumbers = []; }

function displayCardVault(winningTeam) {
    if (allCards.length > 0 && state.usedCardNumbers.length >= allCards.length) {
        showSummary("تم استخدام جميع الكروت! سيتم إعادة خلطها الآن.", () => {
            shuffleAndPrepareCards();
            saveState();
            displayCardVault(winningTeam); 
        });
        return; 
    }
    if (!elements.cardVaultModal || allCards.length === 0) { checkWinner(); return; } 
    hideAllModals(); 
    elements.cardGrid.innerHTML = ''; 
    for (let i = 1; i <= allCards.length; i++) { const c = document.createElement('button'); c.className = 'card-button'; c.textContent = i; if (state.usedCardNumbers.includes(i)) { c.classList.add('used'); c.disabled = true; } c.addEventListener('click', () => handleCardClick(i, winningTeam)); elements.cardGrid.appendChild(c); } 
    showModal(elements.cardVaultModal); 
}

function handleCardClick(cardNumber, winningTeam) {
    if (state.usedCardNumbers.includes(cardNumber)) return;
    const effect = state.shuffledCards[cardNumber];
    if (effect.Sound_Effect) {
        playSound(effect.Sound_Effect);
    } else {
        playSound('card_reveal');
    }
    elements.revealCardTitle.textContent = effect.Card_Title;
    elements.revealCardDescription.textContent = effect.Card_Description;
    elements.revealCardConfirmBtn.onclick = () => {
        state.usedCardNumbers.push(cardNumber);
        hideModal(elements.revealCardModal);
        applyCardEffect(effect, winningTeam);
    };
    hideModal(elements.cardVaultModal);
    showModal(elements.revealCardModal);
}

function roundToNearestFive(num) { return Math.round(num / 5) * 5; }

function getPotentialScores(effect, team, currentState) {
    const opponent = team === 'girls' ? 'boys' : 'girls';
    let potentialScores = { girls: currentState.girlsScore, boys: currentState.boysScore };
    const value = parseInt(effect.Effect_Value) || 0;
    let target = effect.Target === 'OPPONENT' ? opponent : team;
    if (effect.Target === 'BOTH') target = 'both';
    
    switch (effect.Effect_Type) {
        case 'SUBTRACT_POINTS': potentialScores[target] -= value; break;
        case 'STEAL_POINTS': potentialScores[team] += value; potentialScores[opponent] -= value; break;
        case 'RESET_SCORE': potentialScores[target] = 0; break;
        case 'HALVE_SCORE': if (potentialScores[target] > 0) potentialScores[target] = Math.round(potentialScores[target] / 2); break;
        case 'LOSE_QUARTER_SCORE': if (potentialScores[target] > 0) potentialScores[target] = Math.round(potentialScores[target] * 0.75); break;
        case 'SUBTRACT_HALF_OPPONENT_SCORE': if (potentialScores[opponent] > 0) potentialScores[team] -= Math.round(potentialScores[opponent] / 2); break;
        case 'GENEROSITY':
            let pointsToMove = 0;
            const history = currentState.questionHistory;
            if (history.length > 0 && history[history.length - 1].team === team) pointsToMove += history[history.length - 1].points;
            if (history.length > 1 && history[history.length - 2].team === team) pointsToMove += history[history.length - 2].points;
            potentialScores[team] -= pointsToMove;
            potentialScores[opponent] += pointsToMove;
            break;
        case 'EQUALIZE_SCORES':
            const total = potentialScores.girls + potentialScores.boys;
            const avg = Math.round(total / 2);
            potentialScores.girls = avg; potentialScores.boys = avg;
            break;
        case 'CHARITY':
            const higherTeam = potentialScores.girls > potentialScores.boys ? 'girls' : 'boys';
            const lowerTeam = higherTeam === 'girls' ? 'boys' : 'girls';
            if (higherTeam !== lowerTeam && potentialScores[higherTeam] > 0) {
                const charityAmount = Math.round(potentialScores[higherTeam] / 2);
                potentialScores[higherTeam] -= charityAmount;
                potentialScores[lowerTeam] += charityAmount;
            }
            break;
        case 'REVERSE_CHARITY':
            const higher = potentialScores.girls > potentialScores.boys ? 'girls' : 'boys';
            const lower = higher === 'girls' ? 'boys' : 'girls';
            if (higher !== lower && potentialScores[lower] > 0) {
                const amount = Math.round(potentialScores[lower] / 2);
                potentialScores[lower] -= amount;
                potentialScores[higher] += amount;
            }
            break;
        case 'SWAP_SCORES':
            [potentialScores.girls, potentialScores.boys] = [potentialScores.boys, potentialScores.girls];
            break;
        case 'ADD_POINTS':
            if (target === 'both') {
                potentialScores.girls += value; potentialScores.boys += value;
            } else {
                potentialScores[target] += value;
            }
            break;
        case 'SET_SCORE': if (potentialScores[target] < value) potentialScores[target] = value; break;
        case 'CONDITIONAL_ADD_GIRLS': potentialScores[team] += team === 'girls' ? 30 : 10; break;
        case 'CONDITIONAL_ADD_BOYS': potentialScores[team] += team === 'boys' ? 30 : 10; break;
        case 'ROBIN_HOOD':
             if (potentialScores[team] < potentialScores[opponent] && potentialScores[opponent] > 0) {
                const robinAmount = Math.round(potentialScores[opponent] * 0.25);
                potentialScores[opponent] -= robinAmount;
                potentialScores[team] += robinAmount;
            }
            break;
    }
    return potentialScores;
}

function applyCardEffect(effect, team) {
    const opponent = team === 'girls' ? 'boys' : 'girls';
    let target = effect.Target === 'OPPONENT' ? opponent : team;
    let summaryText = "";
    const isNegative = ['SUBTRACT_POINTS', 'RESET_SCORE', 'STEAL_POINTS', 'LOSE_QUARTER_SCORE', 'HALVE_IF_OVER_100', 'HALVE_SCORE', 'GENEROSITY'].includes(effect.Effect_Type);
    const effectsThatCanCausePointLoss = ['SUBTRACT_POINTS', 'STEAL_POINTS', 'RESET_SCORE', 'HALVE_SCORE', 'LOSE_QUARTER_SCORE', 'SUBTRACT_HALF_OPPONENT_SCORE', 'GENEROSITY', 'EQUALIZE_SCORES', 'CHARITY', 'REVERSE_CHARITY', 'SWAP_SCORES'];
    const positivePointEffects = ['ADD_POINTS', 'STEAL_POINTS', 'SET_SCORE', 'CONDITIONAL_ADD_GIRLS', 'CONDITIONAL_ADD_BOYS', 'ROBIN_HOOD', 'REVERSE_CHARITY'];

    if (!effect.Veto_Applied) {
        // Freeze check: Blocks positive point effects
        if (state.activeEffects[target]?.freeze > 0 && positivePointEffects.includes(effect.Effect_Type)) {
             showSummary(`فريق ${target === 'girls' ? 'البنات' : 'الشباب'} مُجَمَّد ولا يمكن إضافة نقاط له من الكروت!`, () => {
                updateAllUI(); saveState(); checkWinner();
            });
            return;
        }

        // Immunity check: Blocks effects that cause a net point loss
        if (state.activeEffects[target]?.immunity > 0 && effectsThatCanCausePointLoss.includes(effect.Effect_Type)) {
            const potentialScores = getPotentialScores(effect, team, state);
            if (potentialScores[target] < state[`${target}Score`]) {
                playSound('negative_effect');
                showSummary(`الدرع الواقي منع خسارة النقاط من حكم "${effect.Card_Title}"!`, () => {
                    updateAllUI(); saveState(); checkWinner();
                });
                return;
            }
        }
        // Reflective Shield check: Blocks direct negative attacks
        if(isNegative && state.activeEffects[target]?.shield > 0) {
            state.activeEffects[target].shield = 0;
            summaryText = `الدرع العاكس صد هجوم "${effect.Card_Title}" وعكسه على الخصم!`;
            showSummary(summaryText, () => {
                applyCardEffect(effect, opponent); 
            });
            return;
        }
        // Veto check 1: Defensive (if card causes net point loss)
        if (state.veto[target] && effectsThatCanCausePointLoss.includes(effect.Effect_Type)) {
            const potentialScores = getPotentialScores(effect, team, state);
            if (potentialScores[target] < state[`${target}Score`]) {
                showInteractiveModal({ ...effect, Manual_Config: 'veto_choice', originalPlayer: team }, target);
                return;
            }
        }
        // Veto check 2: Strategic (if card makes opponent win)
        if (state.veto[opponent]) {
            const potentialScores = getPotentialScores(effect, team, state);
            if (potentialScores[team] >= WINNING_SCORE && state[`${team}Score`] < WINNING_SCORE) {
                 const customEffect = {
                     ...effect,
                     Manual_Config: 'veto_choice',
                     originalPlayer: team,
                     Card_Description: `فريق ${team === 'girls' ? 'البنات' : 'الشباب'} على وشك الفوز بالجولة بهذا الكارت! هل تريدون استخدام الفيتو لإلغاء تأثيره؟`,
                     Card_Title: 'اعتراض استراتيجي'
                 };
                 showInteractiveModal(customEffect, opponent);
                 return;
            }
        }
    }

    if(!effect.Sound_Effect){
        if (isNegative) playSound('negative_effect');
        else if (!['NO_EFFECT', 'MANUAL_EFFECT', 'SHOW_IMAGE', 'GAMBLE', 'PLAYER_CHOICE_RISK'].includes(effect.Effect_Type)) playSound('positive_effect');
    }
    if(isNegative && effect.Effect_Type !== 'REVENGE' && effect.Effect_Type !== 'COPYCAT') { state.lastNegativeEffect = { ...effect }; }

    const value = parseInt(effect.Effect_Value) || 0;
    switch (effect.Effect_Type) {
        case 'ADD_POINTS': if (effect.Target === 'BOTH') { state.girlsScore += value; state.boysScore += value; summaryText = `تمت إضافة ${value} نقطة لكلا الفريقين!`; } else { state[`${target}Score`] += value; summaryText = `تمت إضافة ${value} نقطة لفريق ${target === 'girls' ? 'البنات' : 'الشباب'}.`; } break;
        case 'SUBTRACT_POINTS': state[`${target}Score`] -= value; summaryText = `تم خصم ${value} نقطة من فريق ${target === 'girls' ? 'البنات' : 'الشباب'}.`; break;
        case 'STEAL_POINTS': state[`${team}Score`] += value; state[`${opponent}Score`] -= value; summaryText = `تم سرقة ${value} نقطة من ${opponent === 'girls' ? 'البنات' : 'الشباب'} وإضافتها إلى ${team === 'girls' ? 'البنات' : 'الشباب'}!`; break;
        case 'SWAP_SCORES': const oldGirls = state.girlsScore; const oldBoys = state.boysScore; [state.girlsScore, state.boysScore] = [oldBoys, oldGirls]; summaryText = `تم تبديل النقاط! <br> البنات: ${oldGirls} ⬅️ ${state.girlsScore} <br> الشباب: ${oldBoys} ⬅️ ${state.boysScore}`; break;
        case 'RESET_SCORE': if (state[`${target}Score`] > 0) { const old = state[`${target}Score`]; state[`${target}Score`] = 0; summaryText = `تم تصفير نقاط فريق ${target === 'girls' ? 'البنات' : 'الشباب'} من ${old} إلى 0.`; } else { summaryText = `فريق ${target === 'girls' ? 'البنات' : 'الشباب'} مفلس بالفعل!`; } break;
        case 'EQUALIZE_SCORES': const total = state.girlsScore + state.boysScore; const avg = roundToNearestFive(Math.floor(total / 2)); summaryText = `تم توزيع النقاط بالتساوي! <br> النتيجة الجديدة: ${avg} لكل فريق.`; state.girlsScore = avg; state.boysScore = avg; break;
        case 'CHARITY': const higherTeam = state.girlsScore > state.boysScore ? 'girls' : 'boys'; const lowerTeam = higherTeam === 'girls' ? 'boys' : 'girls'; if (higherTeam !== lowerTeam && state[`${higherTeam}Score`] > 0) { const charityAmount = roundToNearestFive(Math.floor(state[`${higherTeam}Score`] / 2)); state[`${higherTeam}Score`] -= charityAmount; state[`${lowerTeam}Score`] += charityAmount; summaryText = `تبرع فريق ${higherTeam === 'girls' ? 'البنات' : 'الشباب'} بـ ${charityAmount} نقطة!`; } else { summaryText = `لا يمكن تطبيق الحكم والنقاط متساوية أو سالبة.`; } break;
        case 'REVERSE_CHARITY': const higher = state.girlsScore > state.boysScore ? 'girls' : 'boys'; const lower = higher === 'girls' ? 'boys' : 'girls'; if (higher !== lower && state[`${lower}Score`] > 0) { const reverseCharityAmount = roundToNearestFive(Math.floor(state[`${lower}Score`] / 2)); state[`${lower}Score`] -= reverseCharityAmount; state[`${higher}Score`] += reverseCharityAmount; summaryText = `القوي يزداد قوة! تمت إضافة ${reverseCharityAmount} نقطة للفريق الأعلى.`; } else { summaryText = `لا يمكن تطبيق الحكم.`; } break;
        case 'SET_SCORE': if (state[`${target}Score`] < value) { const old = state[`${target}Score`]; state[`${target}Score`] = value; summaryText = `محظووووظ! تم رفع نقاط فريق ${target === 'girls' ? 'البنات' : 'الشباب'} من ${old} إلى ${value}!`; } else { summaryText = `نقاط الفريق (${state[`${target}Score`]}) أعلى بالفعل!`; } break;
        case 'HALVE_IF_OVER_100': if (state[`${team}Score`] > 100) { const old = state[`${team}Score`]; state[`${team}Score`] = roundToNearestFive(Math.floor(state[`${team}Score`] / 2)); summaryText = `ضريبة الأغنياء! تم خصم نصف نقاطك من ${old} إلى ${state[`${team}Score`]}.`; } else { summaryText = "نقاطك أقل من 100، أنت في أمان!"; } break;
        case 'HALVE_SCORE': if (state[`${target}Score`] > 0) { const old = state[`${target}Score`]; state[`${target}Score`] = roundToNearestFive(Math.floor(state[`${target}Score`] / 2)); summaryText = `تم خصم نصف نقاط فريق ${target === 'girls' ? 'البنات' : 'الشباب'} من ${old} إلى ${state[`${target}Score`]}.`; } else { summaryText = `نقاط الخصم ليست موجبة، لا يمكن تطبيق الحكم.`; } break;
        case 'LOSE_QUARTER_SCORE': if (state[`${target}Score`] > 0) { const old = state[`${target}Score`]; state[`${target}Score`] = roundToNearestFive(state[`${target}Score`] * 0.75); summaryText = `تم خصم ربع نقاطك من ${old} إلى ${state[`${target}Score`]}.`; } else { summaryText = `نقاطك ليست موجبة، أنت في أمان.`; } break;
        case 'SUBTRACT_HALF_OPPONENT_SCORE': if (state[`${opponent}Score`] > 0) { const amountToSubtract = roundToNearestFive(Math.floor(state[`${opponent}Score`] / 2)); state[`${team}Score`] -= amountToSubtract; summaryText = `يا خسارة! تم خصم ${amountToSubtract} نقطة منك.`; } else { summaryText = `نقاط الخصم ليست موجبة، نجوت!`; } break;
        case 'CONDITIONAL_ADD_GIRLS': const pointsGirls = team === 'girls' ? 30 : 10; state[`${team}Score`] += pointsGirls; summaryText = `تحيز واضح! تمت إضافة ${pointsGirls} نقطة.`; } break;
        case 'CONDITIONAL_ADD_BOYS': const pointsBoys = team === 'boys' ? 30 : 10; state[`${team}Score`] += pointsBoys; summaryText = `ده مش تحيز برضه! تمت إضافة ${pointsBoys} نقطة.`; break;
        case 'ROBIN_HOOD': if (state[`${team}Score`] < state[`${opponent}Score`] && state[`${opponent}Score`] > 0) { const robinAmount = roundToNearestFive(Math.floor(state[`${opponent}Score`] * 0.25)); state[`${opponent}Score`] -= robinAmount; state[`${team}Score`] += robinAmount; summaryText = `روبن هود يسرق ${robinAmount} نقطة من الأغنياء للفقراء!`; } else { summaryText = `لا يمكن تطبيق الحكم، أنت لست الأفقر!`; } break;
        case 'IMMUNITY': if(!state.activeEffects[target]) state.activeEffects[target]={}; state.activeEffects[target].immunity = value; summaryText = `تم تفعيل الدرع الواقي لفريق ${target==='girls' ? 'البنات':'الشباب'} لمدة ${value} أسئلة!`; break;
        case 'FREEZE_OPPONENT': if(!state.activeEffects[opponent]) state.activeEffects[opponent]={}; state.activeEffects[opponent].freeze = value; summaryText = `تم تجميد فريق ${opponent==='girls' ? 'البنات':'الشباب'} لمدة ${value} أسئلة!`; break;
        case 'DOUBLE_NEXT_Q': if(!state.activeEffects[target]) state.activeEffects[target]={}; state.activeEffects[target].double_next_q = value; summaryText = `نقاط السؤال القادم مضاعفة لفريق ${target==='girls' ? 'البنات':'الشباب'}!`; break;
        case 'GRANT_VETO': state.veto[target] = true; summaryText = `حصل فريق ${target==='girls' ? 'البنات':'الشباب'} على حق الفيتو!`; break;
        case 'REVENGE': if(state.lastNegativeEffect) { const effectToCopy = state.lastNegativeEffect; summaryText=`انتقام! سيتم تطبيق حكم "${effectToCopy.Card_Title}" على الخصم!`; showSummary(summaryText, () => applyCardEffect(effectToCopy, opponent)); return; } else { summaryText=`لم تكن هناك عقوبات سابقة للانتقام منها!`; } break;
        case 'COPYCAT': const lastCardNumber = state.usedCardNumbers[state.usedCardNumbers.length - 2]; if (lastCardNumber && state.shuffledCards[lastCardNumber].Effect_Type !== 'COPYCAT') { const lastEffect = state.shuffledCards[lastCardNumber]; summaryText = `تقليد أعمى! سيتم تطبيق حكم "${lastEffect.Card_Title}" مرة أخرى!`; showSummary(summaryText, () => applyCardEffect(lastEffect, team)); return; } else { summaryText = `لا يوجد ما يمكن تقليده!`; } break;
        case 'GENEROSITY': let pointsToMove = 0; const history = state.questionHistory; if (history.length > 0 && history[history.length - 1].team === team) { pointsToMove += history[history.length - 1].points; } if (history.length > 1 && history[history.length - 2].team === team) { pointsToMove += history[history.length - 2].points; } state[`${team}Score`] -= pointsToMove; state[`${opponent}Score`] += pointsToMove; summaryText = `كرم أخلاق! تم نقل ${pointsToMove} نقطة للفريق المنافس.`; break;
        case 'TAXES': if(!state.activeEffects[opponent]) state.activeEffects[opponent]={}; state.activeEffects[opponent].taxes = { duration: value, by: team }; summaryText = `تم فرض ضرائب على مكاسب الخصم لمدة ${value} أسئلة!`; break;
        case 'REFLECTIVE_SHIELD': if(!state.activeEffects[target]) state.activeEffects[target]={}; state.activeEffects[target].shield = value; summaryText = `تم تفعيل الدرع العاكس!`; break;
        case 'SABOTAGE': if(!state.activeEffects[opponent]) state.activeEffects[opponent]={}; state.activeEffects[opponent].sabotage = value; summaryText = `تخريب! سيحصل الخصم على نصف نقاطه فقط لمدة ${value} أسئلة.`; break;
        case 'GOLDEN_GOOSE': if(!state.activeEffects[team]) state.activeEffects[team]={}; state.activeEffects[team].golden_goose = value; summaryText = `الإوزة الذهبية! +10 نقاط هدية مع كل فوز لمدة ${value} أسئلة.`; break;
        case 'INFLATION': if(!state.activeEffects.girls) state.activeEffects.girls={}; if(!state.activeEffects.boys) state.activeEffects.boys={}; state.activeEffects.girls.inflation = value; state.activeEffects.boys.inflation = value; summaryText = `تضخم! قيمة الأسئلة القادمة مضاعفة للجميع لمدة ${value} أسئلة.`; break;
        case 'WINNING_STREAK': 
            if (!state.activeEffects[team]?.winning_streak > 0) {
                if(!state.activeEffects[team]) state.activeEffects[team]={};
                state.activeEffects[team].winning_streak = 1;
                summaryText = `بدأت سلسلة الانتصارات!`;
            } else {
                summaryText = `لديك سلسلة انتصارات فعالة بالفعل!`;
            }
            break;
        case 'LEECH': if(!state.activeEffects[opponent]) state.activeEffects[opponent]={}; state.activeEffects[opponent].leech = { duration: value, to: team }; summaryText = `تطفل! ستكسب نصف ما يكسبه خصمك لمدة ${value} أسئلة.`; break;
        case 'PLAYER_CHOICE_RISK': case 'MANUAL_EFFECT': case 'SHOW_IMAGE': case 'GAMBLE':
            showInteractiveModal(effect, team);
            return;
        case 'NO_EFFECT': summaryText = `مجرد مزحة! لا شيء يحدث.`; break;
        default: console.warn('Unknown effect type:', effect.Effect_Type); summaryText = "حدث خطأ غير متوقع!"; break;
    }
    const finalize = () => { updateAllUI(); saveState(); checkWinner(); };
    if (summaryText) { showSummary(summaryText, finalize); } 
    else { finalize(); }
}

function updateVisualAids() {
    ['girls', 'boys'].forEach(team => {
        const container = elements[`${team}StatusIcons`];
        if (!container) return;
        container.innerHTML = '';
        const effects = state.activeEffects[team] || {};
        const opponent = team === 'girls' ? 'boys' : 'girls';
        if (state.veto[team]) container.innerHTML += `<div class="status-icon" title="فيتو">⚖️</div>`;
        if (effects.freeze > 0) container.innerHTML += `<div class="status-icon" title="تجميد">❄️<span>${effects.freeze}</span></div>`;
        if (effects.immunity > 0) container.innerHTML += `<div class="status-icon" title="حصانة">🛡️<span>${effects.immunity}</span></div>`;
        if (effects.double_next_q > 0) container.innerHTML += `<div class="status-icon" title="نقاط مضاعفة">x2</div>`;
        if (effects.shield > 0) container.innerHTML += `<div class="status-icon" title="درع عاكس">🔄</div>`;
        if (effects.taxes?.duration > 0) container.innerHTML += `<div class="status-icon" title="ضرائب">💰<span>${effects.taxes.duration}</span></div>`;
        if (effects.sabotage > 0) container.innerHTML += `<div class="status-icon" title="تخريب">💣<span>${effects.sabotage}</span></div>`;
        if (effects.golden_goose > 0) container.innerHTML += `<div class="status-icon" title="إوزة ذهبية">🥚<span>${effects.golden_goose}</span></div>`;
        if (effects.winning_streak > 0) container.innerHTML += `<div class="status-icon" title="سلسلة انتصارات">🔥<span>${effects.winning_streak}</span></div>`;
        if (effects.leech?.duration > 0) container.innerHTML += `<div class="status-icon" title="طفيلي">🦠<span>${effects.leech.duration}</span></div>`;
        if (effects.inflation > 0) container.innerHTML += `<div class="status-icon" title="تضخم">📈<span>${effects.inflation}</span></div>`;
        if (effects.social_effect > 0) container.innerHTML += `<div class="status-icon" title="تأثير اجتماعي">🎭<span>${effects.social_effect}</span></div>`;
    });
}

function showInteractiveModal(effect, team) {
    hideAllModals();
    const opponent = team === 'girls' ? 'boys' : 'girls';
    elements.interactiveTitle.textContent = effect.Card_Title;
    elements.interactiveDescription.innerHTML = ''; 
    elements.interactiveDescription.textContent = effect.Card_Description; 

    elements.interactiveButtons.innerHTML = '';
    elements.interactiveTimer.classList.add('hidden');
    elements.interactiveInputArea.classList.add('hidden');
    clearInterval(interactiveTimerInterval);

    if (effect.Effect_Type === 'SHOW_IMAGE' && effect.Effect_Value) {
        const img = document.createElement('img');
        img.src = effect.Effect_Value;
        img.style.maxWidth = '100%';
        img.style.maxHeight = '300px';
        img.style.borderRadius = '15px';
        img.style.marginTop = '20px';
        elements.interactiveDescription.appendChild(img);
    }

    const config = (effect.Manual_Config || '').trim();
    const configType = config.split('(')[0].trim();
    const configParamsMatch = config.match(/\((.*)\)/);
    const configParams = configParamsMatch ? configParamsMatch[1] : '';

    if (effect.Effect_Type === 'GAMBLE') {
        const result = Math.random() < 0.5 ? 50 : -30;
        const resultText = result > 0 ? `لقد ربحت ${result} نقطة!` : `لقد خسرت ${Math.abs(result)} نقطة!`;
        const finalize = () => { state[`${team}Score`] += result; updateAllUI(); saveState(); checkWinner(); };
        showSummary(resultText, finalize);
        return;
    }

    if (configType === 'veto_choice') {
        elements.interactiveTitle.textContent = effect.Card_Title || 'حق الفيتو';
        elements.interactiveDescription.textContent = effect.Card_Description;
        const btn1 = document.createElement('button'); btn1.textContent = "نعم، استخدم الفيتو"; btn1.className = 'interactive-btn-success';
        btn1.onclick = () => { state.veto[team] = false; hideModal(elements.interactiveModal); showSummary(`تم استخدام الفيتو بنجاح!`, () => { updateAllUI(); saveState(); checkWinner(); }); };
        const btn2 = document.createElement('button'); btn2.textContent = "لا، احتفظ به"; btn2.className = 'interactive-btn-fail';
        btn2.onclick = () => { 
            hideModal(elements.interactiveModal); 
            applyCardEffect({ ...effect, Veto_Applied: true }, effect.originalPlayer);
        };
        elements.interactiveButtons.append(btn1, btn2);
    } else if (configType.startsWith('task')) {
        const successBtn = document.createElement('button'); successBtn.className = 'interactive-btn-success';
        const failBtn = document.createElement('button'); failBtn.textContent = 'فشل'; failBtn.className = 'interactive-btn-fail';
        failBtn.onclick = () => { hideModal(elements.interactiveModal); checkWinner(); };

        if (configType === 'task_award') {
            successBtn.textContent = "البنات"; failBtn.textContent = "الشباب";
            successBtn.className = 'award-btn'; successBtn.style.backgroundColor = 'var(--girls-color)';
            failBtn.className = 'award-btn'; failBtn.style.backgroundColor = 'var(--boys-color)';
            const points = parseInt(effect.Effect_Value);
            successBtn.onclick = () => { state.girlsScore += points; hideModal(elements.interactiveModal); showSummary(`تمت إضافة ${points} نقطة للبنات.`, () => { updateAllUI(); saveState(); checkWinner(); }); };
            failBtn.onclick = () => { state.boysScore += points; hideModal(elements.interactiveModal); showSummary(`تمت إضافة ${points} نقطة للشباب.`, () => { updateAllUI(); saveState(); checkWinner(); }); };
        } else {
             const points = parseInt(effect.Effect_Value);
             successBtn.textContent = `نجح (+${points})`;
             successBtn.onclick = () => { state[`${team}Score`] += points; hideModal(elements.interactiveModal); showSummary(`تمت إضافة ${points} نقطة.`, () => { updateAllUI(); saveState(); checkWinner(); }); };
        }
        elements.interactiveButtons.append(successBtn, failBtn);
    } else if (['support', 'deduct', 'manual_add', 'manual_subtract', 'manual_multiply', 'manual_multiply_subtract'].includes(configType)) {
        elements.manualPointsInput.value = '';
        elements.interactiveInputArea.classList.remove('hidden');
        const confirmBtn = document.createElement('button'); confirmBtn.textContent = 'تأكيد'; confirmBtn.className = 'interactive-btn-confirm';
        confirmBtn.onclick = () => {
            let points = parseInt(elements.manualPointsInput.value) || 0; let summaryText = "";
            if (configType === 'deduct') { state[`${opponent}Score`] -= points; summaryText = `تم خصم ${points} من الخصم.`; }
            else if (configType === 'manual_add') { const p = points * 5; state[`${team}Score`] += p; summaryText = `تمت إضافة ${p} نقطة.`; }
            else if (configType === 'manual_subtract') { const p = points * 5; state[`${team}Score`] -= p; summaryText = `تم خصم ${p} نقطة.`; }
            else if (configType === 'manual_multiply') { const p = points * 10; state[`${team}Score`] += p; summaryText = `تمت إضافة ${p} نقطة.`; }
            else if (configType === 'manual_multiply_subtract') { const p = points * 10; state[`${team}Score`] -= p; summaryText = `تم خصم ${p} نقطة.`; }
            else { state[`${team}Score`] += points; summaryText = `تمت إضافة ${points} نقطة دعم.`; }
            hideModal(elements.interactiveModal); showSummary(summaryText, () => { updateAllUI(); saveState(); checkWinner(); });
        };
        elements.interactiveButtons.append(confirmBtn);
    } else if (configType === 'choice') {
        if (effect.Effect_Type === "PLAYER_CHOICE_RISK") {
            const btn1 = document.createElement('button'); btn1.textContent = `أخذ ${effect.Effect_Value} نقطة`; btn1.className = 'interactive-btn-confirm';
            btn1.onclick = () => { state[`${team}Score`] += parseInt(effect.Effect_Value); hideModal(elements.interactiveModal); showSummary(`تم أخذ ${effect.Effect_Value} نقطة مضمونة.`, () => { updateAllUI(); saveState(); checkWinner(); }); };
            const btn2 = document.createElement('button'); btn2.textContent = "اختيار كارت جديد"; btn2.className = 'interactive-btn-choice';
            btn2.onclick = () => { hideModal(elements.interactiveModal); displayCardVault(team); };
            elements.interactiveButtons.append(btn1, btn2);
        } else { // اعمل الصح
            const btn1 = document.createElement('button'); btn1.textContent = "تبرع بـ 50 نقطة"; btn1.className = 'interactive-btn-fail';
            btn1.onclick = () => { state[`${team}Score`] -= 50; state[`${opponent}Score`] += 50; hideModal(elements.interactiveModal); showSummary(`تم التبرع بـ 50 نقطة للخصم.`, () => { updateAllUI(); saveState(); checkWinner(); }); };
            const btn2 = document.createElement('button'); btn2.textContent = "العب مع الخصم"; btn2.className = 'interactive-btn-choice';
            btn2.onclick = () => { hideModal(elements.interactiveModal); showSummary("سيتم اللعب مع الخصم لنهاية الجولة!", () => checkWinner()); };
            elements.interactiveButtons.append(btn1, btn2);
        }
    } else if (configType.startsWith('info_tracker')) {
        const duration = parseInt(configParams.replace(')','')) || 0;
        if (!state.activeEffects[opponent]) state.activeEffects[opponent] = {};
        state.activeEffects[opponent].social_effect = duration;
        updateAllUI();
        saveState();
        const closeBtn = document.createElement('button'); closeBtn.textContent = 'تم';
        closeBtn.className = 'interactive-btn-confirm';
        closeBtn.onclick = () => hideModal(elements.interactiveModal);
        elements.interactiveButtons.append(closeBtn);
    } else { // info, default
        const closeBtn = document.createElement('button'); closeBtn.textContent = 'تم';
        closeBtn.className = 'interactive-btn-confirm';
        closeBtn.onclick = () => { hideModal(elements.interactiveModal); checkWinner(); };
        elements.interactiveButtons.append(closeBtn);
    }
    
    if (configParams.includes('timer')) {
        let timer = parseInt(configParams.split(':')[1]);
        elements.interactiveTimer.textContent = timer;
        elements.interactiveTimer.classList.remove('hidden');
        interactiveTimerInterval = setInterval(() => {
            timer--;
            elements.interactiveTimer.textContent = timer;
            if (timer <= 0) {
                clearInterval(interactiveTimerInterval);
                elements.interactiveButtons.innerHTML = `<p>انتهى الوقت!</p>`;
                setTimeout(() => hideModal(elements.interactiveModal), 2000);
            }
        }, 1000);
    }
    showModal(elements.interactiveModal);
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
            
            const pointsFromQuestion = calculateQuestionPoints(winningTeam);
            
            if(pointsFromQuestion > 0) state[`${winningTeam}Score`] += pointsFromQuestion;
            state.questionHistory.push({team: winningTeam, points: pointsFromQuestion});
            if(state.questionHistory.length > 5) state.questionHistory.shift();
            
            const opponent = winningTeam === 'girls' ? 'boys' : 'girls';
            if (state.activeEffects[opponent]?.winning_streak > 0) {
                showSummary(`تم كسر سلسلة انتصارات فريق ${opponent === 'girls' ? 'البنات' : 'الشباب'}!`);
                state.activeEffects[opponent].winning_streak = 0;
            }
            if (state.activeEffects[winningTeam]?.winning_streak > 0) {
                state.activeEffects[winningTeam].winning_streak++;
            }
            
            updateAllUI();
            
            if (state.questionNumber % 2 === 0) {
                displayCardVault(winningTeam);
            } else {
                checkWinner();
            }

            ['girls', 'boys'].forEach(team => {
                if (state.activeEffects[team]) {
                    for (const effect in state.activeEffects[team]) {
                        const effectObj = state.activeEffects[team][effect];
                        if (typeof effectObj === 'number' && effectObj > 0 && effect !== 'shield' && effect !== 'winning_streak') {
                            state.activeEffects[team][effect]--;
                        } else if (effectObj?.duration > 0) {
                            state.activeEffects[team][effect].duration--;
                        }
                    }
                }
            });
            saveState(); 
        });
    });

    elements.manualControls.forEach(button => {
        button.addEventListener('click', e => {
            playSound('click');
            const team = e.target.dataset.team;
            const action = e.target.dataset.action;
            
            if (state.activeEffects[team]?.freeze > 0) {
                showSummary(`فريق ${team === 'girls' ? 'البنات' : 'الشباب'} مُجَمَّد ولا يمكن تغيير نقاطه!`);
                return;
            }

            state[`${team}Score`] += (action === 'add' ? MANUAL_POINTS_STEP : -MANUAL_POINTS_STEP);
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
            if (isAdd) { state[`${team}RoundsWon`]++; playSound('sparkle'); } 
            else if (state[`${team}RoundsWon`] > 0) { state[`${team}RoundsWon`]--; }
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
        elements.settleRoundBtn.disabled = false;
        elements.resetRoundBtn.disabled = false;
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
    
    elements.addSupporterBtn.addEventListener('click', () => {
        playSound('click');
        showModal(elements.supporterModal);
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
                const list = selectedTeam === 'girls' ? elements.girlsSupportersList : elements.boysSupportersList;
                const supporterCard = document.createElement('div');
                supporterCard.className = 'supporter-card';
                supporterCard.innerHTML = `<img src="${photoDataUrl}" alt="${supporterName}"><p>👑 ${supporterName}</p>`;
                list.appendChild(supporterCard);
                
                elements.announcementPhoto.src = photoDataUrl;
                elements.announcementText.innerHTML = `🛡️ ${supporterName}<br>ينضم كدرع لفريق ${selectedTeam === 'girls' ? 'البنات' : 'الشباب'}!`;
                playSound('supporter');
                elements.supporterAnnouncement.classList.remove('hidden');
                elements.supporterAnnouncement.classList.add('show');
                setTimeout(() => {
                    elements.supporterAnnouncement.classList.remove('show');
                    setTimeout(() => elements.supporterAnnouncement.classList.add('hidden'), 500);
                }, 5500);
            };
            reader.readAsDataURL(supporterPhotoInput.files[0]);
        }
        elements.supporterForm.reset();
        hideModal(elements.supporterModal);
    });
    
    elements.resetRoundBtn.addEventListener('click', startNewRound);
    elements.newRoundBtnCelebration.addEventListener('click', startNewRound);
    elements.newDayBtn.addEventListener('click', startNewDay);
    elements.allCloseButtons.forEach(btn => btn.addEventListener('click', () => hideAllModals()));
    elements.toggleAnswerBtn.addEventListener('click', () => elements.modalAnswerArea.classList.toggle('hidden'));
}

// --- INITIALIZE ---
async function initializeGame() {
    try {
        console.log("Starting to fetch data from Google Sheets...");
        const [questionsRes, cardsRes] = await Promise.all([
            fetch(QUESTIONS_SHEET_URL),
            fetch(CARDS_SHEET_URL)
        ]);
        
        console.log("Fetch responses received.");

        if (!questionsRes.ok || !cardsRes.ok) {
            throw new Error(`Failed to fetch data. Questions Status: ${questionsRes.status}, Cards Status: ${cardsRes.status}`);
        }
        
        const questionsData = await questionsRes.json();
        const cardsData = await cardsRes.json();
        console.log("Data parsed as JSON.");

        if (!questionsData.values || questionsData.values.length < 2 || !cardsData.values || cardsData.values.length < 2) {
            throw new Error('Google Sheet data is empty or missing headers.');
        }

        const questionHeaders = questionsData.values[0];
        const cardHeaders = cardsData.values[0];

        allQuestions = questionsData.values.slice(1).map((row, index) => {
            let question = { id: `q${index}` };
            questionHeaders.forEach((header, i) => question[header.trim()] = row[i]);
            return question;
        });

        allCards = cardsData.values.slice(1).map((row, index) => {
            let card = { id: `c${index}` };
            cardHeaders.forEach((header, i) => card[header.trim()] = row[i]);
            return card;
        });
        
        console.log(`Successfully loaded ${allQuestions.length} questions and ${allCards.length} cards.`);

    } catch (error) {
        console.error("Game Initialization Error:", error);
        document.body.innerHTML = `<div style="padding: 20px; text-align: center; color: red; font-size: 1.2em;">
            <h1>فشل تحميل بيانات اللعبة</h1>
            <p>الرجاء التأكد من صحة مفتاح API ومعرف Google Sheet، وأن إعدادات المشاركة هي "Anyone with the link".</p>
            <p><strong>رسالة الخطأ (للمطور):</strong> ${error.message}</p>
        </div>`;
        return; 
    }

    loadState();
    availableQuestions = allQuestions.filter(q => !state.usedQuestionIds.includes(q.id));
    if (allCards.length > 0 && (!state.shuffledCards || Object.keys(state.shuffledCards).length === 0)) {
       shuffleAndPrepareCards();
    }
    updateAllUI();
    attachEventListeners();
    console.log("Game initialized successfully!");
    
    elements.nextQuestionBtn.textContent = 'السؤال التالي';
    elements.nextQuestionBtn.disabled = false;
    elements.settleRoundBtn.disabled = false;
    elements.resetRoundBtn.disabled = false;
}

initializeGame();
