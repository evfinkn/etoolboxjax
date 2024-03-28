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
  // @ts-expect-error TypeScript gets mad because commands has some methods with
  // optional arguments (and therefore the type of that argument is `... | undefined`)
  // but the CommandMap expects the value to be string | Args[] (Args doesn't allow
  // undefined). I'm ignoring this because MathJax itself has optional arguments in its
  // commands (see, for example, BaseMethods.Macro).
  commands,
  CounterMethods,
);
