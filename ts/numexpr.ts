type Op = "+" | "-" | "*" | "/" | "m"; // m for unary minus
type OpInfo = {
  readonly prec: number;
  readonly assoc: "left" | "right";
};
type OpOrParen = Op | "(" | ")";

// If the expression has a length >= 2, the last element is always an operator
// (because its in postfix form) and the other elements are numbers or operators.
// Otherwise, the expression is empty or has a single number.
type PostfixExpression = [] | [number] | [...(number | Op)[], Op];

const OPS = new Map<Op, OpInfo>([
  ["+", { prec: 1, assoc: "left" }],
  ["-", { prec: 1, assoc: "left" }],
  ["*", { prec: 2, assoc: "left" }],
  ["/", { prec: 2, assoc: "left" }],
  ["m", { prec: 3, assoc: "right" }],
]);

function last<T>(array: T[]): T | undefined {
  return array[array.length - 1];
}

function isOperator(x: unknown): x is Op {
  return OPS.has(x as Op);
}

function shouldPopOp(opToken1: Op, opToken2: any): boolean {
  if (!(opToken2 && isOperator(opToken2))) return false;

  const op1 = OPS.get(opToken1);
  const op2 = OPS.get(opToken2);
  return op2.prec > op1.prec || (op2.prec === op1.prec && op1.assoc === "left");
}

export function postfixify(expression: string): PostfixExpression {
  const outputQueue: (number | Op)[] = [];
  const operatorStack: OpOrParen[] = [];

  expression
    .replace(/\s+/g, "")
    // Handle unary plus and minus. The unary ops are always at the beginning of the
    // expression or immediately after an operator or opening parenthesis. We replace
    // odd numbers of "-" with "m". "+" and even numbers of "-" are removed, since
    // they are redundant.
    .replace(/(?<=^|[-+*\/\(])([-+]+)/g, (_match, ops: string) => {
      let minusCount = 0;
      for (const op of ops) {
        if (op === "-") minusCount++;
      }
      return minusCount % 2 == 0 ? "" : "m";
    })
    .split(/([\(\)\+\-\*\/m])/)
    .filter((token) => token && token !== "")
    .forEach((token) => {
      const number = Number(token);
      if (Number.isFinite(number)) {
        outputQueue.push(number);
      } else if (isOperator(token)) {
        while (shouldPopOp(token, last(operatorStack))) {
          outputQueue.push(operatorStack.pop() as Op);
        }
        operatorStack.push(token);
      } else if (token === "(") {
        operatorStack.push(token);
      } else if (token === ")") {
        // If the token is a closing parenthesis, pop
        // operators from the stack to the output queue
        while (operatorStack.length > 0 && last(operatorStack) !== "(") {
          outputQueue.push(operatorStack.pop() as Op);
        }
        if (last(operatorStack) !== "(") {
          throw new Error("Mismatched parentheses");
        }
        operatorStack.pop(); // Pop the opening parenthesis from the stack
      } else {
        throw new Error("Invalid token");
      }
    });

  // Pop any remaining operators from the stack to the output queue
  while (operatorStack.length > 0) {
    if (last(operatorStack) === "(") {
      throw new Error("Mismatched parentheses");
    }
    outputQueue.push(operatorStack.pop() as Op);
  }

  return outputQueue as PostfixExpression;
}

export function evaluatePostfix(expression: PostfixExpression): number {
  const stack: number[] = [];

  expression.forEach((token) => {
    if (typeof token === "number") {
      stack.push(token);
    } else if (token === "m") {
      stack.push(-stack.pop()!);
    } else {
      const operand2 = stack.pop();
      const operand1 = stack.pop();
      switch (token) {
        case "+":
          stack.push(operand1 + operand2);
          break;
        case "-":
          stack.push(operand1 - operand2);
          break;
        case "*":
          stack.push(operand1 * operand2);
          break;
        case "/":
          stack.push(operand1 / operand2);
          break;
      }
    }
  });

  if (stack.length !== 1) {
    throw new Error("Invalid expression");
  }
  return stack[0];
}

export function evaluate(expression: string): number {
  return evaluatePostfix(postfixify(expression));
}
