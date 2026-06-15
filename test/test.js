import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { JSDOM } from 'jsdom';

const storageCases = [
  { exportName: 'LocalStorage', storageKey: 'localStorage' },
  { exportName: 'SessionStorage', storageKey: 'sessionStorage' },
];

let importCount = 0;

function restoreWindow(previousWindow, hadWindow) {
  if (hadWindow) {
    globalThis.window = previousWindow;
  } else {
    delete globalThis.window;
  }
}

function closeWindow(windowValue) {
  if (typeof windowValue?.close === 'function') {
    windowValue.close();
  }
}

async function importIndex() {
  importCount += 1;
  const indexUrl = new URL('../src/index.js', import.meta.url);
  indexUrl.searchParams.set('test', String(importCount));
  return import(indexUrl.href);
}

function withWindow(windowValue, callback) {
  const hadWindow = 'window' in globalThis;
  const previousWindow = globalThis.window;

  globalThis.window = windowValue;

  let result;

  try {
    result = callback();
  } catch (error) {
    closeWindow(windowValue);
    restoreWindow(previousWindow, hadWindow);
    throw error;
  }

  if (typeof result?.finally === 'function') {
    return result.finally(() => {
      closeWindow(windowValue);
      restoreWindow(previousWindow, hadWindow);
    });
  }

  closeWindow(windowValue);
  restoreWindow(previousWindow, hadWindow);
  return result;
}

for (const { exportName, storageKey } of storageCases) {
  describe(exportName, () => {
    test(`uses window.${storageKey} when available`, async () => {
      const dom = new JSDOM('', { url: 'https://example.test' });

      await withWindow(dom.window, async () => {
        const storageModule = await importIndex();
        const storage = storageModule[exportName];

        storage.set('key', { value: storageKey });

        assert.equal(
          dom.window[storageKey].getItem('key'),
          JSON.stringify({ value: storageKey }),
        );
        assert.deepEqual(storage.get('key'), { value: storageKey });
      });
    });

    test(`.get returns the default value when stored JSON cannot be parsed`, async () => {
      const dom = new JSDOM('', { url: 'https://example.test' });

      await withWindow(dom.window, async () => {
        const storageModule = await importIndex();
        const storage = storageModule[exportName];

        dom.window[storageKey].setItem('bad', '{');

        assert.equal(storage.get('bad'), null);
        assert.equal(storage.get('bad', 'fallback'), 'fallback');
      });
    });

    test(`.get returns the default value when storage throws`, async () => {
      const throwingStorage = {
        getItem() {
          throw new Error('getItem failed');
        },
        setItem() {},
        removeItem() {},
      };

      await withWindow({ [storageKey]: throwingStorage }, async () => {
        const storageModule = await importIndex();
        const storage = storageModule[exportName];

        assert.equal(storage.get('key'), null);
        assert.equal(storage.get('key', 'fallback'), 'fallback');
      });
    });

    test(`.set swallows storage write errors`, async () => {
      const throwingStorage = {
        getItem() {
          return null;
        },
        setItem() {
          throw new Error('setItem failed');
        },
        removeItem() {},
      };

      await withWindow({ [storageKey]: throwingStorage }, async () => {
        const storageModule = await importIndex();
        const storage = storageModule[exportName];

        assert.doesNotThrow(() => storage.set('key', 'value'));
      });
    });

    test(`.remove deletes values from storage`, async () => {
      const dom = new JSDOM('', { url: 'https://example.test' });

      await withWindow(dom.window, async () => {
        const storageModule = await importIndex();
        const storage = storageModule[exportName];

        storage.set('key', { value: storageKey });
        storage.remove('key');

        assert.equal(dom.window[storageKey].getItem('key'), null);
        assert.equal(storage.get('key'), null);
      });
    });

    test('.remove swallows storage remove errors', async () => {
      const throwingStorage = {
        getItem() {
          return null;
        },
        setItem() {},
        removeItem() {
          throw new Error('removeItem failed');
        },
      };

      await withWindow({ [storageKey]: throwingStorage }, async () => {
        const storageModule = await importIndex();
        const storage = storageModule[exportName];

        assert.doesNotThrow(() => storage.remove('key'));
      });
    });

    describe('FallbackStorage', () => {
      test(`is used when window.${storageKey} is unavailable`, async () => {
        await withWindow({}, async () => {
          const storageModule = await importIndex();
          const storage = storageModule[exportName];

          storage.set('key', { value: storageKey });

          assert.deepEqual(storage.get('key'), { value: storageKey });
          storage.remove('key');
          assert.equal(storage.get('key'), null);
        });
      });

      test(`.get returns the default value for missing keys`, async () => {
        await withWindow({}, async () => {
          const storageModule = await importIndex();
          const storage = storageModule[exportName];
          const defaultValue = { missing: storageKey };

          assert.equal(storage.get('missing'), null);
          assert.equal(storage.get('missing', 'fallback'), 'fallback');
          assert.equal(storage.get('missing', false), false);
          assert.equal(storage.get('missing', 0), 0);
          assert.equal(storage.get('missing', defaultValue), defaultValue);
        });
      });

      test(`.set and .get round-trip JSON edge values`, async () => {
        await withWindow({}, async () => {
          const storageModule = await importIndex();
          const storage = storageModule[exportName];
          const values = [
            ['zero', 0],
            ['false', false],
            ['empty string', ''],
            ['null', null],
            ['array', [0, false, '', null]],
          ];

          for (const [key, value] of values) {
            storage.set(key, value);
            assert.deepEqual(storage.get(key, 'fallback'), value);
          }
        });
      });
    });
  });
}

