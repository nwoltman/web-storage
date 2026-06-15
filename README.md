# @nwoltman/web-storage

[![NPM Version](https://img.shields.io/npm/v/@nwoltman/web-storage.svg)](https://www.npmjs.com/package/@nwoltman/web-storage)
[![Build Status](https://img.shields.io/github/actions/workflow/status/nwoltman/web-storage/ci.yml?branch=main)](https://github.com/nwoltman/web-storage/actions/workflows/ci.yml?query=branch%3Amain)

Provides convenient interfaces wrapping browser
[Web Storage APIs](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
(`localStorage`/`sessionStorage`) that make it easy to safely use those APIs and
store/retrieve any type of data.

### "It's been done before"

Yeah, there's a bunch of packages like this one on npm and they all do about
the same thing. Here's what this particular one offers:

- Full safety against errors when the web storage API is not available
- In-memory fallback when the web storage API is not available
- JSON serialization/deserialization by default so any data type can b e stored
- Custom serialization in case you need more control
- Very small package size
- Full TypeScript support
- 100% test coverage

## API

```js
import { LocalStorage, SessionStorage } from '@nwoltman/web-storage';
```

`LocalStorage` and `SessionStorage` provide the same API. Values are serialized
with `JSON.stringify()` when written and parsed with `JSON.parse()` when read.

#### `set(key, value)`

+ `key` (_string_) - The storage key to write.
+ `value` (_any_) - The value to serialize and store.

```js
LocalStorage.set('settings', { theme: 'dark' });
```

#### `get(key[, defaultValue])`

+ `key` (_string_) - The storage key to read.
+ `defaultValue` (_any_) - Optional value returned when the key is missing,
  stored JSON cannot be parsed, or storage access fails.
  + Default: `null`
+ Returns (_any_) - The deserialized stored value or the default value.

```js
const settings = LocalStorage.get('settings', { theme: 'light' });
```

#### `remove(key)`

+ `key` (_string_) - The storage key to remove.

```js
LocalStorage.remove('settings');
```

### Custom WebStorage

The `LocalStorage` and `SessionStorage` interfaces serialize/deserialize data
using `JSON.stringify`/`JSON.parse` by default. To use a different serializer,
you can create custom interfaces using the `createWebStorage` function.

#### `createWebStorage(serializer)`

+ `serializer` - An object that implements `stringify(value: any) => string`
  and `parse(str: string) => any` methods.

```js
import { createWebStorage } from '@nwoltman/web-storage';

const LocalBase64Storage = createWebStorage('localStorage', {
  stringify: (value) => btoa(String(value)),
  parse: (value) => atob(value),
});

LocalBase64Storage.set('token', 'abc123');

const token = LocalBase64Storage.get('token');
```
