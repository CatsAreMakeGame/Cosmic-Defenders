const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Game Data & Progress ---
let pData = {
    coins: 0,
    scoreBank: 0, 
    currentShip: 0,
    ships: [
        { owned: true, level: 1, items: [] },
        { owned: false, level: 1, items: [] },
        { owned: false, level: 1, items: [] }
    ],
    inventory: { autobot: 0, bounce: 0, scrape: 0 },
    enemyKills: [0, 0, 0]
};

const shipData = [
    { name: "CLASSIC", price: 0, color: "#0f0", w: 40, h: 40, desc: "Standard single shot." },
    { name: "SPREADER", price: 50, color: "#0ff", w: 45, h: 35, desc: "Fires 3 bullets." },
    { name: "PIERCER", price: 150, color: "#f0f", w: 30, h: 45, desc: "Plasma beam passes through." }
];

const enemyData = [
    { name: "GRUNT", color: "#f00", hp: 1, w: 30, h: 30, speedMult: 1, score: 10 },
    { name: "TANK", color: "#08f", hp: 4, w: 40, h: 35, speedMult: 0.6, score: 25 },
    { name: "SPEEDY", color: "#ff0", hp: 1, w: 25, h: 25, speedMult: 1.8, score: 15 }
];

// --- UI Elements ---
const screens = {
    main: document.getElementById('main-menu'),
    settings: document.getElementById('settings-menu'),
    index: document.getElementById('index-menu'),
    gameOver: document.getElementById('game-over')
};
const hud = document.getElementById('hud');
const mobileUI = document.getElementById('mobile-controls');
const btnAutoToggle = document.getElementById('btn-autotoggle');

// --- Game State Variables ---
let gameState = 'menu';
let isMobileMode = false;
let animationId;
let score = 0, wave = 1;
const keys = { left: false, right: false, fire: false, t: false };

let player = { x: 180, y: 530, speed: 5 };
let bullets = [], aliens = [], drops = [];
let lastShotTime = 0;
const fireCooldown = 180; 
let alienDirection = 1;
let baseAlienSpeed = 1.0;
let autoFireActive = false;

// --- Helper Functions ---
function getShipMaxSlots(level) { return Math.floor(level / 5); }
function getShipLevelCost(level) { return level * 10; }

// --- UI & Menu Logic ---
function updateCoinUI() {
    document.getElementById('menu-coins').innerText = pData.coins;
    document.getElementById('hud-coins').innerText = pData.coins;
}

function showMainMenu() {
    gameState = 'menu';
    updateCoinUI();
    Object.values(screens).forEach(s => s.classList.add('hidden'));
    hud.classList.add('hidden');
    mobileUI.classList.add('hidden');
    screens.main.classList.remove('hidden');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

document.getElementById('btn-start').onclick = initGame;
document.getElementById('btn-restart').onclick = initGame;
document.getElementById('btn-menu').onclick = showMainMenu;
document.getElementById('btn-quit').onclick = showMainMenu;
document.getElementById('btn-settings').onclick = () => {
    screens.main.classList.add('hidden');
    screens.settings.classList.remove('hidden');
};
document.getElementById('btn-back-settings').onclick = showMainMenu;
document.getElementById('btn-back-index').onclick = showMainMenu;

document.getElementById('btn-toggle-mobile').onclick = (e) => {
    isMobileMode = !isMobileMode;
    e.target.innerText = `Mobile Mode: ${isMobileMode ? 'ON' : 'OFF'}`;
};

btnAutoToggle.onclick = () => {
    autoFireActive = !autoFireActive;
    btnAutoToggle.innerText = `AUTO: ${autoFireActive ? 'ON' : 'OFF'}`;
    if(autoFireActive) btnAutoToggle.style.background = '#0ff';
    else btnAutoToggle.style.background = 'transparent';
};

// --- Index / Garage Logic ---
document.getElementById('btn-index').onclick = () => {
    screens.main.classList.add('hidden');
    screens.index.classList.remove('hidden');
    renderIndex('ships');
};

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = (e) => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        renderIndex(e.target.id.replace('tab-', ''));
    };
});

