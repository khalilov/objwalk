---
name: objwalk
description: Use when writing or editing JavaScript or TypeScript that imports `objwalk`, reads, writes, or deletes nested object paths, computes differences, reshapes or walks objects, or uses objwalk JSON helpers.
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
import { clone, diff, each, equally, extract, flush, map, merge, parse, pick, set, stringify } from 'objwalk'
```

## Choose the existing operation

| Need | Function and behaviour |
| --- | --- |
| Read a nested value | `pick(data, path, options?)`; unresolved paths return `undefined`. |
| Write a nested value | `set(data, path, value)`; creates intermediate containers, mutates and returns `data`. |
| Delete nested properties | `flush(data, path)`; accepts one path or `string[]`, deletes own properties, mutates and returns `data`; missing paths are left unchanged. |
| Reshape an object | `extract(source, mapping)`; mapping keys are destination paths, values are source paths. |
| Visit nested values | `each(data, (key, value, path, segments) => { ... }, options?)`; supports objects and arrays, root is excluded by default; returning `false` stops the entire traversal. |
| Build a store while walking | `map(data, (key, value, store, path) => { ... }, store?)`; returns the store, ignores callback return values. |
| Deep merge | `merge(target, ...sources)`; mutates and returns the target, merges plain objects, replaces arrays and non-plain values. |
| Deep copy | `clone(value)`; preserves `Date`, `RegExp`, symbol keys, and circular references. |
| Deep comparison | `equally(a, b, paths?)`; supports `NaN`, `Date`, `RegExp`, and circular references; optional `string[]` compares only selected paths. |
| Describe changes | `diff(first, last): DiffOperation[]`; returns `set`/`delete` operations, or `[]` when unchanged. |

`set`, `flush`, and `merge` mutate their targets. Use `clone` first only when the task
requires an independent copy. `each`, `map`, and `diff` do not support circular traversal;
do not infer that capability from `clone` or `equally`.

## Paths and reshaping

| Syntax | Use |
| --- | --- |
| `user.name` | Nested property. |
| `items[0].title` | Explicit array index. |
| `user.{name,email}` | Select several keys with `pick`; a single selected key returns its value. |
| `user.{*}` | List object keys with `pick`. |
| `items[n].title` | Map array items in `extract`, with `[n]` in both source and destination paths. |

`[n]` is an `extract` mapping feature, not a general wildcard for `pick`, `set`, or `flush`.
An array of source paths in `extract` selects the first result that is not
`undefined`, preserving `null`, `false`, `0`, and empty strings; later paths are
not read. Sparse path arrays in `flush` and fallback arrays in `extract` skip holes.

Use `flush` to remove a property rather than `set(data, path, undefined)`, which
leaves the property present. `flush` traverses and deletes only own properties.
Missing, nullish, or primitive parents and empty paths are left unchanged; no
containers are created and empty parents remain. Explicit array indexes work,
but deleting an item leaves a hole without shifting indexes or changing length.
Selection syntax (`{name,email}`, `{*}`) is not supported. Errors from getters,
proxies, or deleting non-configurable properties propagate.

`flush` processes a path array in order; `[]` leaves the target unchanged.
`equally` without `paths` (or with `undefined`) compares whole values. With `paths`,
every selected value must match; `[]` returns true and `''` selects the whole input.
It uses dot notation and explicit array indexes, reading inherited properties like
`pick`; unresolved paths compare as `undefined`, including against an explicit
`undefined` value. Selection syntax and `[n]` mappings are not supported.
Getter/proxy errors propagate.

`equally` compares `Date` and `RegExp` only with their respective types. Arrays
compare every index, including holes, which read as `undefined`; holes match
explicit `undefined` slots but not other values.

`pick` reads inherited properties by default. Use its existing options when own
properties or ignored keys are required:

```ts
pick(data, 'user.name', {
  inherited: false,
  ignore: ['__proto__', 'prototype', 'constructor'],
})
```

## Walking

`each` passes literal `segments: WalkKey[]` as its fourth callback argument.
Object keys are strings; array indexes are numbers. Prefer segments when keys may
contain dots, brackets, or empty strings; the string `path` can be ambiguous.

`EachOptions` accepts `root` (default `false`) and
`descend: ({ key, value, path, segments }) => boolean`.
With `root: true`, the root is visited first, including primitive/nullish values,
with key `undefined`, path `''`, and segments `[]`. Callback keys are then typed
`WalkKey | undefined`; legacy calls keep `WalkKey`. Use the public
`EachCallback<WalkKey | undefined>` for an explicitly typed root-aware callback.
`EachEntry` and `EachOptions` are also public named exports.

`descend` is called only for containers, after their callback, and returning false
skips their children. It also runs for a root container excluded from callbacks.
For example, `descend: ({ value }) => Array.isArray(value) === false` visits arrays
without traversing their elements. Returning exactly `false` from the callback stops
the entire traversal, including siblings and ancestor branches; other return values
are ignored. The stopped container's `descend` is not called, and its children and
subsequent values are not read. Object keys are collected on entering a container;
values are read as visited. `each` still returns `undefined`. Existing callbacks
that returned `false` must omit that return to keep walking. `map` continues to
ignore callback return values for both objects and arrays.
Mutating received segments does not affect traversal. Callback/getter/descend errors
propagate. Cycles are not detected.

## Differences

`diff` recursively compares two plain objects by their own enumerable string keys;
symbol/non-enumerable keys, prototypes, and descriptors are not reported during that traversal.
Arrays and other values use `equally` and are replaced as a whole when changed.
New properties are also set as whole values. The public `DiffOperation` type is:

```ts
type DiffOperation =
  | { type: 'set'; path: string[]; value: unknown }
  | { type: 'delete'; path: string[] }
```

Paths contain literal keys; `[]` replaces the root. Do not join them with `.` to
call `set` or `flush`: keys may contain dots or brackets. `merge` does not apply
these operations. There is no patch applier or options argument.

Deletion is distinct from assigning `null` or `undefined`, including adding an own
`undefined` property. Empty parent objects remain. Inputs are not mutated or cloned;
`set.value` retains references from `last`. Native JSON serialization loses an
`undefined` value, so do not assume lossless transport for arbitrary JS values.
Getter/proxy errors propagate. Cycles are outside the contract, without detection;
shared references without cycles work.

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

Full usage: [README](../../README.md). Edge cases: [specification](../../SPEC.md).
In a consumer project, read the installed
package's README and declarations when checking the available version's API.
