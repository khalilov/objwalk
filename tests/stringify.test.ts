import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import { parse, stringify, type StringifyOptions } from '../src'

describe('stringify', () => {
  it.each([
    [{ a: 1 }, '{"a":1}'],
    [{}, '{}'],
    [[], '[]'],
    [[1, { a: [2] }], '[1,{"a":[2]}]'],
    [null, 'null'],
    [false, 'false'],
    [true, 'true'],
    [0, '0'],
    [42, '42'],
    ['', '""'],
    ['{}', '"{}"'],
    ['a"\n\\b', '"a\\"\\n\\\\b"'],
  ])('matches native serialization and round trips %j', (value, expected) => {
    const onError = vi.fn()
    const text = stringify(value)

    expect(text).toBe(expected)
    expect(text).toBe(JSON.stringify(value))
    expect(stringify(value, { fallback: 'reserve', onError })).toBe(expected)
    expect(onError).not.toHaveBeenCalled()

    if (typeof text === 'string') {
      expect(parse(text)).toStrictEqual(value)
    }
  })

  it('handles circular references and BigInt without modifying the input', () => {
    const circular: Record<string, unknown> = { name: 'cycle' }
    const onError = vi.fn(() => 'ignored')

    circular.self = circular

    for (const value of [circular, 1n]) {
      onError.mockClear()

      expect(stringify(value)).toBeUndefined()
      expect(stringify(value, { fallback: 'null', onError })).toBe('null')
      expect(onError).toHaveBeenCalledExactlyOnceWith(expect.any(TypeError))
      expect(stringify(value, { fallback: '' })).toBe('')
    }

    expect(circular.self).toBe(circular)
    expect(circular.name).toBe('cycle')
  })

  it.each([undefined, () => 1, Symbol('value')])('keeps native undefined without fallback or onError', (value) => {
    const onError = vi.fn()

    expect(stringify(value, { fallback: 'null', onError })).toBeUndefined()
    expect(onError).not.toHaveBeenCalled()
  })

  it('preserves native omission and null replacement rules', () => {
    const values = [undefined, () => 1, Symbol('value'), NaN, Infinity, -Infinity]
    const object = {
      missing: values[0],
      callback: values[1],
      symbol: values[2],
      nan: NaN,
      infinity: Infinity,
      negativeInfinity: -Infinity,
    }

    expect(stringify(values)).toBe('[null,null,null,null,null,null]')
    expect(stringify(object)).toBe('{"nan":null,"infinity":null,"negativeInfinity":null}')
    expect(stringify(NaN)).toBe('null')
    expect(stringify(Infinity)).toBe('null')
  })

  it('preserves replacer transformations, omission, and holder binding', () => {
    const source = Object.freeze({ count: 2, secret: true })
    const holders: unknown[] = []
    const result = stringify(source, {
      replacer: function (key, value) {
        holders.push(this)

        if (key === 'secret') {
          return undefined
        }

        return typeof value === 'number' ? value * 2 : value
      },
    })

    expect(result).toBe('{"count":4}')
    expect(holders[0]).toEqual({ '': source })
    expect(holders[1]).toBe(source)
    expect(holders[2]).toBe(source)
    expect(source).toEqual({ count: 2, secret: true })
  })

  it('preserves a root replacer result of undefined without error handling', () => {
    const onError = vi.fn()

    expect(stringify(1, { replacer: () => undefined, fallback: 'null', onError })).toBeUndefined()
    expect(onError).not.toHaveBeenCalled()
  })

  it('supports replacer arrays and native numeric or string formatting', () => {
    const source = { name: 'Ada', 1: true, secret: false }

    expect(stringify(source, { replacer: ['name', 1] })).toBe('{"name":"Ada","1":true}')
    expect(stringify(source, { replacer: ['name'], space: 2 })).toBe('{\n  "name": "Ada"\n}')
    expect(stringify({ a: 1 }, { space: '\t' })).toBe('{\n\t"a": 1\n}')
    expect(stringify({ a: 1 }, { replacer: null })).toBe('{"a":1}')
  })

  it('preserves native toJSON binding and callback side effects', () => {
    const source = {
      count: 0,
      toJSON(key: string) {
        this.count += 1

        return { key, count: this.count }
      },
    }

    expect(stringify(source)).toBe('{"key":"","count":1}')
    expect(source.count).toBe(1)
    expect(stringify(new Date('2026-01-01T00:00:00.000Z'))).toBe('"2026-01-01T00:00:00.000Z"')
  })

  it('handles replacer, toJSON, and getter exceptions without undoing side effects', () => {
    const error = { reason: 'callback failed' }
    const onError = vi.fn<(error: unknown) => string>(() => 'ignored')
    const effects: string[] = []
    const fail = () => {
      effects.push('called')

      throw error
    }
    const cases: [unknown, StringifyOptions][] = [
      [{ a: 1 }, { replacer: fail }],
      [{ toJSON: fail }, {}],
      [{
        get value() {
          return fail()
        },
      }, {}],
    ]

    for (const [value, options] of cases) {
      onError.mockClear()

      expect(stringify(value, options)).toBeUndefined()
      expect(stringify(value, { ...options, fallback: '', onError })).toBe('')
      expect(onError).toHaveBeenCalledExactlyOnceWith(error)
      expect(onError.mock.calls[0][0]).toBe(error)
    }

    expect(effects).toHaveLength(6)
  })

  it('ignores the return value of onError without a fallback', () => {
    const onError = vi.fn(() => 'ignored')

    expect(stringify(1n, { onError })).toBeUndefined()
    expect(onError).toHaveBeenCalledOnce()
  })

  it('propagates exceptions from onError without handling them again', () => {
    const error = new Error('handler failed')
    const onError = vi.fn(() => {
      throw error
    })

    expect(() => stringify(1n, { fallback: 'null', onError })).toThrow(error)
    expect(onError).toHaveBeenCalledExactlyOnceWith(expect.any(TypeError))
  })

  it('allows onError to rethrow the original value', () => {
    const error = { reason: 'replacer failed' }
    const replacer = () => {
      throw error
    }
    const onError = vi.fn((error: unknown) => {
      throw error
    })

    expect(() => stringify(1, { replacer, onError })).toThrow(error)
    expect(onError).toHaveBeenCalledExactlyOnceWith(error)
  })

  it('exports the agreed signature without promising a string for fallback or onError', () => {
    expectTypeOf(stringify).parameters.toEqualTypeOf<[value: unknown, options?: StringifyOptions]>()
    expectTypeOf(stringify).returns.toEqualTypeOf<string | undefined>()
    expectTypeOf(stringify(undefined, { fallback: 'null' })).toEqualTypeOf<string | undefined>()
    expectTypeOf<StringifyOptions['fallback']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<{ fallback: number }>().not.toMatchTypeOf<StringifyOptions>()
    expectTypeOf<{ onError: string }>().not.toMatchTypeOf<StringifyOptions>()
    expectTypeOf<{ replacer: boolean[] }>().not.toMatchTypeOf<StringifyOptions>()
    expectTypeOf<{ space: boolean }>().not.toMatchTypeOf<StringifyOptions>()
    expectTypeOf<'type'>().not.toMatchTypeOf<keyof StringifyOptions>()
  })
})
