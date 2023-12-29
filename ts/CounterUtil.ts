import type { Args, ParseMethod } from "mathjax-full/js/input/tex/Types.js";

import { MathJax } from "mathjax-full/js/components/global.js";
import ParseUtil from "mathjax-full/js/input/tex/ParseUtil.js";
import TexError from "mathjax-full/js/input/tex/TexError.js";
import TexParser from "mathjax-full/js/input/tex/TexParser.js";
import { Macro } from "mathjax-full/js/input/tex/Token.js";
import { CommandMap } from "mathjax-full/js/input/tex/TokenMap.js";

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

export const COMMAND_MAP = "counter-commands";
export const COUNTER_MAP = "counter-counters";

export class Counter {
  private static counters: Record<string, Counter> = {};

  public static get(name: string): Counter {
    const counter = Counter.counters[name];
    if (counter) return counter;

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
  const arg = parser.GetArgument(name);
  const counterName = /\\value\{([a-zA-Z]+)\}/.exec(arg)?.[1];
  if (counterName) return Counter.get(counterName).value;

  const num = parseInt(arg);
  if (Number.isFinite(num)) return num;

  throw new TexError("InvalidNumber", `Invalid number "${arg}"`);
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
 * @param {string} handlerName The name of the handler to add the macro to.
 * @param {string} cs The control sequence of the macro.
 * @param {ParseMethod} func The parse method for this macro.
 * @param {Args[]} attr The attributes needed for parsing.
 */
export function addMacro(
  parser: TexParser,
  handlerName: string,
  cs: string,
  func: ParseMethod,
  attr: Args[] = [],
) {
  const handlers = parser.configuration.handlers;
  const handler = handlers.retrieve(handlerName) as CommandMap;
  handler.add(cs, new Macro(cs, func, attr));
}

export function pushMath(parser: TexParser, math: string) {
  parser.Push(
    new TexParser(math, parser.stack.env, parser.configuration).mml(),
  );
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
