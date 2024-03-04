import type { StackItem } from "mathjax-full/js/input/tex/StackItem.js";
import type { Args, ParseMethod } from "mathjax-full/js/input/tex/Types.js";

import { MathJax } from "mathjax-full/js/components/global.js";
import ParseUtil from "mathjax-full/js/input/tex/ParseUtil.js";
import TexError from "mathjax-full/js/input/tex/TexError.js";
import TexParser from "mathjax-full/js/input/tex/TexParser.js";
import { Macro } from "mathjax-full/js/input/tex/Token.js";
import { CommandMap } from "mathjax-full/js/input/tex/TokenMap.js";

import { evaluate } from "./numexpr.js";

export * from "./Util.js";

const MJCONFIG = MathJax.config;

const FN_SYMBOLS = [
  "*",
  "\\dagger",
  "\\ddagger",
  "\u00A7", // "\\textsection",
  "\u00B6", // "\\textparagraph",
  "\\|",
  "**",
  "\\dagger\\dagger",
  "\\ddagger\\ddagger",
];

export const COUNTER_CMD_MAP = "counter-commands";
export const COUNTER_MAP = "counter-counters";

export class Counter {
  private static counters: Record<string, Counter> = {};

  public static get(name: string, errorIfUndefined: boolean = true): Counter {
    const counter = Counter.counters[name];
    if (counter || !errorIfUndefined) return counter;

    throw new TexError("UndefinedCounter", `Undefined counter "${name}"`);
  }

  /**
   * Outputs the formatted string of the value of the requested counter.
   * @param {TexParser} parser The calling parser.
   * @param {string} name The name of the counter to be displayed.
   * @returns
   */
  public static the(parser: TexParser, name: string) {
    name = name.substring(4); // Remove '\the' from the name.
    const counter = Counter.get(name);
    pushMath(parser, counter.toString());
  }

  /** The counters that are reset when this counter's value is changed. */
  private subCounters: Counter[] = [];

  /** The counter that resets this counter's value, if any. */
  private _superCounter: Counter | null = null;

  private _toString: () => string | null;

  /**
   * @param {string} name - The name of the counter.
   * @param {?string} [resetBy=null] - The name of another counter that, when
   *   incremented, will reset this counter. If null, the counter will not be reset by
   *   any other counter.
   * @param {number} [value=0] - The value of the counter.
   * @throws {TexError} If a counter with the same name already exists.
   */
  public constructor(
    public readonly name: string,
    resetBy: string | null = null,
    public value: number = 0,
  ) {
    if (Counter.counters[name]) {
      throw new TexError(
        "DuplicateCounter",
        `Counter "${name}" already defined`,
      );
    }
    if (resetBy) {
      const counter = Counter.get(resetBy);
      counter.subCounters.push(this);
      this._superCounter = counter;
    }
    Counter.counters[name] = this;
  }

  public toString(): string {
    return this._toString?.() ?? this.value.toString();
  }

  public step() {
    this.value++;
    // In LaTeX, only the `\stepcounter` command resets subcounters.
    this.subCounters.forEach((counter) => {
      // Instead of resetting the counter, we set it to -1 and then call `step()`
      // so that the counter's subcounters are also reset.
      counter.value = -1;
      counter.step();
    });
  }

  public get superCounter(): Counter | null {
    return this._superCounter;
  }

  public set superCounter(counter: Counter | null) {
    if (this._superCounter) {
      const index = this._superCounter.subCounters.indexOf(this);
      if (index > -1) this._superCounter.subCounters.splice(index, 1);
    }
    this._superCounter = counter;
    counter?.subCounters?.push?.(this);
  }

  public within(counter: Counter, updateToString: boolean) {
    this.superCounter = counter;
    if (updateToString) {
      this._toString = () => `${counter.toString()}.${this.value}`;
    }
  }

  public without(counter: Counter) {
    if (this.superCounter === counter) {
      this.superCounter = null;
      this._toString = null;
    }
  }
}

Object.entries(MJCONFIG.counters || {}).forEach(([name, value]) => {
  if (typeof value === "number") {
    new Counter(name, null, value);
  }
});

MJCONFIG.counters = new Proxy(
  {},
  {
    get: (_target: Record<string, [string, number]>, name: string) => {
      const counter = Counter.get(name);
      return [counter.toString(), counter.value];
    },

    // Don't allow setting the value of a counter.
    set: (_target, _name: string, _value: number) => false,
  },
);

/**
 * @param {TexParser} parser The calling parser.
 * @param {string} name The name of the calling command.
 * @returns {Counter} The counter with the given name.
 * @throws {TexError} If the counter does not exist.
 */
