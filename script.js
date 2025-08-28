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
    questionAwardButtons: document.querySelectorAll('#question-modal .award-btn'),
    celebrationOverlay: document.getElementById('celebration-overlay'), countdownContainer: document.getElementById('countdown-container'),
    countdownText: document.getElementById('countdown-text'), winnerContainer: document.getElementById('winner-container'),
    countdownTimer: document.getElementById('countdown-timer'), winnerNameElement: document.getElementById('winner-name'),
    winnerAvatar: document.getElementById('winner-avatar'), stopCountdownBtn: document.getElementById('stop-countdown-btn'),
    newRoundBtnCelebration: document.getElementById('new-round-btn-celebration'),
    confettiContainer: document.getElementById('confetti-container'),
    allModals: document.querySelectorAll('.modal-overlay'), allCloseButtons: document.querySelectorAll('.modal-close-btn'),
    cardVaultModal: document.getElementById('card-vault-modal'), cardGrid: document.getElementById('card-grid'),
    revealCardModal: document.getElementById('reveal-card-modal'), revealCardTitle: document.getElementById('reveal-card-title'),
    revealCardDescription: document.getElementById('reveal-card-description'), revealCardConfirmBtn: document.getElementById('reveal-card-confirm-btn'),
    chooseTeamModal: document.getElementById('choose-team-modal'),
    interactiveModal: document.getElementById('interactive-modal'), interactiveTitle: document.getElementById('interactive-title'),
    interactiveDescription: document.getElementById('interactive-description'), interactiveTimer: document.getElementById('interactive-timer'),
    interactiveInputArea: document.getElementById('interactive-input-area'), manualPointsInput: document.getElementById('manual-points-input'),
    interactiveButtons: document.getElementById('interactive-buttons'),
    addSupporterBtn: document.getElementById('add-supporter-btn'),
    supporterModal: document.getElementById('supporter-modal'),
    supporterForm: document.getElementById('supporter-form'),
    girlsSupportersList: document.getElementById('girls-supporters'),
    boysSupportersList: document.getElementById('boys-supporters'),
    supporterAnnouncement: document.getElementById('supporter-announcement'),
    announcementPhoto: document.getElementById('announcement-photo'),
    announcementText: document.getElementById('announcement-text'),
};

// --- GAME STATE & CORE LOGIC ---
let allQuestions = [], allCards = [];
let availableQuestions = [];
let countdownInterval = null; let interactiveTimerInterval = null;
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
function updateScoresUI() { if (elements.girlsScore) elements.girlsScore.textContent = state.girlsScore; if (elements.boysScore) elements.boysScore.textContent = state.boysScore; }
function updateRoundsUI() { if (elements.girlsRoundsCount) elements.girlsRoundsCount.textContent = state.girlsRoundsWon; if (elements.boysRoundsCount) elements.boysRoundsCount.textContent = state.boysRoundsWon; }
function updateAllUI() { updateScoresUI(); updateRoundsUI(); updateVisualAids(); }
function showModal(modal) { if (modal) { playSound('modal'); modal.classList.remove('hidden'); } }
function hideModal(modal) { if (modal) { playSound('modal'); modal.classList.add('hidden'); } }
function hideAllModals() {
    clearInterval(interactiveTimerInterval);
    if (!state.countdownActive) {
        stopSound('countdown');
        clearInterval(countdownInterval);
    }
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
    state[`${team}Score`] = Math.max(0, newScore);
    updateScoresUI();
    if (state[`${team}Score`] >= WINNING_SCORE && state.gameActive) {
        checkWinner();
    }
    saveState();
}

function startNewRound() { playSound('click'); resetState(false); if (allCards.length > 0) shuffleAndPrepareCards(); updateAllUI(); if (elements.celebrationOverlay) hideModal(elements.celebrationOverlay); saveState(); }
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
    launchConfetti();
}

function launchConfetti() {
    if (!elements.confettiContainer) return;
    elements.confettiContainer.innerHTML = '';
    const colors = ['#ff478a', '#00e1ff', '#ffd700', '#ffffff'];
    for (let i = 0; i < 150; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.animationDelay = Math.random() * 2 + 's';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        elements.confettiContainer.appendChild(confetti);
    }
}

function shuffleAndPrepareCards() { let s = [...allCards].sort(() => 0.5 - Math.random()); state.shuffledCards = {}; for (let i = 0; i < s.length; i++) { state.shuffledCards[i + 1] = s[i]; } state.usedCardNumbers = []; }
function displayCardVault(winningTeam) { if (!elements.cardVaultModal) return; hideAllModals(); elements.cardGrid.innerHTML = ''; for (let i = 1; i <= allCards.length; i++) { const c = document.createElement('button'); c.className = 'card-button'; c.textContent = i; if (state.usedCardNumbers.includes(i)) { c.classList.add('used'); c.disabled = true; } c.addEventListener('click', () => handleCardClick(i, winningTeam)); elements.cardGrid.appendChild(c); } showModal(elements.cardVaultModal); }
function handleCardClick(cardNumber, winningTeam) { playSound('card_reveal'); const effect = state.shuffledCards[cardNumber]; elements.revealCardTitle.textContent = effect.Card_Title; elements.revealCardDescription.textContent = effect.Card_Description; elements.revealCardConfirmBtn.onclick = () => { state.usedCardNumbers.push(cardNumber); hideModal(elements.revealCardModal); applyCardEffect(effect, winningTeam); }; hideModal(elements.cardVaultModal); showModal(elements.revealCardModal); }
function roundToNearestFive(num) { return Math.round(num / 5) * 5; }

