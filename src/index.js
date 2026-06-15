import { WebStorage } from "./WebStorage.js";
/** @typedef {import("./WebStorage.js").Serializer} Serializer */

/**
 * @param {Serializer} serializer
 */
export function createWebStorage(serializer) {
  return {
    LocalStorage: new WebStorage('localStorage', serializer),
    SessionStorage: new WebStorage('sessionStorage', serializer),
  };
}

const { LocalStorage, SessionStorage } = createWebStorage(JSON);
export { LocalStorage, SessionStorage };
