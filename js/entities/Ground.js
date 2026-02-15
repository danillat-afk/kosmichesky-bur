/**
 * Система земли - пиксельная песочница
 * Земля представлена как сетка блоков 10x10 пикселей
 */
class Ground {
    constructor(game) {
        this.game = game;
        this.ctx = game.ctx;
        
        // Размер блока земли (меньше = детальнее)
        this.blockSize = 12;
        
        // Генерация мира
        this.chunkSize = 50; // блоков в чанке
        this.chunks = new Map(); // Map<"x,y", chunk>
        
        // Текстура земли (создадим процедурно)
        this.groundPattern = this.createGroundPattern();
        
        // Начальная генерация
        this.generateInitialChunks();
    }
    
    createGroundPattern() {
        // Создаём canvas с текстурой земли
        const patternCanvas = document.createElement('canvas');
        patternCanvas.width = 40;
        patternCanvas.height = 40;
        const pctx = patternCanvas.getContext('2d');
        
        // Базовый цвет земли
        pctx.fillStyle = '#8B4513';
        pctx.fillRect(0, 0, 40, 40);
        
        // Шум для текстуры
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * 40;
            const y = Math.random() * 40;
            const size = 1 + Math.random() * 3;
            const shade = Math.random() > 0.5 ? '#A0522D' : '#654321';
            pctx.fillStyle = shade;
            pctx.fillRect(x, y, size, size);
        }
        
