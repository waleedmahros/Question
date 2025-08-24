// --- CONFIGURATION ---
const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQEfxl2DDK4ZY-pFgNMnNlzuXJKf9ysLh1u30CW0aukQVNJ3oEPXTMZ8S8g685fxGYmVv5lmve4ZLrN/pub?output=csv';
const WINNING_SCORE = 10;

// --- AUDIO SETUP ---
const sounds = {
    click: new Audio('Button_click.mp3'),
    modal: new Audio('modal_sound.mp3'),
    point: new Audio('Point_award.mp3'),
    win: new Audio('game_win.mp3'),
    countdown: new Audio('countdown.mp3'),
    supporter: new Audio('supporter_added.mp3'),
    sparkle: new Audio('sparkle.mp3') // **NEW**
};
sounds.countdown.loop = true; 
sounds.modal.volume = 0.5; // **UPDATED**: Volume lowered to 50%

function playSound(sound) {
    if (sounds[sound]) {
        sounds[sound].currentTime = 0;
        sounds[sound].play().catch(e => console.error(`Could not play sound: ${sound}`, e));
    }
}

function stopSound(sound) {
    if (sounds[sound]) {
        sounds[sound].pause();
        sounds[sound].currentTime = 0;
    }
}

// --- DOM ELEMENTS ---
const elements = {
    // ... (All other elements remain the same)
    allCloseButtons: document.querySelectorAll('.modal-close-btn'),
    supporterAnnouncement: document.getElementById('supporter-announcement'),
    announcementPhoto: document.getElementById('announcement-photo'),
    announcementText: document.getElementById('announcement-text')
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
    lastQuestionCategory: null
};

// --- STATE MANAGEMENT ---
function saveState() { /* ... (remains the same) ... */ }
function loadState() { /* ... (remains the same) ... */ }

// --- UI FUNCTIONS ---
function updateScoresUI() { /* ... (remains the same) ... */ }
function updateRoundsUI() { /* ... (remains the same) ... */ }
function updateAllUI() { /* ... (remains the same) ... */ }

// --- MODAL HANDLING ---
function showModal(modal, playSoundEffect = true) {
    if(playSoundEffect) playSound('modal');
    modal.classList.remove('hidden');
}
function hideModal(modal, playSoundEffect = true) {
    if(playSoundEffect) playSound('modal');
    modal.classList.add('hidden');
}

// --- GAME LOGIC ---
function startNewRound() { /* ... (remains the same) ... */ }
function startNewDay() { /* ... (remains the same) ... */ }
function checkWinner() { /* ... (remains the same) ... */ }
function triggerWinSequence() { /* ... (remains the same) ... */ }
function showWinner() { /* ... (remains the same) ... */ }
function launchConfetti() { /* ... (remains the same) ... */ }
function addSupporterToDOM(name, photoDataUrl, team) { /* ... (remains the same) ... */ }
function showSupporterAnnouncement(name, photoUrl, team) { /* ... (remains the same) ... */ }

// --- EVENT LISTENERS ATTACHMENT ---
function attachEventListeners() {
    elements.nextQuestionBtn.addEventListener('click', () => {
        // ... (This entire function remains the same)
    });

    elements.awardButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            playSound('point'); // Play the point sound
            if (!state.gameActive) return;
            const winningTeam = event.target.dataset.team;
            if (winningTeam === 'girls') state.girlsScore++;
            else if (winningTeam === 'boys') state.boysScore++;
            
            saveState();
            updateScoresUI();
            checkWinner();
            
            // **UPDATED**: Close the modal without playing the modal sound
            elements.questionModal.classList.add('hidden'); 
        });
    });
    
    elements.manualControls.forEach(button => {
        // ... (This entire function remains the same)
    });

    elements.roundControls.forEach(button => {
        button.addEventListener('click', (e) => {
            playSound('click');
            const team = e.target.dataset.team;
            const isAdd = e.target.classList.contains('add-round-btn');

            // **UPDATED**: Play sparkle sound on add
            if (isAdd) {
                playSound('sparkle');
            }

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
        // ... (This entire function remains the same)
    });

    elements.toggleAnswerBtn.addEventListener('click', () => {
        playSound('click');
        elements.modalAnswerArea.classList.toggle('hidden');
        elements.toggleAnswerBtn.textContent = elements.modalAnswerArea.classList.contains('hidden') ? "إظهار الإجابة" : "إخفاء الإجابة";
    });
    
    elements.addSupporterBtn.addEventListener('click', () => {
        playSound('click');
        showModal(elements.supporterModal);
    });
    
    // This now correctly handles the 'X' button and background clicks with the modal sound
    elements.allCloseButtons.forEach(btn => btn.addEventListener('click', () => {
        if(btn.closest('.modal-overlay')?.id === 'celebration-overlay') {
            clearInterval(countdownInterval);
            stopSound('countdown');
        }
        elements.allModals.forEach(modal => hideModal(modal, true));
    }));
    
    elements.allModals.forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                 if(modal.id === 'celebration-overlay') {
                    clearInterval(countdownInterval);
                    stopSound('countdown');
                }
                hideModal(modal, true);
            }
        });
    });

    elements.resetRoundBtn.addEventListener('click', startNewRound);
    elements.newRoundBtnCelebration.addEventListener('click', startNewRound);
    elements.newDayBtn.addEventListener('click', startNewDay);

    elements.stopCountdownBtn.addEventListener('click', () => {
        playSound('click');
        clearInterval(countdownInterval);
        stopSound('countdown');
        hideModal(elements.celebrationOverlay);
        state.gameActive = true;
        saveState();
    });
}

// --- INITIALIZATION ---
async function initializeGame() {
    // ... (This entire function remains the same)
}

initializeGame();

// NOTE: I have omitted the full code for functions that have no changes to keep this response brief.
// Please copy the full code block below which contains the complete, final script.
