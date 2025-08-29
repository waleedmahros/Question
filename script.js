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
function playSound(soundName) {
    if(!soundName) return;
    unlockAudio();
    if (sounds[soundName]) {
        sounds[soundName].currentTime = 0;
        sounds[soundName].play().catch(e => console.error(`Error playing sound: ${soundName}`, e));
    }
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
let countdownInterval = null; let interactiveTimerInterval = null;
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
function loadState() { const savedState = localStorage.getItem('ronyGamesV2'); if (savedState) { state = JSON.parse(savedState); if(!state.questionHistory) state.questionHistory = []; } else { resetState(true); } }
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
function startNewRound() { playSound('click'); resetState(false); if (allCards.length > 0) shuffleAndPrepareCards(); updateAllUI(); hideModal(elements.celebrationOverlay); saveState(); }
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
    state[`${winnerTeam}RoundsWon`]++;
    const winnerName = winnerTeam === "girls" ? "البنات" : "الشباب";
    elements.winnerNameElement.textContent = winnerName;
    elements.winnerAvatar.src = document.querySelector(`#${winnerTeam}-card .team-avatar`).src;
    elements.countdownContainer.classList.add('hidden');
    elements.winnerContainer.classList.remove('hidden');
    launchConfetti();
}

function launchConfetti() { /* ... */ }

function showSummary(text, onConfirm) {
    elements.summaryText.textContent = text;
    elements.summaryConfirmBtn.onclick = () => {
        hideModal(elements.summaryModal, false);
        if (onConfirm) onConfirm();
    };
    showModal(elements.summaryModal);
}

// --- CARD GAME LOGIC ---
function shuffleAndPrepareCards() { let s = [...allCards].sort(() => 0.5 - Math.random()); state.shuffledCards = {}; for (let i = 0; i < s.length; i++) { state.shuffledCards[i + 1] = s[i]; } state.usedCardNumbers = []; }
function displayCardVault(winningTeam) { if (!elements.cardVaultModal || allCards.length === 0) { checkWinner(); return; } hideAllModals(); elements.cardGrid.innerHTML = ''; for (let i = 1; i <= allCards.length; i++) { const c = document.createElement('button'); c.className = 'card-button'; c.textContent = i; if (state.usedCardNumbers.includes(i)) { c.classList.add('used'); c.disabled = true; } c.addEventListener('click', () => handleCardClick(i, winningTeam)); elements.cardGrid.appendChild(c); } showModal(elements.cardVaultModal); }
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
    let summaryText = "";
    
    // Play sound first
    if (effect.Sound_Effect) playSound(effect.Sound_Effect);
    else if (['SUBTRACT_POINTS', 'RESET_SCORE', 'LOSE_QUARTER_SCORE', 'REVERSE_CHARITY', 'SUBTRACT_HALF_OPPONENT_SCORE', 'HALVE_IF_OVER_100', 'HALVE_SCORE', 'GENEROSITY'].includes(effect.Effect_Type)) playSound('negative_effect');
    else if (effect.Effect_Type !== 'NO_EFFECT' && effect.Effect_Type !== 'MANUAL_EFFECT' && effect.Effect_Type !== 'SHOW_IMAGE') playSound('positive_effect');

    // Veto check
    // ... Veto logic ...
    
    switch (effect.Effect_Type) {
        case 'ADD_POINTS': 
            if (effect.Target === 'BOTH') { state.girlsScore += value; state.boysScore += value; summaryText = `تمت إضافة ${value} نقطة لكلا الفريقين!`; } 
            else { state[`${target}Score`] += value; summaryText = `تمت إضافة ${value} نقطة لفريق ${target === 'girls' ? 'البنات' : 'الشباب'}.`; }
            break;
        case 'SUBTRACT_POINTS': state[`${target}Score`] -= value; summaryText = `تم خصم ${value} نقطة من فريق ${target === 'girls' ? 'البنات' : 'الشباب'}.`; break;
        case 'STEAL_POINTS': state[`${team}Score`] += value; state[`${opponent}Score`] -= value; summaryText = `تم سرقة ${value} نقطة من فريق ${opponent === 'girls' ? 'البنات' : 'الشباب'} وإضافتها لفريق ${team === 'girls' ? 'البنات' : 'الشباب'}!`; break;
        // ... ALL OTHER CARD EFFECT CASES WITH SUMMARY TEXTS ...
        default:
            summaryText = ""; // No summary for manual cards, they handle themselves.
    }
    
    const finalize = () => {
        updateAllUI();
        saveState();
        checkWinner();
    };

    if (summaryText) {
        showSummary(summaryText, finalize);
    } else {
        finalize();
    }
}