function applyCardEffect(effect, team) {
    const opponent = team === 'girls' ? 'boys' : 'girls';
    let effectApplied = true;
    let isNegative = ['SUBTRACT_POINTS', 'RESET_SCORE', 'HALVE_SCORE', 'REVERSE_CHARITY'].includes(effect.Effect_Type);

    if (isNegative && state.veto[team]) {
        if (confirm(`فريق ${team === 'girls' ? 'البنات' : 'الشباب'} يمتلك الفيتو! هل تريد استخدامه لإلغاء هذا الحكم؟`)) {
            state.veto[team] = false; playSound('positive_effect'); updateAllUI(); saveState(); return;
        }
    }

    if (effect.Sound_Effect) playSound(effect.Sound_Effect);
    else if (isNegative) playSound('negative_effect');
    else playSound('positive_effect');
    
    const value = parseInt(effect.Effect_Value) || 0;
    let target = effect.Target === 'OPPONENT' ? opponent : team;

    switch (effect.Effect_Type) {
        case 'ADD_POINTS': addPoints(target, value); break;
        case 'SUBTRACT_POINTS': addPoints(target, -value); break;
        case 'STEAL_POINTS': addPoints(team, value); addPoints(opponent, -value); break;
        case 'SWAP_SCORES': [state.girlsScore, state.boysScore] = [state.boysScore, state.girlsScore]; break;
        case 'RESET_SCORE': state[`${target}Score`] = 0; break;
        case 'EQUALIZE_SCORES': const avg = roundToNearestFive((state.girlsScore + state.boysScore) / 2); state.girlsScore = avg; state.boysScore = avg; break;
        case 'HALVE_SCORE': state[`${target}Score`] = roundToNearestFive(state[`${target}Score`] / 2); break;
        case 'SET_SCORE': state[`${target}Score`] = value; break;
        case 'IMMUNITY': if (!state.activeEffects[target]) state.activeEffects[target] = {}; state.activeEffects[target].immunity = value; break;
        case 'FREEZE_OPPONENT': if (!state.activeEffects[opponent]) state.activeEffects[opponent] = {}; state.activeEffects[opponent].freeze = value; break;
        case 'DOUBLE_NEXT_Q': if (!state.activeEffects[target]) state.activeEffects[target] = {}; state.activeEffects[target].double_next_q = value; break;
        case 'GRANT_VETO': state.veto[target] = true; break;
        case 'MANUAL_EFFECT': showInteractiveModal(effect, team); effectApplied = false; break;
        case 'NO_EFFECT': break;
        default: console.warn('Unknown effect type:', effect.Effect_Type); break;
    }
    if (effectApplied) {
        updateAllUI();
        saveState();
    }
}

function updateVisualAids() {
    ['girls', 'boys'].forEach(team => {
        const container = elements[`${team}StatusIcons`];
        if (!container) return;
        container.innerHTML = '';
        const effects = state.activeEffects[team] || {};
        if (state.veto[team]) container.innerHTML += `<div class="status-icon" title="فيتو">⚖️</div>`;
        if (effects.freeze > 0) container.innerHTML += `<div class="status-icon" title="تجميد (${effects.freeze} دور)">❄️<span>${effects.freeze}</span></div>`;
        if (effects.immunity > 0) container.innerHTML += `<div class="status-icon" title="حصانة (${effects.immunity} دور)">🛡️<span>${effects.immunity}</span></div>`;
        if (effects.double_next_q > 0) container.innerHTML += `<div class="status-icon" title="نقاط مضاعفة للسؤال القادم">x2</div>`;
    });
}

function showInteractiveModal(effect, team) {
    hideAllModals();
    elements.interactiveTitle.textContent = effect.Card_Title;
    elements.interactiveDescription.textContent = effect.Card_Description;
    elements.interactiveButtons.innerHTML = '';
    elements.interactiveInputArea.classList.add('hidden');
    
    const config = effect.Manual_Config || '';
    if (config.startsWith('task')) {
        const successBtn = document.createElement('button');
        successBtn.textContent = `نجح (+${effect.Effect_Value})`;
        successBtn.onclick = () => { addPoints(team, parseInt(effect.Effect_Value)); hideModal(elements.interactiveModal); };
        const failBtn = document.createElement('button');
        failBtn.textContent = 'فشل';
        failBtn.onclick = () => hideModal(elements.interactiveModal);
        elements.interactiveButtons.append(successBtn, failBtn);
    } else if (config.startsWith('manual')) {
        elements.interactiveInputArea.classList.remove('hidden');
        elements.manualPointsInput.value = '';
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = 'تأكيد';
        confirmBtn.onclick = () => {
            const points = parseInt(elements.manualPointsInput.value) || 0;
            addPoints(team, points);
            hideModal(elements.interactiveModal);
        };
        elements.interactiveButtons.append(confirmBtn);
    } else {
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'تم';
        closeBtn.onclick = () => hideModal(elements.interactiveModal);
        elements.interactiveButtons.append(closeBtn);
    }
    showModal(elements.interactiveModal);
}

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
    } catch (error) { document.body.innerHTML = `<h1>فشل تحميل بيانات اللعبة</h1><p>${error.message}</p><p>تأكد من صحة الرابط ومفتاح API وإعدادات المشاركة للجدول.</p>`; }
}

