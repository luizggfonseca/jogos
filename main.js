/**
 * Mestre da Adivinhação - Logic
 * Ported from Python to Vanilla JS
 */

// --- STATE MANAGEMENT ---
const state = {
    player: "Jogador",
    score: 0,
    level: 1,
    mode: "PROGRESSIVO",

    // Game Session
    secretNumber: 0,
    attemptsLeft: 0,
    maxAttempts: 0,
    minLimit: 0,
    maxLimit: 50,

    hintMin: 0,
    hintMax: 50,

    history: []
};

// --- DATA PERSISTENCE ---
const Storage = {
    getScores: () => {
        const data = localStorage.getItem('guessing_game_scores');
        return data ? JSON.parse(data) : {};
    },

    saveScore: () => {
        const scores = Storage.getScores();
        const currentBest = scores[state.player] ? scores[state.player].score : 0;

        if (state.score >= currentBest) {
            scores[state.player] = {
                score: state.score,
                level: state.level,
                date: new Date().toISOString()
            };
            localStorage.setItem('guessing_game_scores', JSON.stringify(scores));
        }
    },

    loadPlayer: (name) => {
        const scores = Storage.getScores();
        if (scores[name]) {
            state.level = scores[name].level;
            state.score = scores[name].score;
            // Recalculate progressive limit based on level
            state.maxLimit = 50 + ((state.level - 1) * 50);
        } else {
            // New player or reset
            state.level = 1;
            state.score = 0;
            state.maxLimit = 50;
        }
        state.player = name;
    }
};

// --- GAME LOGIC ---
const Engine = {
    startRound: (customMax, customAttempts) => {
        if (state.mode === "PROGRESSIVO") {
            state.maxAttempts = 10;
            // Limit already set by loadPlayer or levelUp
        } else {
            state.maxLimit = customMax || 100;
            state.maxAttempts = customAttempts || 5;
        }

        state.minLimit = 0;
        state.secretNumber = Math.floor(Math.random() * (state.maxLimit + 1));
        state.attemptsLeft = state.maxAttempts;

        // Reset hints
        state.hintMin = 0;
        state.hintMax = state.maxLimit;

        state.history = [];

        console.log(`[DEBUG] Secret: ${state.secretNumber}`); // Cheat for testing
    },

    processGuess: (guess) => {
        const result = {
            correct: false,
            gameOver: false,
            msg: "",
            direction: "" // 'up' or 'down'
        };

        state.attemptsLeft--;
        state.history.unshift({ val: guess, result: guess === state.secretNumber ? 'WIN' : (guess < state.secretNumber ? 'BAIXO' : 'ALTO') });

        if (guess === state.secretNumber) {
            result.correct = true;
            if (state.mode === "PROGRESSIVO") {
                const bonus = 100 + (state.attemptsLeft * 10);
                state.score += bonus;
                state.level++;
                state.maxLimit += 50;
                Storage.saveScore();
            }
            return result;
        }

        if (state.attemptsLeft <= 0) {
            result.gameOver = true;
            if (state.mode === "PROGRESSIVO") {
                state.score = Math.max(0, state.score - 50);
                Storage.saveScore();
            }
            return result;
        }

        // Logic for Hints
        if (guess < state.secretNumber) {
            result.msg = "MUITO BAIXO!";
            result.direction = "up";
            if (guess > state.hintMin) state.hintMin = guess;
        } else {
            result.msg = "MUITO ALTO!";
            result.direction = "down";
            if (guess < state.hintMax) state.hintMax = guess;
        }

        return result;
    }
};

