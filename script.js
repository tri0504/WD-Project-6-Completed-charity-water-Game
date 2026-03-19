// Clean water solutions used as the 8 matching pair themes.
const solutions = [
	{
		id: "filter",
		icon: "\ud83e\uddfa",
		name: "Water Filter",
		snippet: "Water filters remove harmful particles, making water safer to drink right at home."
	},
	{
		id: "well",
		icon: "\ud83d\udd73\ufe0f",
		name: "Well",
		snippet: "Wells can bring clean groundwater closer to villages and reduce long water walks."
	},
	{
		id: "pump",
		icon: "\u26fd",
		name: "Hand Pump",
		snippet: "Hand pumps make it easier to pull clean water up from underground sources."
	},
	{
		id: "pipes",
		icon: "\ud83d\udd27",
		name: "Pipes",
		snippet: "Piped systems can deliver reliable clean water to schools, clinics, and homes."
	},
	{
		id: "rain",
		icon: "\ud83c\udf27\ufe0f",
		name: "Rain Collection",
		snippet: "Rainwater collection captures seasonal rain and stores it for daily community use."
	},
	{
		id: "spring",
		icon: "\ud83d\udca7",
		name: "Protected Spring",
		snippet: "Protecting natural springs helps keep source water cleaner and safer year-round."
	},
	{
		id: "tank",
		icon: "\ud83d\udee2\ufe0f",
		name: "Storage Tank",
		snippet: "Water storage tanks keep water available between collection trips and dry periods."
	},
	{
		id: "hygiene",
		icon: "\ud83e\uddfc",
		name: "Handwashing",
		snippet: "Handwashing stations support hygiene and help stop preventable water-related illness."
	}
];

// Grab important elements from the page so JavaScript can update them later.
const boardElement = document.getElementById("game-board");
const scoreElement = document.getElementById("score");
const timerElement = document.getElementById("timer");
const snippetPanel = document.getElementById("snippet-panel");
const winCelebrationElement = document.getElementById("win-celebration");
const confettiLayerElement = document.getElementById("confetti-layer");
const playAgainButton = document.getElementById("play-again");
const finalScoreElement = document.getElementById("final-score");
const finalTimeElement = document.getElementById("final-time");
const resetGameButton = document.getElementById("reset-game");

// Game state variables that change while the player is playing.
let deck = [];
let flippedCards = [];
let matchedPairs = 0;
let score = 0;
let secondsElapsed = 0;
let timerId = null;
let lockBoard = false;
let gameStarted = false;
let confettiClearId = null;

// Create two cards for each solution so every theme has a pair.
function createDeck() {
	// flatMap lets us return two cards (a pair) for every one solution object.
	const pairs = solutions.flatMap((solution) => {
		return [
			{ ...solution, uniqueId: `${solution.id}-a` },
			{ ...solution, uniqueId: `${solution.id}-b` }
		];
	});

	// Shuffle before returning so card positions are different every game.
	return shuffleDeck(pairs);
}

// Fisher-Yates shuffle for a fair random order each game.
function shuffleDeck(cards) {
	// Copy the array so we do not mutate the original input directly.
	const shuffled = [...cards];

	// Move backward through the array and swap with a random earlier index.
	for (let i = shuffled.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}

	// Return randomized cards.
	return shuffled;
}

// Build the board UI by creating one button element per card in the deck.
function renderBoard() {
	// Clear previous cards before drawing a fresh board.
	boardElement.innerHTML = "";

	// Create and attach each card button.
	deck.forEach((cardData) => {
		const cardButton = document.createElement("button");
		cardButton.className = "memory-card";
		cardButton.type = "button";
		cardButton.dataset.id = cardData.id;
		cardButton.dataset.uniqueId = cardData.uniqueId;
		cardButton.setAttribute("aria-label", "Memory card");

		cardButton.innerHTML = `
			<div class="card-inner">
				<div class="card-face card-back">
					<img src="img/water-can-transparent.png" alt="charity: water" class="card-back-logo">
				</div>
				<div class="card-face card-front">
					<div class="card-icon">${cardData.icon}</div>
					<div class="card-name">${cardData.name}</div>
				</div>
			</div>
		`;

		// Listen for card clicks.
		cardButton.addEventListener("click", handleCardClick);
		boardElement.appendChild(cardButton);
	});
}

// Handle what happens when a user clicks a card.
function handleCardClick(event) {
	const clickedCard = event.currentTarget;

	// Start the game timer on the first card click of each round.
	if (!gameStarted) {
		gameStarted = true;
		startTimer();
		snippetPanel.textContent = "Game started! Match a pair to reveal a clean water solution fact.";
	}

	// Stop invalid clicks while checking cards or when card is already handled.
	if (lockBoard) {
		return;
	}

	// Ignore cards that already belong to a matched pair.
	if (clickedCard.classList.contains("matched")) {
		return;
	}

	// Ignore double-clicking the exact same currently flipped card.
	if (flippedCards.includes(clickedCard)) {
		return;
	}

	// Flip this card and remember it for match checking.
	flipCard(clickedCard);
	flippedCards.push(clickedCard);

	// When two cards are flipped, compare them.
	if (flippedCards.length === 2) {
		checkForMatch();
	}
}

// Visually turn a card face-up.
function flipCard(cardElement) {
	cardElement.classList.add("flipped");
}

// Visually turn a card face-down.
function unflipCard(cardElement) {
	cardElement.classList.remove("flipped");
}

