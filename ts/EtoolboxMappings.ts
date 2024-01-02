import { CommandMap } from "mathjax-full/js/input/tex/TokenMap.js";

import EtoolboxMethods from "./EtoolboxMethods.js";
import { COMMAND_MAP } from "./EtoolboxUtil.js";

export const EtoolboxCommandMap = new CommandMap(
  COMMAND_MAP,
  {
    // Macro tests
    ifdef: ["IfDef", false],
    ifcsdef: ["IfDef", false],
    ifundef: ["IfDef", true],
    ifcsundef: ["IfDef", true],
    // String tests
    ifstrequal: "IfStrEqual",
    ifstrempty: ["IfBlank", false, false],
    ifblank: ["IfBlank", true, false],
    notblank: ["IfBlank", true, true],
    // Arithmetic tests
    ifnumcomp: "IfNumComp",
    ifnumequal: ["IfNumComp", "="],
    ifnumneq: ["IfNumComp", "!="],
    ifnumless: ["IfNumComp", "<"],
    ifnumgreater: ["IfNumComp", ">"],
    ifnumleq: ["IfNumComp", "<="],
    ifnumgeq: ["IfNumComp", ">="],
    ifnumeven: ["IfNumParity", 0],
    ifnumodd: ["IfNumParity", 1],
  },
  EtoolboxMethods,
);
