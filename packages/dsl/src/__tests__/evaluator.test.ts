import { describe, it, expect } from 'vitest';
import { compileExpression, compileVectorExpression, validateExpression, ExpressionError } from '../math/evaluator';

describe('Math Expression Evaluator', () => {
  describe('arithmetic', () => {
    it('evaluates addition', () => {
      const fn = compileExpression('2 + 3');
      expect(fn({})).toBe(5);
    });

    it('evaluates subtraction', () => {
      const fn = compileExpression('10 - 4');
      expect(fn({})).toBe(6);
    });

    it('evaluates multiplication', () => {
      const fn = compileExpression('3 * 7');
      expect(fn({})).toBe(21);
    });

    it('evaluates division', () => {
      const fn = compileExpression('15 / 3');
      expect(fn({})).toBe(5);
    });

    it('evaluates exponentiation', () => {
      const fn = compileExpression('2 ^ 10');
      expect(fn({})).toBe(1024);
    });

    it('respects operator precedence', () => {
      const fn = compileExpression('2 + 3 * 4');
      expect(fn({})).toBe(14);
    });

    it('respects parentheses', () => {
      const fn = compileExpression('(2 + 3) * 4');
      expect(fn({})).toBe(20);
    });

    it('handles unary minus', () => {
      const fn = compileExpression('-5');
      expect(fn({})).toBe(-5);
    });

    it('handles nested unary minus', () => {
      const fn = compileExpression('--5');
      expect(fn({})).toBe(5);
    });

    it('handles decimal numbers', () => {
      const fn = compileExpression('3.14 * 2');
      expect(fn({})).toBeCloseTo(6.28);
    });

    it('handles division by zero', () => {
      const fn = compileExpression('1 / 0');
      expect(fn({})).toBe(Infinity);
    });
  });

  describe('variables', () => {
    it('evaluates single variable', () => {
      const fn = compileExpression('x');
      expect(fn({ x: 42 })).toBe(42);
    });

    it('evaluates expression with x', () => {
      const fn = compileExpression('x ^ 2 - 1');
      expect(fn({ x: 3 })).toBe(8);
    });

    it('evaluates expression with x and y', () => {
      const fn = compileExpression('x + y');
      expect(fn({ x: 3, y: 7 })).toBe(10);
    });

    it('throws for unknown variable', () => {
      const fn = compileExpression('z');
      expect(() => fn({})).toThrow("Unknown variable 'z'");
    });
  });

  describe('functions', () => {
    it('evaluates sin', () => {
      const fn = compileExpression('sin(0)');
      expect(fn({})).toBeCloseTo(0);
    });

    it('evaluates cos', () => {
      const fn = compileExpression('cos(0)');
      expect(fn({})).toBeCloseTo(1);
    });

    it('evaluates sqrt', () => {
      const fn = compileExpression('sqrt(16)');
      expect(fn({})).toBe(4);
    });

    it('evaluates abs', () => {
      const fn = compileExpression('abs(-5)');
      expect(fn({})).toBe(5);
    });

    it('evaluates exp', () => {
      const fn = compileExpression('exp(0)');
      expect(fn({})).toBe(1);
    });

    it('evaluates log (base 10)', () => {
      const fn = compileExpression('log(100)');
      expect(fn({})).toBeCloseTo(2);
    });

    it('evaluates ln (natural log)', () => {
      const fn = compileExpression('ln(1)');
      expect(fn({})).toBeCloseTo(0);
    });

    it('evaluates min with multiple args', () => {
      const fn = compileExpression('min(3, 1, 5)');
      expect(fn({})).toBe(1);
    });

    it('evaluates max with multiple args', () => {
      const fn = compileExpression('max(3, 1, 5)');
      expect(fn({})).toBe(5);
    });

    it('evaluates nested functions', () => {
      const fn = compileExpression('sin(cos(0))');
      expect(fn({})).toBeCloseTo(Math.sin(1));
    });

    it('evaluates atan2', () => {
      const fn = compileExpression('atan2(1, 0)');
      expect(fn({})).toBeCloseTo(Math.PI / 2);
    });

    it('evaluates floor', () => {
      const fn = compileExpression('floor(3.7)');
      expect(fn({})).toBe(3);
    });

    it('evaluates ceil', () => {
      const fn = compileExpression('ceil(3.2)');
      expect(fn({})).toBe(4);
    });

    it('throws for unknown function', () => {
      expect(() => compileExpression('foobar(x)')).toThrow("Unknown function 'foobar'");
    });
  });

  describe('constants', () => {
    it('evaluates PI', () => {
      const fn = compileExpression('PI');
      expect(fn({})).toBeCloseTo(Math.PI);
    });

    it('evaluates E', () => {
      const fn = compileExpression('E');
      expect(fn({})).toBeCloseTo(Math.E);
    });

    it('evaluates TAU', () => {
      const fn = compileExpression('TAU');
      expect(fn({})).toBeCloseTo(Math.PI * 2);
    });
  });

  describe('compound expressions', () => {
    it('evaluates sin(x) * cos(x/2)', () => {
      const fn = compileExpression('sin(x) * cos(x / 2)');
      expect(fn({ x: Math.PI })).toBeCloseTo(0);
    });

    it('evaluates exp(-x^2/2) (Gaussian)', () => {
      // Note: unary minus binds before ^, so use parens for -(x^2)
      const fn = compileExpression('exp(-(x^2) / 2)');
      expect(fn({ x: 0 })).toBeCloseTo(1);
      expect(fn({ x: 1 })).toBeCloseTo(Math.exp(-0.5));
    });

    it('evaluates x^2 - 1 (polynomial)', () => {
      const fn = compileExpression('x ^ 2 - 1');
      expect(fn({ x: 0 })).toBe(-1);
      expect(fn({ x: 1 })).toBe(0);
      expect(fn({ x: 2 })).toBe(3);
    });

    it('evaluates 1/x', () => {
      const fn = compileExpression('1 / x');
      expect(fn({ x: 2 })).toBe(0.5);
    });
  });

  describe('vector expressions', () => {
    it('evaluates [-y, x]', () => {
      const fn = compileVectorExpression('[-y, x]');
      expect(fn({ x: 1, y: 2 })).toEqual([-2, 1]);
    });

    it('evaluates [x, -y]', () => {
      const fn = compileVectorExpression('[x, -y]');
      expect(fn({ x: 3, y: 4 })).toEqual([3, -4]);
    });

    it('evaluates [sin(y), cos(x)]', () => {
      const fn = compileVectorExpression('[sin(y), cos(x)]');
      const result = fn({ x: 0, y: Math.PI / 2 });
      expect(result[0]).toBeCloseTo(1);
      expect(result[1]).toBeCloseTo(1);
    });

    it('throws for non-array expression', () => {
      expect(() => compileVectorExpression('x + y')).toThrow('Vector expression must be an array of 2 elements');
    });

    it('throws for wrong array length', () => {
      expect(() => compileVectorExpression('[x, y, 0]')).toThrow('Vector expression must be an array of 2 elements');
    });
  });

  describe('validation', () => {
    it('returns null for valid expression', () => {
      expect(validateExpression('sin(x) + 1')).toBeNull();
    });

    it('returns error for unmatched parenthesis', () => {
      const err = validateExpression('sin(x');
      expect(err).toContain('Expected RPAREN');
    });

    it('returns error for unknown character', () => {
      const err = validateExpression('x @ y');
      expect(err).toContain("Unexpected character '@'");
    });

    it('returns error for trailing tokens', () => {
      const err = validateExpression('x y');
      expect(err).toContain('Unexpected token');
    });
  });

  describe('security', () => {
    it('cannot access global objects', () => {
      expect(() => compileExpression('window')).not.toThrow();
      const fn = compileExpression('window');
      expect(() => fn({})).toThrow("Unknown variable 'window'");
    });

    it('cannot call eval', () => {
      // Tokenizer rejects string literals (quotes), so eval("...") fails at tokenization
      expect(() => compileExpression('eval("1+1")')).toThrow();
    });

    it('cannot call constructor', () => {
      expect(() => compileExpression('constructor()')).toThrow("Unknown function 'constructor'");
    });

    it('cannot access __proto__', () => {
      const fn = compileExpression('__proto__');
      expect(() => fn({})).toThrow("Unknown variable '__proto__'");
    });
  });
});
