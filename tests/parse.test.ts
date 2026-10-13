import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import { parse, type ParseOptions } from '../src'

describe('parse', () => {
  it.each([
    Object.freeze({ a: Object.freeze([1, 2]) }),
    Object.freeze(Object.assign(Object.create(null), { a: 1 })),
    Object.freeze([1, Object.freeze({ a: 2 })]),
  ])('returns ready objects and arrays by identity without calling reviver', (raw) => {
    const reviver = vi.fn(() => {
      throw new Error('reviver must not run')
    })
    const onError = vi.fn()

    expect(parse(raw)).toBe(raw)
    expect(parse(raw, { reviver, fallback: 'reserve', onError })).toBe(raw)
    expect(reviver).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
  })

  it('does not read properties or serialize ready objects', () => {
    const fail = vi.fn(() => {
      throw new Error('ready object must not be traversed')
    })
    const raw = Object.freeze(Object.defineProperty({ toString: fail, toJSON: fail }, 'value', {
      get: fail,
      enumerable: true,
    }))

    expect(parse(raw)).toBe(raw)
    expect(fail).not.toHaveBeenCalled()
  })

  it.each([0, 42, false, true, null])('parses primitive input %j through native string conversion', (raw) => {
    const onError = vi.fn()

    expect(parse(raw, { fallback: 'reserve', onError })).toBe(raw)
    expect(onError).not.toHaveBeenCalled()
  })

  it.each([
    new ArrayBuffer(0),
    new DataView(new ArrayBuffer(0)),
    new Uint8Array([1, 2]),
    new Int16Array([1, 2]),
  ])('handles invalid binary string conversions using fallback', (raw) => {
    const onError = vi.fn()

    expect(parse(raw)).toBeUndefined()
    expect(parse(raw, { fallback: false, onError })).toBe(false)
    expect(onError).toHaveBeenCalledExactlyOnceWith(expect.any(SyntaxError))
  })

  it.each([
    new ArrayBuffer(0),
    new DataView(new ArrayBuffer(0)),
    new Uint8Array([1, 2]),
  ])('uses binary input string conversion instead of returning its identity', (raw) => {
    const toString = vi.fn(() => '{"a":1}')
    const reviver = vi.fn((key: string, value: unknown) => key === 'a' ? 2 : value)

    Object.defineProperty(raw, 'toString', { value: toString })

    expect(parse(raw, { reviver })).toEqual({ a: 2 })
    expect(toString).toHaveBeenCalledOnce()
    expect(reviver).toHaveBeenCalledTimes(2)
  })

  it('preserves native typed-array text conversion', () => {
    expect(parse(new Uint8Array([7]))).toBe(7)
  })

  it('handles string conversion errors and propagates errors from onError', () => {
    const error = new Error('conversion failed')
    const handlerError = new Error('handler failed')
    const raw: unknown = Object.create({
      toString: () => {
        throw error
      },
    })
    const onError = vi.fn<(error: unknown) => string>(() => 'ignored')
    const rethrow = vi.fn((error: unknown) => {
      throw error
    })
    const fail = vi.fn(() => {
      throw handlerError
    })

    expect(parse(raw)).toBeUndefined()
    expect(parse(raw, { fallback: null, onError })).toBeNull()
    expect(onError).toHaveBeenCalledExactlyOnceWith(error)
    expect(onError.mock.calls[0][0]).toBe(error)
    expect(() => parse(raw, { onError: rethrow })).toThrow(error)
    expect(rethrow).toHaveBeenCalledExactlyOnceWith(error)
    expect(() => parse(raw, { onError: fail })).toThrow(handlerError)
    expect(fail).toHaveBeenCalledExactlyOnceWith(error)
  })

  it('handles input recognition errors through the same error contract', () => {
    const error = new Error('prototype lookup failed')
    const raw = new Proxy({}, {
      getPrototypeOf: () => {
        throw error
      },
    })
    const onError = vi.fn<(error: unknown) => void>()
    const { proxy, revoke } = Proxy.revocable([], {})
    const revokedError = vi.fn()

    revoke()

    expect(parse(raw)).toBeUndefined()
    expect(parse(raw, { fallback: 0, onError })).toBe(0)
    expect(onError).toHaveBeenCalledExactlyOnceWith(error)
    expect(onError.mock.calls[0][0]).toBe(error)
    expect(parse(proxy, { fallback: false, onError: revokedError })).toBe(false)
    expect(revokedError).toHaveBeenCalledExactlyOnceWith(expect.any(TypeError))
  })

  it.each([
    ['{"a":1}', { a: 1 }],
    ['{}', {}],
    ['[]', []],
    ['[1,2]', [1, 2]],
    ['[1,[2,{"a":3}]]', [1, [2, { a: 3 }]]],
    ['"text"', 'text'],
    ['42', 42],
    ['true', true],
    ['false', false],
    ['0', 0],
    ['""', ''],
    ['null', null],
  ])('preserves the native result for %s despite a fallback', (text, expected) => {
    const onError = vi.fn()

    expect(parse(text)).toStrictEqual(JSON.parse(text))
    expect(parse(text, { fallback: 'reserve', onError })).toEqual(expected)
    expect(onError).not.toHaveBeenCalled()
  })

  it.each(['{', '', '   '])('handles invalid input %j', (text) => {
    const onError = vi.fn(() => 'ignored')
    const fallback = { reserved: true }

    expect(parse(text)).toBeUndefined()
    expect(parse(text, { fallback, onError })).toBe(fallback)
    expect(onError).toHaveBeenCalledExactlyOnceWith(expect.any(SyntaxError))
  })

  it.each([null, false, 0, '', undefined])('returns the exact fallback %j on an exception', (fallback) => {
    expect(parse('{', { fallback })).toBe(fallback)
  })

  it('ignores the return value of onError without a fallback', () => {
    const onError = vi.fn(() => 'ignored')

    expect(parse('{', { onError })).toBeUndefined()
    expect(onError).toHaveBeenCalledOnce()
  })

  it('passes reviver errors unchanged to onError once', () => {
    const error = new Error('reviver failed')
    const onError = vi.fn<(error: unknown) => void>()
    const reviver = () => {
      throw error
    }

    expect(parse('{"a":1}', { reviver })).toBeUndefined()
    expect(parse('{"a":1}', { reviver, fallback: false, onError })).toBe(false)
    expect(onError).toHaveBeenCalledExactlyOnceWith(error)
    expect(onError.mock.calls[0][0]).toBe(error)
  })

  it('propagates exceptions from onError without handling them again', () => {
    const error = new Error('handler failed')
    const onError = vi.fn(() => {
      throw error
    })

    expect(() => parse('{', { fallback: null, onError })).toThrow(error)
    expect(onError).toHaveBeenCalledExactlyOnceWith(expect.any(SyntaxError))
  })

  it('allows onError to rethrow the original value', () => {
    const error = { reason: 'reviver failed' }
    const onError = vi.fn((error: unknown) => {
      throw error
    })
    const reviver = () => {
      throw error
    }

    expect(() => parse('1', { reviver, onError })).toThrow(error)
    expect(onError).toHaveBeenCalledExactlyOnceWith(error)
  })

  it('preserves reviver transformations, deletion, and holder binding', () => {
    const holders: unknown[] = []
    const result = parse('{"count":2,"secret":true}', {
      reviver: function (key, value) {
        holders.push(this)

        if (key === 'secret') {
          return undefined
        }

        return typeof value === 'number' ? value * 2 : value
      },
    })

    expect(result).toEqual({ count: 4 })
    expect(holders[0]).toBe(result)
    expect(holders[1]).toBe(result)
    expect(holders[2]).toEqual({ '': result })
  })

  it('preserves a root reviver result of undefined without error handling', () => {
    const onError = vi.fn()

    expect(parse('1', { reviver: () => undefined, fallback: 'reserve', onError })).toBeUndefined()
    expect(onError).not.toHaveBeenCalled()
  })

  it('exports the agreed non-generic signature', () => {
    expectTypeOf(parse).parameters.toEqualTypeOf<[raw: unknown, options?: ParseOptions]>()
    expectTypeOf(parse).returns.toEqualTypeOf<unknown>()
    expectTypeOf<ParseOptions['reviver']>().toEqualTypeOf<Parameters<typeof JSON.parse>[1]>()
    expectTypeOf<{ onError: string }>().not.toMatchTypeOf<ParseOptions>()
    expectTypeOf<{ reviver: boolean }>().not.toMatchTypeOf<ParseOptions>()
    expectTypeOf<'type'>().not.toMatchTypeOf<keyof ParseOptions>()
  })
})
