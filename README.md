# objwalk

Work with nested JavaScript data without writing the same traversal code again.
Read and update values by path, reshape API responses, walk objects and arrays,
and see exactly what changed between two states.

- **One path syntax** for nested properties and array indexes.
- **Tools that work together:** pick, set, reshape, walk, copy, merge, and compare.
- **No runtime dependencies**, with TypeScript declarations and ESM/CommonJS builds.

> 🤖 Coding agent? Load the [objwalk skill](https://github.com/khalilov/objwalk/blob/main/skills/objwalk/SKILL.md).
> Need every edge case? Open the [full specification](https://github.com/khalilov/objwalk/blob/main/SPEC.md).

## Install

```bash
npm install objwalk
```

## Usage

Import the tools you need and use paths to reach nested values:

```ts
import { pick, set, flush } from 'objwalk'

const data = {
  user: { name: 'Natalia Romanoff' },
  items: [{ title: 'Keyboard', internalId: 'draft-1' }],
}

pick(data, 'items[0].title') // 'Keyboard'
set(data, 'user.email', 'black.widow@example.com')
flush(data, ['user.name', 'items[0].internalId'])
// data is now:
// {
//   user: { email: 'black.widow@example.com' },
//   items: [{ title: 'Keyboard' }],
// }
```

`set`, `flush`, and `merge` update their target and return it. Use `clone` first
when you need an independent copy of supported data.

## Paths at a glance

| Path | What it does |
| --- | --- |
| `user.name` | Access a nested property |
| `items[0].title` | Access an array item's property |
| `user.{name,email}` | Select several keys with `pick` |
| `user.{*}` | List keys with `pick` |
| `items[n].title` | Map array items with `extract` |

A missing path returns `undefined` with `pick`. Selection and array mapping have
specific uses; see the [path rules](SPEC.md#paths) for the full syntax.

## Reshape an API response

Describe the shape you want instead of assembling it field by field.
Use a list of source paths for fallbacks and `[n]` to map array items:

```ts
import { extract } from 'objwalk'

const response = {
  profile: { fullName: 'Natalia Romanoff' },
  products: [{ name: 'Keyboard' }, { name: 'Mouse' }],
}

const result = extract(response, {
  'user.name': ['profile.displayName', 'profile.fullName'],
  'items[n].title': 'products[n].name',
})
// {
//   user: { name: 'Natalia Romanoff' },
//   items: [{ title: 'Keyboard' }, { title: 'Mouse' }],
// }
```

`extract` builds a new result object. Selected object values keep their references;
use `clone` when you also need to copy those values.

## Compare values and track changes

Compare a whole state, check only the fields that matter, or get a list of changes:

```ts
import { equally, diff } from 'objwalk'

const before = { user: { name: 'Natalia' }, hp: 10, target: 'enemy' }
const after = { user: { name: 'Natalia' }, hp: 8 }

equally(before, after) // false
equally(before, after, ['user.name']) // true

diff(before, after)
// [
//   { type: 'set', path: ['hp'], value: 8 },
//   { type: 'delete', path: ['target'] },
// ]
```

`equally` supports `NaN`, `Date`, `RegExp`, and circular references. `diff` returns
changes without applying them; its paths are arrays of literal keys, and changed
arrays are replaced as a whole. Its inputs must be acyclic.

## Walk objects and arrays

`each` visits nested values and tells you where they live:

```ts
import { each } from 'objwalk'

each({ user: { name: 'Natalia' }, tags: ['ts'] }, (_key, value, path) => {
  if (typeof value === 'string') {
    console.log(path, value)
  }
})
// user.name Natalia
// tags[0] ts
```

Return `false` to stop the entire walk. For more control, `each` also accepts
`root` and `descend` options and provides literal path segments as a fourth
callback argument. [Traversal details](SPEC.md#each).

Use `{ shallow: true }` to visit dictionary entries as whole values:

```ts
import { each } from 'objwalk'

each({ first: { count: 1 }, second: { count: 2 } }, (key, value) => {
  console.log(key, value.count)
}, { shallow: true })
// first 1
// second 2
```

Here, `key` is inferred as `string` and `value` as `{ count: number }`.
Shallow array visits infer a numeric index and the array's element type.

Use `map` to transform values while keeping the object and array structure:

```ts
import { map } from 'objwalk'

const cleaned = map({ name: ' Natalia ', tags: [' ts '] }, (_key, value) =>
  typeof value === 'string' ? value.trim() : value
)
// { name: 'Natalia', tags: ['ts'] }
```

Each callback return becomes the value at that key or index in the new result.
The input is not modified by `map`. Both walkers expect acyclic data unless
traversal options prune the cycles.

When your callback handles each entry as a whole, use a shallow walk:

```ts
import { map } from 'objwalk'

const counts = map(
  { editors: ['Natalia'], readers: ['Ada', 'Grace'] },
  (_key, value) => value.length,
  { shallow: true }
)
// { editors: 1, readers: 2 }
```

Shallow dictionary keys are typed as `string`; shallow array indexes are `number`.
Both `each` and `map` also infer the original value type in shallow mode.
For selective traversal, pass `descend` in the third argument.
[Mapping options](SPEC.md#map).

## Merge defaults or make a copy

Combine nested settings while keeping the original defaults:

```ts
import { clone, merge } from 'objwalk'

const defaults = { theme: { mode: 'light', contrast: 1 }, tags: ['default'] }
const settings = merge(clone(defaults), {
  theme: { mode: 'dark' },
  tags: ['custom'],
})
// { theme: { mode: 'dark', contrast: 1 }, tags: ['custom'] }
```

`merge` combines plain objects and replaces arrays. `clone` copies nested objects
and arrays, including circular references, with support for `Date` and `RegExp`.
See the [copying contract](SPEC.md#clone) for supported types.

## Handle JSON at the boundary

`parse` accepts JSON text or a ready object or array. `stringify` serializes a value.
Use a fallback when an operation fails:

```ts
import { parse, stringify } from 'objwalk'

parse('{"enabled":true}') // { enabled: true }
parse({ enabled: true }) // { enabled: true }, same object
parse('invalid JSON', { fallback: null }) // null
stringify({ enabled: true }) // '{"enabled":true}'
```

Without a fallback, errors return `undefined`. Native `reviver`, `replacer`,
formatting, and an `onError` callback are available through options.
`parse` returns `unknown`; validate the result before using it as a domain type.
[JSON options and error handling](SPEC.md#parse-and-stringify).

## API

| Task | Function |
| --- | --- |
| Read a value or select keys | [`pick(data, path?, options?)`](SPEC.md#pick) |
| Write a value by path | [`set(data, path, value)`](SPEC.md#set) |
| Delete one or several paths | [`flush(data, path)`](SPEC.md#flush) |
| Reshape data with a mapping | [`extract(source, mapping)`](SPEC.md#extract) |
| Visit nested values | [`each(data, callback, options?)`](SPEC.md#each) |
| Transform values while keeping keys | [`map(data, callback, options?)`](SPEC.md#map) |
| Merge plain objects | [`merge(target, ...sources)`](SPEC.md#merge) |
| Copy supported values | [`clone(value)`](SPEC.md#clone) |
| Compare values or selected paths | [`equally(a, b, paths?)`](SPEC.md#equally) |
| Describe changes between values | [`diff(first, last)`](SPEC.md#diff) |
| Parse JSON or accept a ready value | [`parse(raw, options?)`](SPEC.md#parse-and-stringify) |
| Serialize a value as JSON | [`stringify(value, options?)`](SPEC.md#parse-and-stringify) |

For exact types, mutation rules, and edge cases, use the [full specification](SPEC.md).

## Agent skill

The package includes an [objwalk skill](skills/objwalk/SKILL.md). Point your agent at
`node_modules/objwalk/skills/objwalk/SKILL.md`, or link the entire `skills/objwalk`
folder into its skill directory.