window.buyShip = (id) => {
    if (pData.coins >= shipData[id].price) {
        pData.coins -= shipData[id].price;
        pData.ships[id].owned = true;
        pData.currentShip = id;
        renderIndex('ships');
    }
};
window.equipShip = (id) => { pData.currentShip = id; renderIndex('ships'); };
window.levelUpShip = (id) => {
    const cost = getShipLevelCost(pData.ships[id].level);
    if(pData.coins >= cost && pData.ships[id].level < 20) {
        pData.coins -= cost;
        pData.ships[id].level++;
        renderIndex('ships');
    }
};

window.manageSlot = (shipId, slotIndex) => {
    const ship = pData.ships[shipId];
    const currentItem = ship.items[slotIndex];

    if (currentItem) {
        // Prompt to remove
        const useScrape = confirm(`Remove ${currentItem.toUpperCase()}? \nClick OK to use 1 SCRAPE (Save Item). \nClick Cancel to DESTROY it.`);
        if (useScrape) {
            if (pData.inventory.scrape > 0) {
                pData.inventory.scrape--;
                pData.inventory[currentItem]++;
                ship.items.splice(slotIndex, 1);
                alert("Item saved to inventory using Scrape!");
            } else {
                alert("You don't have any SCRAPE items! Item destroyed.");
                ship.items.splice(slotIndex, 1);
            }
        } else {
            ship.items.splice(slotIndex, 1); // Destroyed
        }
        renderIndex('ships');
    } else {
        // Equip item
        const available = Object.keys(pData.inventory).filter(k => k !== 'scrape' && pData.inventory[k] > 0);
        if (available.length === 0) return alert("No equippable items in inventory.");
        
        let msg = "Type the item name to equip:\n" + available.map(k => `${k} (${pData.inventory[k]})`).join('\n');
        let choice = prompt(msg);
        if (choice && available.includes(choice.toLowerCase())) {
            choice = choice.toLowerCase();
            pData.inventory[choice]--;
            ship.items.push(choice);
            renderIndex('ships');
        }
    }
};

function renderIndex(tab) {
    const content = document.getElementById('index-content');
    content.innerHTML = ''; updateCoinUI();

    if (tab === 'ships') {
        shipData.forEach((ship, i) => {
            const sData = pData.ships[i];
            const maxSlots = getShipMaxSlots(sData.level);
            const isEq = pData.currentShip === i;
            const upgCost = getShipLevelCost(sData.level);
            
            let html = `<div class="garage-panel">
                <div style="display:flex; justify-content:space-between;">
                    <b>${ship.name} ${sData.owned ? `(Lv.${sData.level})` : ''}</b>
                    <span style="color:${ship.color}">■</span>
                </div>`;
            
            if (!sData.owned) {
                html += `<p>${ship.desc}</p>
                         <button onclick="buyShip(${i})" ${pData.coins < ship.price ? 'disabled' : ''}>Buy (${ship.price}C)</button>`;
            } else {
                html += `<div style="display:flex; gap:10px; margin-top:5px;">
                            <button onclick="equipShip(${i})" ${isEq ? 'disabled' : ''}>${isEq ? 'Equipped' : 'Equip'}</button>
                            <button onclick="levelUpShip(${i})" ${pData.coins < upgCost || sData.level >= 20 ? 'disabled' : ''}>
                                ${sData.level >= 20 ? 'MAX LVL' : `UPG (${upgCost}C)`}
                            </button>
                         </div>`;
                
                // Slots UI
                html += `<div class="slot-container">`;
                for(let s = 0; s < 4; s++) {
                    if (s < maxSlots) {
                        const item = sData.items[s] || "EMPTY";
                        html += `<div class="slot" onclick="manageSlot(${i}, ${s})">${item.toUpperCase()}</div>`;
                    } else {
                        html += `<div class="slot locked">LVL ${(s+1)*5}</div>`;
                    }
                }
                html += `</div>`;
            }
            html += `</div>`;
            content.innerHTML += html;
        });
    } else if (tab === 'items') {
        content.innerHTML = `
            <div class="grid-container">
                <div class="card"><div class="info"><b>AUTO-BOT</b><br>Auto fires.<br>Inv: ${pData.inventory.autobot}</div></div>
                <div class="card"><div class="info"><b>BOUNCE</b><br>Wall bounces.<br>Inv: ${pData.inventory.bounce}</div></div>
                <div class="card"><div class="info"><b>SCRAPE</b><br>Saves item on unequip.<br>Inv: ${pData.inventory.scrape}</div></div>
            </div>`;
    } else {
        content.innerHTML = `<div class="grid-container">`;
        enemyData.forEach((enemy, i) => {
            const kills = pData.enemyKills[i];
            const discovered = kills > 0;
            content.innerHTML += `
                <div class="card ${!discovered ? 'mystery' : ''}">
                    <div class="info"><b>${discovered ? enemy.name : '???'}</b><br>
                    ${discovered ? `HP: ${enemy.hp}<br>Kills: ${kills}` : 'Undiscovered'}</div>
                </div>`;
        });
        content.innerHTML += `</div>`;
    }
}

