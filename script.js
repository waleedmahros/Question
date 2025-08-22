const csvData = `
id,type,question_text,image_url,answer
1,text,من هو النبي الذي أرسل إلى قوم ثمود,,صالح عليه السلام
2,text,من هو الصحابي الملقب بأسد الله,,حمزة بن عبد المطلب
3,text,من هو ثالث الخلفاء الراشدين,,عثمان بن عفان
4,text,من هو مؤذن الرسول صلى الله عليه وسلم,,بلال بن رباح
5,text,الى اين هاجر المسلمون الهجرة الاولى,,الحبشة
6,text,كم عدد شهداء غزوة احد,,70
7,text,ما هي السورة القرآنية التي تسمي الحواريون,,سورة الصف
8,text,ما هي اكبر قارة من حيث عدد الدول بها,,قارة أفريقيا
9,text,ما هي اصغر دولة عربية,,البحرين
10,text,ما هو العضو في جسم الانسان المسئول عن ضخ الدم,,القلب
11,text,ما هي عملة المملكة العربية السعودية,,الريال
12,text,ما هي عاصمة المانيا,,برلين
13,text,اكمل المثل ( ما طار طير وارتفع الا كما طار ...),,وقع
14,text,ما هو لون لسان الزرافة,,ازرق
15,text,ما هو اذكي الكائنات البحرية,,الدولفين
16,text,من هو الشاعر الملقب بشاعر القطرين,,خليل مطران
17,image,,https://i.postimg.cc/sgcq71k6/Purple-Yellow-Neu-Brutalism-Guess-The-Animal-Quiz-Mobile-Video-Insta-20250811-221342.png,مهند
18,image,,https://i.postimg.cc/Ghn5fkrg/Purple-Yellow-Neu-Brutalism-Guess-The-Animal-Quiz-Mobile-Video-Insta-20250717-191655.png,بامية
19,image,,https://i.postimg.cc/qqVj9Tf6/4-20250519-071207.png,خياط
20,image,من قام برسم هذه اللوحة,https://i.postimg.cc/GpTPr5xF/Mona-Lisa-by-Leonardo-da-Vinci-from-C2-RMF-retouched.jpg,ليوناردو دافنشي
`;
const allQuestions = [];
const lines = csvData.trim().split('\n');
const headers = lines[0].split(',');
for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    if (values.length === headers.length) {
        const questionObject = {};
        for (let j = 0; j < headers.length; j++) {
            questionObject[headers[j]] = values[j];
        }
        allQuestions.push(questionObject);
    }
}

let availableQuestions = [...allQuestions];

let girlsScore = 0;
let boysScore = 0;
let girlsRoundsWon = 0;
let boysRoundsWon = 0;
const winningScore = 10;
let countdownInterval = null;
let gameActive = true;

const girlsScoreElement = document.getElementById('girls-score');
const boysScoreElement = document.getElementById('boys-score');
const girlsCard = document.getElementById('girls-card');
const girlsPlusBtn = girlsCard.querySelector('.manual-controls button:first-child');
const girlsMinusBtn = girlsCard.querySelector('.manual-controls button:last-child');
const boysCard = document.getElementById('boys-card');
const boysPlusBtn = boysCard.querySelector('.manual-controls button:first-child');
const boysMinusBtn = boysCard.querySelector('.manual-controls button:last-child');
const nextQuestionBtn = document.getElementById('next-question-btn');
const resetGameBtn = document.getElementById('reset-game-btn');
const girlsRoundsCountElement = document.getElementById('girls-rounds-count');
const boysRoundsCountElement = document.getElementById('boys-rounds-count');

const questionModal = document.getElementById('question-modal');
const qModalCloseBtn = questionModal.querySelector('.modal-close-btn');
const modalQuestionArea = document.getElementById('modal-question-area');
const modalAnswerArea = document.getElementById('modal-answer-area');
const toggleAnswerBtn = document.getElementById('toggle-answer-btn');
const awardButtons = document.querySelectorAll('.award-btn');

const supporterModal = document.getElementById('supporter-modal');
const addSupporterBtn = document.getElementById('add-supporter-btn');
const sModalCloseBtn = supporterModal.querySelector('.modal-close-btn');
const supporterForm = document.getElementById('supporter-form');
const girlsSupportersList = document.querySelector('#girls-supporters');
const boysSupportersList = document.querySelector('#boys-supporters');

const celebrationOverlay = document.getElementById('celebration-overlay');
const countdownContainer = document.getElementById('countdown-container');
const winnerContainer = document.getElementById('winner-container');
const countdownTimer = document.getElementById('countdown-timer');
const winnerNameElement = document.getElementById('winner-name');
const stopCountdownBtn = document.getElementById('stop-countdown-btn');
const newGameBtn = document.getElementById('new-game-btn');

function updateScores() {
    girlsScoreElement.textContent = girlsScore;
    boysScoreElement.textContent = boysScore;
    if (gameActive) {
        checkWinner();
    }
}

function updateRounds() {
    girlsRoundsCountElement.textContent = girlsRoundsWon;
    boysRoundsCountElement.textContent = boysRoundsWon;
}

function startNewRound() {
    girlsScore = 0;
    boysScore = 0;
    gameActive = true;
    updateScores();
    celebrationOverlay.classList.add('hidden');
    nextQuestionBtn.textContent = "السؤال التالي";
}

