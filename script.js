// --- CONFIGURATION ---
// ! هام: تأكد من أن GID (الرقم بعد /values/) صحيح لكل تاب
const GOOGLE_SHEET_ID = '1GYDE5x9uumXhWZ2QCTQKdtYtb72izVy0cwPsIQr08ic';
const API_KEY = 'AIzaSyAc1zPbwDhMh3gc_qdPmNwbgd8ubcrG55o'; // ! ضع مفتاح API الخاص بك هنا
const QUESTIONS_SHEET_URL = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/1!A:F?key=${API_KEY}`;
const CARDS_SHEET_URL = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/cards!A:F?key=${API_KEY}`;

const WINNING_SCORE = 200;
const QUESTION_POINTS = 20;
const MANUAL_POINTS_STEP = 5;

// --- AUDIO SETUP ---
const sounds = {
    click: new Audio('Button_click.mp3'), modal: new Audio('modal_sound.mp3'),
    point: new Audio('point_award.mp3'), win: new Audio('game_win.mp3'),
    countdown: new Audio('countdown.mp3'), supporter: new Audio('supporter_added.mp3'),
    sparkle: new Audio('sparkle.mp3'), card_reveal: new Audio('card_reveal.mp3'), // New Sound
    positive_effect: new Audio('positive_effect.mp3'), // New Sound
    negative_effect: new Audio('negative_effect.mp3') // New Sound
};
sounds.countdown.loop = true; sounds.modal.volume = 0.5;

let isAudioUnlocked = false;
function unlockAudio() { if (isAudioUnlocked) return; const silentSound = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA="); silentSound.play().catch(() => {}); isAudioUnlocked = true; }
function playSound(sound) { unlockAudio(); if (sounds[sound]) { sounds[sound].currentTime = 0; sounds[sound].play().catch(e => {}); } }
function stopSound(sound) { if (sounds[sound]) { sounds[sound].pause(); sounds[sound].currentTime = 0; } }

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
    // New Card Game Elements
    cardVaultModal: document.getElementById('card-vault-modal'), cardGrid: document.getElementById('card-grid'),
    interactiveModal: document.getElementById('interactive-modal'), interactiveTitle: document.getElementById('interactive-title'),
    interactiveDescription: document.getElementById('interactive-description'), interactiveTimer: document.getElementById('interactive-timer'),
    interactiveInputArea: document.getElementById('interactive-input-area'), manualPointsInput: document.getElementById('manual-points-input'),
    interactiveButtons: document.getElementById('interactive-buttons'),
};

// --- GAME STATE ---
let allQuestions = []; let allCards = [];
let availableQuestions = [];
let countdownInterval = null; let interactiveTimerInterval = null;

let state = {
    girlsScore: 0, boysScore: 0,
    girlsRoundsWon: 0, boysRoundsWon: 0,
    gameActive: true, usedQuestionIds: [],
    questionNumber: 0,
    shuffledCards: {}, usedCardNumbers: [],
    activeEffects: { girls: {}, boys: {} },
    veto: { girls: false, boys: false },
    lastNegativeEffect: null
};

// --- STATE & UI MANAGEMENT ---
function saveState() { try { localStorage.setItem('ronyGamesV2', JSON.stringify(state)); } catch (e) { console.error("Failed to save state:", e); } }
function loadState() { const savedState = localStorage.getItem('ronyGamesV2'); if (savedState) { Object.assign(state, JSON.parse(savedState)); } }
function updateScoresUI() { elements.girlsScore.textContent = state.girlsScore; elements.boysScore.textContent = state.boysScore; }
function updateRoundsUI() { elements.girlsRoundsCount.textContent = state.girlsRoundsWon; elements.boysRoundsCount.textContent = state.boysRoundsWon; }
function updateAllUI() { updateScoresUI(); updateRoundsUI(); updateVisualAids(); }
function showModal(modal, playSnd = true) { if (playSnd) playSound('modal'); modal.classList.remove('hidden'); }
function hideModal(modal, playSnd = true) { if (playSnd) playSound('modal'); modal.classList.add('hidden'); }
function hideAllModals() { elements.allModals.forEach(modal => modal.classList.add('hidden')); }

