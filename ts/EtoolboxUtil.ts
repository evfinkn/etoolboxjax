import ParseUtil from "mathjax-full/js/input/tex/ParseUtil.js";
import TexError from "mathjax-full/js/input/tex/TexError.js";
import TexParser from "mathjax-full/js/input/tex/TexParser.js";
import { Macro } from "mathjax-full/js/input/tex/Token.js";
import { CommandMap } from "mathjax-full/js/input/tex/TokenMap.js";
import { Args, ParseMethod } from "mathjax-full/js/input/tex/Types.js";

export const ETOOLBOX_COMMAND_MAP = "etoolbox-commands";
export const ETOOLBOX_COUNTER_MAP = "etoolbox-counters";
export const ETOOLBOX_FLAG_MAP = "etoolbox-flags";
export const ETOOLBOX_TOGGLE_MAP = "etoolbox-toggles";

export class Counter {
  private static counters: Record<string, Counter> = {};

  public static get(name: string): Counter | null {
    return Counter.counters[name];
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
    if (counter) {
      pushNumber(parser, counter.value);
    } else {
      throw new TexError(
        "UndefinedCounterReferenced",
        "Undefined counter '%1'",
        name,
      );
    }
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
      if (counter) {
        counter.subCounters.push(this);
        this.superCounter = counter;
      } else {
        throw new TexError(
          "UndefinedCounterReferenced",
          "Undefined counter '%1'",
          resetBy,
        );
      }
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
export function getCounter(parser: TexParser, name: string): Counter {
  const counterName = parser.GetArgument(name);
  const counter = Counter.get(counterName);
  if (counter) return counter;

  throw new TexError(
    "UndefinedCounterReferenced",
    "Undefined counter '%1'",
    name,
  );
}

// The following 2 methods are copied from
// node_modules/mathjax-full/js/input/tex/newcommand/NewcommandUtil.ts

/**
 * Get the next CS name or give an error.
 * @param {TexParser} parser The calling parser.
 * @param {string} cmd The string starting with a control sequence.
 * @return {string} The control sequence.
 */
export function GetCSname(parser: TexParser, cmd: string): string {
  let c = parser.GetNext();
  if (c !== "\\") {
    throw new TexError(
      "MissingCS",
      "%1 must be followed by a control sequence",
      cmd,
    );
  }
  let cs = ParseUtil.trimSpaces(parser.GetArgument(cmd));
  return cs.substring(1);
}

/**
 * Get a control sequence name as an argument (doesn't require the backslash)
 * @param {TexParser} parser The calling parser.
 * @param {string} name The macro that is getting the name.
 * @return {string} The control sequence.
 */
export function GetCsNameArgument(parser: TexParser, name: string): string {
  let cs = ParseUtil.trimSpaces(parser.GetArgument(name));
  if (cs.charAt(0) === "\\") {
    cs = cs.substring(1);
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

export function pushNumber(parser: TexParser, n: number) {
  parser.PushAll(ParseUtil.internalMath(parser, n.toString()));
}