        return this.ctx.createPattern(patternCanvas, 'repeat');
    }
    
    generateInitialChunks() {
        // Генерируем начальную область вокруг бура
        const centerX = Math.floor(this.game.drill.x / (this.chunkSize * this.blockSize));
        const centerY = Math.floor(this.game.drill.y / (this.chunkSize * this.blockSize));
        
        for (let dx = -2; dx <= 2; dx++) {
            for (let dy = -1; dy <= 3; dy++) {
                this.generateChunk(centerX + dx, centerY + dy);
            }
        }
    }
    
    getChunkKey(cx, cy) {
        return `${cx},${cy}`;
    }
    
    generateChunk(cx, cy) {
        const key = this.getChunkKey(cx, cy);
        if (this.chunks.has(key)) return this.chunks.get(key);
        
        const chunk = {
            x: cx,
            y: cy,
            blocks: new Uint8Array(this.chunkSize * this.chunkSize)
        };
        
        // Заполняем чанк землёй
        // Верхние чанки (y < 2) - пустое небо
        // Ниже - земля с разной плотностью
        for (let by = 0; by < this.chunkSize; by++) {
            for (let bx = 0; bx < this.chunkSize; bx++) {
                const worldY = (cy * this.chunkSize + by) * this.blockSize;
                const worldX = (cx * this.chunkSize + bx) * this.blockSize;
                
                let hasGround = false;
                let hardness = 1;
                
                // Простая генерация: сверху небо, потом земля
                if (worldY > 400) {
                    hasGround = true;
                    // Глубже = твёрже
                    const depth = (worldY - 400) / 1000;
                    hardness = 1 + Math.floor(depth);
                    
                    // Небольшие пещеры
                    if (Math.random() < 0.05) hasGround = false;
                }
                
                const idx = by * this.chunkSize + bx;
                chunk.blocks[idx] = hasGround ? Math.min(hardness, 255) : 0;
            }
        }
        
        this.chunks.set(key, chunk);
        return chunk;
    }
    
    // Получить значение земли по мировым координатам
    getBlock(worldX, worldY) {
        const bx = Math.floor(worldX / this.blockSize);
        const by = Math.floor(worldY / this.blockSize);
        const cx = Math.floor(bx / this.chunkSize);
        const cy = Math.floor(by / this.chunkSize);
        
        const chunk = this.generateChunk(cx, cy);
        const localBx = bx % this.chunkSize;
        const localBy = by % this.chunkSize;
        const idx = localBy * this.chunkSize + localBx;
        
        return chunk.blocks[idx];
    }
    
    // Удалить землю (бурение)
    dig(worldX, worldY, radius = 15) {
        let dug = 0;
        
        // Перебираем блоки в радиусе
        const startBx = Math.floor((worldX - radius) / this.blockSize);
        const endBx = Math.floor((worldX + radius) / this.blockSize);
        const startBy = Math.floor((worldY - radius) / this.blockSize);
        const endBy = Math.floor((worldY + radius) / this.blockSize);
        
        for (let bx = startBx; bx <= endBx; bx++) {
            for (let by = startBy; by <= endBy; by++) {
                const blockX = bx * this.blockSize + this.blockSize / 2;
                const blockY = by * this.blockSize + this.blockSize / 2;
                
                // Проверяем расстояние
                const dx = blockX - worldX;
                const dy = blockY - worldY;
                if (dx * dx + dy * dy <= radius * radius) {
                    const cx = Math.floor(bx / this.chunkSize);
                    const cy = Math.floor(by / this.chunkSize);
                    const chunk = this.generateChunk(cx, cy);
                    const localBx = ((bx % this.chunkSize) + this.chunkSize) % this.chunkSize;
                    const localBy = ((by % this.chunkSize) + this.chunkSize) % this.chunkSize;
                    const idx = localBy * this.chunkSize + localBx;
                    
                    if (chunk.blocks[idx] > 0) {
                        chunk.blocks[idx] = 0;
                        dug++;
                        
                        // Частицы
                        if (Math.random() < 0.3) {
                            this.game.createParticle(
                                blockX, blockY,
                                'debris',
                                '#8B4513',
                                2 + Math.random() * 3
                            );
                        }
                    }
                }
            }
        }
        
        return dug;
    }
    
    // Проверка столкновения с землёй
    checkCollision(x, y, width, height) {
        // Проверяем несколько точек по периметру
        const points = [
            { x: x - width/2 + 2, y: y - height/2 + 2 }, // Верхний левый
            { x: x + width/2 - 2, y: y - height/2 + 2 }, // Верхний правый
            { x: x - width/2 + 2, y: y + height/2 - 2 }, // Нижний левый
            { x: x + width/2 - 2, y: y + height/2 - 2 }, // Нижний правый
            { x: x, y: y + height/2 },                    // Низ центр
            { x: x, y: y - height/2 },                    // Верх центр
            { x: x - width/2, y: y },                     // Лево центр
            { x: x + width/2, y: y }                      // Право центр
        ];
        
        for (const p of points) {
            if (this.getBlock(p.x, p.y) > 0) {
                return true;
            }
        }
        return false;
    }
    
    update(dt) {
        // Генерируем чанки вокруг камеры
        const camX = this.game.camera.x;
        const camY = this.game.camera.y;
        const viewWidth = this.game.width;
        const viewHeight = this.game.height;
        
        const startCx = Math.floor((camX - viewWidth) / (this.chunkSize * this.blockSize));
        const endCx = Math.floor((camX + viewWidth * 2) / (this.chunkSize * this.blockSize));
        const startCy = Math.floor((camY - viewHeight) / (this.chunkSize * this.blockSize));
        const endCy = Math.floor((camY + viewHeight * 2) / (this.chunkSize * this.blockSize));
        
        for (let cx = startCx; cx <= endCx; cx++) {
            for (let cy = startCy; cy <= endCy; cy++) {
                this.generateChunk(cx, cy);
            }
        }
    }
    
    render(ctx, camera) {
        // Рисуем только видимые чанки
        const startCx = Math.floor(camera.x / (this.chunkSize * this.blockSize)) - 1;
        const endCx = Math.floor((camera.x + this.game.width) / (this.chunkSize * this.blockSize)) + 1;
        const startCy = Math.floor(camera.y / (this.chunkSize * this.blockSize)) - 1;
        const endCy = Math.floor((camera.y + this.game.height) / (this.chunkSize * this.blockSize)) + 1;
        
        ctx.save();
        
        // Рисуем землю
        ctx.fillStyle = this.groundPattern || '#8B4513';
        
        for (let cx = startCx; cx <= endCx; cx++) {
            for (let cy = startCy; cy <= endCy; cy++) {
                const chunk = this.chunks.get(this.getChunkKey(cx, cy));
                if (!chunk) continue;
                
                const chunkX = cx * this.chunkSize * this.blockSize;
                const chunkY = cy * this.chunkSize * this.blockSize;
                
                // Оптимизация: рисуем прямоугольниками
                for (let by = 0; by < this.chunkSize; by++) {
                    let runStart = -1;
                    
                    for (let bx = 0; bx <= this.chunkSize; bx++) {
                        const idx = by * this.chunkSize + bx;
                        const hasBlock = bx < this.chunkSize && chunk.blocks[idx] > 0;
                        
                        if (hasBlock && runStart === -1) {
                            runStart = bx;
                        } else if ((!hasBlock || bx === this.chunkSize) && runStart !== -1) {
                            // Рисуем полосу
                            const x = chunkX + runStart * this.blockSize - camera.x;
                            const y = chunkY + by * this.blockSize - camera.y;
                            const w = (bx - runStart) * this.blockSize;
                            const h = this.blockSize;
                            
                            ctx.fillRect(x, y, w, h);
                            
                            // Граница для объёма
                            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
                            ctx.lineWidth = 1;
                            ctx.strokeRect(x, y, w, h);
                            
                            runStart = -1;
                        }
                    }
                }
            }
        }
        
        ctx.restore();
    }
}