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

export const ETOOLBOX_COMMAND_MAP = "etoolbox-commands";
export const ETOOLBOX_COUNTER_MAP = "etoolbox-counters";
export const ETOOLBOX_FLAG_MAP = "etoolbox-flags";
export const ETOOLBOX_TOGGLE_MAP = "etoolbox-toggles";

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
    parser.PushAll(ParseUtil.internalMath(parser, counter.value.toString()));
  }

  /** The counters that are reset when this counter's value is changed. */
  private subCounters: Counter[] = [];

  /** The counter that resets this counter's value, if any. */
  private superCounter: Counter | null = null;

  public constructor(
    private _name: string,
    resetBy: string | null = null,
    private _value: number = 0,
  ) {
    if (resetBy) {
      const counter = Counter.get(resetBy);
      counter.subCounters.push(this);
      this.superCounter = counter;
    }
    Counter.counters[_name] = this;
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
    this.subCounters.forEach((counter) => {
      counter.value = 0;
    });
  }

  public add(n: number): void {
    this.value += n;
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
