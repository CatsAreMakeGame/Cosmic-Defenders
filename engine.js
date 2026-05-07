const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let gameState = 'menu';
let score = 0, wave = 1;
let bullets = [], aliens = [], drops = [];

function addScore(points) {
    score += points;
    document.getElementById('score').innerText = score;
    pData.scoreBank += points;
    if (pData.scoreBank >= 100) {
        pData.coins += Math.floor(pData.scoreBank / 100);
        pData.scoreBank %= 100;
        updateCoinUI();
    }
}

function update() {
    // [Bullet logic, Alien movement, Collision detection]
    // Randomized Score Logic:
    /*
    if (a.hp <= 0) {
        const stats = enemyData[a.type];
        const randomScore = Math.floor(Math.random() * (stats.maxScore - stats.minScore + 1)) + stats.minScore;
        addScore(randomScore);
        pData.enemyKills[a.type]++;
        aliens.splice(j, 1);
    }
    */
}

function draw() {
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw assets using paths or Icons
    aliens.forEach(a => {
        ctx.font = "20px Arial";
        ctx.fillText(enemyData[a.type].icon, a.x, a.y + 20);
    });
}

// Start/Stop Logic
document.getElementById('btn-quit').onclick = () => {
    gameState = 'menu';
    location.reload(); // Simple way to reset state
};