// --- Controls ---
window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') keys.left = true;
    if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') keys.right = true;
    if (e.key === ' ') keys.fire = true;
    if (e.key.toLowerCase() === 't') {
        const myShip = pData.ships[pData.currentShip];
        if (myShip.items.includes('autobot')) btnAutoToggle.click();
    }
});
window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') keys.left = false;
    if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') keys.right = false;
    if (e.key === ' ') keys.fire = false;
});

function attachMobile(id, action) {
    const btn = document.getElementById(id);
    const p = (e) => { e.preventDefault(); keys[action] = true; };
    const r = (e) => { e.preventDefault(); keys[action] = false; };
    btn.addEventListener('touchstart', p, { passive: false });
    btn.addEventListener('touchend', r, { passive: false });
    btn.addEventListener('mousedown', p); btn.addEventListener('mouseup', r); btn.addEventListener('mouseleave', r);
}
attachMobile('btn-left', 'left'); attachMobile('btn-right', 'right'); attachMobile('btn-fire', 'fire');

// --- Game Logic ---
function createAliens() {
    aliens = []; alienDirection = 1;
    for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 7; col++) {
            let typeId = 0; 
            if (wave > 1 && Math.random() < 0.2) typeId = 1; // Tank
            if (wave > 2 && Math.random() < 0.2) typeId = 2; // Speedy
            aliens.push({
                x: 30 + col * 50, y: 50 + row * 40,
                type: typeId, hp: enemyData[typeId].hp,
                w: enemyData[typeId].w, h: enemyData[typeId].h
            });
        }
    }
}

function initGame() {
    Object.values(screens).forEach(s => s.classList.add('hidden'));
    hud.classList.remove('hidden');
    if (isMobileMode) mobileUI.classList.remove('hidden');
    
    score = 0; wave = 1; baseAlienSpeed = 1.0; drops = []; bullets = [];
    document.getElementById('score').innerText = score;
    document.getElementById('wave-display').innerText = wave;
    
    player.x = canvas.width / 2 - shipData[pData.currentShip].w / 2;
    keys.left = keys.right = keys.fire = false;
    
    // Check auto bot
    const myShip = pData.ships[pData.currentShip];
    if (myShip.items.includes('autobot')) {
        btnAutoToggle.classList.remove('hidden');
    } else {
        btnAutoToggle.classList.add('hidden');
        autoFireActive = false;
        btnAutoToggle.innerText = 'AUTO: OFF';
        btnAutoToggle.style.background = 'transparent';
    }

    createAliens();
    gameState = 'playing';
    updateCoinUI();
    loop();
}

