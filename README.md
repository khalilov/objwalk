# objwalk

Small utilities for reading, writing, walking, and reshaping nested JavaScript objects.

`objwalk` is built around a compact path syntax, so the same mental model works for picking values, setting values, extracting a new object shape, and walking through nested data.

> Coding agent? Load the [objwalk skill](skills/objwalk/SKILL.md).

## Install

```bash
npm install objwalk
```

## Usage

```ts
import { each, equally, extract, map, merge, parse, pick, set, stringify } from 'objwalk'
```

## pick

Read a value from an object by path.

```ts
const data = {
  user: {
    name: 'Natalia Romanoff',
    email: 'black.widow@example.com',
  },
}

pick(data, 'user.name')
// 'Natalia Romanoff'
```

Pick several keys from the same nested object.

```ts
pick(data, 'user.{name,email}')
// { name: 'Natalia Romanoff', email: 'black.widow@example.com' }
```

List keys from a nested object.

```ts
pick(data, 'user.{*}')
// ['name', 'email']
```

Read from arrays with an explicit index.

```ts
const data = {
  items: [{ title: 'First' }, { title: 'Second' }],
}

pick(data, 'items[1].title')
// 'Second'
```

If the path cannot be resolved, `pick` returns `undefined`.

By default, `pick` keeps its permissive property lookup behavior. Pass options to restrict
lookups to own properties or ignore specific keys.

```ts
pick(data, path, {
  inherited: false,
  ignore: ['__proto__', 'prototype', 'constructor'],
})
```

The options apply to every path segment, array index, and selected key. With `{*}`, ignored
keys are omitted from the returned list.

## set

Set a value inside an object by path.

```ts
const data = {}

set(data, 'user.name', 'Natalia')
// { user: { name: 'Natalia' } }
```

Set values inside arrays with an explicit index.

```ts
const data = {}

set(data, 'items[0].title', 'First')
// { items: [{ title: 'Romanoff' }] }
```

`set` mutates the object passed to it and returns the same object.

## equally

Deeply compare two values for structural equality.

```ts
equally({ a: { b: [1, 2] } }, { a: { b: [1, 2] } })
// true

equally({ a: 1 }, { a: 1, b: 2 })
// false
```

`equally` treats `NaN` as equal to `NaN`, compares `Date` by timestamp and `RegExp` by
source and flags, and follows circular references without looping.

## merge

Deeply merge plain objects into a target object.

```ts
const target = { user: { name: 'Ada', flags: { admin: false } } }

merge(target, { user: { email: 'ada@example.com', flags: { admin: true } } })
// {
//   user: { name: 'Ada', email: 'ada@example.com', flags: { admin: true } },
// }
```

`merge` mutates and returns `target`. Sources are applied from left to right. Arrays and non-plain objects, such as `Date`, replace the existing value rather than being merged.

## extract

Create a new object by mapping destination paths to source paths.

```ts
const source = {
  profile: {
    fullName: 'Natalia Romanoff',
    email: 'black.widow@example.com',
  },
}

extract(source, {
  'user.name': 'profile.fullName',
  'user.email': 'profile.email',
})
// {
//   user: {
//     name: 'Natalia Romanoff',
//     email: 'black.widow@example.com',
//   },
// }
```

Use an array of source paths to provide fallbacks. The first resolved value is used.

```ts
extract(source, {
  'user.name': ['profile.displayName', 'profile.fullName'],
})
```

Use `[n]` to map over arrays.

```ts
const source = {
  products: [
    { name: 'Keyboard' },
    { name: 'Mouse' },
  ],
}

extract(source, {
  'items[n].title': 'products[n].name',
})
// {
//   items: [
//     { title: 'Keyboard' },
//     { title: 'Mouse' },
//   ],
// }
```

## each

Walk through an object and call a function for each value.

```ts
each(data, (key, value, path) => {
  console.log(key, value, path)
})
```

The callback receives:

- `key`: the current object key or array index
- `value`: the current value
- `path`: the full path to the current value

## map

Walk through an object and build a new result.

```ts
const result = map(data, (key, value, store, path) => {
  if (typeof value === 'string') {
    set(store, path, value.trim())
  }
})
```

The callback receives:

- `key`: the current object key or array index
- `value`: the current value
- `store`: the result object being built
- `path`: the full path to the current value

`map` returns `store`.

## parse and stringify

Parse JSON or accept a ready value, and serialize values with optional error handling.
Exceptions return `undefined`, unless a fallback is provided or `onError` throws.