export function GetCounter(parser: TexParser, name: string): Counter {
  const counterName = parser.GetArgument(name);
  return Counter.get(counterName);
}

export function GetNumber(parser: TexParser, name: string): number {
  let startI = parser.i; // Start index of the argument.
  if (parser.GetNext() === "{") startI++; // Don't include the opening brace.
  const arg = parser.GetArgument(name);
  const stopI = parser.i;

  const num = Number(arg);
  if (Number.isFinite(num)) return num;

  parser.i = startI;
  const result = GetNumberFromCS(parser, name);
  parser.i = stopI;
  return result;
}

/**
 * @param {StackItem} [item] The item to check.
 * @returns {boolean} Whether the item is a StackItem of kind "number" with a
 *   numeric property "number".
 */
function isNumberItem(item?: StackItem): boolean {
  return (
    item &&
    item.kind === "number" &&
    typeof item.getProperty("number") === "number"
  );
}

/**
 * Parses a command and returns the number it represents.
 *
 * This function calls the command's parse method and passes `parser` for its `parser`
 * argument. The command's parse method should push an `MmlNode` of kind "mn" to
 * `parser`'s stack.
 *
 * If `cs` is given, `parser.i` should be set to the index right after `cs` in
 * `parser.string` before calling this function. If `cs` is not given, the next command
 * in `parser.string` is parsed, so `parser.i` should be set to the index where the
 * command starts (either the backslash or the first character of the command name).
 * `parser.i` is left where the command leaves it after parsing. For example, if the
 * command takes arguments, `parser.i` will be set to the index right after the closing
 * brace of the last argument.
 *
 * @param {TexParser} parser The calling parser.
 * @param {string} name The name of the calling command.
 * @param {string} [cs] The control sequence of the command to parse. If not
 *   given, it is parsed from `parser`.
 * @returns {number} The number represented by the command.
 * @throws {TexError} If `cs` is blank (empty or whitespace only).
 * @throws {TexError} If `cs` is an undefined macro.
 * @throws {TexError} If the command's result is not a number.
 */
export function GetNumberFromCS(
  parser: TexParser,
  name: string,
  cs?: string,
): number {
  if (!cs) {
    if (parser.GetNext() === "\\") parser.i++;
    cs = parser.GetCS();
  } else if (cs.startsWith("\\")) {
    cs = cs.substring(1);
  }
  cs = cs.trim();

  if (cs === "") {
    throw new TexError("MissingNumber", `Missing number for "${name}"`);
  }

  const handler = parser.configuration.handlers.get("macro");
  const tokenMap = handler.applicable(cs);
  if (!tokenMap) {
    throw new TexError("UndefinedMacro", `Undefined macro "${cs}"`);
  }

  const oldTop = parser.stack.Top();
  const oldFirst = oldTop.First;
  tokenMap.parse([parser, cs]);
  const newTop = parser.stack.Top();
  const newFirst = newTop.First;

  let number: number | null = null;
  if (oldTop !== newTop && typeof newTop.getProperty("number") === "number") {
    number = newTop.getProperty("number") as number;
    // Remove the output of the command since it was only used to get the number.
    parser.stack.Pop();
  } else if (newFirst !== oldFirst && newFirst.isKind("mn")) {
    // The text property doesn't officially exist, but it's there in the browser.
    // @ts-ignore - Property 'text' does not exist on type 'MmlNode'.
    number = Number(newFirst.childNodes[0].text);
    // Remove the output of the command since it was only used to get the number.
    if (oldTop !== newTop) parser.stack.Pop();
    else newTop.Pop();
  } else {
    throw new TexError("InvalidNumber", `Invalid number "${cs}"`);
  }

  return number;
}

export function GetNumberExpr(parser: TexParser, name: string): string {
  let startI = parser.i; // Start index of the argument.
  if (parser.GetNext() === "{") startI++; // Don't include the opening brace.
  const expr = parser.GetArgument(name);
  // Stop index of the argument. - 1 to make it the index of the closing brace.
  const stopI = parser.i - 1;

  // If the argument is a number, return it. We use Number instead of parseFloat
  // because parseFloat allows trailing characters, which we don't want.
  // Note that this will correctly return "" (or whitespace) if the argument is blank
  // since Number("") === 0. We allow blank arguments so that the caller can decide
  // what to do with them.
  if (isFinite(Number(expr))) return expr;

  // Set parser.i to right after the command so that the parser is where
  // command's parse method expects it to be. + 1 is to skip the opening brace.
  // parser.i = startI + 1;
  // const result = GetNumberFromCS(parser, name, expr);
  // parser.i = stopI;
  // return result;

  const string = parser.string;
  const replaced: (string | number)[] = [];
  for (parser.i = startI; parser.i < stopI; parser.i++) {
    let result: string | number = string[parser.i];
    // GetNumberFromCS will set parser.i to the index right after the command.
    if (result === "\\") result = GetNumberFromCS(parser, name);
    replaced.push(result);
  }
  // Increment so that parser.i is at the index right after the closing brace
  // (where GetArgument leaves it).
  parser.i = stopI + 1;
  return replaced.join("");
}