// --- UI CONTROLLER ---
const UI = {
    views: {
        intro: document.getElementById('view-intro'),
        menu: document.getElementById('view-menu'),
        custom: document.getElementById('view-custom'),
        game: document.getElementById('view-game'),
        ranking: document.getElementById('view-ranking')
    },

    navigate: (viewName) => {
        Object.values(UI.views).forEach(el => {
            el.classList.add('hidden');
            el.classList.remove('active');
        });
        UI.views[viewName].classList.remove('hidden');
        // Small delay to allow display:block to apply before opacity transition
        setTimeout(() => UI.views[viewName].classList.add('active'), 10);
    },

    updateMenu: () => {
        document.getElementById('menu-player-name').innerText = state.player;
        document.getElementById('menu-avatar').innerText = state.player.charAt(0).toUpperCase();
        document.getElementById('menu-level').innerText = state.level;
        document.getElementById('menu-score').innerText = state.score;
    },

    updateGameUI: (reset = false) => {
        if (reset) {
            document.getElementById('input-guess').value = '';
            document.getElementById('input-guess').disabled = false;
            document.getElementById('btn-guess').disabled = false;
            document.getElementById('game-actions').classList.add('hidden');
            document.getElementById('guess-history').innerHTML = '';
            document.getElementById('feedback-main').innerText = "Adivinhe!";
            document.getElementById('feedback-main').style.color = 'var(--text-main)';
        }

        document.getElementById('game-mode-tag').innerText = state.mode === "PROGRESSIVO" ? `Nível ${state.level}` : "Modo Treino";
        document.getElementById('game-score').innerText = state.score;
        document.getElementById('game-attempts').innerText = state.attemptsLeft;

        // Progress Bar Color
        const bar = document.getElementById('attempts-bar');
        const percentage = (state.attemptsLeft / state.maxAttempts) * 100;
        bar.style.width = `${percentage}%`;

        bar.className = 'progress-bar'; // Reset
        if (percentage < 30) bar.classList.add('bg-danger');
        else if (percentage < 60) bar.classList.add('bg-warning');

        // Hints
        document.getElementById('limit-min').innerText = state.hintMin;
        document.getElementById('limit-max').innerText = state.hintMax;
    },

    addGlobalListeners: () => {
        // --- Intro ---
        document.getElementById('btn-start').addEventListener('click', () => {
            const name = document.getElementById('player-name').value.trim() || "Jogador";
            Storage.loadPlayer(name);
            UI.updateMenu();
            UI.navigate('menu');
        });

        // --- Menu ---
        document.getElementById('btn-mode-progressive').addEventListener('click', () => {
            state.mode = "PROGRESSIVO";
            // Check if continuing or new?
            // For now simple auto-continue
            Engine.startRound();
            UI.updateGameUI(true);
            UI.navigate('game');
        });

        document.getElementById('btn-mode-custom').addEventListener('click', () => {
            UI.navigate('custom');
        });

        document.getElementById('btn-view-ranking').addEventListener('click', () => {
            UI.renderRanking();
            UI.navigate('ranking');
        });

        document.getElementById('btn-logout').addEventListener('click', () => {
            UI.navigate('intro');
        });

        // --- Custom ---
        const inputMax = document.getElementById('input-custom-max');
        const inputAtt = document.getElementById('input-custom-attempts');

        document.getElementById('btn-start-custom').addEventListener('click', () => {
            const max = parseInt(inputMax.value) || 1000;
            const att = parseInt(inputAtt.value) || 10;

            if (max < 10 || att < 1) {
                alert("Valores inválidos! Mínimo de 10 para o número e 1 tentativa.");
                return;
            }

            state.mode = "CUSTOM";
            Engine.startRound(max, att);
            UI.updateGameUI(true);
            UI.navigate('game');
        });

        document.getElementById('btn-back-custom').addEventListener('click', () => UI.navigate('menu'));

        // --- Game ---
        document.getElementById('btn-guess').addEventListener('click', handleGuess);
        document.getElementById('input-guess').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleGuess();
        });

        document.getElementById('btn-next-level').addEventListener('click', () => {
            if (state.mode === "PROGRESSIVO") {
                Engine.startRound(); // Level up logic is inside processGuess
            } else {
                UI.navigate('custom'); // Back to config
                return;
            }
            UI.updateGameUI(true);
        });

        document.getElementById('btn-quit-game').addEventListener('click', () => UI.navigate('menu'));

        // --- Ranking ---
        document.getElementById('btn-back-ranking').addEventListener('click', () => UI.navigate('menu'));
    },

    renderRanking: () => {
        const list = document.getElementById('ranking-list');
        list.innerHTML = '';

        const scores = Storage.getScores();
        const sorted = Object.entries(scores)
            .sort(([, a], [, b]) => b.score - a.score)
            .slice(0, 10);

        sorted.forEach(([name, data], index) => {
            const div = document.createElement('div');
            div.className = 'rank-item';
            div.innerHTML = `
                <span class="rank-pos">#${index + 1}</span>
                <span class="rank-name">${name}</span>
                <div style="text-align:right">
                    <div class="rank-score">${data.score} pts</div>
                    <small style="opacity:0.6">Nível ${data.level}</small>
                </div>
            `;
            list.appendChild(div);
        });
    }
};

// Handle Guess Action
function handleGuess() {
    const input = document.getElementById('input-guess');
    const val = parseInt(input.value);

    if (isNaN(val)) return;

    const res = Engine.processGuess(val);
    input.value = '';
    input.focus();

    // Visual Feedback
    const fbMain = document.getElementById('feedback-main');

    if (res.correct) {
        fbMain.innerText = "ACERTOU!";
        fbMain.style.color = "var(--success)";
        endRoundState(true);
    } else if (res.gameOver) {
        fbMain.innerText = `GAMER OVER! Era ${state.secretNumber}`;
        fbMain.style.color = "var(--danger)";
        endRoundState(false);
    } else {
        fbMain.innerText = res.msg;
        fbMain.style.color = res.direction === 'up' ? "var(--accent)" : "#38bdf8";
    }

    // Update History UI
    const histContainer = document.getElementById('guess-history');
    const newItem = document.createElement('div');
    newItem.className = `history-item ${res.correct ? 'win' : res.direction}`;
    newItem.innerText = `${val} ${res.direction === 'up' ? '↑' : (res.direction === 'down' ? '↓' : '★')}`;
    histContainer.prepend(newItem);

    UI.updateGameUI();
}

function endRoundState(win) {
    document.getElementById('input-guess').disabled = true;
    document.getElementById('btn-guess').disabled = true;

    const btnNext = document.getElementById('btn-next-level');
    const gameActions = document.getElementById('game-actions');

    gameActions.classList.remove('hidden');

    if (win) {
        btnNext.innerText = state.mode === "PROGRESSIVO" ? "Próximo Nível" : "Configurar Novo";
    } else {
        btnNext.innerText = "Voltar ao Menu";
        btnNext.onclick = () => UI.navigate('menu');
    }
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    UI.addGlobalListeners();
});
