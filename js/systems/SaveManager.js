class SaveManager {
    constructor(game) {
        this.game = game;
        this.saveInterval = 5; // секунд
        this.timer = 0;
    }

    update(dt) {
        this.timer += dt;
        if (this.timer >= this.saveInterval) {
            this.save();
            this.timer = 0;
        }
    }

    save() {
        const data = {
            economy: {
                coins: this.game.economy.coins,
                ore: this.game.economy.ore,
                totalEarned: this.game.economy.totalEarned
            },
            drill: {
                x: this.game.drill.x,
                y: this.game.drill.y,
                depth: this.game.drill.depth
            },
            upgrades: this.game.upgrades.levels,
            progress: {
                currentLayer: this.game.currentLayer
            },
            stats: {
                totalLayersDestroyed: this.game.currentLayer,
                playTime: Date.now()
            }
        };

        localStorage.setItem('drillGame_save', JSON.stringify(data));
        console.log('Игра сохранена');
    }

    load() {
        const saved = localStorage.getItem('drillGame_save');
        if (!saved) return;

        try {
            const data = JSON.parse(saved);

            // Восстановление экономики
            this.game.economy.coins = data.economy?.coins || 0;
            this.game.economy.ore = data.economy?.ore || 0;
            this.game.economy.totalEarned = data.economy?.totalEarned || 0;

            // Восстановление прокачки
            if (data.upgrades) {
                Object.assign(this.game.upgrades.levels, data.upgrades);
                // Применяем улучшения
                Object.keys(data.upgrades).forEach(id => {
                    this.game.upgrades.applyUpgrade(id);
                });
            }

            // Восстановление прогресса
            if (data.progress) {
                this.game.currentLayer = data.progress.currentLayer || 0;
            }

            // Восстановление позиции
            if (data.drill) {
                this.game.drill.x = data.drill.x || this.game.width / 2;
                this.game.drill.y = data.drill.y || 300;
                this.game.drill.depth = data.drill.depth || 0;
            }

            console.log('Игра загружена');
        } catch (e) {
            console.error('Ошибка загрузки:', e);
        }
    }
}