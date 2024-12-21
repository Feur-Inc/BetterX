import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

let observer;

function removeClassRecursively(element, className) {
    if (element.classList && element.classList.contains(className)) {
        element.classList.remove(className);
    }
    for (let child of element.children) {
        removeClassRecursively(child, className);
    }
}

function makeResizable(element, innerElement) {
    function createResizer(direction) {
        const resizer = document.createElement('div');
        resizer.style.position = 'absolute';
        resizer.style.zIndex = '1000';
        
        if (direction === 'horizontal') {
            resizer.style.width = '10px';
            resizer.style.height = '100%';
            resizer.style.left = '-5px';
            resizer.style.top = '0';
            resizer.style.cursor = 'col-resize';
        } else if (direction === 'vertical') {
            resizer.style.width = '100%';
            resizer.style.height = '10px';
            resizer.style.left = '0';
            resizer.style.top = '-5px';
            resizer.style.cursor = 'row-resize';
        } else if (direction === 'corner') {
            resizer.style.width = '20px';
            resizer.style.height = '20px';
            resizer.style.left = '-10px';
            resizer.style.top = '-10px';
            resizer.style.cursor = 'nwse-resize';
        }
        
        element.appendChild(resizer);
        return resizer;
    }

    const horizontalResizer = createResizer('horizontal');
    const verticalResizer = createResizer('vertical');
    const cornerResizer = createResizer('corner');

    let startX, startY, startWidth, startHeight;
    let currentResizer = null;

    function initDrag(e, type) {
        e.stopPropagation();
        e.preventDefault();
        startX = e.clientX;
        startY = e.clientY;
        startWidth = parseInt(getComputedStyle(element).width, 10);
        startHeight = parseInt(getComputedStyle(innerElement).maxHeight, 10);
        
        currentResizer = type;
        
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', doDrag, false);
        document.addEventListener('mouseup', stopDrag, false);
    }

    function doDrag(e) {
        if (!currentResizer) return;

        requestAnimationFrame(() => {
            const dx = startX - e.clientX;
            const dy = startY - e.clientY;
            
            if (currentResizer === 'horizontal' || currentResizer === 'corner') {
                const newWidth = startWidth + dx;
                if (newWidth <= 900 && newWidth >= 300) {
                    element.style.width = `${newWidth}px`;
                    localStorage.setItem('dmDrawerWidth', newWidth);
                }
            }
            
            if (currentResizer === 'vertical' || currentResizer === 'corner') {
                const newHeight = startHeight + dy;
                if (newHeight <= 740 && newHeight >= 53) {
                    innerElement.style.maxHeight = `${newHeight}px`;
                    localStorage.setItem('dmDrawerHeight', newHeight);
                }
            }
        });
    }

    function stopDrag() {
        document.removeEventListener('mousemove', doDrag, false);
        document.removeEventListener('mouseup', stopDrag, false);
        document.body.style.userSelect = '';
        currentResizer = null;
    }

    horizontalResizer.addEventListener('mousedown', (e) => initDrag(e, 'horizontal'), false);
    verticalResizer.addEventListener('mousedown', (e) => initDrag(e, 'vertical'), false);
    cornerResizer.addEventListener('mousedown', (e) => initDrag(e, 'corner'), false);

    const storedWidth = localStorage.getItem('dmDrawerWidth');
    const storedHeight = localStorage.getItem('dmDrawerHeight');
    if (storedWidth) {
        element.style.width = `${storedWidth}px`;
    }
    if (storedHeight) {
        innerElement.style.maxHeight = `${storedHeight}px`;
    }
}

function updateDMDrawer() {
    const dmDrawer = document.querySelector('[data-testid="DMDrawer"]');
    if (dmDrawer) {
        dmDrawer.classList.remove('r-hvns9x');
        removeClassRecursively(dmDrawer, 'r-1ye8kvj');
        
        const innerDiv = dmDrawer.querySelector('div');
        if (innerDiv && !dmDrawer.hasResizers) {
            makeResizable(dmDrawer, innerDiv);
            dmDrawer.hasResizers = true;
        }
    }
}

function clickCollapseButton() {
    const collapseButton = document.querySelector('button[aria-label="Collapse"]');
    if (collapseButton) {
        collapseButton.click();
    }
}

function initializePlugin() {
    clickCollapseButton();
    updateDMDrawer();

    observer = new MutationObserver((mutations) => {
        for (let mutation of mutations) {
            if (mutation.type === 'childList' || mutation.type === 'subtree') {
                updateDMDrawer();
                break;
            }
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

export default definePlugin({
    name: "DMDrawerResizer",
    description: "Makes the DM drawer resizable and persistent across sessions.",
    authors: [Devs.Mopi, Devs.TPM28],
    start() {
        initializePlugin();
    },
    stop() {
        if (observer) {
            observer.disconnect();
        }
    }
});