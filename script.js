const Game = {
    levels: {
        easy: { width: 8, height: 8, crabs: 10, cellSize: 40 },
        medium: { width: 12, height: 12, crabs: 20, cellSize: 35 },
        hard: { width: 16, height: 16, crabs: 40, cellSize: 30 }
    },

    state: {
        board: [],
        revealed: [],
        flagged: [],
        gameOver: false,
        width: 0,
        height: 0,
        crabCount: 0,
        cellSize: 0,
        revealedCount: 0,
        flaggedCount: 0,
        wasZero: false,
        gameStartTime: null,
        timerInterval: null,
        timerStarted: false // Добавлен флаг для отслеживания старта таймера
    },

    elements: {
        gameBoard: document.getElementById("game-board"),
        startGameButton: document.getElementById("start-game"),
        newGameButton: document.getElementById("new-game"),
        restartGameButton: document.getElementById("restart-game"), // Новая кнопка
        howToPlayButton: document.getElementById("how-to-play"), // Новая кнопка
        difficultySelect: document.getElementById("difficulty"),
        themeToggle: document.getElementById("theme-toggle"),
        crabCounter: document.getElementById("crab-counter"),
        gameTimer: document.getElementById("game-timer")
    },

    init() {
        this.loadTheme();
        this.loadGame();
        this.elements.startGameButton.addEventListener("click", () => this.startNewGame());
        this.elements.newGameButton.addEventListener("click", () => this.startNewGame());
        this.elements.restartGameButton.addEventListener("click", () => this.restartGame()); // Обработчик для Restart
        this.elements.howToPlayButton.addEventListener("click", () => this.showInstructions()); // Обработчик для инструкции
        this.elements.themeToggle.addEventListener("click", () => this.toggleTheme());
        this.createInstructionsModal(); // Создаём модальное окно при инициализации
    },

    restartGame() {
        this.state.gameOver = false;
        this.state.revealedCount = 0;
        this.state.flaggedCount = 0;
        this.state.wasZero = false;
        this.state.revealed = Array(this.state.height).fill().map(() => Array(this.state.width).fill(false));
        this.state.flagged = Array(this.state.height).fill().map(() => Array(this.state.width).fill(false));
        this.elements.gameBoard.classList.remove("game-over");
        const message = document.querySelector(".message");
        if (message) message.remove();
        this.resetTimer();
        this.drawBoard();
        this.updateCrabCounter();
        this.saveGame();
    },

    createInstructionsModal() {
        const modal = document.createElement("div");
        modal.id = "instructions-modal";
        modal.innerHTML = `
            <h2>How to Play</h2>
            <p>Click to reveal a cell. If you hit a crab, you lose!</p>
            <p>Right-click to place a flag on a cell you think has a crab.</p>
            <p>Win by revealing all safe cells or flagging all crabs.</p>
            <button onclick="Game.hideInstructions()">Close</button>
        `;
        document.body.appendChild(modal);
    },
    
    showInstructions() {
        const modal = document.getElementById("instructions-modal");
        modal.style.display = "block";
    },
    
    hideInstructions() {
        const modal = document.getElementById("instructions-modal");
        modal.style.display = "none";
    },

    toggleTheme() {
        const isDarkTheme = document.body.classList.toggle("dark-theme");
        document.body.classList.toggle("light-theme", !isDarkTheme);
        localStorage.setItem("theme", isDarkTheme ? "dark" : "light");
    },

    loadTheme() {
        const savedTheme = localStorage.getItem("theme");
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        if (savedTheme) {
            if (savedTheme === "dark") {
                document.body.classList.add("dark-theme");
            } else {
                document.body.classList.add("light-theme");
            }
        } else if (prefersDark) {
            document.body.classList.add("dark-theme");
        } else {
            document.body.classList.add("light-theme");
        }
    },

    setDifficulty() {
        const difficulty = this.elements.difficultySelect.value;
        const level = this.levels[difficulty];
        this.state.width = level.width;
        this.state.height = level.height;
        this.state.crabCount = level.crabs;
        this.state.cellSize = level.cellSize;
    },

    createBoard() {
        this.setDifficulty();
        const { width, height, cellSize } = this.state;

        this.elements.gameBoard.style.gridTemplateColumns = `repeat(${width}, ${cellSize}px)`;
        this.elements.gameBoard.style.gridTemplateRows = `repeat(${height}, ${cellSize}px)`;

        this.state.board = Array(height).fill().map(() => Array(width).fill(0));
        this.state.revealed = Array(height).fill().map(() => Array(width).fill(false));
        this.state.flagged = Array(height).fill().map(() => Array(width).fill(false));
        this.state.revealedCount = 0;
        this.state.flaggedCount = 0;
        this.state.wasZero = false;
        this.state.timerStarted = false; // Сбрасываем флаг таймера

        let crabsPlaced = 0;
        while (crabsPlaced < this.state.crabCount) {
            const x = Math.floor(Math.random() * width);
            const y = Math.floor(Math.random() * height);
            if (this.state.board[y][x] !== "crab") {
                this.state.board[y][x] = "crab";
                crabsPlaced++;
            }
        }

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (this.state.board[y][x] === "crab") continue;
                this.state.board[y][x] = this.countAdjacentCrabs(x, y);
            }
        }

        this.updateCrabCounter();
    },

    countAdjacentCrabs(x, y) {
        const { width, height, board } = this.state;
        return [-1, 0, 1].reduce((count, dy) => 
            count + [-1, 0, 1].reduce((innerCount, dx) => {
                const ny = y + dy;
                const nx = x + dx;
                return innerCount + (nx >= 0 && nx < width && ny >= 0 && ny < height && board[ny][nx] === "crab" ? 1 : 0);
            }, 0), 0);
    },

    updateCrabCounter() {
        const remainingCrabs = this.state.crabCount - this.state.flaggedCount;
        this.elements.crabCounter.textContent = remainingCrabs;
        this.elements.crabCounter.classList.toggle("zero", remainingCrabs === 0);
        if (remainingCrabs === 0 && !this.state.wasZero && !this.state.gameOver) {
            const sound = new Audio('zero-crabs.mp3');
            sound.play().catch(err => console.error("Failed to play sound:", err));
            this.state.wasZero = true;
        } else if (remainingCrabs !== 0) {
            this.state.wasZero = false;
        }
    },

    startTimer() {
        if (this.state.timerStarted) return; // Не запускаем повторно
        this.state.gameStartTime = Date.now();
        this.state.timerStarted = true;
        if (this.state.timerInterval) {
            clearInterval(this.state.timerInterval);
        }
        this.state.timerInterval = setInterval(() => {
            if (this.state.gameOver) {
                clearInterval(this.state.timerInterval);
                return;
            }
            const elapsed = Math.floor((Date.now() - this.state.gameStartTime) / 1000);
            const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
            const seconds = String(elapsed % 60).padStart(2, '0');
            this.elements.gameTimer.textContent = `${minutes}:${seconds}`;
        }, 1000);
    },

    resetTimer() {
        if (this.state.timerInterval) {
            clearInterval(this.state.timerInterval);
        }
        this.elements.gameTimer.textContent = "00:00";
        this.state.gameStartTime = null;
        this.state.timerStarted = false;
    },

    drawBoard() {
        const { gameBoard } = this.elements;
        const { width, height, board, revealed, flagged, cellSize, gameOver } = this.state;

        gameBoard.innerHTML = "";

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const cell = document.createElement("div");
                cell.classList.add("cell");
                cell.style.width = `${cellSize}px`;
                cell.style.height = `${cellSize}px`;
                cell.style.fontSize = `${cellSize / 2}px`;

                if (!gameOver) {
                    cell.addEventListener("click", () => this.revealCell(x, y));
                    cell.addEventListener("contextmenu", (e) => {
                        e.preventDefault();
                        if (!revealed[y][x] && !gameOver) {
                            flagged[y][x] = !flagged[y][x];
                            this.state.flaggedCount += flagged[y][x] ? 1 : -1;
                            this.updateCrabCounter();
                            this.drawBoard();
                        }
                    });
                }
                gameBoard.appendChild(cell);
            }
        }

        const cells = gameBoard.children;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = y * width + x;
                const cell = cells[index];
                cell.className = "cell";
                cell.innerHTML = "";

                if (flagged[y][x]) {
                    cell.classList.add("flagged");
                    cell.textContent = "🚩";
                } else if (revealed[y][x]) {
                    cell.classList.add("revealed");
                    if (board[y][x] === "crab") {
                        cell.classList.add("bomb");
                        const img = document.createElement("img");
                        img.src = "crab.jpg";
                        img.style.width = `${cellSize - 10}px`;
                        img.style.height = `${cellSize - 10}px`;
                        img.onerror = () => {
                            console.error("Failed to load crab.jpg.");
                            cell.textContent = "🦀";
                        };
                        cell.appendChild(img);
                    } else if (board[y][x] > 0) {
                        cell.textContent = board[y][x];
                    }
                }
            }
        }
    },

    revealCell(x, y) {
        const { revealed, flagged, board, gameOver, width, height } = this.state;
        if (revealed[y][x] || flagged[y][x] || gameOver) return;

        // Запускаем таймер при первом клике
        if (!this.state.timerStarted) {
            this.startTimer();
        }

        revealed[y][x] = true;
        this.state.revealedCount++;

        if (board[y][x] === "crab") {
            this.state.gameOver = true;
            this.showMessage("Oh no! A Succinct Crab caught you! Try again!", false);
            this.elements.gameBoard.classList.add("game-over");
        } else if (this.checkWin()) {
            this.state.gameOver = true;
            this.showMessage("You outsmarted the Succinct Crabs! Amazing job!", true);
            this.elements.gameBoard.classList.add("game-over");
        } else if (board[y][x] === 0) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const ny = y + dy;
                    const nx = x + dx;
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height && !revealed[ny][nx]) {
                        this.revealCell(nx, ny);
                    }
                }
            }
        }

        this.drawBoard();
        this.saveGame();
    },

    checkWin() {
        const { width, height, crabCount, revealedCount, flagged, board } = this.state;
        const totalCells = width * height;
        const nonCrabCells = totalCells - crabCount;

        const revealedWin = revealedCount === nonCrabCells;

        let correctlyFlaggedCrabs = 0;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (board[y][x] === "crab" && flagged[y][x]) {
                    correctlyFlaggedCrabs++;
                }
            }
        }
        const flaggedWin = correctlyFlaggedCrabs === crabCount && this.state.flaggedCount === crabCount;

        return revealedWin || flaggedWin;
    },

    showMessage(text, isWin) {
        const message = document.createElement("div");
        message.classList.add("message");
        const imgSrc = isWin ? "icon.png" : "crab.jpg";
        message.innerHTML = `
            <img src="${imgSrc}" alt="${isWin ? 'Succinct Icon' : 'Crab'}">
            <p>${text}</p>
            <button onclick="Game.startNewGame()">Play Again</button>
        `;
        document.body.appendChild(message); // Добавляем в document.body
    },

    saveGame() {
        const gameState = {
            board: this.state.board,
            revealed: this.state.revealed,
            flagged: this.state.flagged,
            gameOver: this.state.gameOver,
            gridWidth: this.state.width,
            gridHeight: this.state.height,
            crabCount: this.state.crabCount,
            flaggedCount: this.state.flaggedCount,
            wasZero: this.state.wasZero,
            difficulty: this.elements.difficultySelect.value,
            gameStartTime: this.state.gameStartTime,
            timerStarted: this.state.timerStarted
        };
        localStorage.setItem("succinctCrabSweeper", JSON.stringify(gameState));
    },

    loadGame() {
        const savedGame = localStorage.getItem("succinctCrabSweeper");
        if (savedGame) {
            const gameState = JSON.parse(savedGame);
            this.elements.difficultySelect.value = gameState.difficulty;
    
            this.setDifficulty();
    
            this.state.board = gameState.board;
            this.state.revealed = gameState.revealed;
            this.state.flagged = gameState.flagged || Array(this.state.height).fill().map(() => Array(this.state.width).fill(false));
            this.state.gameOver = gameState.gameOver;
            this.state.wasZero = gameState.wasZero || false;
            this.state.revealedCount = 0;
            this.state.flaggedCount = 0;
            this.state.gameStartTime = gameState.gameStartTime;
            this.state.timerStarted = gameState.timerStarted || false;
    
            for (let y = 0; y < this.state.height; y++) {
                for (let x = 0; x < this.state.width; x++) {
                    if (this.state.revealed[y][x]) {
                        this.state.revealedCount++;
                    }
                    if (this.state.flagged[y][x]) {
                        this.state.flaggedCount++;
                    }
                }
            }
    
            this.elements.gameBoard.style.gridTemplateColumns = `repeat(${this.state.width}, ${this.state.cellSize}px)`;
            this.elements.gameBoard.style.gridTemplateRows = `repeat(${this.state.height}, ${this.state.cellSize}px)`;
    
            if (this.state.gameOver) {
                this.elements.gameBoard.classList.add("game-over");
            }
            this.drawBoard();
            this.updateCrabCounter();
            this.elements.gameTimer.textContent = "00:00";
            // Показываем кнопки, если игра уже начата
            if (this.state.revealedCount > 0 || this.state.flaggedCount > 0) {
                this.elements.startGameButton.style.display = "none";
                this.elements.newGameButton.style.display = "inline-block";
                this.elements.restartGameButton.style.display = "inline-block";
            }
        } else {
            this.createBoard();
            this.drawBoard();
        }
    },

    startNewGame() {
        this.state.gameOver = false;
        this.state.flaggedCount = 0;
        this.state.wasZero = false;
        this.elements.gameBoard.classList.remove("game-over");
        const message = document.querySelector(".message");
        if (message) message.remove();
        this.createBoard();
        this.saveGame();
        this.drawBoard();
        this.elements.startGameButton.style.display = "none";
        this.elements.newGameButton.style.display = "inline-block";
        this.elements.restartGameButton.style.display = "inline-block"; // Показываем кнопку Restart
        this.resetTimer();
    },
};

Game.init();