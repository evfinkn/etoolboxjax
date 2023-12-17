import { Configuration } from "mathjax-full/js/input/tex/Configuration.js";
import { CommandMap } from "mathjax-full/js/input/tex/TokenMap.js";
import { Macro, Token } from "mathjax-full/js/input/tex/Token.js";
import { ParseMethod } from "mathjax-full/js/input/tex/Types.js";
import TexError from "mathjax-full/js/input/tex/TexError.js";
import TexParser from "mathjax-full/js/input/tex/TexParser.js";
import ParseUtil from "mathjax-full/js/input/tex/ParseUtil.js";
import { StackItem } from "mathjax-full/js/input/tex/StackItem.js";
import { MmlNode } from "mathjax-full/js/core/MmlTree/MmlNode.js";

const ControlflowMethods: Record<string, ParseMethod> = {};

/**
 * Implements `\if<token1><token2>`.
 * The tokens are compared. If they are equal, the `\if`'s body is
 * processed, otherwise it is skipped. The `\else` macro can be used to process
 * the alternative branch. The `\fi` macro ends the conditional.
 * @param {TexParser} parser The active tex parser.
 * @param {string} name The name of the macro being processed.
 */
ControlflowMethods.If = function (parser: TexParser, name: string) {
  try {
    console.debug("itemFactory", parser.itemFactory);
    console.debug("controlflow", name);
    console.debug("parser", parser);
    const token1 = parser.GetArgument(name);
    console.debug("token1", token1);
    const token2 = parser.GetArgument(name);
    console.debug("token2", token2);
    let ifBody = parser.ParseArg(name);
    console.debug("ifBody", ifBody);
    parser.Push(
      parser.itemFactory.create("begin").setProperties({
        name,
        token1,
        token2,
        ifBody,
      }),
    );
  } catch (err) {
    console.debug("err", err);
    throw err;
  }
};

ControlflowMethods.Else = function (parser: TexParser, name: string) {
  console.debug("controlflow", name);
  const top = parser.stack.Top();
  console.debug("top", top);
  if (top.getProperty("name") !== "\\if") {
    throw new TexError("UnexpectedElse", "Unexpected \\else");
  }
  if (top.getProperty("elseBody")) {
    throw new TexError("MultipleElse", "Multiple \\else");
  }
  top.setProperty("elseBody", parser.ParseArg(name));
};

ControlflowMethods.Fi = function (parser: TexParser, name: string) {
  console.debug("controlflow", name);
  const top = parser.stack.Top();
  console.debug("top", top);
  if (top.getProperty("name") !== "\\if") {
    throw new TexError("UnexpectedFi", "Unexpected \\fi");
  }
  parser.stack.Pop();
  const ifBody = top.getProperty("ifBody");
  const elseBody = top.getProperty("elseBody");
  const token1 = top.getProperty("token1");
  const token2 = top.getProperty("token2");
  const result = token1 === token2 ? ifBody : elseBody;
  if (result) {
    console.debug("result", result);
    parser.Push(result as MmlNode);
  }
};

new CommandMap(
  "controlflow",
  {
    if: "If",
    else: "Else",
    fi: "Fi",
  },
  ControlflowMethods,
);

export const controlflowConfiguration = Configuration.create("controlflow", {
  handler: { macro: ["controlflow"] },
});
