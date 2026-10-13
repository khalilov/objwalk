---
name: objwalk
description: Use when writing or editing JavaScript or TypeScript that imports `objwalk`, reads or writes nested object paths, reshapes or walks objects, or uses objwalk JSON helpers.
---

# objwalk

**objwalk is a library for working with JavaScript objects. Extra wrappers whose
only purpose is to check whether a value is an object before calling objwalk are
redundant.** Use the public functions directly within their input contracts.
Do not add `safePick`, `safeMerge`, `parseObject`, `isObjectPayload`, or a custom
JSON decoder to repeat behaviour already owned by the library.

Application-specific validation of required fields and allowed values still
belongs at untyped boundaries. `parse` returns `unknown`; it does not prove a
domain type. Other functions keep their declared input contracts: do not bypass
them with type assertions or assume every method accepts arbitrary `unknown`.

Named imports only:

```ts
import { clone, each, equally, extract, map, merge, parse, pick, set, stringify } from 'objwalk'
```

## Choose the existing operation

| Need | Function and behaviour |
| --- | --- |
| Read a nested value | `pick(data, path, options?)`; unresolved paths return `undefined`. |
| Write a nested value | `set(data, path, value)`; creates intermediate containers, mutates and returns `data`. |
| Reshape an object | `extract(source, mapping)`; mapping keys are destination paths, values are source paths. |
| Visit nested values | `each(data, (key, value, path) => { ... })`; visits containers and leaves, excluding the root. |
| Build a store while walking | `map(data, (key, value, store, path) => { ... }, store?)`; returns the store, ignores callback return values. |
| Deep merge | `merge(target, ...sources)`; mutates and returns the target, merges plain objects, replaces arrays and non-plain values. |
| Deep copy | `clone(value)`; preserves `Date`, `RegExp`, symbol keys, and circular references. |
| Deep comparison | `equally(a, b)`; supports `NaN`, `Date`, `RegExp`, and circular references. |

`set` and `merge` mutate their targets. Use `clone` first only when the task
requires an independent copy. `each` and `map` do not support circular traversal;
do not infer that capability from `clone` or `equally`.

## Paths and reshaping

| Syntax | Use |
| --- | --- |
| `user.name` | Nested property. |
| `items[0].title` | Explicit array index. |
| `user.{name,email}` | Select several keys with `pick`; a single selected key returns its value. |
| `user.{*}` | List object keys with `pick`. |
| `items[n].title` | Map array items in `extract`, with `[n]` in both source and destination paths. |

`[n]` is an `extract` mapping feature, not a general wildcard for `pick` or `set`.
An array of source paths in `extract` selects the first result that is not
`undefined`, preserving `null`, `false`, `0`, and empty strings.

`pick` reads inherited properties by default. Use its existing options when own
properties or ignored keys are required:

```ts
pick(data, 'user.name', {
  inherited: false,
  ignore: ['__proto__', 'prototype', 'constructor'],
})
```

## JSON and ready values

Call `parse(raw, options?)` directly with `raw: unknown`. The library chooses
between ready values and text; do not surround it with `typeof`, `Array.isArray`,
`ArrayBuffer.isView`, or prototype checks to make that choice.

- Plain objects with `Object.prototype` or a null prototype, and arrays, return
  by the same reference. They are not copied or traversed; `reviver` is not called.
- Other inputs use `JSON.parse(typeof raw === 'string' ? raw : String(raw), reviver)`.
  ArrayBuffer, DataView, and typed-array views take this text path. A Buffer with
  JSON text can use its native string conversion; there is no binary decoder.
- Parsed roots may be objects, arrays, strings, numbers, booleans, or `null`.
  There is no object-only mode and no `parse<T>()` overload.
- `stringify(value, options?)` always uses native `JSON.stringify`, including
  `replacer` callback/array and `space`. `stringify('{}')` returns `'"{}"'`.

Both functions return `undefined` on an exception by default. Options include
`fallback` and `onError(error: unknown)`. `parse` also accepts native `reviver`.
`ParseOptions` and `StringifyOptions` are public named type exports.

`onError` receives the original exception once. Its return value is ignored;
if it throws, that exception propagates. Errors from input recognition, string
conversion, reviver, replacer, toJSON, and getters follow the same contract.

Fallback applies only to exceptions. Preserve valid falsy results and native
`undefined`: `stringify(undefined, { fallback: 'null' })` still returns
`undefined`. Neither fallback nor a throwing `onError` changes stringify's
return type of `string | undefined`.

Full usage: [README](../../README.md). In a consumer project, read the installed
package's README and declarations when checking the available version's API.
