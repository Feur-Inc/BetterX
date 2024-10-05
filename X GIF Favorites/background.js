const categoriesUrlPattern = /^https:\/\/x\.com\/i\/api\/1\.1\/foundmedia\/categories\.json/;
const favoritesUrlPattern = /^https:\/\/x\.com\/i\/api\/1\.1\/foundmedia\/categories\/_favorites_\.json/;

const favoritesGroup = {
  display_name: "★ Favorites",
  id: "_favorites_",
  thumbnail_images: [
    {
      url: "",
      width: 0,
      height: 0,
      byte_count: 0,
      still_image_url: ""
    }
  ],
  original_image: {
    url: "",
    width: 0,
    height: 0,
    byte_count: 0,
    still_image_url: ""
  },
  object_type: "group"
};

console.log("Extension started: Listening for requests...");

const requestData = {};

browser.webRequest.onBeforeRequest.addListener(
  async (details) => {
    console.log("Intercepting request:", details.url);

    const filter = browser.webRequest.filterResponseData(details.requestId);
    const decoder = new TextDecoder("utf-8");
    const encoder = new TextEncoder();

    requestData[details.requestId] = {
      data: [],
      filter,
      decoder,
      encoder,
      url: details.url
    };

    filter.ondata = (event) => {
      console.log("Received data chunk for request:", details.requestId);
      requestData[details.requestId].data.push(event.data);
    };

    filter.onstop = async () => {
      console.log("All data chunks received for request:", details.requestId);
      await handleRequest(details.requestId);
    };

    return {};
  },
  { urls: ["*://x.com/i/api/1.1/foundmedia/*"], types: ["xmlhttprequest"] },
  ["blocking"]
);

console.log("Request listener added.");

async function handleRequest(requestId) {
  const { data, filter, decoder, encoder, url } = requestData[requestId];

  try {
    const string = decoder.decode(await new Blob(data).arrayBuffer());
    console.log("Response decoded for request:", requestId);

    let json = JSON.parse(string);
    console.log("Parsed JSON for request:", requestId);

    if (categoriesUrlPattern.test(url)) {
      console.log("Handling categories URL for request:", requestId);
      if (json.data && json.data.groups) {
        console.log("Injecting favorites group into categories");
        json.data.groups.unshift(favoritesGroup);
      }
    } else if (favoritesUrlPattern.test(url)) {
      console.log("Handling favorites URL for request:", requestId);
      const favorites = await loadFavorites();
      console.log("Loaded favorites for request:", requestId);
      json = createFavoritesResponse(favorites);
      console.log("Created favorites response for request:", requestId);
    }

    const encodedResponse = encoder.encode(JSON.stringify(json));
    console.log("Encoded modified response for request:", requestId);
    filter.write(encodedResponse);
  } catch (error) {
    console.error("Error processing response for request:", requestId, error);
    console.log("Returning unmodified data due to error for request:", requestId);
    data.forEach(chunk => filter.write(chunk));
  } finally {
    console.log("Closing filter for request:", requestId);
    filter.close();
    delete requestData[requestId];
  }
}

async function loadFavorites() {
  console.log("Loading favorites from local storage...");
  try {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get('xcomGifFavorites', (result) => {
        if (chrome.runtime.lastError) {
          console.error("Error loading favorites:", chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          console.log("Favorites loaded successfully:", result.xcomGifFavorites);
          resolve(result.xcomGifFavorites || {});
        }
      });
    });
  } catch (error) {
    console.error("Error in loadFavorites function:", error);
    return {};
  }
}

function createFavoritesResponse(favorites) {
  console.log("Creating favorites response with:", favorites);

  if (!favorites || Object.keys(favorites).length === 0) {
    console.log("No favorites found. Returning empty response.");
    return {
      data: { items: [] }
    };
  }

  const items = Object.entries(favorites).map(([altText, url]) => {
    let provider = { name: "unknown", display_name: "Unknown", icon_images: [] };
    let id = `unknown_${Math.random().toString(36).substr(2, 9)}`;

    if (url.includes('giphy.com')) {
      provider = { name: "giphy", display_name: "GIPHY", icon_images: [] };
      id = `giphy_${Math.random().toString(36).substr(2, 9)}`;
      console.log("Giphy detected. ID generated:", id);
    } else if (url.includes('tenor.com')) {
      provider = { name: "riffsy", display_name: "Tenor", icon_images: [] };
      id = `riffsy_${Math.random().toString(36).substr(2, 9)}`;
      console.log("Tenor detected. ID generated:", id);
    }

    return {
      provider,
      item_type: "gif",
      id,
      found_media_origin: {
        provider: provider.name,
        id: id.split('_')[1]
      },
      url,
      thumbnail_images: [
        {
          url,
          width: 200,
          height: 200,
          byte_count: 0,
          still_image_url: url
        }
      ],
      original_image: {
        url,
        width: 480,
        height: 480,
        byte_count: 0,
        still_image_url: url
      },
      preview_image: {
        url,
        width: 480,
        height: 480,
        byte_count: 0,
        still_image_url: url
      },
      alt_text: altText,
      object_type: "item"
    };
  });

  console.log("Favorites response created successfully:", items);

  return {
    data: { items }
  };
}

console.log("Extension setup complete.");