```ts
import { parse, stringify, type ParseOptions, type StringifyOptions } from 'objwalk'

// Signatures:
// parse(raw: unknown, options?: ParseOptions): unknown
// stringify(value: unknown, options?: StringifyOptions): string | undefined

const value = parse('{"a":1}') // { a: 1 }, typed as unknown
const valueOrNull = parse('{', { fallback: null }) // null
const text = stringify(value, { fallback: 'null', space: 2 })
const object = { a: 1 }
const array = [1, 2]

parse(object) === object // true
parse(array) === array // true

parse('[]') // []
stringify({}) // '{}'
stringify([]) // '[]'
stringify(null) // 'null'
stringify('{}') // '"{}"'
```

Root values can be objects, arrays, strings, numbers, booleans, or `null`;
neither function requires an expected shape or restricts values to objects.
`parse` returns `unknown`; successful parsing does not validate the expected data structure.
Validate the result before using it as a specific type. There is no `parse<T>()` overload.

`parse` accepts `unknown`. Plain objects (with `Object.prototype` or a `null` prototype) and
arrays are returned by reference, without cloning, serialization, mutation, or calling `reviver`.
Other inputs use `JSON.parse(typeof raw === 'string' ? raw : String(raw), reviver)`.
ArrayBuffer, DataView, and typed-array views use this text path; there is no binary decoder.
For example, a Node.js Buffer containing JSON text can be parsed through its native string conversion.
Errors during input recognition or string conversion follow the same `onError`/`fallback` contract.

| Option | `ParseOptions` | `StringifyOptions` |
| --- | --- | --- |
| `fallback` | `unknown`, default `undefined` | `string`, default `undefined` |
| `onError` | `(error: unknown) => void` | `(error: unknown) => void` |
| `reviver` | Native `JSON.parse` callback, only for the text path | — |
| `replacer` | — | Native callback or array of strings/numbers (also accepts `null`) |
| `space` | — | `string` or `number` for native JSON formatting |

Callbacks retain native `this` binding. For example, a reviver can transform or delete properties,
and a replacer can select or transform values:

```ts
parse('{"count":2,"secret":true}', {
  reviver: (key, value) => key === 'secret' ? undefined : value,
}) // { count: 2 }

stringify({ name: 'Ada', secret: true }, { replacer: ['name'], space: 2 })
// '{\n  "name": "Ada"\n}'
```

On an exception, `onError` receives the original error once, then the function returns `fallback`.
The callback's return value is ignored. Exceptions from `reviver`, `replacer`, `toJSON`, or getters
follow the same rule. If `onError` throws, its exception propagates to the caller:

```ts
const requiredText = stringify(value, {
  onError: (error) => {
    throw error
  },
}) // still string | undefined

stringify(1n, { fallback: 'null' }) // 'null' (BigInt throws natively)
stringify(undefined, { fallback: 'null' }) // undefined (no exception)
parse('false', { fallback: true }) // false
parse('null', { fallback: {} }) // null
```

Fallbacks apply only to exceptions: valid `0`, `false`, `''`, and `null` are preserved.
Likewise, a reviver returning `undefined` for the root does not trigger a fallback.
Top-level `undefined`, functions, and symbols serialize to native `undefined` without calling
`onError`. Native handling of these values inside objects/arrays, `NaN`, `Infinity`, and `toJSON`
is preserved. Circular references throw natively and use the same error handling as BigInt.
The wrappers do not mutate inputs, undo callback side effects, log errors, or repair invalid JSON.

## Path syntax

| Syntax | Description |
| --- | --- |
| `user.name` | Read or write a nested property. |
| `items[0].title` | Read or write an array item by index. |
| `user.{name,email}` | Pick several keys from one object. |
| `user.{*}` | List keys from one object. |
| `items[n].title` | Map every item in an array during `extract`. |

## Agent skill

The package includes an [objwalk skill](skills/objwalk/SKILL.md) in `skills/objwalk/`.
After installation, point your agent at `node_modules/objwalk/skills/objwalk/SKILL.md`.
If your agent uses a skill directory, link the entire `skills/objwalk` folder, not just `SKILL.md`.

The skill explains the existing object utilities and JSON helpers, and directs agents to use
them without redundant wrappers that only repeat object checks.

## API

```ts
pick(data, path)
set(data, path, value)
extract(data, mapping)
each(data, callback)
map(data, callback)
merge(target, ...sources)
equally(a, b)
parse(raw, options?) // unknown
stringify(value, options?) // string | undefined
```
