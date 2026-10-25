# objwalk specification

This document describes the public API in the current source tree, including changes
not yet released. [README.md](README.md) provides examples; [tests](tests/) exercise
the contracts.

## Public API and shared types

All functions and types below are named exports from `objwalk`.

```ts
type ObjwalkObject = Record<string, any>
type WalkKey = string | number
type ExtractMapping = Record<string, string | string[]>

type PickOptions = {
  inherited?: boolean
  ignore?: readonly string[]
}

type DiffOperation =
  | { type: 'set'; path: string[]; value: unknown }
  | { type: 'delete'; path: string[] }
```

| Function | Return value | Mutation and identity |
| --- | --- | --- |
| `pick(data, path?, options?)` | Selected value, selection object, key list, or `undefined` | Selected values retain their references |
| `set(data, path, value)` | Input object | Mutates the input; assigned values are not cloned |
| `flush(data, path)` | Input object | Mutates the input |
| `extract(source, mapping)` | New result object | Selected values are not cloned |
| `each(data, callback, options?)` | `undefined` | Passes original values to callbacks |
| `map(data, callback, store?)` | Supplied store or a new object | Callback builds or mutates the store |
| `merge(target, ...sources)` | Target object | Mutates the target; replacement values are not cloned |
| `clone(value)` | Value of the same declared generic type | Recursively copies supported objects and arrays |
| `equally(a, b, paths?)` | `boolean` | Does not assign to the inputs |
| `diff(first, last)` | `DiffOperation[]` | Does not assign to inputs; operation values retain references |
| `parse(raw, options?)` | `unknown` | Ready objects and arrays retain their references |
| `stringify(value, options?)` | `string \| undefined` | Uses native JSON serialization |

`pick`, `set`, and `flush` use `{}` when their `data` argument is `undefined`.
`set` and `flush` still require the path argument. `pick` defaults its path to `''`.
Their declared data contract is `ObjwalkObject`; this is not a guarantee that all
functions accept every possible JavaScript value. `each` and `map` accept `any`;
`clone` is generic; `equally`, `diff`, `parse`, and `stringify` accept `unknown` inputs.
`extract` requires an object and a mapping; `merge` requires an object target.

Except for the documented JSON error handling, exceptions from callbacks, getters,
setters, proxies, or native property operations propagate. Mutations already made
before an exception are not rolled back. Functions are synchronous and do not await
callback results. User callbacks and property accessors can have their own side effects.

## Paths

Paths are strings, not arrays of literal segments. A dot separates object properties.
An explicit array segment has the form `items[0]`; its parser matches
`^(\w+)\[(\d+)\]$`. Use canonical non-negative decimal indexes and a word-character
property name for this syntax. A bracket segment resolves only when its named value
is an array. Ordinary segments use property lookup.

Supported examples are `user.name`, `items[0].title`, and
`groups[0].items[1].id`. Quoted brackets, escaping dots, negative indexes, and nested
brackets such as `matrix[0][1]` are not supported path operators. Unsupported syntax
is not automatically rejected: a segment can instead be treated as a literal key.
There is no general path validator.

| Syntax | Interpretation |
| --- | --- |
| `user.name` | Property traversal |
| `items[0].title` | Explicit array index followed by property traversal |
| `user.{name,email}` | Terminal key selection in `pick` |
| `user.{*}` | Terminal key listing in `pick` |
| `items[n].title` | Array mapping in `extract`, paired with a source mapping |

Key selection is interpreted by `pick`, including source paths passed through
`pick` by `extract`. It is not interpreted by `set`, `flush`, or `equally`.
`[n]` is not a wildcard for the other functions.

Empty paths have operation-specific meanings:

- `pick(data, '')` returns the root value.
- `equally(a, b, [''])` compares the whole input values.
- `flush(data, '')` does nothing.
- `set(data, '', value)` assigns the property whose key is the empty string.

Traversal paths from `each` and `map` are descriptive strings, not a lossless encoding
of arbitrary keys. Literal dots, brackets, and empty keys can make them ambiguous.
A root array produces paths such as `[0]`, which do not have the named-array-segment
form above. Use `each`'s literal `segments` or `diff`'s operation paths when exact keys matter.