function checkWinner() {
    if (girlsScore >= winningScore || boysScore >= winningScore) {
        gameActive = false;
        triggerWinSequence();
    }
}

function triggerWinSequence() {
    celebrationOverlay.classList.remove('hidden');
    countdownContainer.classList.remove('hidden');
    winnerContainer.classList.add('hidden');
    let countdown = 30;
    countdownTimer.textContent = countdown;
    
    countdownInterval = setInterval(() => {
        countdown--;
        countdownTimer.textContent = countdown;
        if (countdown <= 0) {
            clearInterval(countdownInterval);
            showWinner();
        }
    }, 1000);
}

function showWinner() {
    countdownContainer.classList.add('hidden');
    winnerContainer.classList.remove('hidden');
    const winner = girlsScore >= winningScore ? "البنات" : "الشباب";
    if (winner === "البنات") {
        girlsRoundsWon++;
    } else {
        boysRoundsWon++;
    }
    updateRounds();
    winnerNameElement.textContent = winner;
    winnerNameElement.style.color = (winner === "البنات") ? "var(--girls-color)" : "var(--boys-color)";
}

girlsPlusBtn.addEventListener('click', () => { if(gameActive) { girlsScore++; updateScores(); } });
girlsMinusBtn.addEventListener('click', () => { if (girlsScore > 0) { girlsScore--; updateScores(); } });
boysPlusBtn.addEventListener('click', () => { if(gameActive) { boysScore++; updateScores(); } });
boysMinusBtn.addEventListener('click', () => { if (boysScore > 0) { boysScore--; updateScores(); } });

resetGameBtn.addEventListener('click', startNewRound);
newGameBtn.addEventListener('click', startNewRound);
stopCountdownBtn.addEventListener('click', () => {
    clearInterval(countdownInterval);
    celebrationOverlay.classList.add('hidden');
    gameActive = true;
});

const addRoundButtons = document.querySelectorAll('.add-round-btn');
addRoundButtons.forEach(button => {
    button.addEventListener('click', (e) => {
        const team = e.target.dataset.team;
        if(team === 'girls') girlsRoundsWon++; else boysRoundsWon++;
        updateRounds();
    });
});

const subtractRoundButtons = document.querySelectorAll('.subtract-round-btn');
subtractRoundButtons.forEach(button => {
    button.addEventListener('click', (e) => {
        const team = e.target.dataset.team;
        if(team === 'girls') { if (girlsRoundsWon > 0) girlsRoundsWon--; } 
        else { if (boysRoundsWon > 0) boysRoundsWon--; }
        updateRounds();
    });
});

nextQuestionBtn.addEventListener('click', () => {
    if (!gameActive) return;
    if (availableQuestions.length === 0) {
        alert("انتهت جميع الأسئلة المتاحة!");
        return;
    }
    const randomIndex = Math.floor(Math.random() * availableQuestions.length);
    const currentQuestion = availableQuestions[randomIndex];
    availableQuestions.splice(randomIndex, 1);
    
    modalQuestionArea.innerHTML = '';
    if (currentQuestion.type === 'image') {
        if(currentQuestion.question_text) {
            const textElement = document.createElement('p');
            textElement.textContent = currentQuestion.question_text;
            modalQuestionArea.appendChild(textElement);
        }
        const imgElement = document.createElement('img');
        imgElement.src = currentQuestion.image_url;
        modalQuestionArea.appendChild(imgElement);
    } else {
        modalQuestionArea.textContent = currentQuestion.question_text;
    }
    modalAnswerArea.textContent = currentQuestion.answer;
    if (nextQuestionBtn.textContent.includes("ابدأ")) {
        nextQuestionBtn.textContent = "السؤال التالي";
    }
    questionModal.classList.remove('hidden');
});

qModalCloseBtn.addEventListener('click', () => questionModal.classList.add('hidden'));
toggleAnswerBtn.addEventListener('click', () => {
    modalAnswerArea.classList.toggle('hidden');
    toggleAnswerBtn.textContent = modalAnswerArea.classList.contains('hidden') ? "إظهار الإجابة" : "إخفاء الإجابة";
});
awardButtons.forEach(button => {
    button.addEventListener('click', (event) => {
        if (!gameActive) return;
        const winningTeam = event.target.dataset.team;
        if (winningTeam === 'girls') girlsScore++;
        else if (winningTeam === 'boys') boysScore++;
        updateScores();
        questionModal.classList.add('hidden');
    });
});

addSupporterBtn.addEventListener('click', () => supporterModal.classList.remove('hidden'));
sModalCloseBtn.addEventListener('click', () => supporterModal.classList.add('hidden'));
supporterForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const supporterName = document.getElementById('supporter-name').value;
    const supporterPhotoInput = document.getElementById('supporter-photo');
    const selectedTeam = document.querySelector('input[name="team"]:checked').value;
    if (supporterPhotoInput.files && supporterPhotoInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const photoDataUrl = e.target.result;
            const supporterCard = document.createElement('div');
            supporterCard.className = 'supporter-card';
            supporterCard.innerHTML = `<img src="${photoDataUrl}" alt="${supporterName}"><p>👑 ${supporterName}</p>`;
            if (selectedTeam === 'girls') girlsSupportersList.appendChild(supporterCard);
            else boysSupportersList.appendChild(supporterCard);
            supporterModal.classList.add('hidden');
            supporterForm.reset();
        };
        reader.readAsDataURL(supporterPhotoInput.files[0]);
    }
});

updateScores();
updateRounds();
