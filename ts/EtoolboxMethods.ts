import { ParseMethod } from "mathjax-full/js/input/tex/Types.js";
import TexParser from "mathjax-full/js/input/tex/TexParser.js";

import * as EtoolboxUtil from "./EtoolboxUtil.js";
import { Counter, ETOOLBOX_COUNTER_MAP } from "./EtoolboxUtil.js";

const EtoolboxMethods: Record<string, ParseMethod> = {};

EtoolboxMethods.NewCounter = function (parser: TexParser, name: string) {
  console.debug("NewCounter");
  const cs = parser.GetArgument(name);
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