## pick

`pick(data, path?, options?)` reads a path without creating intermediate containers.
Missing or nullish intermediate values produce `undefined`. Valid falsy values are
preserved. An explicit array index outside the array resolves to `undefined`, unless
a value is available through the configured property lookup.

`PickOptions` defaults to `{ inherited: true, ignore: [] }`. `inherited: false`
restricts every property and array-index lookup to own properties. `ignore` matches
exact string keys, including array indexes represented as strings, at every lookup.

Terminal selection trims whitespace around comma-separated keys and removes empty
entries. One selected key returns its value. Multiple selected keys return a new
object containing every selected key, including keys whose values are `undefined`.
Selection requires an object value; an unresolved or primitive selection base returns
`undefined`. The selection operation does not clone selected values.

`{*}` returns own enumerable string keys, filtered by `ignore`, in `Object.keys`
order. It returns `[]` for arrays, primitives, nullish values, or unresolved paths;
it does not list inherited keys even when inherited lookup is enabled.

## set

`set(data, path, value)` mutates and returns the same input object. It uses direct
property lookup and assignment, without `PickOptions` or the key filter from `merge`.

For an ordinary intermediate segment, missing, nullish, and primitive values are
replaced with `{}`. Existing object values, including arrays, are reused.
For an array segment, a non-array named value is replaced with `[]`. A later index
extends the array, leaving holes before that index. An intermediate indexed value
is initialized to `{}` only when it is `undefined`; existing null or primitive
indexed values are not normalized into objects for further traversal.

The final property or array slot is assigned even when `value` is `undefined`.
Assignment is distinct from deletion. No empty-parent pruning or rollback occurs.

## flush

`flush(data, path)` accepts `path: string | string[]`. Each path deletes an own
property using native `delete`, and the function returns the same input object.

- Path arrays are processed in order and are not modified. Holes are skipped.
- Empty lists, empty paths, missing paths, and nullish or primitive parents are no-ops.
- Traversal and deletion use only own properties, including explicit array indexes.
- Missing containers are not created; empty parents are not removed.
- Overlapping and repeated paths are processed against the state left by earlier paths.
- Deleting an array slot leaves a hole; length and later indexes are unchanged.
- An exception stops processing immediately. Earlier deletions remain applied and
  later paths are not processed.

## extract

`extract(source, mapping)` creates a result root. Mapping keys are destination paths;
values are source paths or ordered arrays of fallback source paths.

Mappings are processed in `Object.entries(mapping)` order. A direct source path is
read with `pick` and written with `set`, even when its value is `undefined`.
A fallback array selects the first value that is not `undefined`; `null`, `false`,
`0`, and `''` all count as resolved. Holes are skipped and later paths are not read
after a match. If none resolve, that mapping performs no assignment.

For array mapping, use one `[n].` marker in both the destination path and its string
source path, for example `'items[n].title': 'products[n].name'`. The source prefix
must resolve to an array. Each present source item is read using the source suffix
and assigned at the corresponding destination index. A non-array source produces
no assignments. Multiple mapping markers and fallback arrays of array mappings
are outside this mapping contract.

The result root is new, but selected objects are assigned by reference. Overlapping
destination writes can therefore modify objects shared with the source. `extract`
does not provide an independent deep snapshot.

## each

```ts
type EachCallback<TKey extends WalkKey | undefined = WalkKey> = (
  key: TKey,
  value: any,
  path: string,
  segments: WalkKey[]
) => unknown

type EachEntry = {
  key: WalkKey | undefined
  value: any
  path: string
  segments: WalkKey[]
}

type EachOptions = {
  root?: boolean
  descend?: (entry: EachEntry) => boolean
}
```

`each(data, callback, options?)` walks objects and arrays depth first, visiting a
value before its children. Objects enumerate own enumerable string keys in
`Object.keys` order; symbols and non-enumerable properties are not enumerated.
Arrays visit numeric indexes in ascending order, using native `every` iteration:
absent slots are skipped, inherited indexed values can be visited, and non-index
properties are not traversed. Any non-null object can be a container; functions
are leaves, and built-in collection internals are not traversed.

