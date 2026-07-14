# objwalk

Small utilities for reading, writing, walking, and reshaping nested JavaScript objects.

`objwalk` is built around a compact path syntax, so the same mental model works for picking values, setting values, extracting a new object shape, and walking through nested data.

## Install

```bash
npm install objwalk
```

## Usage

```ts
import { each, extract, map, merge, pick, set } from 'objwalk'
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
merge(target, ...sources)
```
