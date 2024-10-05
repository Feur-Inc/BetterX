(function () {
  const storageKey = 'xcomGifFavorites';

  function loadFavorites() {
    return new Promise((resolve) => {
      chrome.storage.local.get(storageKey, (result) => {
        resolve(result[storageKey] || {});
      });
    });
  }

  function saveFavorites(favorites) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [storageKey]: favorites }, resolve);
    });
  }

  function createStarIcon(isFavorite) {
    const starContainer = document.createElement('div');
    starContainer.style.cssText = `
      position: absolute;
      top: 5px;
      right: 5px;
      width: 40px;
      height: 40px;
      background-color: rgba(0, 0, 0, 0.3);
      border-radius: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      z-index: 10;
      user-select: none;
      -webkit-user-select: none;
    `;

    const star = document.createElement('div');
    star.innerHTML = '★';
    star.style.cssText = `
      font-size: 30px;
      color: ${isFavorite ? 'gold' : 'white'};
    `;

    starContainer.appendChild(star);
    return starContainer;
  }

  async function handleGifElements() {
    const favorites = await loadFavorites();
    const gifElements = document.querySelectorAll('div[data-testid="gifSearchGifImage"]');

    gifElements.forEach((gifElement) => {
      if (gifElement.querySelector('.gif-favorite-star')) return;

      const imgElement = gifElement.querySelector('img');
      if (!imgElement) return;

      const gifUrl = imgElement.src;
      const isFavorite = Object.values(favorites).includes(gifUrl);
      const starIcon = createStarIcon(isFavorite);
      starIcon.classList.add('gif-favorite-star');

      starIcon.addEventListener('click', async (event) => {
        event.stopPropagation();
        event.preventDefault();

        const newFavorites = await loadFavorites();
        const starInner = starIcon.querySelector('div');
        const existingKey = Object.keys(newFavorites).find(key => newFavorites[key] === gifUrl);

        if (existingKey) {
          delete newFavorites[existingKey];
          starInner.style.color = 'white';
        } else {
          const altText = imgElement.alt || 'Untitled GIF';
          newFavorites[altText] = gifUrl;
          starInner.style.color = 'gold';
        }
        await saveFavorites(newFavorites);
      });

      gifElement.style.position = 'relative';
      gifElement.appendChild(starIcon);
    });
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        handleGifElements();
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  handleGifElements();
})();
(function () {
  const storageKey = 'xcomGifFavorites';

  function loadFavorites() {
    return new Promise((resolve) => {
      chrome.storage.local.get(storageKey, (result) => {
        resolve(result[storageKey] || {});
      });
    });
  }

  function saveFavorites(favorites) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [storageKey]: favorites }, resolve);
    });
  }

  function createStarIcon(isFavorite) {
    const starContainer = document.createElement('div');
    starContainer.style.cssText = `
      position: absolute;
      top: 5px;
      right: 5px;
      width: 40px;
      height: 40px;
      background-color: rgba(0, 0, 0, 0.3);
      border-radius: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      z-index: 10;
      user-select: none;
      -webkit-user-select: none;
    `;

    const star = document.createElement('div');
    star.innerHTML = '★';
    star.style.cssText = `
      font-size: 30px;
      color: ${isFavorite ? 'gold' : 'white'};
    `;

    starContainer.appendChild(star);
    return starContainer;
  }

  async function handleGifElements() {
    const favorites = await loadFavorites();
    const gifElements = document.querySelectorAll('div[data-testid="gifSearchGifImage"]');

    gifElements.forEach((gifElement) => {
      if (gifElement.querySelector('.gif-favorite-star')) return;

      const imgElement = gifElement.querySelector('img');
      if (!imgElement) return;

      const gifUrl = imgElement.src;
      const isFavorite = Object.values(favorites).includes(gifUrl);
      const starIcon = createStarIcon(isFavorite);
      starIcon.classList.add('gif-favorite-star');

      starIcon.addEventListener('click', async (event) => {
        event.stopPropagation();
        event.preventDefault();

        const newFavorites = await loadFavorites();
        const starInner = starIcon.querySelector('div');
        const existingKey = Object.keys(newFavorites).find(key => newFavorites[key] === gifUrl);

        if (existingKey) {
          delete newFavorites[existingKey];
          starInner.style.color = 'white';
        } else {
          const altText = imgElement.alt || 'Untitled GIF';
          newFavorites[altText] = gifUrl;
          starInner.style.color = 'gold';
        }
        await saveFavorites(newFavorites);
      });

      gifElement.style.position = 'relative';
      gifElement.appendChild(starIcon);
    });
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        handleGifElements();
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  handleGifElements();
})();