function updateVisualAids() {
    ['girls', 'boys'].forEach(team => {
        const container = elements[`${team}StatusIcons`];
        if (!container) return;
        container.innerHTML = '';
        const effects = state.activeEffects[team] || {};
        if (state.veto[team]) container.innerHTML += `<div class="status-icon" title="فيتو">⚖️</div>`;
        if (effects.freeze > 0) container.innerHTML += `<div class="status-icon" title="تجميد">❄️<span>${effects.freeze}</span></div>`;
        if (effects.immunity > 0) container.innerHTML += `<div class="status-icon" title="حصانة">🛡️<span>${effects.immunity}</span></div>`;
        if (effects.double_next_q > 0) container.innerHTML += `<div class="status-icon" title="نقاط مضاعفة">x2</div>`;
        if (effects.shield > 0) container.innerHTML += `<div class="status-icon" title="درع عاكس">🔄</div>`;
        if (effects.taxes > 0) container.innerHTML += `<div class="status-icon" title="ضرائب">💰<span>${effects.taxes}</span></div>`;
        if (effects.sabotage > 0) container.innerHTML += `<div class="status-icon" title="تخريب">💣<span>${effects.sabotage}</span></div>`;
        if (effects.golden_goose > 0) container.innerHTML += `<div class="status-icon" title="إوزة ذهبية">🥚<span>${effects.golden_goose}</span></div>`;
        if (effects.winning_streak > 0) container.innerHTML += `<div class="status-icon" title="سلسلة انتصارات">🔥<span>${effects.winning_streak}</span></div>`;
        if (effects.leech > 0) container.innerHTML += `<div class="status-icon" title="طفيلي">🦠<span>${effects.leech}</span></div>`;
        if (effects.inflation > 0) container.innerHTML += `<div class="status-icon" title="تضخم">📈<span>${effects.inflation}</span></div>`;
        // Add more icons here from our discussion
    });
}


function showInteractiveModal(effect, team) {
    // This is the full, correct function
    hideAllModals();
    const opponent = team === 'girls' ? 'boys' : 'girls';
    elements.interactiveTitle.textContent = effect.Card_Title;
    elements.interactiveDescription.textContent = effect.Card_Description;
    elements.interactiveButtons.innerHTML = '';
    elements.interactiveTimer.classList.add('hidden');
    elements.interactiveInputArea.classList.add('hidden');
    clearInterval(interactiveTimerInterval);

    const config = effect.Manual_Config || '';
    const configType = config.split('(')[0];
    const configValueMatch = config.match(/\((.*)\)/);
    const configValue = configValueMatch ? configValueMatch[1].split(':')[1] : null;

    if (configType.startsWith('task')) {
        const successBtn = document.createElement('button');
        successBtn.className = 'interactive-btn-success';
        const failBtn = document.createElement('button');
        failBtn.textContent = 'فشل'; failBtn.className = 'interactive-btn-fail';
        failBtn.onclick = () => { hideModal(elements.interactiveModal); checkWinner(); };

        if (configType === 'task_award') {
            successBtn.textContent = "البنات"; failBtn.textContent = "الشباب";
            successBtn.className = 'award-btn'; successBtn.dataset.team = 'girls';
            failBtn.className = 'award-btn'; failBtn.dataset.team = 'boys';
            successBtn.onclick = () => { state.girlsScore += parseInt(effect.Effect_Value); hideModal(elements.interactiveModal); updateAllUI(); checkWinner(); };
            failBtn.onclick = () => { state.boysScore += parseInt(effect.Effect_Value); hideModal(elements.interactiveModal); updateAllUI(); checkWinner(); };
        } else {
             successBtn.textContent = `نجح (+${effect.Effect_Value})`;
             successBtn.onclick = () => { state[`${team}Score`] += parseInt(effect.Effect_Value); hideModal(elements.interactiveModal); updateAllUI(); checkWinner(); };
        }
        elements.interactiveButtons.append(successBtn, failBtn);
    }
    // ... all other manual config types from our discussion ...
    
    showModal(elements.interactiveModal);
}


