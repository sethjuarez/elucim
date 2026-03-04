// Safe math expression evaluator — NO eval(), NO Function()
// Tokenizer + recursive descent parser for expressions like "sin(x) * cos(x/2)"

// ─── Tokens ─────────────────────────────────────────────────────────────────

type TokenType =
  | 'NUMBER' | 'IDENT' | 'PLUS' | 'MINUS' | 'STAR' | 'SLASH'
  | 'CARET' | 'LPAREN' | 'RPAREN' | 'LBRACKET' | 'RBRACKET'
  | 'COMMA' | 'EOF';

interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

// ─── Built-in functions and constants ───────────────────────────────────────

const FUNCTIONS: Record<string, (...args: number[]) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  atan2: (y, x) => Math.atan2(y, x),
  sqrt: Math.sqrt,
  abs: Math.abs,
  log: Math.log10,
  ln: Math.log,
  exp: Math.exp,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  min: (...args) => Math.min(...args),
  max: (...args) => Math.max(...args),
  sign: Math.sign,
  pow: Math.pow,
};

const CONSTANTS: Record<string, number> = {
  PI: Math.PI,
  E: Math.E,
  TAU: Math.PI * 2,
};

// ─── Tokenizer ──────────────────────────────────────────────────────────────

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const ch = input[i];

    // Whitespace
    if (/\s/.test(ch)) { i++; continue; }

    // Numbers (including decimals like .5 and 3.14)
    if (/[0-9]/.test(ch) || (ch === '.' && i + 1 < input.length && /[0-9]/.test(input[i + 1]))) {
      let num = '';
      const start = i;
      while (i < input.length && /[0-9.]/.test(input[i])) {
        num += input[i++];
      }
      tokens.push({ type: 'NUMBER', value: num, pos: start });
      continue;
    }

    // Identifiers (function names, variables, constants)
    if (/[a-zA-Z_]/.test(ch)) {
      let id = '';
      const start = i;
      while (i < input.length && /[a-zA-Z0-9_]/.test(input[i])) {
        id += input[i++];
      }
      tokens.push({ type: 'IDENT', value: id, pos: start });
      continue;
    }

    // Single-character tokens
    const start = i;
    i++;
    switch (ch) {
      case '+': tokens.push({ type: 'PLUS', value: '+', pos: start }); break;
      case '-': tokens.push({ type: 'MINUS', value: '-', pos: start }); break;
      case '*': tokens.push({ type: 'STAR', value: '*', pos: start }); break;
      case '/': tokens.push({ type: 'SLASH', value: '/', pos: start }); break;
      case '^': tokens.push({ type: 'CARET', value: '^', pos: start }); break;
      case '(': tokens.push({ type: 'LPAREN', value: '(', pos: start }); break;
      case ')': tokens.push({ type: 'RPAREN', value: ')', pos: start }); break;
      case '[': tokens.push({ type: 'LBRACKET', value: '[', pos: start }); break;
      case ']': tokens.push({ type: 'RBRACKET', value: ']', pos: start }); break;
      case ',': tokens.push({ type: 'COMMA', value: ',', pos: start }); break;
      default:
        throw new ExpressionError(`Unexpected character '${ch}'`, start);
    }
  }

  tokens.push({ type: 'EOF', value: '', pos: i });
  return tokens;
}

// ─── AST Nodes ──────────────────────────────────────────────────────────────

type ASTNode =
  | { kind: 'number'; value: number }
  | { kind: 'variable'; name: string }
  | { kind: 'unary'; op: '+' | '-'; operand: ASTNode }
  | { kind: 'binary'; op: '+' | '-' | '*' | '/' | '^'; left: ASTNode; right: ASTNode }
  | { kind: 'call'; name: string; args: ASTNode[] }
  | { kind: 'array'; elements: ASTNode[] };

// ─── Parser (Recursive Descent) ────────────────────────────────────────────

