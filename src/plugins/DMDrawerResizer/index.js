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
        if (direction === 'horizontal') {
            resizer.style.width = '10px';
            resizer.style.height = '100%';
            resizer.style.left = '-5px';
            resizer.style.top = '0';
            resizer.style.cursor = 'col-resize';
        } else {
            resizer.style.width = '100%';
            resizer.style.height = '10px';
            resizer.style.left = '0';
            resizer.style.top = '-5px';
            resizer.style.cursor = 'row-resize';
        }
        element.appendChild(resizer);
        return resizer;
    }

    const horizontalResizer = createResizer('horizontal');
    const verticalResizer = createResizer('vertical');

    let startX, startY, startWidth, startHeight;

    function initDrag(e, isHorizontal) {
        e.stopPropagation();
        e.preventDefault();
        if (isHorizontal) {
            startX = e.clientX;
            startWidth = parseInt(getComputedStyle(element).width, 10);
            document.addEventListener('mousemove', doHorizontalDrag, false);
        } else {
            startY = e.clientY;
            startHeight = parseInt(getComputedStyle(innerElement).maxHeight, 10);
            document.addEventListener('mousemove', doVerticalDrag, false);
        }
        document.addEventListener('mouseup', stopDrag, false);
    }

    function doHorizontalDrag(e) {
        const dx = startX - e.clientX;
        const newWidth = startWidth + dx;

        element.style.minHeight = `53px`;
        if (newWidth <= 900) {
            element.style.width = `${newWidth}px`;
            localStorage.setItem('dmDrawerWidth', newWidth);
        }
    }

    function doVerticalDrag(e) {
        const dy = startY - e.clientY;
        const newHeight = startHeight + dy;
        if (newHeight <= 740) {
            innerElement.style.maxHeight = `${newHeight}px`;
            localStorage.setItem('dmDrawerHeight', newHeight);
        }
        innerElement.style.minHeight = `53px`;
    }

    function stopDrag() {
        document.removeEventListener('mousemove', doHorizontalDrag, false);
        document.removeEventListener('mousemove', doVerticalDrag, false);
        document.removeEventListener('mouseup', stopDrag, false);
    }

    horizontalResizer.addEventListener('mousedown', (e) => initDrag(e, true), false);
    verticalResizer.addEventListener('mousedown', (e) => initDrag(e, false), false);

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
    authors: [Devs.Mopi],
    start() {
        initializePlugin();
    },
    stop() {
        if (observer) {
            observer.disconnect();
        }
    }
});
