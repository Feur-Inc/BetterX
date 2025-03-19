/**
 * Manages Twitter accent color detection
 * 
 * Twitter stores accent color in IndexedDB under 
 * localforage > keyvaluepairs > "device:rweb.settings" > local > themeColor
 * The format is [color]500 (e.g., "blue500", "purple500", etc.)
 */

// Color mappings from Twitter's color name to hex values
const ACCENT_COLORS = {
  blue: {
    primary: '#1d9bf0',
    hover: '#1a8cd8',
  },
  yellow: {
    primary: '#ffd400',
    hover: '#e6bf00',
  },
  magenta: {
    primary: '#f91880',
    hover: '#e01673',
  },
  purple: {
    primary: '#7856ff',
    hover: '#6c4de6',
  },
  orange: {
    primary: '#ff7a00',
    hover: '#e66e00',
  },
  green: {
    primary: '#00ba7c',
    hover: '#00a76f',
  }
};

// Default to blue if color can't be determined
const DEFAULT_COLOR = 'blue';

/**
 * Get the accent color from IndexedDB
 * @returns {Promise<{color: string, primary: string, hover: string}>}
 */
export async function getAccentColor() {
  try {
    const db = await openIndexedDB('localforage');
    const color = await getColorFromDB(db);
    return formatColorResult(color);
  } catch (error) {
    console.error('Error getting accent color:', error);
    return formatColorResult(DEFAULT_COLOR);
  }
}

/**
 * Opens the IndexedDB database
 */
function openIndexedDB(dbName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName);
    
    request.onerror = () => reject(new Error('Could not open IndexedDB'));
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Gets the color value from the database
 */
async function getColorFromDB(db) {
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(['keyvaluepairs'], 'readonly');
      const store = transaction.objectStore('keyvaluepairs');
      const request = store.get('device:rweb.settings');
      
      request.onerror = () => reject(new Error('Error reading from IndexedDB'));
      
      request.onsuccess = () => {
        const data = request.result;
        if (data && data.local && data.local.themeColor) {
          // The color is stored as e.g. "blue500"
          const colorMatch = data.local.themeColor.match(/^([a-z]+)500$/);
          if (colorMatch && colorMatch[1]) {
            resolve(colorMatch[1]);
            return;
          }
        }
        resolve(DEFAULT_COLOR);
      };
    } catch (error) {
      console.error('Error reading from IndexedDB:', error);
      resolve(DEFAULT_COLOR);
    }
  });
}

/**
 * Format the color result with its hex values
 */
function formatColorResult(colorName) {
  const colorData = ACCENT_COLORS[colorName] || ACCENT_COLORS[DEFAULT_COLOR];
  return {
    color: colorName,
    primary: colorData.primary,
    hover: colorData.hover,
  };
}

/**
 * Watches for changes to the accent color
 * @param {Function} callback - Function to call when accent color changes
 * @returns {Function} Cleanup function
 */
export function watchAccentColorChanges(callback) {
  // Check the accent color periodically
  let currentColor = null;
  
  const checkColor = async () => {
    try {
      const { color, primary, hover } = await getAccentColor();
      if (currentColor !== color) {
        if (currentColor !== null) {
          console.log(`BetterX: Twitter accent color changed from ${currentColor} to ${color}`);
        }
        currentColor = color;
        callback({ color, primary, hover });
      }
    } catch (error) {
      console.error('Error checking accent color:', error);
    }
  };
  
  // Initial check
  checkColor();
  
  // Set up periodic checks
  const intervalId = setInterval(checkColor, 5000); // Check every 5 seconds
  
  // Return cleanup function
  return () => clearInterval(intervalId);
}
