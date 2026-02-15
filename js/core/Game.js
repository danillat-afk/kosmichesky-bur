/*
 * КОСМИЧЕСКИЙ БУР - Песочница с управлением
 * Управление: стрелки/AD или тач слева/справа
 */

class Game {
constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d', { alpha: false }); // отключаем альфа-канал

    // Определяем размеры в зависимости от платформы
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
        this.width = 540;
        this.height = 960;
    } else {
        this.width = 1080;
        this.height = 1920;
    }

    this.canvas.width = this.width;
    this.canvas.height = this.height;

    console.log('Canvas size:', this.canvas.width, 'x', this.canvas.height);

    // Инициализация систем
    this.renderer = new Renderer(this);
    this.input = new Input(this);
    this.economy = new Economy();
    this.upgrades = new Upgrades(this);
    this.driftSystem = new DriftSystem(this);
    this.saveManager = new SaveManager(this);

    // Сущности
    this.drill = new Drill(this);
    this.ground = new Ground(this);
    this.particles = [];

    // Лимит частиц для производительности
    this.maxParticles = 300;

    // Состояние игры
    this.isRunning = false;
    this.lastTime = 0;
    this.camera = { x: 0, y: 0 };

    // Счётчик слоёв (больше не используется, но оставим)
    this.currentLayer = 0;

    this.init();
}

    init() {
        // Устанавливаем начальную позицию камеры
        this.drill.updateCamera();
        
        this.setupEventListeners();
        this.createStarfield();
        this.saveManager.load();
        this.start();
    }
    
    createStarfield() {
        const container = document.getElementById('game-container');
        const canvas = document.getElementById('gameCanvas');
        
        // Создаём туманности (вставляем ПЕРЕД canvas в DOM, но canvas имеет z-index выше)
        for (let i = 1; i <= 3; i++) {
            const nebula = document.createElement('div');
            nebula.className = `nebula-${i}`;
            container.insertBefore(nebula, canvas);
        }
    }

    setupEventListeners() {
        // Кнопки меню
        document.getElementById('btn-upgrades').addEventListener('click', () => {
            this.openModal('modal-upgrades');
            this.upgrades.renderUI();
        });

        document.getElementById('btn-achievements').addEventListener('click', () => {
            this.openModal('modal-achievements');
        });

        document.getElementById('btn-settings').addEventListener('click', () => {
            // TODO: Модалка настроек
        });

        // Закрытие модалок
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.modal').classList.add('hidden');
            });
        });

        // Усилители
        document.querySelectorAll('.boost-slot').forEach(slot => {
            slot.addEventListener('click', () => {
                const boostType = slot.dataset.boost;
                this.activateBoost(boostType);
            });
        });

        // Ресайз
        window.addEventListener('resize', () => this.handleResize());
        this.handleResize();
    }

    handleResize() {
        const container = document.getElementById('game-container');
        const aspect = this.width / this.height;
        const windowAspect = window.innerWidth / window.innerHeight;

        if (windowAspect > aspect) {
            this.canvas.style.height = '100vh';
            this.canvas.style.width = `${window.innerHeight * aspect}px`;
        } else {
            this.canvas.style.width = '100vw';
            this.canvas.style.height = `${window.innerWidth / aspect}px`;
        }
    }

    start() {
        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    }

    loop(timestamp) {
        if (!this.isRunning) return;

        const deltaTime = Math.min((timestamp - this.lastTime) / 1000, 0.1);
        this.lastTime = timestamp;

        this.update(deltaTime);
        this.render();

        requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
        // Обновляем землю (генерация чанков)
        this.ground.update(dt);
        
        // Обновляем дрифт
        this.driftSystem.update(dt);

        // Обновляем бур
        this.drill.update(dt);

        // Обновляем частицы
        this.particles = this.particles.filter(p => {
            p.update(dt);
            return p.life > 0;
        });

        // Автосохранение
        this.saveManager.update(dt);

        // Обновление UI
        this.updateUI();
    }

    render() {
        // Очищаем canvas (делаем прозрачным, фон в CSS)
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Проверка - рисуем тестовый круг если ничего не видно
        if (this.frameCount === undefined) this.frameCount = 0;
        this.frameCount++;
        if (this.frameCount < 10) {
            console.log('Render frame', this.frameCount);
        }

        // Рисуем землю
        this.ground.render(this.ctx, this.camera);

        // Рисуем бур
        this.drill.render(this.ctx, this.camera);

        // Рисуем частицы
        this.particles.forEach(p => p.render(this.ctx, this.camera));

        // Эффекты дрифта
        this.driftSystem.renderEffects(this.ctx);
    }

    updateUI() {
        // Ресурсы
        document.getElementById('coins').textContent = Math.floor(this.economy.coins);
        document.getElementById('ore').textContent = this.economy.ore;
        document.getElementById('depth-meter').textContent = 
            Math.floor(this.drill.depth * 10) + 'м';

        // Дрифт
        const driftFill = document.getElementById('drift-fill');
        const driftMult = document.getElementById('drift-multiplier');
        driftFill.style.width = (this.driftSystem.charge / this.driftSystem.maxCharge * 100) + '%';
        driftMult.textContent = '×' + this.driftSystem.multiplier.toFixed(1);
        
        // Визуальная обратная связь для высокого дрифта
        const driftPanel = document.getElementById('drift-panel');
        if (this.driftSystem.multiplier > 2.0) {
            driftPanel.classList.add('high-value');
        } else {
            driftPanel.classList.remove('high-value');
        }
    }

    openModal(id) {
        document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
        document.getElementById(id).classList.remove('hidden');
    }

    activateBoost(type) {
        console.log('Активация усилителя:', type);
    }

    createParticle(x, y, type, color, size = null) {
    if (this.particles.length >= this.maxParticles) {
        this.particles.shift(); // удаляем самую старую частицу
    }
    this.particles.push(new Particle(x, y, type, color, size));
}
}

// Запуск при загрузке
window.addEventListener('load', () => {
    console.log('Загрузка игры Космический Бур...');
    try {
        window.game = new Game();
        console.log('Игра загружена!');
    } catch (e) {
        console.error('ОШИБКА при загрузке игры:', e);
        console.error('Стек:', e.stack);
    }
});