`root` defaults to `false`. When enabled, the root is visited first with key
`undefined`, path `''`, and segments `[]`, even for primitive, nullish, or empty
inputs. Otherwise a primitive or nullish root has no visits. Object keys are
strings and array indexes are numbers. Without root visits, callback keys are
typed as `WalkKey`; enabled or dynamic root options use `WalkKey | undefined`.

Returning exactly `false` from the callback stops the entire traversal, including
siblings and remaining ancestor branches. Other return values, including other
falsy values, are ignored. A stopped container does not invoke `descend` or visit
children; subsequent values are not read. The function returns `undefined` after
both completion and early stopping.

`descend` is evaluated only for containers, after their callback. It also runs for
an excluded root container. Returning `false` skips that container's children and
continues with siblings. It does not stop the entire traversal.

Object keys are collected when entering a container; values are read as visited.
For arrays, native iteration captures the starting length: appended slots beyond
that length are not visited. Callback and `descend` receive separate copies of
`segments`; modifying those copies does not change traversal paths. `value` remains
the original value. Cycles are not detected. Separate and nested invocations do
not share stop state.

## map

```ts
type MapCallback<TStore extends Record<string, any> = Record<string, any>> = (
  key: WalkKey,
  value: any,
  store: TStore,
  path: string
) => void
```

`map(data, callback, store?)` uses the default `each` traversal for objects and arrays,
excluding the root. The callback receives the original value and the same store
on every visit. A supplied store is returned by identity; otherwise the store is
a new `{}`. The generic store type is preserved in the return type.

All callback return values, including `false`, are ignored. `map` exposes neither
root/descend options nor literal segments. Errors propagate and completed store
mutations remain applied. Cycles are not detected.

## merge

`merge<T extends ObjwalkObject>(target: T, ...sources: unknown[]): T` mutates and
returns the target. Sources are applied left to right. A source is processed only
when its prototype is `Object.prototype` or `null`; other root sources are ignored.

Each source uses its own enumerable string entries. Entry values are read by
`Object.entries` before that source's assignments begin. Keys `__proto__`,
`constructor`, and `prototype` are skipped at every recursive merge level.
Symbols and non-enumerable source keys are not merged.

When the current target value and source value are both plain objects, they are
merged recursively. Otherwise the source value replaces the target value by
reference, including arrays, `Date`, `null`, and `undefined`. Replacement objects
are not traversed just because they have been assigned. The operation does not
guarantee cycle handling or preserve a snapshot of source values beyond each
source's entry collection.

## clone

`clone<T>(value: T): T` returns primitive values and functions unchanged. Arrays
and ordinary object properties are recursively copied with a reference store,
preserving their shared references and circular links within the copied graph.

- Arrays copy indexed values up to their length into a new array. Holes become
  explicit `undefined` entries; extra properties and symbol keys are not copied.
- Other objects use `Reflect.ownKeys`, including symbols and non-enumerable keys,
  to read values and assign them to a new ordinary object. Custom prototypes and
  property descriptors are not preserved; accessors are evaluated rather than copied.
- `Date` uses a new instance with the same timestamp; `RegExp` uses its source and
  flags. Their custom properties are not copied, `lastIndex` is not retained, and
  repeated references to these special values are not deduplicated by the store.
- There is no specialized copying of `Map`, `Set`, typed-array internal state, or
  class invariants. The generic return type does not guarantee preservation of
  those runtime capabilities.

Property access errors propagate. The implementation does not assign to the source.

## equally

`equally(a: unknown, b: unknown, paths?: string[]): boolean` performs deep comparison.
Omitting `paths`, or passing `undefined`, compares the whole values. Providing a
path list compares only the selected values; all must match. An empty list returns
`true`, holes are skipped, and comparison stops at the first mismatch. Unselected
properties and later paths are not read.

Path reads use ordinary dot and explicit array-index lookup with inherited
properties enabled. Missing paths resolve to `undefined`, so a missing value and
an explicit `undefined` value compare equally. `''` selects the root. Selection
syntax and `[n]` mappings are not interpreted.

For whole values or each selected value:

- Strictly identical values compare equal, including `0` and `-0`.
- `NaN` compares equal to `NaN`. Other primitive values use strict equality.
- Two `Date` instances compare timestamps; two `RegExp` instances compare source
  and flags. Distinct invalid dates have unequal timestamps under strict equality.
  A `Date` or `RegExp` cannot equal a value of the other type or an ordinary object.
- An array and a non-array compare unequal. Arrays compare lengths and indexed
  values in both dense and sparse arrays. A hole reads as `undefined`, including
  when compared against an explicit `undefined` slot. Inherited indexed values
  follow ordinary property lookup. Comparison is independent of argument order
  for inputs without access side effects. Values are read once per compared index,
  and reading stops at the first mismatch. Extra string and symbol properties
  are not compared.
- Other objects compare all own string and symbol keys, including non-enumerable
  keys, then recursively compare values. Key order, prototypes, and descriptors
  are not compared. Accessors are evaluated.
- Previously visited object pairs allow circular graphs to terminate; alias
  identity across otherwise equal object graphs is not required.

There is no specialized comparison of collection internal state such as `Map`
or `Set` entries. The same rules apply to whole-value and selected-path comparisons.

## diff

`diff(first: unknown, last: unknown): DiffOperation[]` describes changes from the
first value to the last. Equal inputs produce `[]`.

When both values at a location are plain objects, comparison recurses through own
enumerable string keys. Inherited, symbol, and non-enumerable properties are not
part of that recursion. Other values, including arrays, use `equally` and are
replaced as a whole when unequal. Newly added values are also set as a whole.

Paths are arrays of literal string keys. `[]` identifies a root replacement.
They are not string-path arguments for `pick`, `set`, or `flush`, and must not be
joined with dots when keys can contain path punctuation.

Changed and added values are visited in the last object's key order. Removals
are emitted when leaving their containing branch, in the first object's key
order, before moving to the next branch. An own `undefined` value is distinct
from deletion. Empty parents remain; prototype and descriptor changes are not
reported during plain-object recursion.

Operations contain original references from `last`, without cloning. No patch
applier, options argument, or cycle detection is provided. Acyclic shared references
are supported. JSON serialization can drop an `undefined` operation value, so the
operation list is not a lossless JSON transport for every JavaScript value.

## parse and stringify

```ts
type ParseOptions = {
  fallback?: unknown
  onError?: (error: unknown) => void
  reviver?: Parameters<typeof JSON.parse>[1]
}

type StringifyOptions = {
  fallback?: string
  onError?: (error: unknown) => void
  replacer?: ParseOptions['reviver'] | Parameters<typeof JSON.stringify>[1]
  space?: string | number
}
```

`parse(raw: unknown, options?): unknown` returns ready arrays and plain objects
by reference without walking them or calling `reviver`. Plain objects include
null-prototype objects. Other values use
`JSON.parse(typeof raw === 'string' ? raw : String(raw), reviver)`.
`ArrayBuffer` and array-buffer views always use the text path; there is no binary
decoder. The result can be any JSON root type, or the arbitrary result of a
reviver. There is no generic `parse<T>()` or object-only mode.

`stringify(value: unknown, options?): string | undefined` always calls native
`JSON.stringify` with `replacer` and `space`. Strings are serialized as strings,
not treated as already serialized JSON. Native omission, array-null replacement,
formatting, `toJSON`, and callback `this` binding are preserved.

Both functions catch exceptions from their normal operation, including recognition,
conversion, getters, proxies, and JSON callbacks. On an exception, `onError`, when
provided, receives the original thrown value once, then the function returns
`fallback`, which defaults to `undefined`. A throwing `onError` propagates its
exception without being called again. Its return value is ignored.

Fallback applies only to exceptions. Valid `null`, `false`, `0`, and `''` are
preserved. A root reviver result of `undefined`, or native `stringify(undefined)`,
does not invoke error handling or use the fallback. A string fallback or throwing
handler does not narrow stringify's public `string | undefined` return type.
Callback side effects are not rolled back. There is no logging, JSON repair, or
domain-shape validation.

## Verification

`npm test` type-checks source and tests through `tsconfig.test.json`, then runs
Vitest. This includes compile-time `expectTypeOf` assertions. `npm run build` generates ESM,
CommonJS, and declarations; `npm run pack:check` inspects the npm package contents.
