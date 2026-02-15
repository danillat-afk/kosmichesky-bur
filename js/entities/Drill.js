class Drill {
    constructor(game) {
        this.game = game;
        this.x = game.width / 2;
        this.y = 150; // Начальная позиция - выше земли (земля начинается на 400)
        
        // Размеры
        this.width = 60;
        this.bodyHeight = 80;
        this.drillTipLength = 50;
        this.totalHeight = this.bodyHeight + this.drillTipLength;
        
        // Скорость
        this.speedX = 0;
        this.speedY = 0;
        this.maxSpeed = 300;
        this.acceleration = 600;
        this.friction = 0.85;
        
        // Гравитация
        this.gravity = 350;
        
        // Бурение
        this.isDrilling = false;
        this.drillPower = 100;
        this.drillRadius = 25;
        
        // Визуал
        this.rotation = 0;
        this.shakeX = 0;
        this.shakeY = 0;
        
        // Температура
        this.temperature = 0;
        this.maxTemperature = 100;
        
        // Глубина
        this.depth = 0;
        this.maxDepth = 0;
    }
    
    update(dt) {
        const input = this.game.input;
        const ground = this.game.ground;
        
        // Проверка - если бур застрял в земле при старте, выталкиваем его
        if (ground.checkCollision(this.x, this.y, this.width, this.totalHeight)) {
            // Поднимаемся пока не освободимся
            this.y -= 5;
            this.speedY = 0;
            return; // Пропускаем кадр
        }
        
        // Получаем ввод
        const hInput = input.getHorizontal();
        const vInput = input.getVertical();
        
        // Горизонтальное движение
        if (hInput !== 0) {
            this.speedX += hInput * this.acceleration * dt;
        } else {
            this.speedX *= this.friction;
        }
        this.speedX = Math.max(-this.maxSpeed, Math.min(this.maxSpeed, this.speedX));
        
        // Вертикальное управление
        if (vInput < -0.3) {
            // ВВЕРХ - поднимаемся
            this.speedY -= 400 * dt;
        } else if (vInput > 0.3) {
            // ВНИЗ - ускоряем падение
            this.speedY += 200 * dt;
        } else {
            // Гравитация
            this.speedY += this.gravity * dt;
        }
        
        // Пробуем двигаться по X
        let newX = this.x + this.speedX * dt;
        if (!ground.checkCollision(newX, this.y, this.width, this.totalHeight)) {
            this.x = newX;
        } else {
            // Упёрлись в стену - пробуем бурить сбоку
            if (Math.abs(this.speedX) > 50) {
                const sideDir = Math.sign(this.speedX);
                const digX = this.x + sideDir * (this.width/2 + 10);
                const digY = this.y + this.totalHeight/2 - 20; // Бурим на уровне наконечника
                const dug = ground.dig(digX, digY, 15);
                if (dug > 0) {
                    this.game.economy.addCoins(dug);
                    this.temperature = Math.min(this.temperature + dug * 0.2, this.maxTemperature);
                    // Немного двигаемся в сторону
                    this.x += sideDir * 20 * dt;
                }
            }
            this.speedX = 0;
        }
        
        // Пробуем двигаться по Y (с защитой от туннелирования)
        let newY = this.y + this.speedY * dt;
        
        // Если падаем слишком быстро - проверяем промежуточные точки
        if (this.speedY > 200) {
            const steps = Math.ceil(Math.abs(this.speedY * dt) / 20);
            for (let i = 1; i < steps; i++) {
                const checkY = this.y + (this.speedY * dt) * (i / steps);
                if (ground.checkCollision(this.x, checkY, this.width, this.totalHeight)) {
                    newY = checkY - 2; // Останавливаемся чуть раньше коллизии
                    this.speedY = 0;
                    break;
                }
            }
        }
        
        // Проверяем столкновение снизу (падение)
        if (this.speedY > 0) {
            // Проверяем коллизию в новой позиции
            if (!ground.checkCollision(this.x, newY, this.width, this.totalHeight)) {
                // Свободно - падаем
                this.y = newY;
                this.isDrilling = false;
            } else {
                // Столкнулись с землёй - пробуем бурить
                const digY = this.y + this.totalHeight / 2; // Низ наконечника
                const dug = ground.dig(this.x, digY, this.drillRadius);
                
                if (dug > 0) {
                    // Пробурили - можно пройти
                    this.isDrilling = true;
                    this.game.economy.addCoins(dug);
                    this.temperature = Math.min(this.temperature + dug * 0.3, this.maxTemperature);
                    
                    // Дрожание
                    this.shakeX = (Math.random() - 0.5) * 2;
                    this.shakeY = (Math.random() - 0.5) * 2;
                    
                    // Медленно проходим
                    this.y += 60 * dt;
                    
                    // Расширяем проход - бур боковые блоки
                    const sideDug = ground.dig(this.x - this.width/2, digY - 10, 12) + 
                                   ground.dig(this.x + this.width/2, digY - 10, 12);
                    if (sideDug > 0) {
                        this.game.economy.addCoins(sideDug);
                    }
                } else {
                    // Не пробурили - упёрлись
                    this.isDrilling = false;
                    this.speedY = 0;
                    // Немного отскакиваем вверх
                    this.speedY = -50;
                }
            }
        } 
        // Проверяем столкновение сверху (взлёт)
        else if (this.speedY < 0) {
            if (!ground.checkCollision(this.x, newY, this.width, this.totalHeight)) {
                this.y = newY;
                this.isDrilling = false;
            } else {
                // Упёрлись в потолок
                this.speedY = 0;
            }
        } 
        // Практически не движемся по Y
        else {
            this.y = newY;
            this.isDrilling = false;
        }
        
        // Санитарная проверка - если застряли в земле, выталкиваемся
        let stuckCounter = 0;
        while (ground.checkCollision(this.x, this.y, this.width, this.totalHeight) && stuckCounter < 20) {
            this.y -= 2;
            stuckCounter++;
        }
        
        // Охлаждение
        if (!this.isDrilling) {
            this.temperature = Math.max(0, this.temperature - 20 * dt);
            this.shakeX *= 0.9;
            this.shakeY *= 0.9;
        }
        
        // Глубина
        this.maxDepth = Math.max(this.maxDepth, (this.y - 150) / 100);
        this.depth = this.maxDepth;
        
        // Камера
        this.updateCamera();
    }
    
    updateCamera() {
        const targetCamX = this.x - this.game.width / 2;
        const targetCamY = this.y - this.game.height / 3;
        
        this.game.camera.x += (targetCamX - this.game.camera.x) * 0.15;
        this.game.camera.y += (targetCamY - this.game.camera.y) * 0.15;
    }
    
    render(ctx, camera) {
        const screenX = this.x - camera.x + this.shakeX;
        const screenY = this.y - camera.y + this.shakeY;
        
        ctx.save();
        ctx.translate(screenX, screenY);
        
        // Центр корпуса
        const bodyCenterY = -this.totalHeight / 2 + this.bodyHeight / 2;
        const bodyBottom = bodyCenterY + this.bodyHeight / 2;
        
        // Тень корпуса
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(-this.width/2 + 5, bodyCenterY - this.bodyHeight/2 + 5, this.width, this.bodyHeight);
        
        // Корпус
        const bodyGradient = ctx.createLinearGradient(-this.width/2, 0, this.width/2, 0);
        bodyGradient.addColorStop(0, '#5080a0');
        bodyGradient.addColorStop(0.5, '#80c0e0');
        bodyGradient.addColorStop(1, '#5080a0');
        
        ctx.fillStyle = bodyGradient;
        ctx.fillRect(-this.width/2, bodyCenterY - this.bodyHeight/2, this.width, this.bodyHeight);
        
        // Обводка корпуса
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.strokeRect(-this.width/2, bodyCenterY - this.bodyHeight/2, this.width, this.bodyHeight);
        
        ctx.strokeStyle = '#404040';
        ctx.lineWidth = 2;
        ctx.strokeRect(-this.width/2, bodyCenterY - this.bodyHeight/2, this.width, this.bodyHeight);
        
        // Внутренний механизм (шестерёнки)
        ctx.fillStyle = '#404040';
        for (let i = 0; i < 3; i++) {
            const y = bodyCenterY - this.bodyHeight/2 + 20 + i * 20;
            ctx.beginPath();
            ctx.arc(0, y, 10, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = '#606060';
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let j = 0; j < 6; j++) {
                const angle = (j / 6) * Math.PI * 2 + Date.now() / 200;
                const x = Math.cos(angle) * 6;
                const y2 = y + Math.sin(angle) * 6;
                if (j === 0) ctx.moveTo(x, y2);
                else ctx.lineTo(x, y2);
            }
            ctx.closePath();
            ctx.stroke();
        }
        
        // НАКОНЕЧНИК БУРА
        const tipHeat = this.temperature / this.maxTemperature;
        const tipColor = tipHeat > 0.7 ? '#ff4400' : (tipHeat > 0.4 ? '#ff8800' : '#c0c0c0');
        const drillRotation = Date.now() / 50;
        const tipBottom = this.totalHeight / 2;
        
        // Крепление
        ctx.fillStyle = '#606060';
        ctx.fillRect(-this.width/2 - 2, bodyBottom - 3, this.width + 4, 6);
        
        // Конус бура
        const tipGradient = ctx.createLinearGradient(-this.width/2, bodyBottom, 0, tipBottom);
        tipGradient.addColorStop(0, '#808080');
        tipGradient.addColorStop(0.5, tipColor);
        tipGradient.addColorStop(1, tipHeat > 0.5 ? '#ff6600' : '#404040');
        
        ctx.fillStyle = tipGradient;
        ctx.beginPath();
        ctx.moveTo(-this.width/2 - 3, bodyBottom);
        ctx.lineTo(0, tipBottom);
        ctx.lineTo(this.width/2 + 3, bodyBottom);
        ctx.closePath();
        ctx.fill();
        
        // Спиральные ребра
        ctx.strokeStyle = tipHeat > 0.5 ? '#ffaa00' : '#303030';
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            const offset = (i / 3) * Math.PI * 2 + drillRotation;
            for (let j = 0; j <= 8; j++) {
                const t = j / 8;
                const angle = offset + t * Math.PI * 1.5;
                const x = Math.cos(angle) * (this.width/2 - 5) * (1 - t * 0.8);
                const y = bodyBottom + 5 + t * (tipBottom - bodyBottom - 5);
                if (j === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
        
        // Центральная ось
        ctx.strokeStyle = '#202020';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, bodyBottom);
        ctx.lineTo(0, tipBottom);
        ctx.stroke();
        
        // Остриё
        ctx.fillStyle = tipHeat > 0.6 ? '#ff4400' : '#101010';
        ctx.beginPath();
        ctx.arc(0, tipBottom, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Свечение при нагреве
        if (tipHeat > 0.5) {
            ctx.globalAlpha = tipHeat * 0.5;
            ctx.fillStyle = '#ffaa00';
            ctx.beginPath();
            ctx.arc(0, tipBottom - 10, 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        
        // Индикатор перегрева
        if (this.temperature > 80) {
            const warningAlpha = 0.5 + 0.5 * Math.sin(Date.now() / 100);
            ctx.strokeStyle = `rgba(255, 0, 0, ${warningAlpha})`;
            ctx.lineWidth = 3;
            ctx.strokeRect(-this.width/2 - 3, -this.totalHeight/2 - 3, this.width + 6, this.totalHeight + 6);
        }
        
        // Искры при бурении
        if (this.isDrilling && Math.random() < 0.5) {
            ctx.fillStyle = '#ffaa00';
            for (let i = 0; i < 3; i++) {
                const sx = (Math.random() - 0.5) * 20;
                const sy = tipBottom + Math.random() * 15;
                ctx.fillRect(sx - 1, sy - 1, 3, 3);
            }
        }
        
        ctx.restore();
    }
}
