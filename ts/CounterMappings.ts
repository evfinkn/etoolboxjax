import type { CommandMapRecord } from "./Util.js";

import { CommandMap } from "mathjax-full/js/input/tex/TokenMap.js";

import CounterMethods from "./CounterMethods.js";
import { COUNTER_CMD_MAP } from "./CounterUtil.js";

const commands: CommandMapRecord<typeof CounterMethods> = {
  newcounter: "NewCounter",
  setcounter: "SetCounter",
  stepcounter: "StepCounter",
  addtocounter: "AddToCounter",
  arabic: ["Format", "toArabic"],
  roman: ["Format", "toRoman", false],
  Roman: ["Format", "toRoman", true],
  alph: ["Format", "toAlph", false],
  Alph: ["Format", "toAlph", true],
  fnsymbol: ["Format", "toFnSymbol"],
  counterwithin: "CounterWithin",
  counterwithout: "CounterWithout",
  value: "Value",
  number: "Number",
  romannumeral: "RomanNumeral",
};

export const CounterCommandMap = new CommandMap(
  COUNTER_CMD_MAP,
  commands,
  CounterMethods,
);