export function EvalNumberExpr(parser: TexParser, name: string): number {
  const expr = GetNumberExpr(parser, name);
  return evaluate(expr);
}

// The following 2 methods are copied from
// node_modules/mathjax-full/js/input/tex/newcommand/NewcommandUtil.ts

/**
 * Get a control sequence name from a string.
 * @param {string} str The string to parse as a control sequence name.
 * @param {string} name The name of the calling command.
 * @param {boolean} [requireBackslash=false] Whether the control sequence name must
 *   start with a backslash.
 * @return {string} The control sequence.
 */
export function GetCsName(
  str: string,
  name: string,
  requireBackslash: boolean = false,
): string {
  let cs = ParseUtil.trimSpaces(str);
  if (cs.charAt(0) === "\\") {
    cs = cs.substring(1);
  } else if (requireBackslash) {
    throw new TexError(
      "MissingControlSequence",
      `${name} must be given a control sequence`,
    );
  }
  if (!cs.match(/^(.|[a-z]+)$/i)) {
    throw new TexError(
      "IllegalControlSequence",
      `Illegal control sequence name "${cs}" given for ${name}`,
    );
  }
  return cs;
}

/**
 * Get a control sequence name from an argument.
 * @see GetCsName
 */
export function GetCsNameArgument(
  parser: TexParser,
  name: string,
  requireBackslash: boolean = false,
): string {
  return GetCsName(parser.GetArgument(name), name, requireBackslash);
}

/**
 * Get a control sequence name from an optional argument.
 * @see GetCsName
 */
export function GetCsNameBrackets(
  parser: TexParser,
  name: string,
  requireBackslash: boolean = false,
): string | null {
  const optionalArg = parser.GetBrackets(name, "");
  if (optionalArg === "") return null;

  return GetCsName(optionalArg, name, requireBackslash);
}

/**
 * Adds a new macro as extension to the parser.
 * @param {TexParser} parser The current parser.
 * @param {string} mapName The name of the handler to add the macro to.
 * @param {string} cs The control sequence of the macro.
 * @param {ParseMethod} func The parse method for this macro.
 * @param {Args[]} attr The attributes needed for parsing.
 */
export function addMacro(
  parser: TexParser,
  mapName: string,
  cs: string,
  func: ParseMethod,
  attr: Args[] = [],
) {
  const handlers = parser.configuration.handlers;
  const handler = handlers.retrieve(mapName) as CommandMap;
  handler.add(cs, new Macro(cs, func, attr));
}

export function pushMath(parser: TexParser, math: string) {
  parser.Push(
    new TexParser(math, parser.stack.env, parser.configuration).mml(),
  );
}

export function pushText(parser: TexParser, text: string) {
  const mathvariant = parser.stack.env.font || parser.stack.env.mathvariant;
  const def = mathvariant ? { mathvariant } : {};
  parser.Push(ParseUtil.internalText(parser, text, def));
}

export type FormatMethod = "toArabic" | "toRoman" | "toAlph" | "toFnSymbol";

export function toArabic(num: number): string {
  return num.toString();
}

// prettier-ignore
export function toRoman(num: number): string {
  if (num <= 0) return "";

  let result = "";

  while (num >= 1000) { result += "M";  num -= 1000; }
  if    (num >= 900)  { result += "CM"; num -= 900; }
  if    (num >= 500)  { result += "D";  num -= 500; }
  if    (num >= 400)  { result += "CD"; num -= 400; }
  while (num >= 100)  { result += "C";  num -= 100; }
  if    (num >= 90)   { result += "XC"; num -= 90; }
  if    (num >= 50)   { result += "L";  num -= 50; }
  if    (num >= 40)   { result += "XL"; num -= 40; }
  while (num >= 10)   { result += "X";  num -= 10; }
  if    (num >= 9)    { result += "IX"; num -= 9; }
  if    (num >= 5)    { result += "V";  num -= 5; }
  if    (num >= 4)    { result += "IV"; num -= 4; }
  while (num >= 1)    { result += "I";  num -= 1; }

  return result;
}

export function toAlph(num: number): string {
  if (num <= 0 || num > 26) return "";

  return String.fromCharCode(0x40 + num);
}

export function toFnSymbol(num: number): string {
  return FN_SYMBOLS[num - 1] ?? "";
}
