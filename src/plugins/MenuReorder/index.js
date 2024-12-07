import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

export default definePlugin({
    name: "MenuReorder",
    description: "Allows reordering of menu items in both vertical and horizontal navigation bars",
    authors: [Devs.TPM28],

    draggedElement: null,
    menuItems: [],
    nav: null,
    dropIndicator: null,
    STORAGE_KEY: 'customMenuOrder',
    observer: null,

    horizontalMenuContainer: null,
    horizontalMenuItems: [],
    horizontalDropIndicator: null,
    HORIZONTAL_STORAGE_KEY: 'customHorizontalMenuOrder',
    lastUrl: null,
    urlObserver: null,

        start() {
            setTimeout(() => {
                this.initPlugin();
                this.addPageChangeListener();
                this.initHorizontalMenuObserver();
            }, 1400);
        },

    stop() {
        this.cleanUp();
        this.cleanupHorizontal();
    },

    initHorizontalMenuObserver() {
        this.lastUrl = location.href;
        this.urlObserver = new MutationObserver(() => {
            const url = location.href;
            if (url !== this.lastUrl) {
                this.lastUrl = url;
                if (url.includes('x.com/home') || url.includes('twitter.com/home')) {
                    this.cleanupHorizontal();
                    setTimeout(() => this.initHorizontalMenu(), 300);
                }
            }
        });
        this.urlObserver.observe(document, {subtree: true, childList: true});
        this.initHorizontalMenu();
    },

    initHorizontalMenu() {
        const primaryColumn = document.querySelector('[data-testid="primaryColumn"]');
        if (primaryColumn) {
            this.horizontalMenuContainer = primaryColumn.querySelector('[data-testid="ScrollSnap-List"]');
            if (this.horizontalMenuContainer) {
                this.createHorizontalDropIndicator();
                this.updateHorizontalMenuItems();
                this.restoreHorizontalOrder();
            }
        }
    },

    createHorizontalDropIndicator() {
        this.horizontalDropIndicator = document.createElement('div');
        this.horizontalDropIndicator.style.position = 'absolute';
        this.horizontalDropIndicator.style.width = '2px';
        this.horizontalDropIndicator.style.backgroundColor = '#1DA1F2';
        this.horizontalDropIndicator.style.display = 'none';
        this.horizontalDropIndicator.style.zIndex = '9999';
        this.horizontalDropIndicator.style.pointerEvents = 'none';
        document.body.appendChild(this.horizontalDropIndicator);
    },

    updateHorizontalMenuItems() {
        if (this.horizontalMenuContainer) {
            this.horizontalMenuItems = Array.from(this.horizontalMenuContainer.querySelectorAll('div[role="presentation"]'));
            this.horizontalMenuItems.forEach((item, index) => {
                item.setAttribute('draggable', 'true');
                item.id = `horizontal-menu-item-${index}`;
                item.classList.add('menu-item');

                item.addEventListener('dragstart', this.horizontalDragStart.bind(this));
                item.addEventListener('dragend', this.horizontalDragEnd.bind(this));
            });
            this.horizontalMenuContainer.addEventListener('dragover', this.horizontalDragOver.bind(this));
            this.horizontalMenuContainer.addEventListener('drop', this.horizontalDrop.bind(this));
        }
    },

    saveHorizontalOrder() {
        const order = this.horizontalMenuItems.map(item => {
            const span = item.querySelector('span.css-1jxf684');
            return span ? span.textContent : '';
        }).filter(text => text);
        localStorage.setItem(this.HORIZONTAL_STORAGE_KEY, JSON.stringify(order));
    },

    restoreHorizontalOrder() {
        const savedOrder = JSON.parse(localStorage.getItem(this.HORIZONTAL_STORAGE_KEY));
        if (!savedOrder || !this.horizontalMenuContainer) return;

        const fragment = document.createDocumentFragment();
        savedOrder.forEach(savedText => {
            const item = this.horizontalMenuItems.find(menuItem => {
                const span = menuItem.querySelector('span.css-1jxf684');
                return span && span.textContent === savedText;
            });
            if (item) {
                fragment.appendChild(item);
            }
        });
        
        this.horizontalMenuContainer.appendChild(fragment);
        this.updateHorizontalMenuItems();
        this.clickFirstMenuItem();
    },

    clickFirstMenuItem() {
        if (this.horizontalMenuItems.length > 0) {
            const firstItem = this.horizontalMenuItems[0];
            const clickableElement = firstItem.querySelector('a[role="tab"]');
            if (clickableElement) {
                clickableElement.click();
            }
        }
    },

    horizontalDragStart(e) {
        this.draggedElement = e.currentTarget;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', e.currentTarget.id);
        setTimeout(() => {
            this.draggedElement.style.opacity = '0.5';
        }, 0);
    },

    horizontalDragOver(e) {
        e.preventDefault();
        const closestItem = this.getClosestHorizontalMenuItem(e.clientX);
        if (closestItem && closestItem !== this.draggedElement) {
            const rect = closestItem.getBoundingClientRect();
            const middleX = rect.left + rect.width / 2;

            this.horizontalDropIndicator.style.left = e.clientX < middleX ? 
                `${rect.left - 1}px` : `${rect.right - 1}px`;
            this.horizontalDropIndicator.style.top = `${rect.top}px`;
            this.horizontalDropIndicator.style.height = `${rect.height}px`;
            this.horizontalDropIndicator.style.display = 'block';
        } else {
            this.horizontalDropIndicator.style.display = 'none';
        }
    },

    horizontalDrop(e) {
        e.preventDefault();
        this.horizontalDropIndicator.style.display = 'none';

        const closestItem = this.getClosestHorizontalMenuItem(e.clientX);
        if (closestItem && closestItem !== this.draggedElement) {
            const rect = closestItem.getBoundingClientRect();
            const middleX = rect.left + rect.width / 2;

            if (e.clientX < middleX) {
                this.horizontalMenuContainer.insertBefore(this.draggedElement, closestItem);
            } else {
                this.horizontalMenuContainer.insertBefore(this.draggedElement, closestItem.nextSibling);
            }

            this.updateHorizontalMenuItems();
            this.saveHorizontalOrder();
            this.clickFirstMenuItem();
        }
    },

    horizontalDragEnd() {
        if (this.draggedElement) {
            this.draggedElement.style.opacity = '1';
            this.draggedElement = null;
        }
        this.horizontalDropIndicator.style.display = 'none';
    },

    getClosestHorizontalMenuItem(x) {
        return this.horizontalMenuItems.reduce((closest, item) => {
            const rect = item.getBoundingClientRect();
            const offset = Math.abs(x - (rect.left + rect.width / 2));
            return offset < closest.offset ? { offset, element: item } : closest;
        }, { offset: Number.POSITIVE_INFINITY }).element;
    },

    cleanupHorizontal() {
        if (this.horizontalMenuItems) {
            this.horizontalMenuItems.forEach(item => {
                item.removeEventListener('dragstart', this.horizontalDragStart.bind(this));
                item.removeEventListener('dragend', this.horizontalDragEnd.bind(this));
                item.removeAttribute('draggable');
            });
        }
        if (this.horizontalMenuContainer) {
            this.horizontalMenuContainer.removeEventListener('dragover', this.horizontalDragOver.bind(this));
            this.horizontalMenuContainer.removeEventListener('drop', this.horizontalDrop.bind(this));
        }
        if (this.urlObserver) {
            this.urlObserver.disconnect();
        }
        if (this.horizontalDropIndicator && this.horizontalDropIndicator.parentNode) {
            this.horizontalDropIndicator.parentNode.removeChild(this.horizontalDropIndicator);
        }
        this.horizontalMenuItems = [];
    },

    initPlugin() {
        this.observer = new MutationObserver((mutations) => {
            for (let mutation of mutations) {
                if (mutation.type === 'childList') {
                    const nav = document.querySelector('nav[role="navigation"][class*="r-eqz5dr"]');
                    if (nav) {
                        this.observer.disconnect();
                        this.initializePlugin(nav);
                        break;
                    }
                }
            }
        });

        this.observer.observe(document.body, { childList: true, subtree: true });
    },

    addPageChangeListener() {
        window.addEventListener('popstate', this.handlePageChange.bind(this));
        const pushState = history.pushState;
        history.pushState = function () {
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
        if (this.observer) {
            this.observer.disconnect();
        }
        this.dropIndicator?.remove();
        window.removeEventListener('resize', this.updateMenuItems.bind(this));
        this.nav?.removeEventListener('dragover', this.dragOver.bind(this));
        this.nav?.removeEventListener('drop', this.drop.bind(this));
        this.menuItems.forEach(item => {
            item.removeEventListener('dragstart', this.dragStart.bind(this));
            item.removeEventListener('dragend', this.dragEnd.bind(this));
            item.removeAttribute('draggable');
        });
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

    getLastPathSegment(url) {
        const urlObj = new URL(url);
        const path = urlObj.pathname;
        return path.substring(path.lastIndexOf('/'));
    },

    saveOrder() {
        const order = this.menuItems.map(item => {
            const testId = item.getAttribute('data-testid');
            const href = item.href ? this.getLastPathSegment(item.href) : null;
            return testId || href;
        });
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(order));
    },

    restoreOrder() {
        const savedOrder = JSON.parse(localStorage.getItem(this.STORAGE_KEY));
        if (savedOrder) {
            savedOrder.forEach(savedId => {
                const item = this.menuItems.find(menuItem => {
                    const testId = menuItem.getAttribute('data-testid');
                    const href = menuItem.href ? this.getLastPathSegment(menuItem.href) : null;
                    return testId === savedId || href === savedId;
                });
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
            description: "Enable menu reordering"
        }
    }
});
