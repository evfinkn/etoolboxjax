import type { CommandMapRecord } from "./Util.js";

import { CommandMap } from "mathjax-full/js/input/tex/TokenMap.js";

import EtoolboxMethods from "./EtoolboxMethods.js";
import { ETOOLBOX_CMD_MAP } from "./EtoolboxUtil.js";

const commands: CommandMapRecord<typeof EtoolboxMethods> = {
  // TeX flags
  // NewFlag takes errorIfDefined argument
  newbool: ["NewFlag", "bool", true],
  providebool: ["NewFlag", "bool", false],
  setbool: ["SetFlag", "bool"],
  // SetFlag accepts value argument
  booltrue: ["SetFlag", "bool", true],
  boolfalse: ["SetFlag", "bool", false],
  // IfFlag takes negate argument
  ifbool: ["IfFlag", "bool", false],
  notbool: ["IfFlag", "bool", true],
  // Toggles
  newtoggle: ["NewFlag", "toggle", true],
  providetoggle: ["NewFlag", "toggle", false],
  settoggle: ["SetFlag", "toggle"],
  toggletrue: ["SetFlag", "toggle", true],
  togglefalse: ["SetFlag", "toggle", false],
  iftoggle: ["IfFlag", "toggle", false],
  nottoggle: ["IfFlag", "toggle", true],
  // Macro tests
  // IfDef takes negate argument
  ifdef: ["IfDef", false],
  ifcsdef: ["IfDef", false],
  ifundef: ["IfDef", true],
  ifcsundef: ["IfDef", true],
  // String tests
  ifstrequal: ["IfStrEqual"],
  // IfStrEqual takes trim and negate arguments
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
};

export const EtoolboxCommandMap = new CommandMap(
  ETOOLBOX_CMD_MAP,
  commands,
  EtoolboxMethods,
);