function gameOver() {
    gameState = 'gameover';
    cancelAnimationFrame(animationId);
    mobileUI.classList.add('hidden'); hud.classList.add('hidden');
    document.getElementById('go-score').innerText = score;
    screens.gameOver.classList.remove('hidden');
}

function addScore(points) {
    score += points; document.getElementById('score').innerText = score;
    pData.scoreBank += points;
    while(pData.scoreBank >= 100) { pData.coins++; pData.scoreBank -= 100; updateCoinUI(); }
}

function spawnDrop(x, y) {
    if (Math.random() < 0.08) { // 8% chance
        const types = ['autobot', 'bounce', 'scrape'];
        drops.push({ x: x, y: y, type: types[Math.floor(Math.random() * types.length)], w: 15, h: 15, speed: 2 });
    }
}

function fireBullets() {
    const shipId = pData.currentShip;
    const sData = shipData[shipId];
    const pX = player.x + sData.w / 2;
    const hasBounce = pData.ships[shipId].items.includes('bounce');
    
    if (shipId === 0) {
        bullets.push({ x: pX - 2, y: player.y, w: 4, h: 12, speed: 8, vx: hasBounce ? (Math.random()>0.5?1:-1) : 0, power: 1, pierce: false, bounce: hasBounce });
    } else if (shipId === 1) {
        bullets.push({ x: pX - 2, y: player.y, w: 4, h: 12, speed: 7, vx: 0, power: 1, pierce: false, bounce: hasBounce });
        bullets.push({ x: pX - 2, y: player.y, w: 4, h: 12, speed: 6, vx: -2.5, power: 1, pierce: false, bounce: hasBounce });
        bullets.push({ x: pX - 2, y: player.y, w: 4, h: 12, speed: 6, vx: 2.5, power: 1, pierce: false, bounce: hasBounce });
    } else if (shipId === 2) {
        bullets.push({ x: pX - 4, y: player.y, w: 8, h: 25, speed: 12, vx: 0, power: 1, pierce: true, hitList: new Set(), bounce: hasBounce });
    }
    lastShotTime = Date.now();
}

function update() {
    const sData = shipData[pData.currentShip];

    if (keys.left && player.x > 0) player.x -= player.speed;
    if (keys.right && player.x < canvas.width - sData.w) player.x += player.speed;

    if ((keys.fire || autoFireActive) && Date.now() - lastShotTime > fireCooldown) {
        fireBullets();
    }

    // Drops
    for (let i = drops.length - 1; i >= 0; i--) {
        let d = drops[i];
        d.y += d.speed;
        // Collision with player
        if (d.x < player.x + sData.w && d.x + d.w > player.x && d.y < player.y + sData.h && d.y + d.h > player.y) {
            pData.inventory[d.type]++;
            drops.splice(i, 1);
            continue;
        }
        if (d.y > canvas.height) drops.splice(i, 1);
    }

    // Bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        b.y -= b.speed;
        b.x += b.vx;
        
        // Bounce logic
        if (b.bounce) {
            if (b.x <= 0) { b.x = 0; b.vx *= -1; }
            else if (b.x + b.w >= canvas.width) { b.x = canvas.width - b.w; b.vx *= -1; }
        }

        if (b.y < -30 || (!b.bounce && (b.x < 0 || b.x > canvas.width))) {
            bullets.splice(i, 1);
        }
    }

    // Aliens
    let hitWall = false;
    for (let a of aliens) {
        const speed = baseAlienSpeed * enemyData[a.type].speedMult;
        a.x += speed * alienDirection;
        if (a.x <= 0 || a.x + a.w >= canvas.width) hitWall = true;
    }

    if (hitWall) {
        alienDirection *= -1;
        for (let a of aliens) {
            a.y += 20;
            if (a.y + a.h >= player.y) gameOver();
        }
    }

    // Collisions
    for (let i = bullets.length - 1; i >= 0; i--) {
        for (let j = aliens.length - 1; j >= 0; j--) {
            let b = bullets[i], a = aliens[j];
            if (!b || !a) continue;
            if (b.pierce && b.hitList.has(a)) continue;

            if (b.x < a.x + a.w && b.x + b.w > a.x && b.y < a.y + a.h && b.y + b.h > a.y) {
                a.hp -= b.power;
                if (b.pierce) b.hitList.add(a); 
                else bullets.splice(i, 1);

                if (a.hp <= 0) {
                    pData.enemyKills[a.type]++;
                    addScore(enemyData[a.type].score);
                    spawnDrop(a.x + a.w/2, a.y + a.h/2);
                    aliens.splice(j, 1);
                }
                if (!b.pierce) break; 
            }
        }
    }

    if (aliens.length === 0) {
        wave++; document.getElementById('wave-display').innerText = wave;
        baseAlienSpeed += 0.3; createAliens();
    }
}

