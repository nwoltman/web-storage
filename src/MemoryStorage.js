export class MemoryStorage {
  constructor() {
    /** @type {Map<string, string>} */
    this._storage = new Map();
  }

  /**
   * @param {string} key
   * @returns {string | null}
   */
  getItem(key) {
    return this._storage.get(key) ?? null;
  }

  /**
   * @param {string} key
   * @param {unknown} value
   * @returns {void}
   */
  setItem(key, value) {
    this._storage.set(String(key), String(value));
  }

  /**
   * @param {string} key
   * @returns {void}
   */
  removeItem(key) {
    this._storage.delete(key);
  }
}