class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token {
    return this.tokens[this.pos];
  }

  private advance(): Token {
    const t = this.tokens[this.pos];
    this.pos++;
    return t;
  }

  private expect(type: TokenType): Token {
    const t = this.peek();
    if (t.type !== type) {
      throw new ExpressionError(
        `Expected ${type} but got ${t.type} ('${t.value}')`,
        t.pos
      );
    }
    return this.advance();
  }

  // Entry point
  parse(): ASTNode {
    const node = this.parseExpression();
    if (this.peek().type !== 'EOF') {
      const t = this.peek();
      throw new ExpressionError(
        `Unexpected token '${t.value}' after expression`,
        t.pos
      );
    }
    return node;
  }

  // expression = term (('+' | '-') term)*
  private parseExpression(): ASTNode {
    let left = this.parseTerm();
    while (this.peek().type === 'PLUS' || this.peek().type === 'MINUS') {
      const op = this.advance().value as '+' | '-';
      const right = this.parseTerm();
      left = { kind: 'binary', op, left, right };
    }
    return left;
  }

  // term = power (('*' | '/') power)*
  private parseTerm(): ASTNode {
    let left = this.parsePower();
    while (this.peek().type === 'STAR' || this.peek().type === 'SLASH') {
      const op = this.advance().value as '*' | '/';
      const right = this.parsePower();
      left = { kind: 'binary', op, left, right };
    }
    return left;
  }

  // power = unary ('^' power)?  (right-associative)
  private parsePower(): ASTNode {
    const base = this.parseUnary();
    if (this.peek().type === 'CARET') {
      this.advance();
      const exp = this.parsePower(); // right-associative
      return { kind: 'binary', op: '^', left: base, right: exp };
    }
    return base;
  }

  // unary = ('+' | '-') unary | primary
  private parseUnary(): ASTNode {
    if (this.peek().type === 'MINUS') {
      this.advance();
      const operand = this.parseUnary();
      return { kind: 'unary', op: '-', operand };
    }
    if (this.peek().type === 'PLUS') {
      this.advance();
      return this.parseUnary();
    }
    return this.parsePrimary();
  }

  // primary = NUMBER | IDENT ('(' args ')')? | '(' expression ')' | '[' elements ']'
  private parsePrimary(): ASTNode {
    const t = this.peek();

    // Number literal
    if (t.type === 'NUMBER') {
      this.advance();
      return { kind: 'number', value: parseFloat(t.value) };
    }

    // Identifier (variable, constant, or function call)
    if (t.type === 'IDENT') {
      this.advance();
      const name = t.value;

      // Function call
      if (this.peek().type === 'LPAREN') {
        this.advance(); // consume '('
        const args: ASTNode[] = [];
        if (this.peek().type !== 'RPAREN') {
          args.push(this.parseExpression());
          while (this.peek().type === 'COMMA') {
            this.advance();
            args.push(this.parseExpression());
          }
        }
        this.expect('RPAREN');

        // Validate function name
        if (!Object.prototype.hasOwnProperty.call(FUNCTIONS, name)) {
          throw new ExpressionError(
            `Unknown function '${name}'. Available: ${Object.keys(FUNCTIONS).join(', ')}`,
            t.pos
          );
        }
        return { kind: 'call', name, args };
      }

      // Constant
      if (Object.prototype.hasOwnProperty.call(CONSTANTS, name)) {
        return { kind: 'number', value: CONSTANTS[name] };
      }

      // Variable
      return { kind: 'variable', name };
    }

    // Parenthesized expression
    if (t.type === 'LPAREN') {
      this.advance();
      const expr = this.parseExpression();
      this.expect('RPAREN');
      return expr;
    }

    // Array literal [expr, expr]
    if (t.type === 'LBRACKET') {
      this.advance();
      const elements: ASTNode[] = [];
      if (this.peek().type !== 'RBRACKET') {
        elements.push(this.parseExpression());
        while (this.peek().type === 'COMMA') {
          this.advance();
          elements.push(this.parseExpression());
        }
      }
      this.expect('RBRACKET');
      return { kind: 'array', elements };
    }

    throw new ExpressionError(
      `Unexpected token '${t.value}'`,
      t.pos
    );
  }
}

// ─── Evaluator ──────────────────────────────────────────────────────────────

function evaluate(node: ASTNode, vars: Record<string, number>): number | number[] {
  switch (node.kind) {
    case 'number':
      return node.value;

    case 'variable':
      if (Object.prototype.hasOwnProperty.call(vars, node.name)) return vars[node.name];
      throw new ExpressionError(`Unknown variable '${node.name}'`, 0);

    case 'unary':
      const operand = evaluate(node.operand, vars) as number;
      return node.op === '-' ? -operand : operand;

    case 'binary': {
      const left = evaluate(node.left, vars) as number;
      const right = evaluate(node.right, vars) as number;
      switch (node.op) {
        case '+': return left + right;
        case '-': return left - right;
        case '*': return left * right;
        case '/': return right === 0 ? Infinity : left / right;
        case '^': return Math.pow(left, right);
      }
      break;
    }

    case 'call': {
      const fn = FUNCTIONS[node.name];
      const args = node.args.map(a => evaluate(a, vars) as number);
      return fn(...args);
    }

    case 'array':
      return node.elements.map(e => evaluate(e, vars) as number);
  }

  throw new ExpressionError('Invalid AST node', 0);
}

// ─── Error Class ────────────────────────────────────────────────────────────

export class ExpressionError extends Error {
  position: number;
  constructor(message: string, position: number) {
    super(message);
    this.name = 'ExpressionError';
    this.position = position;
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Compile a math expression string into a callable function.
 * Returns a function that accepts variable values and returns a number.
 *
 * @example
 * const fn = compileExpression('sin(x) * 2');
 * fn({ x: Math.PI / 2 }); // → 2
 */
export function compileExpression(
  expr: string
): (vars: Record<string, number>) => number {
  const tokens = tokenize(expr);
  const ast = new Parser(tokens).parse();
  return (vars: Record<string, number>) => evaluate(ast, vars) as number;
}

/**
 * Compile a vector expression string (returns [number, number]).
 * Used for VectorField fn props.
 *
 * @example
 * const fn = compileVectorExpression('[-y, x]');
 * fn({ x: 1, y: 2 }); // → [-2, 1]
 */
export function compileVectorExpression(
  expr: string
): (vars: Record<string, number>) => [number, number] {
  const tokens = tokenize(expr);
  const ast = new Parser(tokens).parse();

  if (ast.kind !== 'array' || ast.elements.length !== 2) {
    throw new ExpressionError(
      'Vector expression must be an array of 2 elements, e.g. "[-y, x]"',
      0
    );
  }

  return (vars: Record<string, number>) => {
    const result = evaluate(ast, vars);
    return result as [number, number];
  };
}

/**
 * Validate an expression string without evaluating it.
 * Returns null if valid, or an error message string.
 */
export function validateExpression(expr: string): string | null {
  try {
    const tokens = tokenize(expr);
    new Parser(tokens).parse();
    return null;
  } catch (e) {
    if (e instanceof ExpressionError) {
      return `${e.message} (at position ${e.position})`;
    }
    return String(e);
  }
}
