import { CommandMap } from "mathjax-full/js/input/tex/TokenMap.js";

import EtoolboxMethods from "./EtoolboxMethods.js";
import { ETOOLBOX_COMMAND_MAP } from "./EtoolboxUtil.js";

export const EtoolboxCommandMap = new CommandMap(
  ETOOLBOX_COMMAND_MAP,
  {
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
  },
  EtoolboxMethods,
);
