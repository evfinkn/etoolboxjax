import ParseUtil from "mathjax-full/js/input/tex/ParseUtil.js";
import TexError from "mathjax-full/js/input/tex/TexError.js";
import TexParser from "mathjax-full/js/input/tex/TexParser.js";
import { Macro } from "mathjax-full/js/input/tex/Token.js";
import { CommandMap } from "mathjax-full/js/input/tex/TokenMap.js";
import { Args, ParseMethod } from "mathjax-full/js/input/tex/Types.js";

const ROMAN_NUMERALS: [string, number][] = [
  ["M", 1000],
  ["CM", 900],
  ["D", 500],
  ["CD", 400],
  ["C", 100],
  ["XC", 90],
  ["L", 50],
  ["XL", 40],
  ["X", 10],
  ["IX", 9],
  ["V", 5],
  ["IV", 4],
  ["I", 1],
];

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

function defaultCounterToString(): string {
  return this.value.toString();
}

export class Counter {
  private static counters: Record<string, Counter> = {};

  public static get(name: string, required: boolean = true): Counter | null {
    const counter = Counter.counters[name];
    if (counter) return counter;

    throw new TexError(
      "UndefinedCounterReferenced",
      'Undefined counter "%1"',
      name,
    );
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
    parser.PushAll(ParseUtil.internalMath(parser, counter.toString()));
  }

  /** The counters that are reset when this counter's value is changed. */
  private subCounters: Counter[] = [];

  /** The counter that resets this counter's value, if any. */
  private _superCounter: Counter | null = null;

  private _toString: () => string = defaultCounterToString;

  public constructor(
    private _name: string,
    resetBy: string | null = null,
    private _value: number = 0,
  ) {
    if (Counter.counters[_name]) {
      throw new TexError(
        "DuplicateCounter",
        'Counter "%1" already defined',
        _name,
      );
    }
    if (resetBy) {
      const counter = Counter.get(resetBy);
      counter.subCounters.push(this);
      this._superCounter = counter;
    }
    Counter.counters[_name] = this;
  }

  public toString(): string {
    return this._toString();
  }

  /** The name of the counter. */
  public get name(): string {
    return this._name;
  }

  /** The current value of the counter. */
  public get value(): number {
    return this._value;
  }

  public set value(value: number) {
    this._value = value;
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

  public add(n: number): void {
    this.value += n;
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
      this._toString = defaultCounterToString;
    }
  }
}

/**
 * @param {TexParser} parser The calling parser.
 * @param {string} name The name of the calling command.
 * @returns {Counter} The counter with the given name.
 * @throws {TexError} If the counter does not exist.
 */
export function GetCounter(parser: TexParser, name: string): Counter {
  const counterName = parser.GetArgument(name);
  console.debug("counterName: ", counterName);
  return Counter.get(counterName);
}

export function GetNumber(parser: TexParser, name: string): number {
  const arg = parser.GetArgument(name);
  const num = parseInt(arg);
  if (Number.isFinite(num)) return num;

  // Invalid number argument.
  throw new TexError("InvalidNumber", 'Invalid number "%1"', arg);
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
      "%1 must be given a control sequence",
      name,
    );
  }
  if (!cs.match(/^(.|[a-z]+)$/i)) {
    throw new TexError(
      "IllegalControlSequenceName",
      "Illegal control sequence name for %1",
      name,
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
 * @param {string} cs The control sequence of the delimiter.
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

export type FormatMethod = "toArabic" | "toRoman" | "toAlph" | "toFnSymbol";

export function toArabic(num: number): string {
  return num.toString();
}

export function toRoman(num: number): string {
  if (num <= 0) return "";

  let result = "";

  ROMAN_NUMERALS.forEach(([symbol, value]) => {
    const count = Math.floor(num / value);
    result += symbol.repeat(count);
    num -= value * count;
  });

  return result;
}

export function toAlph(num: number): string {
  if (num <= 0 || num > 26) return "";

  return String.fromCharCode(0x40 + num);
}

export function toFnSymbol(num: number): string {
  if (num <= 0 || num > FN_SYMBOLS.length) return "";

  return FN_SYMBOLS[num - 1];
}