// --- CORE GAME LOGIC ---
function startNewRound() {
    playSound('click');
    state.girlsScore = 0; state.boysScore = 0; state.gameActive = true;
    state.questionNumber = 0;
    state.usedCardNumbers = []; state.shuffledCards = {};
    state.activeEffects = { girls: {}, boys: {} }; state.veto = { girls: false, boys: false };
    shuffleAndPrepareCards();
    updateAllUI();
    hideModal(elements.celebrationOverlay, false);
    saveState();
}

function startNewDay() {
    playSound('click');
    if (confirm("هل أنت متأكد أنك تريد بدء يوم جديد؟ سيتم مسح كل شيء.")) {
        localStorage.removeItem('ronyGamesV2');
        location.reload();
    }
}

function addPoints(team, points) {
    const opponent = team === 'girls' ? 'boys' : 'girls';
    let currentScore = state[`${team}Score`];
    let totalPointsToAdd = points;

    // Check for active effects (Freeze, Sabotage)
    if (totalPointsToAdd > 0 && state.activeEffects[team].freeze > 0) {
        console.log(`${team} is frozen. No points added.`);
        return; // No points added if frozen
    }
    if (totalPointsToAdd > 0 && state.activeEffects[team].sabotage > 0) {
        totalPointsToAdd = Math.floor(totalPointsToAdd / 2);
    }
    
    const newScore = currentScore + totalPointsToAdd;

    // Multi-round win logic
    if (newScore >= WINNING_SCORE) {
        const roundsWon = Math.floor(newScore / WINNING_SCORE);
        console.log(`${team} won ${roundsWon} rounds.`);
        state[`${team}RoundsWon`] += roundsWon;
        playSound('win');
        launchConfetti();
        updateRoundsUI();
        startNewRound(); // This resets scores to 0 for the next round
    } else {
        state[`${team}Score`] = newScore;
        updateScoresUI();
    }

    // Leech effect
    if (totalPointsToAdd > 0 && state.activeEffects[opponent].leech > 0) {
        const leechPoints = roundToNearestFive(Math.floor(totalPointsToAdd / 2));
        state[`${opponent}Score`] += leechPoints;
        console.log(`${opponent} leeched ${leechPoints} points.`);
    }

    updateAllUI();
    saveState();
}

// --- CARD GAME LOGIC ---
function shuffleAndPrepareCards() {
    let shuffled = [...allCards].sort(() => 0.5 - Math.random());
    state.shuffledCards = {};
    for (let i = 0; i < shuffled.length; i++) {
        state.shuffledCards[i + 1] = shuffled[i];
    }
    state.usedCardNumbers = [];
    console.log(`Cards shuffled for the new round.`);
}

