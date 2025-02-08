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
    hiddenMenuItems: [],

    // Nouvelle méthode pour vérifier la page à ignorer
    isIgnoredPage() {
        return location.href.includes("x.com/notifications") || 
               location.href.includes("x.com/search?");
    },

    start() {
        setTimeout(() => {
            if (this.isIgnoredPage()) return; // Quitte immédiatement si page ignorée
            
            this.initPlugin();
            this.addPageChangeListener();
            this.initHorizontalMenuObserver();
            this.waitAndClickFirstMenuItem();
        }, 500);
    },

    stop() {
        this.cleanUp();
        this.cleanupHorizontal();
    },

    initHorizontalMenuObserver() {
        this.lastUrl = location.href;
        if (this.urlObserver) this.urlObserver.disconnect();
        this.urlObserver = new MutationObserver(() => {
            const primaryColumn = document.querySelector('[data-testid="primaryColumn"]');
            if (primaryColumn && !this.horizontalMenuContainer) {
                this.initHorizontalMenu();
            }
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
        // Modification : on passe de 'absolute' à 'fixed'
        this.horizontalDropIndicator.style.position = 'fixed';
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
        const currentOrder = this.horizontalMenuItems.map(item => {
            const span = item.querySelector('span.css-1jxf684');
            return span ? span.textContent : '';
        }).filter(text => text);
        if (JSON.stringify(currentOrder) === JSON.stringify(savedOrder)) {
            return;
        }
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
    },

    waitAndClickFirstMenuItem() {
        const savedOrder = JSON.parse(localStorage.getItem(this.HORIZONTAL_STORAGE_KEY));
        if (!savedOrder || savedOrder.length === 0) return;

        const targetText = savedOrder[0];
        const maxAttempts = 30; // 3 secondes avec 100ms entre chaque tentative
        let attempts = 0;

        const findAndClickItem = () => {
            const items = document.querySelectorAll('div[role="presentation"] span.css-1jxf684');
            const targetItem = Array.from(items).find(span => span.textContent === targetText);

            if (targetItem) {
                const clickableElement = targetItem.closest('a[role="tab"]');
                if (clickableElement) {
                    clickableElement.click();
                    return true;
                }
            }

            attempts++;
            if (attempts >= maxAttempts) return true;

            return false;
        };

        const attemptClick = () => {
            if (!findAndClickItem()) {
                setTimeout(attemptClick, 100);
            }
        };

        setTimeout(attemptClick, 100);
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

        this.hiddenMenuItems = JSON.parse(localStorage.getItem('hiddenMenuItems')) || [];
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
        // On ne nettoie plus tout le plugin, seulement la partie horizontale
        this.cleanupHorizontal();
        setTimeout(() => {
            if (this.isIgnoredPage()) return;
            if (!this.nav) {
                this.initPlugin(); // Initialise seulement si nav n'existe pas encore
            }
            // Réinitialise uniquement le menu horizontal
            this.initHorizontalMenu();
        }, 200);
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
        this.dropIndicator.style.position = 'fixed'; // Changé de 'absolute' à 'fixed'
        this.dropIndicator.style.height = '2px';
        this.dropIndicator.style.backgroundColor = '#1DA1F2';
        this.dropIndicator.style.display = 'none';
        this.dropIndicator.style.zIndex = '9999';
        this.dropIndicator.style.pointerEvents = 'none';
        this.dropIndicator.style.width = '200px'; // Ajout d'une largeur par défaut
        this.dropIndicator.style.borderRadius = '4px'; // Ajout d'arrondi
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

            item.addEventListener('contextmenu', this.handleContextMenu.bind(this));

            const identifier = this.getMenuItemIdentifier(item);
            if (this.hiddenMenuItems.includes(identifier)) {
                item.style.display = 'none';
            }
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

            this.dropIndicator.style.top = `${e.clientY < middleY ? rect.top : rect.bottom}px`;
            this.dropIndicator.style.left = `${rect.left}px`;
            this.dropIndicator.style.width = `${rect.width - 40}px`;
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

    handleContextMenu(e) {
        e.preventDefault();

        const menuItem = e.currentTarget;
        const contextMenu = document.createElement('div');
        contextMenu.style.position = 'fixed';
        contextMenu.style.top = `${e.clientY}px`;
        contextMenu.style.left = `${e.clientX}px`;
        contextMenu.style.backgroundColor = '#15202b';
        contextMenu.style.border = '1px solid #38444d';
        contextMenu.style.padding = '5px';
        contextMenu.style.zIndex = '10000';

        const hideOption = document.createElement('div');
        hideOption.textContent = 'Hide this item';
        hideOption.style.padding = '5px';
        hideOption.style.cursor = 'pointer';
        hideOption.addEventListener('click', () => {
            this.hideMenuItem(menuItem);
            document.body.removeChild(contextMenu);
        });
        contextMenu.appendChild(hideOption);

        const resetOption = document.createElement('div');
        resetOption.textContent = 'Reset menu';
        resetOption.style.padding = '5px';
        resetOption.style.cursor = 'pointer';
        resetOption.addEventListener('click', () => {
            this.resetMenu();
            document.body.removeChild(contextMenu);
        });
        contextMenu.appendChild(resetOption);

        document.body.appendChild(contextMenu);

        const closeContextMenu = (event) => {
            if (event.target !== contextMenu && !contextMenu.contains(event.target)) {
                document.body.removeChild(contextMenu);
                document.removeEventListener('click', closeContextMenu);
            }
        };
        setTimeout(() => {
            document.addEventListener('click', closeContextMenu);
        }, 0);
    },

    hideMenuItem(menuItem) {
        const identifier = this.getMenuItemIdentifier(menuItem);
        menuItem.style.display = 'none';
        if (!this.hiddenMenuItems.includes(identifier)) {
            this.hiddenMenuItems.push(identifier);
            localStorage.setItem('hiddenMenuItems', JSON.stringify(this.hiddenMenuItems));
        }
    },

    resetMenu() {
        this.hiddenMenuItems = [];
        localStorage.removeItem('hiddenMenuItems');
        this.menuItems.forEach(item => {
            item.style.display = '';
        });
    },

    getMenuItemIdentifier(menuItem) {
        const testId = menuItem.getAttribute('data-testid');
        const href = menuItem.href ? this.getLastPathSegment(menuItem.href) : null;
        return testId || href || menuItem.id;
    },

    settings: {
        enabled: {
            type: OptionType.BOOLEAN,
            default: true,
            description: "Enable menu reordering"
        }
    }
});
