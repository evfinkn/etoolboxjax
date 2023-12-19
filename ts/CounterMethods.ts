import { ParseMethod } from "mathjax-full/js/input/tex/Types.js";
import TexParser from "mathjax-full/js/input/tex/TexParser.js";

import * as Util from "./CounterUtil.js";
import { Counter, COUNTER_MAP } from "./CounterUtil.js";
import TexError from "mathjax-full/js/input/tex/TexError.js";
import ParseUtil from "mathjax-full/js/input/tex/ParseUtil.js";

const CounterMethods: Record<string, ParseMethod> = {};

CounterMethods.NewCounter = function (parser: TexParser, name: string) {
  console.debug(name);
  const cs = Util.GetCsNameArgument(parser, name);
  // The order has to be \newcounter{cs}[superCounter] like in LaTeX. If `cs` is a "["
  // then the order is reversed, so we throw an error.
  // This is different from LaTeX, where an error would be thrown when the counter that
  // was supposed to be defined is referenced later. However, I figured it'd be helpful
  // to throw an error here to make the actual error more obvious (since usually,
  // optional arguments come before required arguments).
  if (cs === "[") {
    parser.i--; // Decrement so that GetBrackets() gets the argument correctly.
    const optionalArg = Util.GetCsNameBrackets(parser, name);
    // It's fine if GetArgument throws an error, since we'd want that regardless
    // of whether the order is correct or not.
    const requiredArg = Util.GetCsNameArgument(parser, name);
    throw new TexError(
      "InvalidArgumentOrder",
      'Counter name "{%2}" must come before optional argument "[%1]"',
      optionalArg,
      requiredArg,
    );
  }
  console.debug("cs: ", cs);
  const superCounter = Util.GetCsNameBrackets(parser, name);
  console.debug("superCounter: ", superCounter);
  console.debug(new Counter(cs, superCounter));
  const theCs = `the${cs}`;
  console.debug("theCs: ", theCs);
  Util.addMacro(parser, COUNTER_MAP, theCs, Counter.the);
};

CounterMethods.SetCounter = function (parser: TexParser, name: string) {
  console.debug(name);
  const counter = Util.GetCounter(parser, name);
  console.debug("counter: ", counter);
  // const value = parser.GetArgument(name);
  // console.debug("value: ", value);
  // counter.value = parseInt(value);
  counter.value = Util.GetNumber(parser, name);
  console.debug("counter value after setting value: ", counter.value);
};

CounterMethods.StepCounter = function (parser: TexParser, name: string) {
  console.debug(name);
  const counter = Util.GetCounter(parser, name);
  console.debug("counter before stepping: ", counter);
  counter.step();
  console.debug("counter value after stepping: ", counter.value);
};

CounterMethods.AddToCounter = function (parser: TexParser, name: string) {
  console.debug(name);
  const counter = Util.GetCounter(parser, name);
  console.debug("counter before adding: ", counter);
  // const value = parser.GetArgument(name);
  // console.debug("value to add: ", value);
  // counter.value += parseInt(value);
  counter.value += Util.GetNumber(parser, name);
  console.debug("counter value after adding: ", counter.value);
};

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
CounterMethods.CounterWithin = function (parser: TexParser, name: string) {
  console.debug(name);
  const updateToString = !parser.GetStar();
  console.debug("updateToString: ", updateToString);
  const counter = Util.GetCounter(parser, name);
  console.debug("counter: ", counter);
  const superCounter = Util.GetCounter(parser, name);
  console.debug("superCounter: ", superCounter);
  counter.within(superCounter, updateToString);
};

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
CounterMethods.CounterWithout = function (parser: TexParser, name: string) {
  console.debug(name);
  const counter = Util.GetCounter(parser, name);
  console.debug("counter: ", counter);
  const superCounter = Util.GetCounter(parser, name);
  console.debug("superCounter: ", superCounter);
  counter.without(superCounter);
};

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
CounterMethods.Format = function (
  parser: TexParser,
  name: string,
  formatMethod: Util.FormatMethod,
  capital: boolean | null = null,
) {
  console.debug(name);
  const counter = Util.GetCounter(parser, name);
  let formatted = Util[formatMethod](counter.value);
  formatted = capital ? formatted.toUpperCase() : formatted.toLowerCase();
  console.debug("formatted: ", formatted);
  if (/^[a-zA-Z]*$/.test(formatted)) {
    const mathvariant = parser.stack.env.font || parser.stack.env.mathvariant;
    const def = mathvariant ? { mathvariant } : {};
    parser.Push(ParseUtil.internalText(parser, formatted, def));
  } else {
    parser.Push(
      new TexParser(formatted, parser.stack.env, parser.configuration).mml(),
    );
  }
};

export default CounterMethods;