// --- Visual Rendering ---
function drawPlayer(ctx, x, y, id) {
    ctx.fillStyle = shipData[id].color;
    ctx.beginPath();
    const w = shipData[id].w, h = shipData[id].h;
    
    if (id === 0) { // Classic Jet
        ctx.moveTo(x + w/2, y);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x + w/2, y + h - 10);
        ctx.lineTo(x, y + h);
    } else if (id === 1) { // Spreader
        ctx.moveTo(x + w/2, y + 10);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x + w - 10, y);
        ctx.lineTo(x + w/2, y + h/2);
        ctx.lineTo(x + 10, y);
        ctx.lineTo(x, y + h);
    } else if (id === 2) { // Piercer Dart
        ctx.moveTo(x + w/2, y);
        ctx.lineTo(x + w/2 + 5, y + h);
        ctx.lineTo(x + w/2 - 5, y + h);
    }
    ctx.fill();
    
    // Engine glow
    ctx.fillStyle = "orange";
    ctx.beginPath();
    ctx.arc(x + w/2, y + h, 4 + Math.random()*3, 0, Math.PI*2);
    ctx.fill();
}

function drawEnemy(ctx, x, y, type, a) {
    ctx.fillStyle = enemyData[type].color;
    const w = a.w, h = a.h;
    
    if (type === 0) { // Grunt (Bug)
        ctx.beginPath(); ctx.ellipse(x + w/2, y + h/2, w/2, h/3, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.fillRect(x+8, y+8, 4, 4); ctx.fillRect(x+18, y+8, 4, 4);
    } else if (type === 1) { // Tank
        ctx.fillRect(x, y+5, w, h-10);
        ctx.fillRect(x+5, y, w-10, h);
        ctx.fillStyle = '#f00'; ctx.fillRect(x+w/2-5, y+h/2-2, 10, 4);
    } else if (type === 2) { // Speedy
        ctx.beginPath(); ctx.moveTo(x+w/2, y+h); ctx.lineTo(x+w, y); ctx.lineTo(x, y); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x+w/2, y+h/3, 3, 0, Math.PI*2); ctx.fill();
    }
}

function draw() {
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawPlayer(ctx, player.x, player.y, pData.currentShip);

    for (let b of bullets) {
        ctx.fillStyle = b.pierce ? '#f0f' : (b.bounce ? '#fff' : '#ff0');
        ctx.shadowBlur = 5; ctx.shadowColor = ctx.fillStyle;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.shadowBlur = 0;
    }

    for (let d of drops) {
        ctx.fillStyle = d.type === 'autobot' ? '#0ff' : (d.type === 'bounce' ? '#fff' : '#f90');
        ctx.fillRect(d.x, d.y, d.w, d.h);
        ctx.fillStyle = '#000'; ctx.font = '10px Arial';
        ctx.fillText("?", d.x+4, d.y+11);
    }

    for (let a of aliens) {
        drawEnemy(ctx, a.x, a.y, a.type, a);
    }
}

function loop() {
    if (gameState !== 'playing') return;
    update();
    draw();
    animationId = requestAnimationFrame(loop);
}
