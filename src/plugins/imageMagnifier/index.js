import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

export default definePlugin({
    name: "ImageMagnifier",
    description: "Adds a magnifying glass feature to images for detailed viewing",
    authors: [Devs.Mopi],
    options: {
        defaultZoom: {
            type: OptionType.NUMBER,
            default: 2,
            description: "Default zoom level (1-6)",
            minimum: 1,
            maximum: 6
        },
        magnifierSize: {
            type: OptionType.NUMBER,
            default: 150,
            description: "Default magnifier size in pixels (50-400)",
            minimum: 50,
            maximum: 400
        }
    },

    start() {
        this.style = document.createElement('style');
        this.style.textContent = `
            .magnifier {
                position: fixed;
                border: 2px solid #333;
                border-radius: 50%;
                pointer-events: none;
                display: none;
                background-repeat: no-repeat;
                z-index: 1000;
                overflow: hidden;
            }
        `;
        document.head.appendChild(this.style);

        this.magnifier = document.createElement('div');
        this.magnifier.className = 'magnifier';
        document.body.appendChild(this.magnifier);

        this.isActive = false;
        this.zoomLevel = this.settings.store.defaultZoom;
        this.magnifierSize = this.settings.store.magnifierSize;

        this.updateMagnifier = this.updateMagnifier.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleWheel = this.handleWheel.bind(this);
        this.handleDragStart = this.handleDragStart.bind(this);

        this.attachEventListeners();
    },

    stop() {
        this.observer?.disconnect();
        this.style?.remove();
        this.magnifier?.remove();
        this.detachEventListeners();
    },

    attachEventListeners() {
        document.addEventListener('mouseup', this.handleMouseUp);
        this.observeImages();
        
        this.observer = new MutationObserver(() => this.observeImages());
        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    },

    detachEventListeners() {
        document.removeEventListener('mouseup', this.handleMouseUp);
        document.querySelectorAll('[data-testid="swipe-to-dismiss"] img').forEach(img => {
            img.removeEventListener('mousedown', this.handleMouseDown);
            img.removeEventListener('wheel', this.handleWheel);
            img.removeEventListener('dragstart', this.handleDragStart);
        });
    },

    observeImages() {
        const images = document.querySelectorAll('[data-testid="swipe-to-dismiss"] img');
        images.forEach(img => {
            if (!img._magnifierInitialized) {
                img._magnifierInitialized = true;
                img.addEventListener('mousedown', this.handleMouseDown);
                img.addEventListener('wheel', this.handleWheel);
                img.addEventListener('dragstart', this.handleDragStart);
            }
        });
    },

    updateMagnifier(e, img) {
        if (!this.isActive) return;

        const rect = img.getBoundingClientRect();
        
        // Position magnifier directly at cursor offset without window bounds clamping
        const magnifierX = e.clientX - this.magnifierSize / 2;
        const magnifierY = e.clientY - this.magnifierSize / 2;
        
        this.magnifier.style.left = magnifierX + 'px';
        this.magnifier.style.top = magnifierY + 'px';
        this.magnifier.style.width = this.magnifierSize + 'px';
        this.magnifier.style.height = this.magnifierSize + 'px';

        // Calculate cursor position relative to image
        const cursorX = e.clientX - rect.left;
        const cursorY = e.clientY - rect.top;

        const zoomedWidth = rect.width * this.zoomLevel;
        const zoomedHeight = rect.height * this.zoomLevel;

        // Calculate background position considering out-of-bounds
        const bgX = (cursorX * this.zoomLevel) - (this.magnifierSize / 2);
        const bgY = (cursorY * this.zoomLevel) - (this.magnifierSize / 2);

        this.magnifier.style.backgroundImage = `url(${img.src})`;
        this.magnifier.style.backgroundSize = `${zoomedWidth}px ${zoomedHeight}px`;
        this.magnifier.style.backgroundPosition = `-${bgX}px -${bgY}px`;

        // Add a small buffer to prevent edge content persistence
        const buffer = 2;
        if (cursorX < -buffer || cursorX > rect.width + buffer ||
            cursorY < -buffer || cursorY > rect.height + buffer) {
            this.magnifier.style.backgroundImage = 'none';
        }
    },

    handleMouseDown(e) {
        if (e.button !== 0) return;
        
        this.isActive = true;
        this.currentImage = e.target;
        this.currentImage.style.cursor = 'crosshair';
        this.magnifier.style.display = 'block';
        
        this.updateMagnifier(e, this.currentImage);
        
        this.moveHandler = (e) => {
            if (this.isActive) {
                this.updateMagnifier(e, this.currentImage);
            }
        };
        
        document.addEventListener('mousemove', this.moveHandler);
    },

    handleMouseUp() {
        if (this.isActive) {
            this.isActive = false;
            this.currentImage.style.cursor = 'default';
            this.magnifier.style.display = 'none';
            document.removeEventListener('mousemove', this.moveHandler);
        }
    },

    handleWheel(e) {
        if (this.isActive) {
            e.preventDefault();
            
            if (e.shiftKey) {
                if (e.deltaY < 0) {
                    this.magnifierSize = Math.min(this.magnifierSize + 20, 400);
                } else {
                    this.magnifierSize = Math.max(this.magnifierSize - 20, 50);
                }
            } else {
                if (e.deltaY < 0) {
                    this.zoomLevel = Math.min(this.zoomLevel + 0.5, 6);
                } else {
                    this.zoomLevel = Math.max(this.zoomLevel - 0.5, 1);
                }
            }
            this.updateMagnifier(e, this.currentImage);
        }
    },

    handleDragStart(e) {
        e.preventDefault();
    }
});
