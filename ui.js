const screens = {
    main: document.getElementById('main-menu'),
    index: document.getElementById('index-menu'),
    gameOver: document.getElementById('game-over')
};

function updateCoinUI() {
    document.getElementById('menu-coins').innerText = pData.coins;
    document.getElementById('hud-coins').innerText = pData.coins;
}

function renderIndex(tab) {
    const content = document.getElementById('index-content');
    content.innerHTML = ''; 
    updateCoinUI();

    if (tab === 'ships') {
        shipData.forEach((ship, i) => {
            const sData = pData.ships[i];
            const maxSlots = getShipMaxSlots(sData.level);
            const isEq = pData.currentShip === i;
            
            let html = `<div class="garage-panel">
                <b>${ship.name} ${sData.owned ? `(Lv.${sData.level})` : ''}</b>
                <div style="margin: 10px 0;">
                    ${sData.owned ? 
                        `<button onclick="equipShip(${i})" ${isEq ? 'disabled' : ''}>${isEq ? 'Equipped' : 'Equip'}</button>
                         <button onclick="levelUpShip(${i})">UPG (${getShipLevelCost(sData.level)}C)</button>` :
                        `<button onclick="buyShip(${i})">BUY (${ship.price}C)</button>`
                    }
                </div>
                <div class="slot-container">`;
            for(let s = 0; s < 4; s++) {
                const isLocked = s >= maxSlots;
                html += `<div class="slot ${isLocked ? 'locked' : ''}" onclick="${isLocked ? '' : `manageSlot(${i}, ${s})`}">
                    ${isLocked ? `Lv${(s+1)*5}` : (sData.items[s] || "EMPTY").toUpperCase()}
                </div>`;
            }
            html += `</div></div>`;
            content.innerHTML += html;
        });
    } else if (tab === 'enemies') {
        enemyData.forEach((enemy, i) => {
            const discovered = pData.enemyKills[i] > 0;
            content.innerHTML += `
                <div class="card ${!discovered ? 'mystery' : ''}">
                    <div style="font-size:30px;">${discovered ? enemy.icon : '❓'}</div>
                    <div class="info">
                        <b>${discovered ? enemy.name : '???'}</b><br>
                        ${discovered ? `Kills: ${pData.enemyKills[i]}<br>Value: ${enemy.minScore}-${enemy.maxScore}` : 'Undiscovered'}
                    </div>
                </div>`;
        });
    }
}

// Logic for buying/equipping
window.buyShip = (id) => { if(pData.coins >= shipData[id].price) { pData.coins -= shipData[id].price; pData.ships[id].owned = true; renderIndex('ships'); } };
window.equipShip = (id) => { pData.currentShip = id; renderIndex('ships'); };
window.levelUpShip = (id) => {
    let cost = getShipLevelCost(pData.ships[id].level);
    if(pData.coins >= cost && pData.ships[id].level < 20) {
        pData.coins -= cost; pData.ships[id].level++; renderIndex('ships');
    }
};
