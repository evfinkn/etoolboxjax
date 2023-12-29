type Op = "+" | "-" | "*" | "/" | "m"; // m for unary minus
type OpInfo = {
  readonly prec: number;
  readonly assoc: "left" | "right";
};
type OpOrParen = Op | "(" | ")";
type PostfixExpression = [] | [number] | [...(number | Op)[], Op];

const ops = new Map<Op, OpInfo>([
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
  return ops.has(x as Op);
}

function shouldPopOp(opToken1: Op, opToken2: any): boolean {
  if (!(opToken2 && isOperator(opToken2))) return false;

  const op1 = ops.get(opToken1);
  const op2 = ops.get(opToken2);
  return op2.prec > op1.prec || (op2.prec === op1.prec && op1.assoc === "left");
}

export function postfixify(expression: string): PostfixExpression {
  const outputQueue: (number | Op)[] = [];
  const operatorStack: OpOrParen[] = [];

  expression
    .replace(/\s+/g, "")
    // .replace(/(?<=^|\(|[-+*\/])(?:\+|-{2})/g, "") // remove unary plus and double minus
    // .replace(/(?<=^|\(|[-+*\/])\-/g, "m") // replace unary minus with m
    // handle unary plus and minus
    .replace(/(?<=^|[-+*\/\(])([-+]+)/g, (_match, ops) => {
      let count = 0;
      for (let i = 0; i < ops.length; ++i) {
        if (ops.charAt(i) === "-") count++;
      }
      return count % 2 == 0 ? "" : "m";
    })
    .split(/([\(\)\+\-\*\/m])/)
    .filter((token) => token && token !== "")
    .forEach((token) => {
      const float = parseFloat(token);
      if (isFinite(float)) {
        outputQueue.push(float);
      } else if (isOperator(token)) {
        while (shouldPopOp(token, last(operatorStack))) {
          outputQueue.push(operatorStack.pop() as Op);
        }
        operatorStack.push(token);
      } else if (token === "(") {
        operatorStack.push(token);
      } else if (token === ")") {
        // If the token is a closing parenthesis, pop operators from the stack to the output queue
        while (operatorStack.length > 0 && last(operatorStack) !== "(") {
          outputQueue.push(operatorStack.pop() as Op);
        }
        if (last(operatorStack) !== "(") {
          throw new Error("Mismatched parentheses");
        }
        operatorStack.pop(); // Pop the opening parenthesis from the stack
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
