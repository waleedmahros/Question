// --- CONFIGURATION ---
const GOOGLE_SHEET_ID = '1GYDE5x9uumXhWZ2QCTQKdtYtb72izVy0cwPsIQr08ic';
const API_KEY = 'AIzaSyAc1zPbwDhMh3gc_qdPmNwbgd8ubcrG55o';
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
    unlockAudio();
    
    if (!sounds[soundName]) {
        console.log(`تحميل صوت جديد: ${soundName}`);
        sounds[soundName] = new Audio(`sounds/${soundName}.mp3`);
        
        sounds[soundName].addEventListener('error', (e) => {
            console.error(`خطأ في تحميل الصوت: ${soundName}`, e);
            if (sounds.click) {
                sounds.click.currentTime = 0;
                sounds.click.play().catch(() => {});
            }
        });
        
        sounds[soundName].addEventListener('loadeddata', () => {
            console.log(`تم تحميل الصوت بنجاح: ${soundName}`);
        });
    }
    
    if (sounds[soundName]) {
        sounds[soundName].currentTime = 0;
        sounds[soundName].play().catch(e => {
            console.error(`خطأ في تشغيل الصوت: ${soundName}`, e);
        });
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
        veto: { girls: false, boys: false }, lastNegativeEffect: null
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

function launchConfetti() {
    elements.confettiContainer.innerHTML = '';
    for (let i = 0; i < 100; i++) {
        const c = document.createElement('div');
        c.className = 'confetti';
        c.style.left = `${Math.random()*100}vw`;
        c.style.animationDelay = `${Math.random()*2}s`;
        c.style.backgroundColor=['#ff478a', '#00e1ff', '#ffd700', '#ffffff'][Math.floor(Math.random()*4)];
        elements.confettiContainer.appendChild(c);
    }
}

// --- CARD GAME LOGIC ---
function shuffleAndPrepareCards() { let s = [...allCards].sort(() => 0.5 - Math.random()); state.shuffledCards = {}; for (let i = 0; i < s.length; i++) { state.shuffledCards[i + 1] = s[i]; } state.usedCardNumbers = []; }
function displayCardVault(winningTeam) { if (!elements.cardVaultModal || allCards.length === 0) { checkWinner(); return; } hideAllModals(); elements.cardGrid.innerHTML = ''; for (let i = 1; i <= allCards.length; i++) { const c = document.createElement('button'); c.className = 'card-button'; c.textContent = i; if (state.usedCardNumbers.includes(i)) { c.classList.add('used'); c.disabled = true; } c.addEventListener('click', () => handleCardClick(i, winningTeam)); elements.cardGrid.appendChild(c); } showModal(elements.cardVaultModal); }
function handleCardClick(cardNumber, winningTeam) {
    if (state.usedCardNumbers.includes(cardNumber)) return;
    playSound("card_reveal");
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
    if (effect.Sound_Effect) {
        console.log(`تشغيل الصوت المخصص للكارت: ${effect.Sound_Effect}`);
        playSound(effect.Sound_Effect);
    }
}

function roundToNearestFive(num) { return Math.floor(num / 5) * 5; }

function applyCardEffect(effect, team) {
    console.log("=== تطبيق تأثير الكارت ===");
    console.log("اسم الكارت:", effect.Card_Title);
    console.log("نوع التأثير:", effect.Effect_Type);
    console.log("قيمة التأثير:", effect.Effect_Value);
    console.log("الهدف:", effect.Target);
    console.log("الفريق المطبق:", team);
    
    const opponent = team === 'girls' ? 'boys' : 'girls';
    const value = parseInt(effect.Effect_Value) || 0;
    let target = effect.Target === "OPPONENT" ? opponent : team;
    let effectApplied = true;

    // حفظ التأثير السلبي للانتقام
    if (isNegativeEffect(effect.Effect_Type) && effect.Effect_Type !== 'REVENGE') {
        state.lastNegativeEffect = {
            effect: {...effect},
            team: team,
            timestamp: Date.now()
        };
        console.log('تم حفظ التأثير السلبي للانتقام:', effect.Card_Title);
    }

    // التحقق من الحصانة ضد التأثيرات السلبية
    if (effect.Target !== 'BOTH' && 
        isNegativeEffect(effect.Effect_Type) && 
        state.activeEffects[target]?.immunity > 0) {
        console.log(`تم إلغاء التأثير بسبب الحصانة لدى فريق ${target}`);
        alert(`تم إلغاء تأثير ${effect.Card_Title} بسبب الحصانة لدى فريق ${target === 'girls' ? 'البنات' : 'الشباب'}`);
        updateAllUI();
        saveState();
        checkWinner();
        return;
    }

    // تشغيل الأصوات المناسبة
    if (["SUBTRACT_POINTS", "RESET_SCORE", "LOSE_QUARTER_SCORE", "REVERSE_CHARITY", "SUBTRACT_HALF_OPPONENT_SCORE", "HALVE_IF_OVER_100", "HALVE_SCORE", "GENEROSITY"].includes(effect.Effect_Type)) { 
        playSound("negative_effect"); 
    }
    else if (effect.Effect_Type !== "NO_EFFECT" && effect.Effect_Type !== "MANUAL_EFFECT" && effect.Effect_Type !== "SHOW_IMAGE" && effect.Sound_Effect === "") { 
        playSound("positive_effect"); 
    }

    console.log(`النقاط قبل التطبيق - البنات: ${state.girlsScore}, الشباب: ${state.boysScore}`);

    switch (effect.Effect_Type) {
        case 'ADD_POINTS': 
            if (effect.Target === 'BOTH') { 
                state.girlsScore += value; 
                state.boysScore += value; 
                console.log(`إضافة ${value} نقطة للفريقين`);
            } else { 
                state[`${target}Score`] += value; 
                console.log(`إضافة ${value} نقطة لفريق ${target}`);
            } 
            break;
        
        case 'SUBTRACT_POINTS': 
            state[`${target}Score`] = Math.max(0, state[`${target}Score`] - value); 
            console.log(`خصم ${value} نقطة من فريق ${target}`);
            break;
        
        case 'STEAL_POINTS': 
            const stealAmount = Math.min(value, state[`${opponent}Score`]);
            state[`${team}Score`] += stealAmount; 
            state[`${opponent}Score`] -= stealAmount; 
            console.log(`سرقة ${stealAmount} نقطة من ${opponent} إلى ${team}`);
            break;
        
        case 'SWAP_SCORES': 
            [state.girlsScore, state.boysScore] = [state.boysScore, state.girlsScore]; 
            console.log('تم تبديل النقاط بين الفريقين');
            break;
        
        case 'RESET_SCORE': 
            if (state[`${target}Score`] > 0) { 
                console.log(`إعادة تعيين نقاط فريق ${target} من ${state[`${target}Score`]} إلى 0`);
                state[`${target}Score`] = 0; 
            } 
            break;
        
        case 'EQUALIZE_SCORES': 
            const total = state.girlsScore + state.boysScore; 
            const avg = roundToNearestFive(Math.floor(total / 2)); 
            console.log(`توزيع النقاط بالتساوي: ${avg} لكل فريق`);
            state.girlsScore = avg; 
            state.boysScore = avg; 
            break;
        
        case 'CHARITY': 
            if (state.girlsScore !== state.boysScore) {
                const higherTeam = state.girlsScore > state.boysScore ? 'girls' : 'boys'; 
                const lowerTeam = higherTeam === 'girls' ? 'boys' : 'girls'; 
                if (state[`${higherTeam}Score`] > 0) { 
                    const charityAmount = roundToNearestFive(Math.floor(state[`${higherTeam}Score`] / 2)); 
                    state[`${higherTeam}Score`] -= charityAmount; 
                    state[`${lowerTeam}Score`] += charityAmount; 
                    console.log(`تطبيق الأعمال الخيرية: ${charityAmount} نقطة من ${higherTeam} إلى ${lowerTeam}`);
                }
            } else {
                console.log('الفريقان متعادلان، لا حاجة للأعمال الخيرية');
            }
            break;
        
        case 'REVERSE_CHARITY': 
            if (state.girlsScore !== state.boysScore) {
                const higher = state.girlsScore > state.boysScore ? 'girls' : 'boys'; 
                const lower = higher === 'girls' ? 'boys' : 'girls'; 
                if (state[`${lower}Score`] > 0) { 
                    const reverseCharityAmount = roundToNearestFive(Math.floor(state[`${lower}Score`] / 2)); 
                    state[`${lower}Score`] -= reverseCharityAmount; 
                    state[`${higher}Score`] += reverseCharityAmount; 
                    console.log(`تطبيق الأعمال الخيرية العكسية: ${reverseCharityAmount} نقطة من ${lower} إلى ${higher}`);
                }
            } else {
                console.log('الفريقان متعادلان، لا حاجة للأعمال الخيرية');
            }
            break;
        
        case 'SET_SCORE': 
            const oldScore = state[`${target}Score`];
            if (oldScore < value) { 
                state[`${target}Score`] = value; 
                console.log(`رفع نقاط فريق ${target} من ${oldScore} إلى ${value}`);
            } else {
                console.log(`نقاط فريق ${target} (${oldScore}) أعلى من أو تساوي ${value}، لم يتم التغيير`);
            }
            break;
        
        case 'HALVE_IF_OVER_100': 
            if (state[`${team}Score`] > 100) { 
                const oldScore = state[`${team}Score`];
                state[`${team}Score`] = roundToNearestFive(Math.floor(state[`${team}Score`] / 2)); 
                console.log(`تنصيف نقاط فريق ${team} من ${oldScore} إلى ${state[`${team}Score`]}`);
            } 
            break;
        
        case 'HALVE_SCORE': 
            if (state[`${target}Score`] > 0) { 
                const oldScore = state[`${target}Score`];
                state[`${target}Score`] = roundToNearestFive(Math.floor(state[`${target}Score`] / 2)); 
                console.log(`تنصيف نقاط فريق ${target} من ${oldScore} إلى ${state[`${target}Score`]}`);
            } 
            break;
        
        case 'LOSE_QUARTER_SCORE': 
            if (state[`${target}Score`] > 0) { 
                const oldScore = state[`${target}Score`];
                state[`${target}Score`] = roundToNearestFive(state[`${target}Score`] * 0.75); 
                console.log(`فقدان ربع النقاط لفريق ${target} من ${oldScore} إلى ${state[`${target}Score`]}`);
            } 
            break;
        
        case 'SUBTRACT_HALF_OPPONENT_SCORE': 
            if (state[`${opponent}Score`] > 0) { 
                const amountToSubtract = roundToNearestFive(Math.floor(state[`${opponent}Score`] / 2)); 
                state[`${team}Score`] = Math.max(0, state[`${team}Score`] - amountToSubtract); 
                console.log(`خصم نصف نقاط الخصم (${amountToSubtract}) من فريق ${team}`);
            } 
            break;
        
        case 'CONDITIONAL_ADD_GIRLS': 
            const addValue = team === 'girls' ? 30 : 10;
            state[`${team}Score`] += addValue; 
            console.log(`إضافة شرطية: ${addValue} نقطة لفريق ${team}`);
            break;
        
        case 'CONDITIONAL_ADD_BOYS': 
            const addValueBoys = team === 'boys' ? 30 : 10;
            state[`${team}Score`] += addValueBoys; 
            console.log(`إضافة شرطية: ${addValueBoys} نقطة لفريق ${team}`);
            break;
        
        case 'ROBIN_HOOD': 
            if (state[`${team}Score`] < state[`${opponent}Score`] && state[`${opponent}Score`] > 0) { 
                const robinAmount = roundToNearestFive(Math.floor(state[`${opponent}Score`] * 0.25)); 
                state[`${opponent}Score`] -= robinAmount; 
                state[`${team}Score`] += robinAmount; 
                console.log(`روبن هود: سرقة ${robinAmount} من ${opponent} إلى ${team}`);
            } else {
                console.log('روبن هود: الشروط غير متوفرة');
            }
            break;
        
        case 'IMMUNITY': 
            if (!state.activeEffects[target]) state.activeEffects[target] = {};
            state.activeEffects[target].immunity = (state.activeEffects[target].immunity || 0) + value; 
            console.log(`منح حصانة لفريق ${target} لمدة ${value} أسئلة`);
            break;
        
        case 'FREEZE_OPPONENT': 
            if (!state.activeEffects[opponent]) state.activeEffects[opponent] = {};
            state.activeEffects[opponent].freeze = (state.activeEffects[opponent].freeze || 0) + value; 
            console.log(`تجميد فريق ${opponent} لمدة ${value} أسئلة`);
            break;
        
        case 'DOUBLE_NEXT_Q': 
            if (!state.activeEffects[target]) state.activeEffects[target] = {};
            state.activeEffects[target].double_next_q = (state.activeEffects[target].double_next_q || 0) + value; 
            console.log(`مضاعفة النقاط للسؤال القادم لفريق ${target}`);
            break;
        
        case 'GRANT_VETO': 
            state.veto[target] = true; 
            console.log(`منح الفيتو لفريق ${target}`);
            break;
        
        case 'REVENGE': 
            if(state.lastNegativeEffect) { 
                console.log('تطبيق الانتقام بناء على:', state.lastNegativeEffect.effect.Card_Title);
                applyCardEffect(state.lastNegativeEffect.effect, opponent);
            } else {
                console.log('لا يوجد تأثير سلبي سابق للانتقام منه');
                // بديل إذا لم يكن هناك تأثير سلبي سابق
                state[`${team}Score`] += 20;
            }
            break;
        
        case 'TAXES': 
            if (!state.activeEffects[team]) state.activeEffects[team] = {};
            state.activeEffects[team].taxes = (state.activeEffects[team].taxes || 0) + value; 
            console.log(`تطبيق ضرائب على فريق ${team} لمدة ${value} أسئلة`);
            break;
        
        case 'REFLECTIVE_SHIELD': 
            if (!state.activeEffects[target]) state.activeEffects[target] = {};
            state.activeEffects[target].shield = (state.activeEffects[target].shield || 0) + value; 
            console.log(`منح درع عاكس لفريق ${target} لمدة ${value} أسئلة`);
            break;
        
        case 'SABOTAGE': 
            if (!state.activeEffects[opponent]) state.activeEffects[opponent] = {};
            state.activeEffects[opponent].sabotage = (state.activeEffects[opponent].sabotage || 0) + value; 
            console.log(`تخريب فريق ${opponent} لمدة ${value} أسئلة`);
            break;
        
        case 'GOLDEN_GOOSE': 
            if (!state.activeEffects[team]) state.activeEffects[team] = {};
            state.activeEffects[team].golden_goose = (state.activeEffects[team].golden_goose || 0) + value; 
            console.log(`إوزة ذهبية لفريق ${team} لمدة ${value} أسئلة`);
            break;
        
        case 'INFLATION': 
            if (!state.activeEffects.girls) state.activeEffects.girls = {};
            if (!state.activeEffects.boys) state.activeEffects.boys = {};
            state.activeEffects.girls.inflation = (state.activeEffects.girls.inflation || 0) + value; 
            state.activeEffects.boys.inflation = (state.activeEffects.boys.inflation || 0) + value; 
            console.log(`تطبيق تضخم على الفريقين لمدة ${value} أسئلة`);
            break;
        
        case 'WINNING_STREAK': 
            if (!state.activeEffects[team]) state.activeEffects[team] = {};
            if(!state.activeEffects[team].winning_streak) {
                state.activeEffects[team].winning_streak = 0;
            } 
            state.activeEffects[team].winning_streak = 1; 
            console.log(`بداية سلسلة انتصارات لفريق ${team}`);
            break;
        
        case 'LEECH': 
            if (!state.activeEffects[team]) state.activeEffects[team] = {};
            state.activeEffects[team].leech = (state.activeEffects[team].leech || 0) + value; 
            console.log(`طفيلي لفريق ${team} لمدة ${value} أسئلة`);
            break;
        
        case 'PLAYER_CHOICE_RISK': 
        case 'MANUAL_EFFECT': 
        case 'SHOW_IMAGE': 
        case 'GAMBLE':
            console.log('عرض نافذة تفاعلية للكارت');
            showInteractiveModal(effect, team);
            effectApplied = false;
            break;
        
        case 'NO_EFFECT': 
            console.log('لا يوجد تأثير');
            break;
        
        default: 
            console.warn('نوع تأثير غير معروف:', effect.Effect_Type); 
            break;
    }
    
    console.log(`النقاط بعد التطبيق - البنات: ${state.girlsScore}, الشباب: ${state.boysScore}`);
    console.log('=== انتهاء تطبيق التأثير ===');
    
    if (effectApplied) {
        updateAllUI();
        saveState();
        checkWinner();
    }
}

// تحديد إذا كان التأثير سلبيًا
function isNegativeEffect(effectType) {
    const negativeEffects = [
        'SUBTRACT_POINTS', 'RESET_SCORE', 'LOSE_QUARTER_SCORE', 
        'REVERSE_CHARITY', 'SUBTRACT_HALF_OPPONENT_SCORE', 
        'HALVE_IF_OVER_100', 'HALVE_SCORE', 'FREEZE_OPPONENT', 
        'SABOTAGE', 'TAXES', 'LEECH'
    ];
    return negativeEffects.includes(effectType);
}

// إصلاح الخطأ الإملائي في updateVisualAids
function updateVisualAids() {
    ['girls', 'boys'].forEach(team => {
        const container = elements[`${team}StatusIcons`];
        if (!container) return;
        container.innerHTML = '';
        const effects = state.activeEffects[team] || {};
        if (state.veto[team]) container.innerHTML += `<div class="status-icon" title="فيتو">⚖️</div>`;
        if (effects.freeze > 0) container.innerHTML += `<div class="status-icon" title="تجميد">❄️<span>${effects.freeze}</span></div>`;
        if (effects.immunity > 0) container.innerHTML += `<div class="status-icon" title="حصانة">🛡️<span>${effects.immunity}</span></div>`;
        if (effects.double_next_q > 0) container.innerHTML += `<div class="status-icon" title="نقاط مضاعفة للسؤال القادم">x2</div>`;
        if (effects.shield > 0) container.innerHTML += `<div class="status-icon" title="درع عاكس">🔄</div>`;
        if (effects.taxes > 0) container.innerHTML += `<div class="status-icon" title="ضرائب">💰<span>${effects.taxes}</span></div>`;
        if (effects.sabotage > 0) container.innerHTML += `<div class="status-icon" title="تخريب">💣<span>${effects.sabotage}</span></div>`;
        if (effects.golden_goose > 0) container.innerHTML += `<div class="status-icon" title="إوزة ذهبية">🥚<span>${effects.golden_goose}</span></div>`;
        if (effects.winning_streak > 0) container.innerHTML += `<div class="status-icon" title="سلسلة انتصارات">🔥<span>${effects.winning_streak}</span></div>`;
        if (effects.leech > 0) container.innerHTML += `<div class="status-icon" title="طفيلي">🦠<span>${effects.leech}</span></div>`;
        if (effects.inflation > 0) container.innerHTML += `<div class="status-icon" title="تضخم">📈<span>${effects.inflation}</span></div>`;
    });
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

    if (configType === 'task' || configType === 'task_award') {
        const successBtn = document.createElement('button');
        successBtn.textContent = `نجح (+${effect.Effect_Value})`; successBtn.className = 'interactive-btn-success';
        const failBtn = document.createElement('button');
        failBtn.textContent = 'فشل'; failBtn.className = 'interactive-btn-fail';
        failBtn.onclick = () => hideModal(elements.interactiveModal);

        if (configType === 'task_award') {
            successBtn.textContent = "البنات";
            failBtn.textContent = "الشباب";
            successBtn.className = 'award-btn'; successBtn.dataset.team = 'girls';
            failBtn.className = 'award-btn'; failBtn.dataset.team = 'boys';
            successBtn.onclick = () => { state.girlsScore += parseInt(effect.Effect_Value); hideModal(elements.interactiveModal); updateAllUI(); checkWinner(); };
            failBtn.onclick = () => { state.boysScore += parseInt(effect.Effect_Value); hideModal(elements.interactiveModal); updateAllUI(); checkWinner(); };
        } else {
             successBtn.onclick = () => { state[`${team}Score`] += parseInt(effect.Effect_Value); hideModal(elements.interactiveModal); updateAllUI(); checkWinner(); };
        }
        elements.interactiveButtons.append(successBtn, failBtn);
    } else if (['support', 'deduct', 'manual_add', 'manual_subtract', 'manual_multiply', 'manual_multiply_subtract'].includes(configType)) {
        elements.manualPointsInput.value = '';
        elements.interactiveInputArea.classList.remove('hidden');
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = 'تأكيد'; confirmBtn.className = 'interactive-btn-confirm';
        confirmBtn.onclick = () => {
            let points = parseInt(elements.manualPointsInput.value) || 0;
            if (configType === 'deduct') { 
                state[`${opponent}Score`] = Math.max(0, state[`${opponent}Score`] - points); 
            }
            else if (configType === 'manual_add') { 
                state[`${team}Score`] += (points * 5); 
            }
            else if (configType === 'manual_subtract') { 
                state[`${team}Score`] = Math.max(0, state[`${team}Score`] - (points * 5)); 
            }
            else if (configType === 'manual_multiply') { 
                state[`${team}Score`] += (points * 10); 
            }
            else if (configType === 'manual_multiply_subtract') { 
                state[`${team}Score`] = Math.max(0, state[`${team}Score`] - (points * 10)); 
            }
            else { 
                state[`${team}Score`] += points; 
            } // support
            hideModal(elements.interactiveModal); updateAllUI(); checkWinner();
        };
        elements.interactiveButtons.append(confirmBtn);
    } else if (configType === 'choice') {
        // Specific logic for choice cards
        if (effect.Card_Title.includes("تغامر")) {
            const btn1 = document.createElement('button'); btn1.textContent = "أخذ 20 نقطة"; btn1.className = 'interactive-btn-confirm';
            btn1.onclick = () => { state[`${team}Score`] += 20; hideModal(elements.interactiveModal); updateAllUI(); checkWinner(); };
            const btn2 = document.createElement('button'); btn2.textContent = "اختيار كارت جديد"; btn2.className = 'interactive-btn-choice';
            btn2.onclick = () => { hideModal(elements.interactiveModal); displayCardVault(team); };
            elements.interactiveButtons.append(btn1, btn2);
        } else if (effect.Card_Title.includes("اعمل الصح")) { // اعمل الصح
            const btn1 = document.createElement('button'); btn1.textContent = "تبرع بـ 50 نقطة"; btn1.className = 'interactive-btn-fail';
            btn1.onclick = () => { 
                state[`${team}Score`] = Math.max(0, state[`${team}Score`] - 50); 
                state[`${opponent}Score`] += 50; 
                hideModal(elements.interactiveModal); 
                updateAllUI(); 
                checkWinner(); 
            };
            const btn2 = document.createElement('button'); btn2.textContent = "العب مع الخصم"; btn2.className = 'interactive-btn-choice';
            btn2.onclick = () => hideModal(elements.interactiveModal);
            elements.interactiveButtons.append(btn1, btn2);
        } else {
            // Default choice behavior
            const closeBtn = document.createElement('button'); closeBtn.textContent = 'تم';
            closeBtn.className = 'interactive-btn-confirm'; closeBtn.onclick = () => hideModal(elements.interactiveModal);
            elements.interactiveButtons.append(closeBtn);
        }
    } else { // info, default
        const closeBtn = document.createElement('button'); closeBtn.textContent = 'تم';
        closeBtn.className = 'interactive-btn-confirm'; closeBtn.onclick = () => hideModal(elements.interactiveModal);
        elements.interactiveButtons.append(closeBtn);
    }
    showModal(elements.interactiveModal);
}

// دالة محسنة لعرض إعلان الداعم
function showSupporterAnnouncement(name, photoUrl, team) {
    // إعداد المحتوى
    elements.announcementPhoto.src = photoUrl;
    elements.announcementText.innerHTML = `🛡️ ${name}<br>ينضم كدرع لفريق ${team === 'girls' ? 'البنات' : 'الشباب'}!`;
    
    // تشغيل الصوت
    playSound('supporter');
    
    // إضافة تأثير blur للخلفية
    document.body.classList.add('supporter-announcement-active');
    
    // عرض الشاشة
    elements.supporterAnnouncement.classList.remove('hidden');
    
    // إضافة animation للظهور
    setTimeout(() => {
        elements.supporterAnnouncement.classList.add('show');
    }, 50);

    // إخفاء الشاشة بعد 5 ثواني
    setTimeout(() => {
        elements.supporterAnnouncement.classList.remove('show');
        
        // إزالة التأثيرات بعد انتهاء الانتقال
        setTimeout(() => {
            elements.supporterAnnouncement.classList.add('hidden');
            document.body.classList.remove('supporter-announcement-active');
        }, 500);
    }, 5000);
}

// --- INITIALIZATION & EVENT LISTENERS ---
async function initializeGame() {
    loadState();
    updateAllUI();
    attachEventListeners();
    try {
        const [qRes, cRes] = await Promise.all([fetch(QUESTIONS_SHEET_URL), fetch(CARDS_SHEET_URL)]);
        if (!qRes.ok || !cRes.ok) throw new Error('Network error');
        const qData = await qRes.json();
        const cData = await cRes.json();
        allQuestions = (qData.values || []).slice(1).map(row => ({ id: row[0], type: row[1], question_text: row[2], image_url: row[3], answer: row[4], category: row[5] || 'عام' })).filter(q => q.id);
        allCards = (cData.values || []).slice(1).map(row => ({ Card_Title: row[0], Card_Description: row[1], Effect_Type: row[2], Effect_Value: row[3], Target: row[4], Manual_Config: row[5] || '', Sound_Effect: row[6] || '' })).filter(c => c.Card_Title);
        availableQuestions = allQuestions.filter(q => !state.usedQuestionIds.includes(q.id));
        if (allCards.length > 0) shuffleAndPrepareCards();
        else { console.error("CRITICAL: No cards were loaded."); alert("لم يتم تحميل الكروت! تأكد من اسم التاب وإعدادات المشاركة."); }
    } catch (error) { document.body.innerHTML = `<h1>فشل تحميل بيانات اللعبة</h1><p>${error.message}</p>`; }
}

function awardPoints(team, points) {
    const opponent = team === 'girls' ? 'boys' : 'girls';
    let finalPoints = points;

    // التحقق من تأثيرات الفريق الفائز
    if (state.activeEffects[team]) {
        // التحقق من التجمد
        if (state.activeEffects[team].freeze > 0) {
            alert(`فريق ${team === 'girls' ? 'البنات' : 'الشباب'} مجمد ولا يمكنه تلقي النقاط!`);
            return;
        }
        
        if (state.activeEffects[team].double_next_q > 0) {
            finalPoints *= 2;
            state.activeEffects[team].double_next_q = 0; // استخدم التأثير مرة واحدة
        }
        if (state.activeEffects[team].inflation > 0) {
            finalPoints *= 1.5; // زيادة 50%
        }
        if (state.activeEffects[team].winning_streak > 0) {
            finalPoints += 10 * state.activeEffects[team].winning_streak;
            state.activeEffects[team].winning_streak++;
        }
        if (state.activeEffects[team].golden_goose > 0) {
            finalPoints += 10;
        }
    }

    // التحقق من تأثيرات الفريق الخصم
    if (state.activeEffects[opponent]) {
        if (state.activeEffects[opponent].shield > 0) {
            // عكس النقاط
            state[`${opponent}Score`] += finalPoints;
            state.activeEffects[opponent].shield--;
            updateAllUI();
            saveState();
            checkWinner();
            return; // لا تكمل إضافة النقاط للفريق الأصلي
        }
        if (state.activeEffects[opponent].sabotage > 0) {
            finalPoints *= 0.5; // خصم 50%
        }
        if (state.activeEffects[opponent].leech > 0) {
            state[`${opponent}Score`] += Math.round(finalPoints * 0.25);
        }
    }

    state[`${team}Score`] += Math.round(finalPoints);
    updateAllUI();
    saveState();
    checkWinner();
}

function attachEventListeners() {
    elements.nextQuestionBtn.addEventListener('click', () => {
        playSound('click');
        if (!state.gameActive) { alert("الجولة متوقفة حالياً!"); return; }
        if (availableQuestions.length === 0) { alert("انتهت جميع الأسئلة!"); return; }

        // Decrement active effects timers
        ['girls', 'boys'].forEach(team => {
            if (state.activeEffects[team]) {
                for (const effect in state.activeEffects[team]) {
                    if (typeof state.activeEffects[team][effect] === 'number' && state.activeEffects[team][effect] > 0) {
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
            const team = event.target.dataset.team;
            const opponent = team === 'girls' ? 'boys' : 'girls';

            if (state.activeEffects[team] && state.activeEffects[team].freeze > 0) {
                alert(`فريق ${team} مجمد ولا يمكنه الإجابة!`);
                return;
            }

            awardPoints(team, QUESTION_POINTS);
            hideModal(elements.questionModal);
            
            // Check if it's time to display a card
            if (state.questionNumber % 2 === 0) {
                displayCardVault(team);
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

    // إصلاح كود إضافة الداعم مع تحسين العرض
    elements.supporterForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const supporterName = document.getElementById('supporter-name').value;
        const supporterPhotoInput = document.getElementById('supporter-photo');
        const selectedTeam = document.querySelector('input[name="team"]:checked').value;
        
        if (supporterPhotoInput.files && supporterPhotoInput.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const photoDataUrl = e.target.result;
                
                // إضافة الداعم إلى القائمة
                const list = selectedTeam === 'girls' ? elements.girlsSupportersList : elements.boysSupportersList;
                const supporterCard = document.createElement('div');
                supporterCard.className = 'supporter-card';
                supporterCard.innerHTML = `<img src="${photoDataUrl}" alt="${supporterName}"><p>👑 ${supporterName}</p>`;
                list.appendChild(supporterCard);
                
                // تحسين عرض شاشة الإعلان
                showSupporterAnnouncement(supporterName, photoDataUrl, selectedTeam);
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
initializeGame();
