const localStoragePrefix = "import-map-override:";
const disabledOverridesLocalStorageKey = "import-map-overrides-disabled";
const externalOverridesLocalStorageKey = "import-map-overrides-external-maps";
const overrideAttribute = "data-is-importmap-override";

const portRegex = /^\d+$/g;

// export const importMapType = importMapMetaElement
//   ? importMapMetaElement.getAttribute("content")
//   : "importmap";

// const serverOverrides = importMapMetaElement
//   ? importMapMetaElement.hasAttribute("server-cookie")
//   : false;
// const serverOnly = importMapMetaElement
//   ? importMapMetaElement.hasAttribute("server-only")
//   : false;

let originalMap = null
let defaultMap = createEmptyImportMap()

window.importMapOverrides = {
  addOverride(moduleName, url) {
    if (portRegex.test(url)) {
      url = imo.getUrlFromPort(moduleName, url);
    }
    const key = localStoragePrefix + moduleName;
    localStorage.setItem(key, url);
    // if (serverOverrides) {
    //   document.cookie = `${key}=${url}`;
    // }
    fireChangedEvent();
    return imo.getOverrideMap();
  },
  getOverrideMap(includeDisabled = false) {
    const overrides = createEmptyImportMap();
    const disabledOverrides = imo.getDisabledOverrides();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(localStoragePrefix)) {
        const moduleName = key.slice(localStoragePrefix.length);
        if (includeDisabled || !disabledOverrides.includes(moduleName)) {
          overrides.imports[moduleName] = localStorage.getItem(key);
        }
      }
    }
    return overrides;
  },
  removeOverride(moduleName) {
    const key = localStoragePrefix + moduleName;
    const hasItem = localStorage.getItem(key) !== null;
    localStorage.removeItem(key);
    // if (serverOverrides) {
    //   document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
    // }
    imo.enableOverride(moduleName);
    fireChangedEvent();
    return hasItem;
  },
  resetOverrides() {
    Object.keys(imo.getOverrideMap(true).imports).forEach((moduleName) => {
      imo.removeOverride(moduleName);
    });
    localStorage.removeItem(disabledOverridesLocalStorageKey);
    localStorage.removeItem(externalOverridesLocalStorageKey);
    fireChangedEvent();
    return imo.getOverrideMap();
  },
  hasOverrides() {
    return Object.keys(imo.getOverrideMap().imports).length > 0;
  },
  getUrlFromPort(moduleName, port) {
    const fileName = moduleName.replace(/@/g, "").replace(/\//g, "-");
    return `//localhost:${port}/${fileName}.js`;
  },
  enableUI() {
    const customElementName = "import-map-overrides-full";
    const showWhenLocalStorage = "show-when-local-storage";
    let customElement = document.querySelector(customElementName);

    if (!customElement) {
      customElement = document.createElement(customElementName);
      customElement.setAttribute(showWhenLocalStorage, "true");
      document.body.appendChild(customElement);
    }

    const localStorageKey = customElement.getAttribute(showWhenLocalStorage);
    if (localStorageKey) {
      localStorage.setItem(localStorageKey, true);
      customElement.renderWithPreact();
    }
  },
  mergeImportMap(originalMap, newMap) {
    const outMap = createEmptyImportMap();
    for (let i in originalMap.imports) {
      outMap.imports[i] = originalMap.imports[i];
    }
    for (let i in newMap.imports) {
      outMap.imports[i] = newMap.imports[i];
    }
    for (let i in originalMap.scopes) {
      outMap.scopes[i] = originalMap.scopes[i];
    }
    for (let i in newMap.scopes) {
      outMap.scopes[i] = newMap.scopes[i];
    }
    return outMap;
  },
  setDefaultMap(arr){
    originalMap = arr.reduce((map, microApp) => {
      map[microApp.name] = microApp
      return map
    }, {})
    
    defaultMap = imo.mergeImportMap({
      imports: arr.reduce((map, item) => {
        const name = item.name
        map[name] = originalMap[name].entry
        return map
      }, {})
    }, {})
  },
  getCurrentQiankunMap() {
    const currentPageMap = imo.getCurrentPageMap()
    return Object.keys(originalMap).reduce((map, key) => {
      map[key] = { ...originalMap[key], entry: currentPageMap.imports[key] }
      return map
    }, {})
  },
  getDefaultMap() {
    return defaultMap
  },
  getCurrentPageMap() {
    return imo.mergeImportMap(
      defaultMap, initialOverrideMap
    )
  },
  getCurrentPageExternalOverrides() {
    const currentPageExternalOverrides = [];
    document
      .querySelectorAll(
        `[${overrideAttribute}]:not([id="import-map-overrides"])`
      )
      .forEach((externalOverrideEl) => {
        currentPageExternalOverrides.push(externalOverrideEl.src);
      });
    return currentPageExternalOverrides;
  },
  getNextPageMap() {
    return imo.mergeImportMap(
      imo.getDefaultMap(),
      imo.getOverrideMap(),
    )
  },
  disableOverride(moduleName) {
    const disabledOverrides = imo.getDisabledOverrides();
    if (!disabledOverrides.includes(moduleName)) {
      localStorage.setItem(
        disabledOverridesLocalStorageKey,
        JSON.stringify(disabledOverrides.concat(moduleName))
      );
      fireChangedEvent();
      return true;
    } else {
      return false;
    }
  },
  enableOverride(moduleName) {
    const disabledOverrides = imo.getDisabledOverrides();
    const index = disabledOverrides.indexOf(moduleName);
    if (index >= 0) {
      disabledOverrides.splice(index, 1);
      localStorage.setItem(
        disabledOverridesLocalStorageKey,
        JSON.stringify(disabledOverrides)
      );
      fireChangedEvent();
      return true;
    } else {
      return false;
    }
  },
  getDisabledOverrides() {
    const disabledOverrides = localStorage.getItem(
      disabledOverridesLocalStorageKey
    );
    return disabledOverrides ? JSON.parse(disabledOverrides) : [];
  },
  isDisabled(moduleName) {
    return imo.getDisabledOverrides().includes(moduleName);
  },
};

const imo = window.importMapOverrides;

function fireChangedEvent() {
  // Set timeout so that event fires after the change has totally finished
  setTimeout(() => {
    if (window.CustomEvent) {
      window.dispatchEvent(new CustomEvent("import-map-overrides:change"));
    }
  });
}

const initialOverrideMap = imo.getOverrideMap();

function createEmptyImportMap() {
  return { imports: {}, scopes: {} };
}

export default imo