function displayCardVault(winningTeam) {
    hideAllModals();
    elements.cardGrid.innerHTML = ''; // Clear previous grid
    for (let i = 1; i <= allCards.length; i++) {
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
    state.usedCardNumbers.push(cardNumber);
    const effect = state.shuffledCards[cardNumber];
    
    // Animate the selected card
    const cardButton = elements.cardGrid.querySelector(`[data-card-number='${cardNumber}']`);
    cardButton.classList.add('used');
    cardButton.disabled = true;
    
    setTimeout(() => {
        hideModal(elements.cardVaultModal, false);
        applyCardEffect(effect, winningTeam);
    }, 500); // Wait half a second for effect
}

function roundToNearestFive(num) {
    return Math.floor(num / 5) * 5;
}

// The master function for all card effects
function applyCardEffect(effect, team) {
    const opponent = team === 'girls' ? 'boys' : 'girls';
    let effectApplied = true;

    // VETO CHECK
    const isNegative = effect.Effect_Type.includes('SUBTRACT') || effect.Effect_Type.includes('RESET') || effect.Effect_Type.includes('HALVE') || effect.Effect_Type.includes('LOSE');
    if (isNegative && state.veto[team]) {
        if (confirm(`فريق ${team === 'girls' ? 'البنات' : 'الشباب'} يمتلك الفيتو! هل تريد استخدامه لإلغاء هذا الحكم؟`)) {
            state.veto[team] = false;
            playSound('positive_effect');
            updateVisualAids();
            saveState();
            return; // Stop the effect
        }
    }

    if(isNegative) playSound('negative_effect'); else playSound('positive_effect');
    
    // Save last negative effect for REVENGE card
    if(isNegative) { state.lastNegativeEffect = { effect, team }; }

    switch (effect.Effect_Type) {
        // --- Point Effects ---
        case 'ADD_POINTS': addPoints(effect.Target === 'BOTH' ? 'girls' : team, parseInt(effect.Effect_Value)); if(effect.Target === 'BOTH') addPoints('boys', parseInt(effect.Effect_Value)); break;
        case 'SUBTRACT_POINTS': addPoints(effect.Target === 'SELF' ? team : opponent, -parseInt(effect.Effect_Value)); break;
        case 'STEAL_POINTS': addPoints(team, parseInt(effect.Effect_Value)); addPoints(opponent, -parseInt(effect.Effect_Value)); break;
        
        // --- Strategic Effects ---
        case 'SWAP_SCORES': [state.girlsScore, state.boysScore] = [state.boysScore, state.girlsScore]; break;
        case 'RESET_SCORE': state[`${effect.Target === 'SELF' ? team : opponent}Score`] = 0; break;
        case 'EQUALIZE_SCORES': const total = state.girlsScore + state.boysScore; const avg = roundToNearestFive(Math.floor(total / 2)); state.girlsScore = avg; state.boysScore = avg; break;
        case 'CHARITY': const higherTeam = state.girlsScore > state.boysScore ? 'girls' : 'boys'; const lowerTeam = higherTeam === 'girls' ? 'boys' : 'girls'; const charityAmount = roundToNearestFive(Math.floor(state[`${higherTeam}Score`] / 2)); addPoints(higherTeam, -charityAmount); addPoints(lowerTeam, charityAmount); break;
        case 'REVERSE_CHARITY': const higher = state.girlsScore > state.boysScore ? 'girls' : 'boys'; const lower = higher === 'girls' ? 'boys' : 'girls'; const reverseCharityAmount = roundToNearestFive(Math.floor(state[`${lower}Score`] / 2)); addPoints(lower, -reverseCharityAmount); addPoints(higher, reverseCharityAmount); break;
        case 'SET_SCORE': state[`${effect.Target === 'SELF' ? team : opponent}Score`] = parseInt(effect.Effect_Value); break;
        
        // --- Percentage & Conditional Effects ---
        case 'HALVE_IF_OVER_100': if (state[`${team}Score`] > 100) { state[`${team}Score`] = roundToNearestFive(Math.floor(state[`${team}Score`] / 2)); } break;
        case 'HALVE_SCORE': state[`${opponent}Score`] = roundToNearestFive(Math.floor(state[`${opponent}Score`] / 2)); break;
        case 'LOSE_QUARTER_SCORE': state[`${team}Score`] = roundToNearestFive(state[`${team}Score`] * 0.75); break;
        case 'SUBTRACT_HALF_OPPONENT_SCORE': const amountToSubtract = roundToNearestFive(Math.floor(state[`${opponent}Score`] / 2)); addPoints(team, -amountToSubtract); break;
        case 'CONDITIONAL_ADD_GIRLS': addPoints(team, team === 'girls' ? 30 : 10); break;
        case 'CONDITIONAL_ADD_BOYS': addPoints(team, team === 'boys' ? 30 : 10); break;
        case 'ROBIN_HOOD': if (state[`${team}Score`] < state[`${opponent}Score`]) { const robinAmount = roundToNearestFive(Math.floor(state[`${opponent}Score`] * 0.25)); addPoints(opponent, -robinAmount); addPoints(team, robinAmount); } break;

        // --- State-based & Future Effects ---
        case 'IMMUNITY': state.activeEffects[team].immunity = parseInt(effect.Effect_Value); break;
        case 'FREEZE_OPPONENT': state.activeEffects[opponent].freeze = parseInt(effect.Effect_Value); break;
        case 'DOUBLE_NEXT_Q': state.activeEffects[team].double_next_q = 1; break;
        case 'GRANT_VETO': state.veto[team] = true; break;
        case 'REVENGE': if(state.lastNegativeEffect) { applyCardEffect(state.lastNegativeEffect.effect, opponent); } break;
        case 'TAXES': state.activeEffects[team].taxes = parseInt(effect.Effect_Value); break;
        case 'REFLECTIVE_SHIELD': state.activeEffects[team].shield = 1; break;
        case 'SABOTAGE': state.activeEffects[opponent].sabotage = parseInt(effect.Effect_Value); break;
        case 'GOLDEN_GOOSE': state.activeEffects[team].golden_goose = parseInt(effect.Effect_Value); break;
        case 'INFLATION': state.activeEffects.girls.inflation = parseInt(effect.Effect_Value); state.activeEffects.boys.inflation = parseInt(effect.Effect_Value); break;
        case 'WINNING_STREAK': state.activeEffects[team].winning_streak = 1; break;
        case 'LEECH': state.activeEffects[team].leech = parseInt(effect.Effect_Value); break;
        case 'GENEROSITY': 
            // This is complex, would need to store history of last winners. For now, a simpler version:
            addPoints(team, -QUESTION_POINTS); addPoints(opponent, QUESTION_POINTS);
            break;
        
        // --- Player Choice & Random ---
        case 'GAMBLE': Math.random() < 0.5 ? addPoints(team, 50) : addPoints(team, -30); break;
        case 'PLAYER_CHOICE_RISK': showInteractiveModal(effect, team); effectApplied = false; break;

        // --- Manual & Other ---
        case 'MANUAL_EFFECT': showInteractiveModal(effect, team); effectApplied = false; break;
        case 'SHOW_IMAGE': showInteractiveModal(effect, team); effectApplied = false; break;
        case 'COPYCAT': break; // Needs implementation
        case 'NO_EFFECT': break; // Do nothing
        default: console.warn('Unknown effect type:', effect.Effect_Type); break;
    }
    
    if (effectApplied) {
        updateAllUI();
        saveState();
    }
}

function showInteractiveModal(effect, team) {
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

    if (configType === 'task') {
        const successBtn = document.createElement('button');
        successBtn.textContent = `نجح (+${effect.Effect_Value})`;
        successBtn.className = 'interactive-btn-success';
        successBtn.onclick = () => { addPoints(team, parseInt(effect.Effect_Value)); hideModal(elements.interactiveModal); };
        
        const failBtn = document.createElement('button');
        failBtn.textContent = 'فشل';
        failBtn.className = 'interactive-btn-fail';
        failBtn.onclick = () => hideModal(elements.interactiveModal);

        elements.interactiveButtons.append(successBtn, failBtn);

        if (configValue) {
            let timer = parseInt(configValue);
            elements.interactiveTimer.textContent = timer;
            elements.interactiveTimer.classList.remove('hidden');
            interactiveTimerInterval = setInterval(() => {
                timer--;
                elements.interactiveTimer.textContent = timer;
                if(timer <= 0) {
                    clearInterval(interactiveTimerInterval);
                    hideModal(elements.interactiveModal);
                }
            }, 1000);
        }
    } else if (configType === 'support' || configType === 'deduct' || configType === 'manual_add' || configType === 'manual_subtract' || configType === 'manual_multiply') {
        elements.manualPointsInput.value = '';
        elements.interactiveInputArea.classList.remove('hidden');
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = 'تأكيد';
        confirmBtn.className = 'interactive-btn-confirm';
        
        confirmBtn.onclick = () => {
            let points = parseInt(elements.manualPointsInput.value) || 0;
            if (configType === 'deduct' || configType === 'manual_subtract') points = -Math.abs(points);
            if (configType === 'manual_multiply') points *= parseInt(effect.Effect_Value);
            if (configType === 'manual_add') points *= 5; // As requested for name
            if (configType === 'manual_subtract') points *= 5; // As requested for name

            addPoints(team, points);
            hideModal(elements.interactiveModal);
        };
        elements.interactiveButtons.append(confirmBtn);

    } else if (configType === 'choice') {
        // ... Logic for custom choice buttons
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'إغلاق';
        closeBtn.onclick = () => hideModal(elements.interactiveModal);
        elements.interactiveButtons.append(closeBtn);

    } else if (effect.Effect_Type === 'SHOW_IMAGE') {
        // ... Logic to show image
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'إغلاق';
        closeBtn.onclick = () => hideModal(elements.interactiveModal);
        elements.interactiveButtons.append(closeBtn);

    } else { // 'info' and default
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'تم';
        closeBtn.className = 'interactive-btn-confirm';
        closeBtn.onclick = () => hideModal(elements.interactiveModal);
        elements.interactiveButtons.append(closeBtn);
    }

    showModal(elements.interactiveModal);
}

function updateVisualAids() {
    ['girls', 'boys'].forEach(team => {
        const container = elements[`${team}StatusIcons`];
        container.innerHTML = '';
        const effects = state.activeEffects[team];

        if (state.veto[team]) container.innerHTML += `<div class="status-icon" title="فيتو">⚖️</div>`;
        if (effects.freeze > 0) container.innerHTML += `<div class="status-icon" title="تجميد">❄️<span>${effects.freeze}</span></div>`;
        if (effects.immunity > 0) container.innerHTML += `<div class="status-icon" title="حصانة">🛡️<span>${effects.immunity}</span></div>`;
        if (effects.double_next_q > 0) container.innerHTML += `<div class="status-icon" title="نقاط مضاعفة">x2</div>`;
        // Add more icons for other effects as needed
    });
}

// --- INITIALIZATION & EVENT LISTENERS ---
async function initializeGame() {
    loadState();
    updateAllUI();
    attachEventListeners();

    try {
        const [questionsResponse, cardsResponse] = await Promise.all([
            fetch(QUESTIONS_SHEET_URL),
            fetch(CARDS_SHEET_URL)
        ]);

        if (!questionsResponse.ok) throw new Error('Failed to load questions');
        if (!cardsResponse.ok) throw new Error('Failed to load cards');

        const questionsData = await questionsResponse.json();
        const cardsData = await cardsResponse.json();
        
        allQuestions = (questionsData.values || []).slice(1).map(row => ({
            id: row[0], type: row[1], question_text: row[2], image_url: row[3], answer: row[4], category: row[5] || 'عام'
        })).filter(q => q.id);

        allCards = (cardsData.values || []).slice(1).map(row => ({
            Card_Title: row[0], Card_Description: row[1], Effect_Type: row[2], 
            Effect_Value: row[3], Target: row[4], Manual_Config: row[5] || ''
        })).filter(c => c.Card_Title);

        availableQuestions = allQuestions.filter(q => !state.usedQuestionIds.includes(q.id));
        console.log(`${availableQuestions.length} of ${allQuestions.length} questions available.`);
        console.log(`${allCards.length} cards loaded.`);
        
        shuffleAndPrepareCards();

    } catch (error) {
        console.error('فشل في تحميل بيانات اللعبة:', error);
        document.body.innerHTML = `<h1>فشل تحميل بيانات اللعبة</h1><p>${error.message}</p>`;
    }
}


function attachEventListeners() {
    elements.nextQuestionBtn.addEventListener('click', () => {
        playSound('click');
        if (!state.gameActive) { alert("الجولة انتهت!"); return; }
        if (availableQuestions.length === 0) { alert("انتهت جميع الأسئلة!"); return; }
        
        state.questionNumber++;
        // Simple random question logic for now
        const randomIndex = Math.floor(Math.random() * availableQuestions.length);
        const currentQuestion = availableQuestions.splice(randomIndex, 1)[0];
        state.usedQuestionIds.push(currentQuestion.id);

        elements.modalQuestionArea.innerHTML = currentQuestion.question_text || '';
        if (currentQuestion.image_url) {
            const img = document.createElement('img');
            img.src = currentQuestion.image_url;
            elements.modalQuestionArea.appendChild(img);
        }
        elements.modalAnswerArea.textContent = currentQuestion.answer;
        elements.modalAnswerArea.classList.add('hidden');
        elements.toggleAnswerBtn.textContent = "إظهار الإجابة";

        showModal(elements.questionModal);
        saveState();
    });

    elements.awardButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            playSound('point');
            if (!state.gameActive) return;
            const winningTeam = event.target.dataset.team;
            
            // Add points for the question
            addPoints(winningTeam, QUESTION_POINTS);
            
            // Check for card question
            if (state.questionNumber % 2 === 0) {
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
            addPoints(team, points);
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

    // ... other listeners like supporter form, close buttons etc. are mostly the same
    elements.resetRoundBtn.addEventListener('click', startNewRound);
    elements.newRoundBtnCelebration.addEventListener('click', startNewRound);
    elements.newDayBtn.addEventListener('click', startNewDay);
    elements.allCloseButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            clearInterval(interactiveTimerInterval); // Clear any active timers
            hideAllModals();
        });
    });
}

initializeGame();
