class Upgrades {
    constructor(game) {
        this.game = game;

        this.upgrades = [
            {
                id: 'drill_power',
                name: 'Усиление Бура',
                description: 'Увеличивает урон по земле',
                baseCost: 50,
                costMultiplier: 1.3,
                maxLevel: 50,
                effect: (level) => 1 + level * 0.2,
                icon: '⛏️'
            },
            {
                id: 'drill_speed',
                name: 'Скорость Бура',
                description: 'Быстрее движется вниз',
                baseCost: 100,
                costMultiplier: 1.4,
                maxLevel: 30,
                effect: (level) => 100 + level * 10,
                icon: '⚡'
            },
            {
                id: 'cooling',
                name: 'Охлаждение',
                description: 'Медленнее перегревается',
                baseCost: 200,
                costMultiplier: 1.5,
                maxLevel: 20,
                effect: (level) => 1 + level * 0.1, // Базовая эффективность 1, +10% за уровень
                icon: '❄️'
            },
            {
                id: 'drift_decay',
                name: 'Стабильность',
                description: 'Дрифт длится дольше',
                baseCost: 500,
                costMultiplier: 1.6,
                maxLevel: 15,
                effect: (level) => 2 - level * 0.1,
                icon: '🎯'
            },
            {
                id: 'coin_multi',
                name: 'Финансист',
                description: 'Больше монет с слоёв',
                baseCost: 1000,
                costMultiplier: 2,
                maxLevel: 10,
                effect: (level) => 1 + level * 0.5,
                icon: '💰'
            },
            {
                id: 'ore_chance',
                name: 'Геолог',
                description: 'Шанс найти руду',
                baseCost: 2000,
                costMultiplier: 2,
                maxLevel: 10,
                effect: (level) => 0.1 + level * 0.05,
                icon: '💎'
            }
        ];

        this.levels = {};
        this.upgrades.forEach(u => this.levels[u.id] = 0);
    }

    getCost(upgradeId) {
        const upg = this.upgrades.find(u => u.id === upgradeId);
        const level = this.levels[upgradeId];
        return Math.floor(upg.baseCost * Math.pow(upg.costMultiplier, level));
    }

    canAfford(upgradeId) {
        return this.game.economy.coins >= this.getCost(upgradeId);
    }

    buy(upgradeId) {
        const upg = this.upgrades.find(u => u.id === upgradeId);
        const cost = this.getCost(upgradeId);

        if (this.levels[upgradeId] >= upg.maxLevel) return false;
        if (!this.game.economy.spendCoins(cost)) return false;

        this.levels[upgradeId]++;
        this.applyUpgrade(upgradeId);
        return true;
    }

    applyUpgrade(upgradeId) {
        const upg = this.upgrades.find(u => u.id === upgradeId);
        const level = this.levels[upgradeId];
        const drill = this.game.drill;

        switch(upgradeId) {
            case 'drill_power':
                drill.power = upg.effect(level);
                break;
            case 'drill_speed':
                drill.speed = upg.effect(level);
                break;
            case 'cooling':
                drill.coolingEfficiency = upg.effect(level);
                break;
            case 'drift_decay':
                this.game.driftSystem.decayRate = upg.effect(level);
                break;
            case 'coin_multi':
                this.game.economy.coinMultiplier = upg.effect(level);
                break;
            case 'ore_chance':
                this.game.economy.oreChance = upg.effect(level);
                break;
        }
    }

    renderUI() {
        const container = document.querySelector('.upgrades-grid');
        container.innerHTML = '';

        this.upgrades.forEach(upg => {
            const level = this.levels[upg.id];
            const cost = this.getCost(upg.id);
            const maxed = level >= upg.maxLevel;
            const canAfford = this.canAfford(upg.id);

            const card = document.createElement('div');
            card.className = `upgrade-card ${maxed ? 'maxed' : ''}`;
            card.innerHTML = `
                <div style="font-size: 30px; margin-bottom: 5px;">${upg.icon}</div>
                <div class="upgrade-name">${upg.name}</div>
                <div class="upgrade-level">Ур. ${level}/${upg.maxLevel}</div>
                <button class="upgrade-cost" ${maxed || !canAfford ? 'disabled' : ''}>
                    ${maxed ? 'МАКС' : '🪙 ' + Utils.formatNumber(cost)}
                </button>
            `;

            card.querySelector('button').addEventListener('click', () => {
                if (this.buy(upg.id)) {
                    this.renderUI();
                    this.game.saveManager.save();
                }
            });

            container.appendChild(card);
        });
    }
}