/**
 * Система земли - пиксельная песочница с кэшированием чанков
 */
class Ground {
    constructor(game) {
        this.game = game;
        this.ctx = game.ctx;

        // Размер блока земли (было 12, теперь 16 для производительности)
        this.blockSize = 16;

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
            blocks: new Uint8Array(this.chunkSize * this.chunkSize),
            canvas: document.createElement('canvas'),
            dirty: true
        };
        chunk.canvas.width = this.chunkSize * this.blockSize;
        chunk.canvas.height = this.chunkSize * this.blockSize;

        // Заполняем чанк землёй
        for (let by = 0; by < this.chunkSize; by++) {
            for (let bx = 0; bx < this.chunkSize; bx++) {
                const worldY = (cy * this.chunkSize + by) * this.blockSize;
                const worldX = (cx * this.chunkSize + bx) * this.blockSize;

                let hasGround = false;
                let hardness = 1;

                if (worldY > 400) {
                    hasGround = true;
                    const depth = (worldY - 400) / 1000;
                    hardness = 1 + Math.floor(depth);
                    if (Math.random() < 0.05) hasGround = false;
                }

                const idx = by * this.chunkSize + bx;
                chunk.blocks[idx] = hasGround ? Math.min(hardness, 255) : 0;
            }
        }

        this.renderChunkToCanvas(chunk);
        this.chunks.set(key, chunk);
        return chunk;
    }

    renderChunkToCanvas(chunk) {
        const ctx = chunk.canvas.getContext('2d');
        ctx.clearRect(0, 0, chunk.canvas.width, chunk.canvas.height);
        ctx.fillStyle = this.groundPattern || '#8B4513';

        for (let by = 0; by < this.chunkSize; by++) {
            let runStart = -1;
            for (let bx = 0; bx <= this.chunkSize; bx++) {
                const idx = by * this.chunkSize + bx;
                const hasBlock = bx < this.chunkSize && chunk.blocks[idx] > 0;
                if (hasBlock && runStart === -1) {
                    runStart = bx;
                } else if ((!hasBlock || bx === this.chunkSize) && runStart !== -1) {
                    const x = runStart * this.blockSize;
                    const y = by * this.blockSize;
                    const w = (bx - runStart) * this.blockSize;
                    ctx.fillRect(x, y, w, this.blockSize);
                    runStart = -1;
                }
            }
        }
        chunk.dirty = false;
    }

    getBlock(worldX, worldY) {
        const bx = Math.floor(worldX / this.blockSize);
        const by = Math.floor(worldY / this.blockSize);
        const cx = Math.floor(bx / this.chunkSize);
        const cy = Math.floor(by / this.chunkSize);

        const key = this.getChunkKey(cx, cy);
        const chunk = this.chunks.get(key);
        if (!chunk) return 0; // за пределами сгенерированного - пусто

        const localBx = ((bx % this.chunkSize) + this.chunkSize) % this.chunkSize;
        const localBy = ((by % this.chunkSize) + this.chunkSize) % this.chunkSize;
        const idx = localBy * this.chunkSize + localBx;
        return chunk.blocks[idx];
    }

    dig(worldX, worldY, radius = 15) {
        let dug = 0;
        const modifiedChunks = new Set();

        const startBx = Math.floor((worldX - radius) / this.blockSize);
        const endBx = Math.floor((worldX + radius) / this.blockSize);
        const startBy = Math.floor((worldY - radius) / this.blockSize);
        const endBy = Math.floor((worldY + radius) / this.blockSize);

        for (let bx = startBx; bx <= endBx; bx++) {
            for (let by = startBy; by <= endBy; by++) {
                const blockX = bx * this.blockSize + this.blockSize / 2;
                const blockY = by * this.blockSize + this.blockSize / 2;

                const dx = blockX - worldX;
                const dy = blockY - worldY;
                if (dx * dx + dy * dy <= radius * radius) {
                    const cx = Math.floor(bx / this.chunkSize);
                    const cy = Math.floor(by / this.chunkSize);
                    const chunk = this.generateChunk(cx, cy); // гарантируем наличие чанка
                    const localBx = ((bx % this.chunkSize) + this.chunkSize) % this.chunkSize;
                    const localBy = ((by % this.chunkSize) + this.chunkSize) % this.chunkSize;
                    const idx = localBy * this.chunkSize + localBx;

                    if (chunk.blocks[idx] > 0) {
                        chunk.blocks[idx] = 0;
                        modifiedChunks.add(chunk);
                        dug++;

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

        modifiedChunks.forEach(chunk => chunk.dirty = true);
        return dug;
    }

    checkCollision(x, y, width, height) {
        const points = [
            { x: x - width/2 + 2, y: y - height/2 + 2 },
            { x: x + width/2 - 2, y: y - height/2 + 2 },
            { x: x - width/2 + 2, y: y + height/2 - 2 },
            { x: x + width/2 - 2, y: y + height/2 - 2 },
            { x: x, y: y + height/2 },
            { x: x, y: y - height/2 },
            { x: x - width/2, y: y },
            { x: x + width/2, y: y }
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

        // Перерисовываем dirty-чанки
        for (let chunk of this.chunks.values()) {
            if (chunk.dirty) {
                this.renderChunkToCanvas(chunk);
            }
        }
    }

    render(ctx, camera) {
        const startCx = Math.floor(camera.x / (this.chunkSize * this.blockSize)) - 1;
        const endCx = Math.floor((camera.x + this.game.width) / (this.chunkSize * this.blockSize)) + 1;
        const startCy = Math.floor(camera.y / (this.chunkSize * this.blockSize)) - 1;
        const endCy = Math.floor((camera.y + this.game.height) / (this.chunkSize * this.blockSize)) + 1;

        for (let cx = startCx; cx <= endCx; cx++) {
            for (let cy = startCy; cy <= endCy; cy++) {
                const chunk = this.chunks.get(this.getChunkKey(cx, cy));
                if (!chunk) continue;

                const screenX = cx * this.chunkSize * this.blockSize - camera.x;
                const screenY = cy * this.chunkSize * this.blockSize - camera.y;

                ctx.drawImage(chunk.canvas, screenX, screenY);
            }
        }
    }
}