import type { CommandMapRecord } from "./Util.js";

import { CommandMap } from "mathjax-full/js/input/tex/TokenMap.js";

import EtoolboxMethods from "./EtoolboxMethods.js";
import { ETOOLBOX_CMD_MAP } from "./EtoolboxUtil.js";

const commands: CommandMapRecord<typeof EtoolboxMethods> = {
  numexpr: "NumExpr",
  defcounter: "DefCounter",
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
  // TODO: etoolbox has a difference between commands with and without the cs-prefix,
  //       is it worth implementing?
  // IfDef takes negate argument
  ifdef: ["IfDef", false],
  ifcsdef: ["IfDef", false],
  ifundef: ["IfDef", true],
  ifcsundef: ["IfDef", true],
  // IfDefMacro takes withParams argument (undefined if okay either way)
  ifdefmacro: "IfDefMacro",
  ifcsmacro: "IfDefMacro",
  ifdefparam: ["IfDefMacro", true],
  ifcsparam: ["IfDefMacro", true],
  // IfDefEmpty takes orVoid argument
  ifdefempty: "IfDefEmpty",
  ifcsempty: "IfDefEmpty",
  ifdefvoid: ["IfDefEmpty", true],
  ifcsvoid: ["IfDefEmpty", true],
  // Counter tests
  // TODO: we don't have \newcount so these all test \newcounter
  ifdefcounter: "IfDefCounter",
  ifcscounter: "IfDefCounter",
  ifltxcounter: "IfDefCounter",
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
  // List parsers
  DeclareListParser: "DeclareListParser",
  docsvlist: ["ListParser", ",", "\\do"],
  forcsvlist: ["ListParser", ","],
  // Lists
  newlist: "NewList",
  listadd: "ListAdd",
  listremove: "ListRemove",
  dolistloop: ["ListLoop", "\\do"],
  forlistloop: "ListLoop",
  loopbreak: "LoopBreak",
  // List tests
  ifinlist: "IfInList",
  // Misc
  ifrmnum: "IfRomanNumeral",
};

/**
 * In `etoolbox`, the cs-prefixed versions are called with a control sequence *name*
 * rather than a control sequence. For example, `ifdef` is called like
 * `\ifdef{\cs}{}{}`, whereas `\ifcsdef` is called like `\ifcsdef{cs}{}{}`. However,
 * this port uses the same command for both. That is, `\ifdef` can be called either way,
 * and `\ifcsdef` is an alias for `\ifdef`.
 */
export const EtoolboxCommandMap = new CommandMap(
  ETOOLBOX_CMD_MAP,
  commands,
  EtoolboxMethods,
);
