# objwalk

Small utilities for reading, writing, walking, and reshaping nested JavaScript objects.

`objwalk` is built around a compact path syntax, so the same mental model works for picking values, setting values, extracting a new object shape, and walking through nested data.

## Install

```bash
npm install objwalk
```

## Usage

```ts
import { each, extract, map, pick, set } from 'objwalk'
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
// 'Ada'
```

Pick several keys from the same nested object.

```ts
pick(data, 'user.{name,email}')
// { name: 'Ada', email: 'ada@example.com' }
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

## set

Set a value inside an object by path.

```ts
const data = {}

set(data, 'user.name', 'Ada')
// { user: { name: 'Ada' } }
```

Set values inside arrays with an explicit index.

```ts
const data = {}

set(data, 'items[0].title', 'First')
// { items: [{ title: 'First' }] }
```

`set` mutates the object passed to it and returns the same object.

## extract

Create a new object by mapping destination paths to source paths.

```ts
const source = {
  profile: {
    fullName: 'Ada Lovelace',
    email: 'ada@example.com',
  },
}

extract(source, {
  'user.name': 'profile.fullName',
  'user.email': 'profile.email',
})
// {
//   user: {
//     name: 'Ada Lovelace',
//     email: 'ada@example.com',
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

## Path syntax

| Syntax | Description |
| --- | --- |
| `user.name` | Read or write a nested property. |
| `items[0].title` | Read or write an array item by index. |
| `user.{name,email}` | Pick several keys from one object. |
| `user.{*}` | List keys from one object. |
| `items[n].title` | Map every item in an array during `extract`. |

## API

```ts
pick(data, path)
set(data, path, value)
extract(data, mapping)
each(data, callback)
map(data, callback)
```

## Status

Early work in progress. The public API is intentionally small and may still change before the first stable release.
