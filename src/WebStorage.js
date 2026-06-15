import { MemoryStorage } from "./MemoryStorage.js";

/**
 * @typedef {object} Serializer
 * @property {(str: string) => unknown} parse
 * @property {(value: unknown) => string} stringify
 */

export class WebStorage {
  /**
   * @param {'localStorage' | 'sessionStorage'} storageKey
   * @param {Serializer} serializer
   */
  constructor(storageKey, serializer) {
    try {
      /** @type {Storage | MemoryStorage} */
      this._storageInterface = window[storageKey] ?? new MemoryStorage();
    } catch {
      this._storageInterface = new MemoryStorage();
    }

    /** @type {Serializer} */
    this._serializer = serializer;
  }

  /**
   * @template [T=unknown]
   * @overload
   * @param {string} key
   * @returns {T | null}
   */
  /**
   * @template T
   * @overload
   * @param {string} key
   * @param {T} defaultValue
   * @returns {T}
   */
  /**
   * @template T
   * @param {string} key
   * @param {T | null} [defaultValue=null]
   * @returns {T | null}
   */
  get(key, defaultValue = null) {
    try {
      const value = this._storageInterface.getItem(key);
      return value === null ? defaultValue : /** @type {T} */ (this._serializer.parse(value));
    } catch {
      return defaultValue;
    }
  }

  /**
   * @param {string} key
   * @param {unknown} value
   * @returns {void}
   */
  set(key, value) {
    try {
      this._storageInterface.setItem(key, this._serializer.stringify(value));
    } catch {
      // Swallow error
    }
  }

  /**
   * @param {string} key
   * @returns {void}
   */
  remove(key) {
    try {
      this._storageInterface.removeItem(key);
    } catch {
      // Swallow error
    }
  }
}