function attachEventListeners() {
    if (elements.nextQuestionBtn) elements.nextQuestionBtn.addEventListener('click', () => {
        if (!state.gameActive) { alert("الجولة متوقفة!"); return; }
        if (availableQuestions.length === 0) { alert("انتهت الأسئلة!"); return; }
        playSound('click');
        state.questionNumber++;
        const randIdx = Math.floor(Math.random() * availableQuestions.length);
        const question = availableQuestions.splice(randIdx, 1)[0];
        state.usedQuestionIds.push(question.id);
        elements.modalQuestionArea.innerHTML = `<p>${question.question_text || ''}</p>`;
        if (question.image_url) { const img = document.createElement('img'); img.src = question.image_url; elements.modalQuestionArea.appendChild(img); }
        elements.modalAnswerArea.textContent = question.answer;
        elements.modalAnswerArea.classList.add('hidden');
        elements.toggleAnswerBtn.textContent = "إظهار الإجابة";
        showModal(elements.questionModal);
        saveState();
    });

    if (elements.questionAwardButtons) elements.questionAwardButtons.forEach(button => {
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
            if (!state.gameActive && action === 'add' && !state.countdownActive) return;
            playSound('click');
            addPoints(team, points, false);
        });
    });

    if (elements.roundControls) elements.roundControls.forEach(button => {
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

    if (elements.stopCountdownBtn) elements.stopCountdownBtn.addEventListener('click', () => {
        playSound('click'); clearInterval(countdownInterval); stopSound('countdown');
        hideModal(elements.celebrationOverlay);
        state.gameActive = true; state.countdownActive = false;
        saveState();
    });
    
    if (elements.addSupporterBtn) {
        elements.addSupporterBtn.addEventListener('click', () => {
            if (elements.supporterModal) showModal(elements.supporterModal);
        });
    }

    if (elements.supporterForm) {
        elements.supporterForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const nameInput = document.getElementById('supporter-name');
            const photoInput = document.getElementById('supporter-photo');
            const teamInput = document.querySelector('input[name="team"]:checked');
            if (!nameInput || !photoInput || !teamInput) return;
            const name = nameInput.value; const team = teamInput.value;
            if (name && photoInput.files.length > 0) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const photoSrc = e.target.result;
                    const list = elements[`${team}SupportersList`];
                    const supporterCard = document.createElement('div');
                    supporterCard.className = 'supporter-card';
                    supporterCard.innerHTML = `<img src="${photoSrc}" alt="${name}"><p>${name}</p>`;
                    if (list) list.appendChild(supporterCard);
                    playSound('supporter');
                    if(elements.announcementPhoto) elements.announcementPhoto.src = photoSrc;
                    if(elements.announcementText) elements.announcementText.textContent = `${name} يدعم فريق ${team === 'girls' ? 'البنات' : 'الشباب'}`;
                    if(elements.supporterAnnouncement) {
                        elements.supporterAnnouncement.classList.remove('hidden');
                        setTimeout(() => { elements.supporterAnnouncement.classList.add('hidden'); }, 4000);
                    }
                };
                reader.readAsDataURL(photoInput.files[0]);
                elements.supporterForm.reset();
                hideModal(elements.supporterModal);
            }
        });
    }

    if (elements.settleRoundBtn) elements.settleRoundBtn.addEventListener('click', () => { if (state.gameActive && elements.chooseTeamModal) showModal(elements.chooseTeamModal); });
    if (elements.chooseTeamModal) elements.chooseTeamModal.querySelectorAll('.award-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const team = e.target.dataset.team;
            hideModal(elements.chooseTeamModal);
            if (state.gameActive) triggerWinSequence(true, team);
        });
    });
    
    if (elements.allCloseButtons) elements.allCloseButtons.forEach(btn => btn.addEventListener('click', () => hideAllModals()));
    if (elements.resetRoundBtn) elements.resetRoundBtn.addEventListener('click', startNewRound);
    if (elements.newDayBtn) elements.newDayBtn.addEventListener('click', startNewDay);
    if (elements.newRoundBtnCelebration) elements.newRoundBtnCelebration.addEventListener('click', startNewRound);
    if (elements.toggleAnswerBtn) elements.toggleAnswerBtn.addEventListener('click', () => { if (elements.modalAnswerArea) elements.modalAnswerArea.classList.toggle('hidden'); });
}

// --- INITIALIZE ---
initializeGame();
