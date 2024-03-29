import type TexParser from "mathjax-full/js/input/tex/TexParser.js";
import type { ParseMethod } from "mathjax-full/js/input/tex/Types.js";

import TexError from "mathjax-full/js/input/tex/TexError.js";

import * as Util from "./CounterUtil.js";
import { Counter, COUNTER_MAP } from "./CounterUtil.js";

// Default LaTeX counters: https://en.wikibooks.org/wiki/LaTeX/Counters
// Equation numbering with sections: https://github.com/mathjax/MathJax/issues/2427
// Other MathJax v4 beta: https://github.com/lucasvreis/xparsejax

const CounterMethods = {
  NewCounter(parser: TexParser, name: string) {
    const cs = Util.GetCsNameArgument(parser, name);
    // The order has to be \newcounter{cs}[superCounter] like in LaTeX. If `cs` is a "["
    // then the order is reversed, so we throw an error.
    if (cs === "[") {
      throw new TexError(
        "InvalidArgumentOrder",
        "Counter name must come before optional argument",
      );
    }
    const superCounter = Util.GetCsNameBrackets(parser, name);
    new Counter(cs, superCounter);
    const theCs = `the${cs}`;
    // eslint-disable-next-line @typescript-eslint/unbound-method
    Util.addMacro(parser, COUNTER_MAP, theCs, Counter.the);
  },

  SetCounter(parser: TexParser, name: string) {
    const counter = Util.GetCounter(parser, name);
    counter.value = Util.GetNumber(parser, name);
  },

  StepCounter(parser: TexParser, name: string) {
    const counter = Util.GetCounter(parser, name);
    counter.step();
  },

  AddToCounter(parser: TexParser, name: string) {
    const counter = Util.GetCounter(parser, name);
    counter.value += Util.GetNumber(parser, name);
  },

  /**
   * Handles the `\counterwithin{counter}{superCounter}` command.
   *
   * This adds `counter` to `superCounter`'s list of subcounters, meaning that
   * `counter` will be reset when `superCounter` is changed. The `\thecounter` command
   * will also be updated to include `\thesuperCounter.` as a prefix, unless the starred
   * version of `\counterwithin` (i.e. `\counterwithin*`) is used.
   *
   * Note that `\counterwithin*` doesn't change the prefix of `\thecounter` if
   * `superCounter` was already set with `\counterwithin`. If you want to remove the
   * use `\counterwithout` followed by `\counterwithin*`.
   *
   * If `counter` already has a supercounter, it will be removed from that supercounter's
   * list of subcounters.
   * @param {TexParser} parser The calling parser.
   * @param {string} name The name of the calling command.
   */
  CounterWithin(parser: TexParser, name: string) {
    const updateToString = !parser.GetStar();
    const counter = Util.GetCounter(parser, name);
    const superCounter = Util.GetCounter(parser, name);
    counter.within(superCounter, updateToString);
  },

  /**
   * Handles the `\counterwithout{counter}{superCounter}` command.
   *
   * This removes `counter` from `superCounter`'s list of subcounters, meaning that
   * `counter` will no longer be reset when `superCounter` is changed. Additionally, if
   * `superCounter` was set with the unstarred version of `\counterwithin`, `\thecounter`
   * will no longer be prefixed with `\thesuperCounter.`.
   *
   * If `superCounter` is not `counter`'s supercounter, this command does nothing.
   * @param {TexParser} parser The calling parser.
   * @param {string} name The name of the calling command.
   */
  CounterWithout(parser: TexParser, name: string) {
    const counter = Util.GetCounter(parser, name);
    const superCounter = Util.GetCounter(parser, name);
    counter.without(superCounter);
  },

  /**
   * Handles the formatting-related commands.
   *
   * Specifically, this handles the following commands:
   * - `\arabic`
   * - `\roman`
   * - `\Roman`
   * - `\alph`
   * - `\Alph`
   * - `\fnsymbol`
   *
   * @param {TexParser} parser The calling parser.
   * @param {string} name The name of the calling command.
   * @param {Util.FormatMethod} formatMethod The name of the method to use for
   *   formatting. Either "toArabic", "toRoman", "toAlph", or "toFnSymbol".
   * @param {?boolean} capital Whether to capitalize the formatted string.
   */
  Format(
    parser: TexParser,
    name: string,
    formatMethod: Util.FormatMethod,
    capital: boolean | null = null,
  ) {
    const counter = Util.GetCounter(parser, name);
    let formatted = Util[formatMethod](counter.value);
    formatted = capital ? formatted.toUpperCase() : formatted.toLowerCase();
    if (/^[a-zA-Z]*$/.test(formatted)) {
      Util.pushText(parser, formatted);
    } else {
      Util.pushMath(parser, formatted);
    }
  },

  Number(parser: TexParser, name: string) {
    const num = Util.GetNumber(parser, name);
    Util.pushMath(parser, num.toString());
  },

  Value(parser: TexParser, name: string) {
    const counter = Util.GetCounter(parser, name);
    const number = counter.value;
    parser.Push(parser.itemFactory.create("number", number));
  },

  RomanNumeral(parser: TexParser, name: string) {
    const num = Util.GetNumber(parser, name);
    const formatted = Util.toRoman(num);
    Util.pushText(parser, formatted.toLowerCase());
  },
} satisfies Record<string, ParseMethod>;

export default CounterMethods;
