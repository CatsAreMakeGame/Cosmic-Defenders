// --- Global Game Data ---
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
    { 
        name: "GRUNT", color: "#f00", hp: 1, w: 30, h: 30, speedMult: 1, 
        minScore: 10, maxScore: 30, icon: "👾" 
    },
    { 
        name: "TANK", color: "#08f", hp: 4, w: 40, h: 35, speedMult: 0.6, 
        minScore: 20, maxScore: 40, icon: "🛡️" 
    },
    { 
        name: "SPEEDY", color: "#ff0", hp: 1, w: 25, h: 25, speedMult: 1.8, 
        minScore: 15, maxScore: 35, icon: "⚡" 
    }
];

// Helpers
const getShipMaxSlots = (level) => Math.floor(level / 5);
const getShipLevelCost = (level) => level * 10;
