import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

export default definePlugin({
    name: "MenuReorder",
    description: "Allows reordering of menu items in the navigation bar",
    authors: [Devs.TPM28],

    draggedElement: null,
    menuItems: [],
    nav: null,
    dropIndicator: null,
    STORAGE_KEY: 'customMenuOrder',
    observer: null,
    initAttempts: 0,
    maxInitAttempts: 10,
    initInterval: null,

    start() {
        this.initPlugin();
        this.addPageChangeListener();
    },

    stop() {
        this.cleanUp();
    },

    initPlugin() {
        this.initInterval = setInterval(() => {
            this.initAttempts++;
            const nav = document.querySelector('nav[role="navigation"][class*="r-eqz5dr"]');
            if (nav) {
                clearInterval(this.initInterval);
                this.initializePlugin(nav);
            } else if (this.initAttempts >= this.maxInitAttempts) {
                clearInterval(this.initInterval);
                console.error("Twitter Menu Reorder Plugin: Failed to find navigation bar after multiple attempts");
            }
        }, 1000);
    },

    addPageChangeListener() {
        window.addEventListener('popstate', this.handlePageChange.bind(this));
        const pushState = history.pushState;
        history.pushState = function() {
            pushState.apply(history, arguments);
            dispatchEvent(new Event('pushstate'));
        };
        window.addEventListener('pushstate', this.handlePageChange.bind(this));
    },

    handlePageChange() {
        this.cleanUp();
        this.initPlugin();
    },

    initializePlugin(nav) {
        this.nav = nav;
        this.createDropIndicator();
        this.updateMenuItems();
        this.restoreOrder();

        window.addEventListener('resize', this.updateMenuItems.bind(this));
        this.nav.addEventListener('dragover', this.dragOver.bind(this));
        this.nav.addEventListener('drop', this.drop.bind(this));
    },

    cleanUp() {
        clearInterval(this.initInterval);
        this.dropIndicator?.remove();
        window.removeEventListener('resize', this.updateMenuItems.bind(this));
        this.nav?.removeEventListener('dragover', this.dragOver.bind(this));
        this.nav?.removeEventListener('drop', this.drop.bind(this));
        this.menuItems.forEach(item => {
            item.removeEventListener('dragstart', this.dragStart.bind(this));
            item.removeEventListener('dragend', this.dragEnd.bind(this));
            item.removeAttribute('draggable');
        });
        this.initAttempts = 0;
    },

    createDropIndicator() {
        this.dropIndicator = document.createElement('div');
        this.dropIndicator.style.position = 'absolute';
        this.dropIndicator.style.height = '2px';
        this.dropIndicator.style.backgroundColor = '#1DA1F2';
        this.dropIndicator.style.display = 'none';
        this.dropIndicator.style.zIndex = '9999';
        this.dropIndicator.style.pointerEvents = 'none';
        document.body.appendChild(this.dropIndicator);
    },

    updateMenuItems() {
        this.menuItems = Array.from(this.nav.querySelectorAll('a, button'));
        this.menuItems.forEach((item, index) => {
            item.setAttribute('draggable', 'true');
            item.id = `menu-item-${index}`;
            item.classList.add('menu-item');

            item.removeEventListener('dragstart', this.dragStart.bind(this));
            item.removeEventListener('dragend', this.dragEnd.bind(this));

            item.addEventListener('dragstart', this.dragStart.bind(this));
            item.addEventListener('dragend', this.dragEnd.bind(this));
        });
    },

    saveOrder() {
        const order = this.menuItems.map(item => item.getAttribute('data-testid') || item.href);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(order));
    },

    restoreOrder() {
        const savedOrder = JSON.parse(localStorage.getItem(this.STORAGE_KEY));
        if (savedOrder) {
            savedOrder.forEach(savedId => {
                const item = this.menuItems.find(menuItem => 
                    menuItem.getAttribute('data-testid') === savedId || menuItem.href === savedId
                );
                if (item) {
                    this.nav.appendChild(item);
                }
            });
        }
    },

    dragStart(e) {
        this.draggedElement = e.target;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', e.target.id);
        setTimeout(() => {
            this.draggedElement.style.opacity = '0.5';
        }, 0);
    },

    dragOver(e) {
        e.preventDefault();
        const closestItem = this.getClosestMenuItem(e.clientY);
        if (closestItem && closestItem !== this.draggedElement) {
            const rect = closestItem.getBoundingClientRect();
            const middleY = rect.top + rect.height / 2;

            if (e.clientY < middleY) {
                this.dropIndicator.style.top = `${rect.top - 1}px`;
            } else {
                this.dropIndicator.style.top = `${rect.bottom - 1}px`;
            }

            this.dropIndicator.style.left = `${rect.left}px`;
            this.dropIndicator.style.width = `${rect.width}px`;
            this.dropIndicator.style.display = 'block';
        } else {
            this.dropIndicator.style.display = 'none';
        }
    },

    drop(e) {
        e.preventDefault();
        this.dropIndicator.style.display = 'none';

        const closestItem = this.getClosestMenuItem(e.clientY);
        if (closestItem && closestItem !== this.draggedElement) {
            const rect = closestItem.getBoundingClientRect();
            const middleY = rect.top + rect.height / 2;

            if (e.clientY < middleY) {
                this.nav.insertBefore(this.draggedElement, closestItem);
            } else {
                this.nav.insertBefore(this.draggedElement, closestItem.nextSibling);
            }

            this.updateMenuItems();
            this.saveOrder();
        }
    },

    dragEnd(e) {
        this.draggedElement.style.opacity = '1';
        this.dropIndicator.style.display = 'none';
        this.draggedElement = null;
    },

    getClosestMenuItem(y) {
        return this.menuItems.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = Math.abs(y - (box.top + box.height / 2));
            if (offset < closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.POSITIVE_INFINITY }).element;
    },

    settings: {
        enabled: {
            type: OptionType.BOOLEAN,
            default: true,
            description: "Enable Twitter menu reordering"
        }
    }
});