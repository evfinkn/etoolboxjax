import { ParseMethod } from "mathjax-full/js/input/tex/Types.js";
import TexParser from "mathjax-full/js/input/tex/TexParser.js";

import * as EtoolboxUtil from "./EtoolboxUtil.js";
import { Counter, ETOOLBOX_COUNTER_MAP } from "./EtoolboxUtil.js";
import TexError from "mathjax-full/js/input/tex/TexError.js";

const EtoolboxMethods: Record<string, ParseMethod> = {};

EtoolboxMethods.NewCounter = function (parser: TexParser, name: string) {
  console.debug("NewCounter");
  const cs = EtoolboxUtil.GetCsNameArgument(parser, name);
  // The order has to be \newcounter{cs}[superCounter] like in LaTeX. If `cs` is a "["
  // then the order is reversed, so we throw an error.
  // This is different from LaTeX, where an error would be thrown when the counter that
  // was supposed to be defined is referenced later. However, I figured it'd be helpful
  // to throw an error here to make the actual error more obvious (since usually,
  // optional arguments come before required arguments).
  if (cs === "[") {
    parser.i--; // Decrement so that GetBrackets() gets the argument correctly.
    const optionalArg = parser.GetBrackets(name);
    // It's fine if GetArgument throws an error, since we'd want that regardless
    // of whether the order is correct or not.
    const requiredArg = parser.GetArgument(name);
    throw new TexError(
      "InvalidArgumentOrder",
      'Counter name "{%2}" must come before optional argument "[%1]"',
      optionalArg,
      requiredArg,
    );
  }
  console.debug("cs: ", cs);
  const superCounter = parser.GetBrackets(name);
  console.debug("superCounter: ", superCounter);
  console.debug(new Counter(cs, superCounter));
  const theCs = `the${cs}`;
  console.debug("theCs: ", theCs);
  EtoolboxUtil.addMacro(parser, ETOOLBOX_COUNTER_MAP, theCs, Counter.the);
};

EtoolboxMethods.SetCounter = function (parser: TexParser, name: string) {
  console.debug("SetCounter");
  const counter = EtoolboxUtil.GetCounter(parser, name);
  console.debug("counter: ", counter);
  const value = parser.GetArgument(name);
  console.debug("value: ", value);
  counter.value = parseInt(value);
  console.debug("counter value after setting value: ", counter.value);
};

EtoolboxMethods.StepCounter = function (parser: TexParser, name: string) {
  console.debug("StepCounter");
  const counter = EtoolboxUtil.GetCounter(parser, name);
  console.debug("counter before stepping: ", counter);
  counter.value++;
  console.debug("counter value after stepping: ", counter.value);
};

EtoolboxMethods.AddToCounter = function (parser: TexParser, name: string) {
  console.debug("AddToCounter");
  const counter = EtoolboxUtil.GetCounter(parser, name);
  console.debug("counter before adding: ", counter);
  const value = parser.GetArgument(name);
  console.debug("value to add: ", value);
  counter.value += parseInt(value);
  console.debug("counter value after adding: ", counter.value);
};

export default EtoolboxMethods;