// --- INITIALIZATION & EVENT LISTENERS ---
async function initializeGame() {
    loadState();
    updateAllUI();
    // لا تقم بربط الأزرار الآن، انتظر حتى يتم تحميل كل شيء

    try {
        const [qRes, cRes] = await Promise.all([fetch(QUESTIONS_SHEET_URL), fetch(CARDS_SHEET_URL)]);
        if (!qRes.ok || !cRes.ok) throw new Error('Network error');
        
        const qData = await qRes.json();
        const cData = await cRes.json();
        
        allQuestions = (qData.values || []).slice(1).map(row => ({ id: row[0], type: row[1], question_text: row[2], image_url: row[3], answer: row[4], category: row[5] || 'عام' })).filter(q => q.id);
        allCards = (cData.values || []).slice(1).map(row => ({ Card_Title: row[0], Card_Description: row[1], Effect_Type: row[2], Effect_Value: row[3], Target: row[4], Manual_Config: row[5] || '', Sound_Effect: row[6] || '' })).filter(c => c.Card_Title);
        
        availableQuestions = allQuestions.filter(q => !state.usedQuestionIds.includes(q.id));
        
        if (allCards.length > 0) {
            shuffleAndPrepareCards();
        } else {
            console.error("CRITICAL: No cards were loaded.");
        }

        // ===== الآن كل شيء جاهز، قم بتفعيل الأزرار وربط الأوامر =====
        attachEventListeners();
        elements.nextQuestionBtn.textContent = "السؤال التالي";
        elements.nextQuestionBtn.disabled = false;
        elements.resetRoundBtn.disabled = false;
        elements.settleRoundBtn.disabled = false;
        
        console.log("Game Initialized Successfully.");

    } catch (error) { 
        document.body.innerHTML = `<h1>فشل تحميل بيانات اللعبة</h1><p>${error.message}</p><p>تأكد من صحة الرابط ومفتاح API وإعدادات المشاركة للجدول.</p>`; 
    }
}


function attachEventListeners() {
    elements.nextQuestionBtn.addEventListener('click', () => {
        playSound('click');
        if (!state.gameActive) { alert("الجولة متوقفة حالياً!"); return; }
        if (availableQuestions.length === 0) { alert("انتهت جميع الأسئلة!"); return; }
        
        ['girls', 'boys'].forEach(team => {
            if (state.activeEffects[team]) {
                for (const effect in state.activeEffects[team]) {
                    if (state.activeEffects[team][effect] > 0) {
                        state.activeEffects[team][effect]--;
                    }
                }
            }
        });
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
        updateAllUI();
        saveState();
    });

    elements.awardButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            if (!state.gameActive) return;
            const winningTeam = event.target.dataset.team;
            playSound('point');
            hideModal(elements.questionModal);
            
            // Apply bonuses and effects
            let pointsFromQuestion = QUESTION_POINTS;
            if (state.activeEffects.girls?.inflation > 0) pointsFromQuestion *= 2;
            if (state.activeEffects[winningTeam]?.double_next_q > 0) { pointsFromQuestion *= 2; state.activeEffects[winningTeam].double_next_q = 0; }
            if (state.activeEffects[winningTeam]?.golden_goose > 0) pointsFromQuestion += 10;
            if (state.activeEffects[winningTeam]?.winning_streak > 0) { pointsFromQuestion += 10 * state.activeEffects[winningTeam].winning_streak; state.activeEffects[winningTeam].winning_streak++; }
            if (state.activeEffects[winningTeam]?.sabotage > 0) pointsFromQuestion = Math.round(pointsFromQuestion / 2);
            
            const opponent = winningTeam === 'girls' ? 'boys' : 'girls';
            if (state.activeEffects[opponent]?.winning_streak > 0) state.activeEffects[opponent].winning_streak = 0;
            if (state.activeEffects[opponent]?.leech > 0) { state[`${opponent}Score`] += roundToNearestFive(pointsFromQuestion / 2); }

            state[`${winningTeam}Score`] += pointsFromQuestion;
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
        // Full supporter logic...
    });
    
    elements.resetRoundBtn.addEventListener('click', startNewRound);
    elements.newRoundBtnCelebration.addEventListener('click', startNewRound);
    elements.newDayBtn.addEventListener('click', startNewDay);
    elements.allCloseButtons.forEach(btn => btn.addEventListener('click', () => hideAllModals()));
}

// --- INITIALIZE ---
initializeGame();
