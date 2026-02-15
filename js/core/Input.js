class Input {
    constructor(game) {
        this.game = game;
        
        // Состояние клавиш
        this.left = false;
        this.right = false;
        this.up = false;
        this.down = false;
        
        // Тач для мобильных - джойстик
        this.touchActive = false;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchCurrentX = 0;
        this.touchCurrentY = 0;
        this.joystickX = 0; // -1 до 1
        this.joystickY = 0; // -1 до 1
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Клавиатура
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));
        
        // Тач события для canvas
        const canvas = this.game.canvas;
        canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
        canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
        canvas.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });
        canvas.addEventListener('touchcancel', (e) => this.onTouchEnd(e), { passive: false });
        
        // Мышь для теста на ПК
        canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        window.addEventListener('mouseup', () => this.onMouseUp());
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    }
    
    onKeyDown(e) {
        switch(e.code) {
            case 'ArrowLeft':
            case 'KeyA':
                this.left = true;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.right = true;
                break;
            case 'ArrowUp':
            case 'KeyW':
                this.up = true;
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.down = true;
                break;
        }
    }
    
    onKeyUp(e) {
        switch(e.code) {
            case 'ArrowLeft':
            case 'KeyA':
                this.left = false;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.right = false;
                break;
            case 'ArrowUp':
            case 'KeyW':
                this.up = false;
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.down = false;
                break;
        }
    }
    
    onTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = this.game.canvas.getBoundingClientRect();
        
        // Учитываем масштабирование canvas
        const scaleX = this.game.canvas.width / rect.width;
        const scaleY = this.game.canvas.height / rect.height;
        
        this.touchStartX = (touch.clientX - rect.left) * scaleX;
        this.touchStartY = (touch.clientY - rect.top) * scaleY;
        this.touchCurrentX = this.touchStartX;
        this.touchCurrentY = this.touchStartY;
        this.touchActive = true;
        this.updateJoystick();
    }
    
    onTouchMove(e) {
        e.preventDefault();
        if (!this.touchActive) return;
        
        const touch = e.touches[0];
        const rect = this.game.canvas.getBoundingClientRect();
        const scaleX = this.game.canvas.width / rect.width;
        const scaleY = this.game.canvas.height / rect.height;
        
        this.touchCurrentX = (touch.clientX - rect.left) * scaleX;
        this.touchCurrentY = (touch.clientY - rect.top) * scaleY;
        this.updateJoystick();
    }
    
    onTouchEnd(e) {
        e.preventDefault();
        this.touchActive = false;
        this.joystickX = 0;
        this.joystickY = 0;
    }
    
    updateJoystick() {
        // Максимальное расстояние джойстика
        const maxDistance = 100;
        
        let dx = this.touchCurrentX - this.touchStartX;
        let dy = this.touchCurrentY - this.touchStartY;
        
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Нормализуем
        if (distance > maxDistance) {
            dx = (dx / distance) * maxDistance;
            dy = (dy / distance) * maxDistance;
        }
        
        // Преобразуем в -1 до 1
        this.joystickX = dx / maxDistance;
        this.joystickY = dy / maxDistance;
    }
    
    onMouseDown(e) {
        this.touchActive = true;
        this.touchStartX = e.clientX;
        this.touchStartY = e.clientY;
        this.touchCurrentX = e.clientX;
        this.touchCurrentY = e.clientY;
        this.updateJoystick();
    }
    
    onMouseUp() {
        this.touchActive = false;
        this.joystickX = 0;
        this.joystickY = 0;
    }
    
    onMouseMove(e) {
        if (!this.touchActive) return;
        this.touchCurrentX = e.clientX;
        this.touchCurrentY = e.clientY;
        this.updateJoystick();
    }
    
    // Получить горизонтальный ввод (-1 до 1)
    getHorizontal() {
        if (this.left) return -1;
        if (this.right) return 1;
        return this.joystickX;
    }
    
    // Получить вертикальный ввод (-1 до 1)
    getVertical() {
        if (this.up) return -1;
        if (this.down) return 1;
        return this.joystickY;
    }
}