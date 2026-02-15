class Layer {
    constructor(game, index, previousLayerY = null) {
        this.game = game;
        this.index = index;

        // Позиция
        this.width = game.width - 40;
        this.height = 80;
        this.x = game.width / 2;
        
        // ИСПРАВЛЕНО: Правильное позиционирование слоев относительно бура
        // Для первого слоя: размещаем его сразу под буром
        const initialDrillY = game.drill ? game.drill.y : 200;
        const drillHeight = game.drill ? game.drill.height : 200;
        if (previousLayerY !== null) {
            this.y = previousLayerY + this.height;
        } else {
            // Первый слой размещаем так, чтобы бур касался его верхней грани
            // Учитываем: y бура - половина высоты бура + небольшой зазор + половина высоты слоя
            this.y = initialDrillY + drillHeight/2 + this.height/2 + 20;
        }

        // Характеристики - бесконечная прогрессия сложности
        const depthProgress = Math.floor(index / 10) * 0.1;
        this.hardness = 1 + depthProgress;
        this.maxHealth = 10 * this.hardness;
        this.health = this.maxHealth;
        this.reward = Math.floor(5 * this.hardness);

        // Визуал
        this.color = this.generateColor();
        this.pattern = this.generatePattern();
        this.isDestroyed = false;
        
        // Для эффекта разрушения
        this.destroyProgress = 0;
        this.destroyParticles = [];
    }

    generateColor() {
        // Бесконечная цикличная смена цветов плит
        const colors = [
            '#8B4513', // SaddleBrown
            '#A0522D', // Sienna
            '#CD853F', // Peru
            '#DEB887', // BurlyWood
            '#D2691E', // Chocolate
            '#BC8F8F', // RosyBrown
            '#F4A460', // SandyBrown
            '#DAA520', // GoldenRod
            '#B8860B', // DarkGoldenRod
            '#D2691E', // Chocolate
        ];
        return colors[this.index % colors.length];
    }

    generatePattern() {
        // Процедурная генерация текстуры
        return {
            cracks: Math.random() > 0.7,
            crystals: Math.random() > 0.9,
            fossils: Math.random() > 0.95
        };
    }

    takeDamage(damage, dt) {
        if (this.isDestroyed) return false;

        this.health -= damage;

        // Эффект повреждения (частицы при ударе)
        const particleCount = Math.min(Math.floor(damage * 2), 10);
        for (let i = 0; i < particleCount; i++) {
            const particleType = Math.random() > 0.7 ? 'debris' : 'chip';
            const size = particleType === 'debris' ? 3 + Math.random() * 4 : 2 + Math.random() * 3;
            
            this.game.createParticle(
                this.x + (Math.random() - 0.5) * this.width,
                this.y - this.height / 2 + Math.random() * this.height,
                particleType,
                this.color,
                size
            );
        }

        // Эффект искр при сильном ударе
        if (damage > 5 && Math.random() < 0.3) {
            for (let i = 0; i < 3; i++) {
                this.game.createParticle(
                    this.x + (Math.random() - 0.5) * 20,
                    this.y - this.height / 2,
                    'spark',
                    '#ffaa00',
                    2 + Math.random() * 2
                );
            }
        }

        if (this.health <= 0) {
            this.destroy();
            return true;
        }
        return false;
    }

    destroy() {
        this.isDestroyed = true;
        this.destroyProgress = 0;
        
        // Создаем осколки для эффекта разрушения
        const fragmentCount = 15 + Math.floor(Math.random() * 10);
        
        for (let i = 0; i < fragmentCount; i++) {
            const size = 5 + Math.random() * 10;
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 100;
            const rotationSpeed = (Math.random() - 0.5) * 10;
            
            this.destroyParticles.push({
                x: this.x + (Math.random() - 0.5) * this.width,
                y: this.y + (Math.random() - 0.5) * this.height,
                size: size,
                color: this.color,
                velocityX: Math.cos(angle) * speed,
                velocityY: Math.sin(angle) * speed,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: rotationSpeed,
                life: 1.0,
                decay: 0.5 + Math.random() * 0.5
            });
        }
        
        // Эффект пыли
        for (let i = 0; i < 20; i++) {
            this.game.createParticle(
                this.x + (Math.random() - 0.5) * this.width,
                this.y + (Math.random() - 0.5) * this.height,
                'dust',
                this.color,
                3 + Math.random() * 5
            );
        }
        
        // Эффект взрыва
        for (let i = 0; i < 8; i++) {
            this.game.createParticle(
                this.x,
                this.y,
                'explosion',
                '#ff8800',
                8 + Math.random() * 12
            );
        }
    }

    update(dt) {
        // Анимация разрушения
        if (this.isDestroyed && this.destroyParticles.length > 0) {
            this.destroyProgress += dt;
            
            // Обновляем осколки
            for (let i = this.destroyParticles.length - 1; i >= 0; i--) {
                const particle = this.destroyParticles[i];
                
                particle.x += particle.velocityX * dt;
                particle.y += particle.velocityY * dt;
                particle.rotation += particle.rotationSpeed * dt;
                particle.life -= particle.decay * dt;
                
                // Гравитация
                particle.velocityY += 100 * dt;
                
                // Удаляем мертвые частицы
                if (particle.life <= 0) {
                    this.destroyParticles.splice(i, 1);
                }
            }
        }
    }

    render(ctx, camera) {
        if (this.isDestroyed) return;

        const screenY = this.y - camera.y;

        // Оптимизация: пропускаем рендеринг если слой далеко за экраном
        if (screenY < -200 || screenY > ctx.canvas.height + 200) return;

        ctx.save();

        // Основной цвет
        ctx.fillStyle = this.color;
        ctx.fillRect(
            this.x - this.width / 2,
            screenY - this.height / 2,
            this.width,
            this.height
        );

        // Текстура
        this.renderTexture(ctx, screenY);

        // Полоска здоровья (если поврежден)
        if (this.health < this.maxHealth) {
            const healthPercent = this.health / this.maxHealth;
            ctx.fillStyle = '#333';
            ctx.fillRect(
                this.x - this.width / 2 + 10,
                screenY - this.height / 2 + 10,
                this.width - 20,
                8
            );
            ctx.fillStyle = healthPercent > 0.5 ? '#4CAF50' : '#f44336';
            ctx.fillRect(
                this.x - this.width / 2 + 10,
                screenY - this.height / 2 + 10,
                (this.width - 20) * healthPercent,
                8
            );
        }

        // Номер слоя (для отладки, можно убрать)
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.index, this.x, screenY + 8);

        ctx.restore();
        
        // Рендерим осколки разрушения
        if (this.isDestroyed && this.destroyParticles.length > 0) {
            this.renderFragments(ctx, camera);
        }
    }
    
    renderFragments(ctx, camera) {
        const screenY = this.y - camera.y;
        
        ctx.save();
        
        for (const fragment of this.destroyParticles) {
            const fragmentScreenY = fragment.y - camera.y;
            const alpha = Math.max(0, fragment.life);
            
            ctx.save();
            ctx.translate(fragment.x, fragmentScreenY);
            ctx.rotate(fragment.rotation);
            ctx.globalAlpha = alpha;
            
            // Осколок
            ctx.fillStyle = fragment.color;
            ctx.fillRect(-fragment.size/2, -fragment.size/2, fragment.size, fragment.size);
            
            // Контур осколка
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.lineWidth = 1;
            ctx.strokeRect(-fragment.size/2, -fragment.size/2, fragment.size, fragment.size);
            
            // Внутренняя деталь
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fillRect(-fragment.size/4, -fragment.size/4, fragment.size/2, fragment.size/2);
            
            ctx.restore();
        }
        
        ctx.restore();
    }

    renderTexture(ctx, screenY) {
        const left = this.x - this.width / 2;
        const top = screenY - this.height / 2;

        // Трещины
        if (this.pattern.cracks) {
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(left + 20, top + 20);
            ctx.lineTo(left + 50, top + 40);
            ctx.lineTo(left + 30, top + 60);
            ctx.stroke();
        }

        // Кристаллы
        if (this.pattern.crystals) {
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.beginPath();
            ctx.moveTo(left + this.width - 40, top + 20);
            ctx.lineTo(left + this.width - 30, top + 40);
            ctx.lineTo(left + this.width - 50, top + 40);
            ctx.closePath();
            ctx.fill();
        }

        // Граница слоя
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 2;
        ctx.strokeRect(left, top, this.width, this.height);
    }
}