describe('createWebStorage', () => {
  test('creates storage instances that use the provided serializer', async () => {
    const serializer = {
      parse(value) {
        return { parsed: value.slice('encoded:'.length) };
      },
      stringify(value) {
        return `encoded:${value}`;
      },
    };

    await withWindow({}, async () => {
      const { createWebStorage } = await importIndex();
      const { LocalStorage, SessionStorage } = createWebStorage(serializer);

      LocalStorage.set('local', 'stored local value');
      SessionStorage.set('session', 'stored session value');

      assert.deepEqual(LocalStorage.get('local'), { parsed: 'stored local value' });
      assert.deepEqual(SessionStorage.get('session'), { parsed: 'stored session value' });
    });
  });

  test('creates storage instances backed by the matching window storage APIs', async () => {
    const dom = new JSDOM('', { url: 'https://example.test' });
    const serializer = {
      parse(value) {
        return { decoded: value.slice('encoded:'.length) };
      },
      stringify(value) {
        return `encoded:${value}`;
      },
    };

    await withWindow(dom.window, async () => {
      const { createWebStorage } = await importIndex();
      const { LocalStorage, SessionStorage } = createWebStorage(serializer);

      LocalStorage.set('key', 'local value');
      SessionStorage.set('key', 'session value');

      assert.equal(dom.window.localStorage.getItem('key'), 'encoded:local value');
      assert.equal(dom.window.sessionStorage.getItem('key'), 'encoded:session value');
      assert.deepEqual(LocalStorage.get('key'), { decoded: 'local value' });
      assert.deepEqual(SessionStorage.get('key'), { decoded: 'session value' });
    });
  });

  test('falls back to memory storage when window is unavailable', async () => {
    const hadWindow = 'window' in globalThis;
    const previousWindow = globalThis.window;

    try {
      delete globalThis.window;

      const { createWebStorage } = await importIndex();
      const { LocalStorage, SessionStorage } = createWebStorage(JSON);

      LocalStorage.set('local', 'local value');
      SessionStorage.set('session', 'session value');

      assert.equal(LocalStorage.get('local'), 'local value');
      assert.equal(SessionStorage.get('session'), 'session value');
    } finally {
      restoreWindow(previousWindow, hadWindow);
    }
  });
});
