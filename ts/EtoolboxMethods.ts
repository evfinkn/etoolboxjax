import { Macro } from "mathjax-full/js/input/tex/Token.js";
import { ParseMethod } from "mathjax-full/js/input/tex/Types.js";
import TexError from "mathjax-full/js/input/tex/TexError.js";
import TexParser from "mathjax-full/js/input/tex/TexParser.js";
import { MmlNode } from "mathjax-full/js/core/MmlTree/MmlNode.js";

const EtoolboxMethods: Record<string, ParseMethod> = {};

/**
 * Implements `\if<token1><token2>`.
 * The tokens are compared. If they are equal, the `\if`'s body is
 * processed, otherwise it is skipped. The `\else` macro can be used to process
 * the alternative branch. The `\fi` macro ends the conditional.
 * @param {TexParser} parser The active tex parser.
 * @param {string} name The name of the macro being processed.
 */
EtoolboxMethods.If = function (parser: TexParser, name: string) {
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

EtoolboxMethods.Else = function (parser: TexParser, name: string) {
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

EtoolboxMethods.Fi = function (parser: TexParser, name: string) {
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

export default EtoolboxMethods;
