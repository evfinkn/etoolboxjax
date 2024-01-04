import type TexParser from "mathjax-full/js/input/tex/TexParser.js";

import { CommandMap } from "mathjax-full/js/input/tex/TokenMap.js";

import EtoolboxMethods from "./EtoolboxMethods.js";
import { COMMAND_MAP } from "./EtoolboxUtil.js";

// prettier-ignore
type NonParseParams<F> =
  F extends (parser: TexParser, name: string, ...args: infer R) => any ? R : never;

type EtoolboxNames = keyof typeof EtoolboxMethods;
type EtoolboxParameters<K> = K extends EtoolboxNames
  ? K | [K, ...NonParseParams<(typeof EtoolboxMethods)[K]>]
  : never;

const commands: Record<string, EtoolboxParameters<EtoolboxNames>> = {
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
  COMMAND_MAP,
  commands,
  EtoolboxMethods,
);