// Compare the two selected cards and route to match or mismatch logic.
function checkForMatch() {
	// Lock input so the player cannot flip extra cards during evaluation.
	lockBoard = true;

	const [firstCard, secondCard] = flippedCards;
	const isMatch = firstCard.dataset.id === secondCard.dataset.id;

	// Matching cards stay open and increase score.
	if (isMatch) {
		handleMatch(firstCard, secondCard);
		return;
	}

	// Non-matching cards will flip back after a short pause.
	handleMismatch(firstCard, secondCard);
}

// Apply all updates for a successful pair match.
function handleMatch(firstCard, secondCard) {
	// Mark both cards as permanently matched.
	firstCard.classList.add("matched");
	secondCard.classList.add("matched");

	// Disable buttons so matched cards are no longer interactive.
	firstCard.disabled = true;
	secondCard.disabled = true;

	// Update progress and score.
	matchedPairs += 1;
	score += 10;

	// Refresh UI and check if the game is complete.
	updateScore();
	showSnippet(firstCard.dataset.id);
	resetTurn();
	checkWin();
}

// Handle a failed pair by flipping both cards back after a delay.
function handleMismatch(firstCard, secondCard) {
	setTimeout(() => {
		// Return cards to face-down state.
		unflipCard(firstCard);
		unflipCard(secondCard);
		// Re-open board interactions for the next turn.
		resetTurn();
	}, 850);
}

// Clear turn-specific state so the next two card picks can begin.
function resetTurn() {
	flippedCards = [];
	lockBoard = false;
}

// Show a short learning fact that matches the solved card pair.
function showSnippet(solutionId) {
	const found = solutions.find((solution) => solution.id === solutionId);

	// Safety check in case no matching solution is found.
	if (!found) {
		return;
	}

	// Update panel text with the solution fact.
	snippetPanel.textContent = found.snippet;

	// Re-trigger panel flash animation on every new match.
	snippetPanel.classList.remove("snippet-flash");
	void snippetPanel.offsetWidth;
	snippetPanel.classList.add("snippet-flash");
}

// Update score number and replay score animation.
function updateScore() {
	scoreElement.textContent = String(score);
	scoreElement.classList.remove("score-pop");
	void scoreElement.offsetWidth;
	scoreElement.classList.add("score-pop");
}

// Convert seconds into MM:SS format for the timer display.
function formatTime(totalSeconds) {
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

// Start (or restart) the one-second game timer.
function startTimer() {
	// Prevent duplicate intervals by stopping any existing timer first.
	stopTimer();
	timerId = setInterval(() => {
		secondsElapsed += 1;
		timerElement.textContent = formatTime(secondsElapsed);
	}, 1000);
}

// Stop the timer interval when game resets or ends.
function stopTimer() {
	if (timerId) {
		clearInterval(timerId);
		timerId = null;
	}
}

// Build one burst of confetti using simple DOM elements.
function createConfettiBurst() {
	const confettiColors = ["#ffc907", "#003366", "#77a8bb", "#fed8c1", "#bf6c46"];
	const pieceCount = 80;

	for (let i = 0; i < pieceCount; i += 1) {
		const piece = document.createElement("div");
		piece.className = "confetti-piece";
		piece.style.left = `${Math.random() * 100}%`;
		piece.style.backgroundColor = confettiColors[Math.floor(Math.random() * confettiColors.length)];
		piece.style.animationDuration = `${2.1 + Math.random() * 1.6}s`;
		piece.style.animationDelay = `${Math.random() * 0.45}s`;
		piece.style.transform = `rotate(${Math.random() * 360}deg)`;
		confettiLayerElement.appendChild(piece);
	}
}

// Show the custom celebration overlay and trigger confetti.
function showWinCelebration() {
	winCelebrationElement.hidden = false;
	createConfettiBurst();
	setTimeout(createConfettiBurst, 450);

	if (confettiClearId) {
		clearTimeout(confettiClearId);
	}

	confettiClearId = setTimeout(() => {
		confettiLayerElement.innerHTML = "";
		confettiClearId = null;
	}, 4300);
}

// Hide celebration UI and remove any leftover confetti elements.
function hideWinCelebration() {
	winCelebrationElement.hidden = true;
	confettiLayerElement.innerHTML = "";

	if (confettiClearId) {
		clearTimeout(confettiClearId);
		confettiClearId = null;
	}
}

// If all pairs are matched, show final score/time in the win modal.
function checkWin() {
	// Exit early until every solution pair is matched.
	if (matchedPairs !== solutions.length) {
		return;
	}

	// Freeze timer and show end-of-game results.
	stopTimer();
	gameStarted = false;
	finalScoreElement.textContent = String(score);
	finalTimeElement.textContent = formatTime(secondsElapsed);
	showWinCelebration();
}

// Restore all game values and UI to begin a brand-new round.
function resetGame() {
	// Reset timer and all in-memory game state.
	stopTimer();
	hideWinCelebration();
	deck = createDeck();
	flippedCards = [];
	matchedPairs = 0;
	score = 0;
	secondsElapsed = 0;
	lockBoard = false;
	gameStarted = false;

	// Reset on-screen labels and helper text.
	scoreElement.textContent = "0";
	timerElement.textContent = "00:00";
	snippetPanel.textContent = "Click any card to start the game. Match a pair to reveal a clean water solution fact.";

	// Draw fresh cards and wait for the player's first card click.
	renderBoard();
}

// "Play Again" closes the celebration overlay and resets to ready-to-start.
playAgainButton.addEventListener("click", () => {
	resetGame();
});

resetGameButton.addEventListener("click", resetGame);

// Start the first game when the page loads.
resetGame();
