// math-parser.js - Recursive descent parser: math expressions → GLSL/JS code

class MathParser {
    constructor() {
        this.FUNCTIONS = new Set([
            'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2',
            'exp', 'log', 'ln', 'sqrt', 'abs', 'sign', 'floor', 'ceil',
            'min', 'max', 'pow', 'sinh', 'cosh', 'tanh', 'mod', 'fract'
        ]);
        this.CONSTANTS = { 'pi': 'PI', 'PI': 'PI', 'e': 'E', 'E': 'E' };
        this.VARIABLES = new Set(['x', 'y', 't']);
        this.detectedParams = new Map();
    }

    tokenize(input) {
        const tokens = [];
        let i = 0;
        while (i < input.length) {
            if (input[i] === ' ' || input[i] === '\t') { i++; continue; }

            // Numbers
            if (/[0-9]/.test(input[i]) || (input[i] === '.' && i + 1 < input.length && /[0-9]/.test(input[i + 1]))) {
                let num = '';
                while (i < input.length && /[0-9.]/.test(input[i])) num += input[i++];
                tokens.push({ type: 'NUM', value: num });
                continue;
            }

            // Identifiers
            if (/[a-zA-Z_]/.test(input[i])) {
                let id = '';
                while (i < input.length && /[a-zA-Z0-9_]/.test(input[i])) id += input[i++];
                tokens.push({ type: 'ID', value: id });
                continue;
            }

            const OPS = {
                '+': 'PLUS', '-': 'MINUS', '*': 'STAR', '/': 'SLASH',
                '^': 'CARET', '(': 'LP', ')': 'RP', ',': 'COMMA'
            };
            if (OPS[input[i]]) {
                tokens.push({ type: OPS[input[i]], value: input[i] });
                i++;
                continue;
            }

            throw new Error(`Unexpected character '${input[i]}' at position ${i}`);
        }

        // Insert implicit multiplication tokens
        const result = [];
        for (let j = 0; j < tokens.length; j++) {
            result.push(tokens[j]);
            if (j + 1 < tokens.length) {
                const a = tokens[j], b = tokens[j + 1];
                const needsMul =
                    (a.type === 'NUM' && (b.type === 'ID' || b.type === 'LP')) ||
                    (a.type === 'RP' && (b.type === 'ID' || b.type === 'NUM' || b.type === 'LP'));
                if (needsMul) result.push({ type: 'STAR', value: '*' });
            }
        }

        result.push({ type: 'EOF', value: '' });
        return result;
    }

    parse(input) {
        this.tokens = this.tokenize(input);
        this.pos = 0;
        this.detectedParams = new Map();
        const expr = this.parseExpr();
        if (this.peek().type !== 'EOF') {
            throw new Error(`Unexpected token '${this.peek().value}' after expression`);
        }
        return expr;
    }

    peek() { return this.tokens[this.pos]; }
    advance() { return this.tokens[this.pos++]; }

    parseExpr() {
        let left = this.parseTerm();
        while (this.peek().type === 'PLUS' || this.peek().type === 'MINUS') {
            const op = this.advance().value;
            const right = this.parseTerm();
            left = `(${left} ${op} ${right})`;
        }
        return left;
    }

    parseTerm() {
        let left = this.parseUnary();
        while (this.peek().type === 'STAR' || this.peek().type === 'SLASH') {
            const op = this.advance().value;
            const right = this.parseUnary();
            left = `(${left} ${op} ${right})`;
        }
        return left;
    }

    parseUnary() {
        if (this.peek().type === 'MINUS') {
            this.advance();
            return `(-${this.parseUnary()})`;
        }
        if (this.peek().type === 'PLUS') { this.advance(); return this.parseUnary(); }
        return this.parsePower();
    }

    parsePower() {
        let base = this.parseAtom();
        if (this.peek().type === 'CARET') {
            this.advance();
            const exp = this.parseUnary();
            return `pow(${base}, ${exp})`;
        }
        return base;
    }

    parseAtom() {
        const tok = this.peek();

        if (tok.type === 'NUM') {
            this.advance();
            let v = tok.value;
            if (!v.includes('.')) v += '.0';
            return v;
        }

        if (tok.type === 'ID') {
            this.advance();
            const name = tok.value;

            // Function call
            if (this.peek().type === 'LP' && this.FUNCTIONS.has(name)) {
                this.advance(); // consume (
                const args = [this.parseExpr()];
                while (this.peek().type === 'COMMA') { this.advance(); args.push(this.parseExpr()); }
                if (this.peek().type !== 'RP') throw new Error(`Expected ')' after ${name}(`);
                this.advance();
                let fn = name;
                if (name === 'ln') fn = 'log';
                return `${fn}(${args.join(', ')})`;
            }

            // Constants
            if (this.CONSTANTS[name]) {
                if (name === 'e' || name === 'E') return '2.71828182845905';
                return '3.14159265358979';
            }

            // Variables
            if (this.VARIABLES.has(name)) return name;

            // Parameter
            if (!this.detectedParams.has(name)) {
                this.detectedParams.set(name, 1.0);
            }
            return name;
        }

        if (tok.type === 'LP') {
            this.advance();
            const expr = this.parseExpr();
            if (this.peek().type !== 'RP') throw new Error("Expected ')'");
            this.advance();
            return expr;
        }

        throw new Error(`Unexpected token '${tok.value}'`);
    }

    /** Parse expression and return {glsl, params, error} */
    toGLSL(input) {
        try {
            const glsl = this.parse(input.trim());
            return { glsl, params: new Map(this.detectedParams), error: null };
        } catch (e) {
            return { glsl: null, params: new Map(), error: e.message };
        }
    }
}

// JS math scope string for CPU evaluation
const JS_MATH_SCOPE = `const sin=Math.sin,cos=Math.cos,tan=Math.tan,asin=Math.asin,acos=Math.acos,atan=Math.atan,atan2=Math.atan2,exp=Math.exp,log=Math.log,sqrt=Math.sqrt,abs=Math.abs,sign=Math.sign,floor=Math.floor,ceil=Math.ceil,min=Math.min,max=Math.max,pow=Math.pow,sinh=Math.sinh,cosh=Math.cosh,tanh=Math.tanh,PI=Math.PI,mod=(a,b)=>((a%b)+b)%b,fract=x=>x-Math.floor(x);`;

function createEvaluator(glslExpr, paramNames) {
    const paramDecl = paramNames.map(n => `const ${n}=params.${n};`).join('');
    try {
        return new Function('x', 'y', 't', 'params', JS_MATH_SCOPE + paramDecl + 'return ' + glslExpr + ';');
    } catch (e) {
        return () => 0;
    }
}
