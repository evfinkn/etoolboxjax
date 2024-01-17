import type { ParserConfiguration } from "mathjax-full/js/input/tex/Configuration.js";

import { Configuration } from "mathjax-full/js/input/tex/Configuration.js";
import { CommandMap } from "mathjax-full/js/input/tex/TokenMap.js";

import "./EtoolboxMappings.js";

import { LoopBreakItem, LoopItem } from "./EtoolboxItems.js";
import { ETOOLBOX_CMD_MAP, LIST_PARSER_MAP } from "./EtoolboxUtil.js";

/**
 * Initializes the counter package.
 * @param {Configuration} config The current configuration.
 */
const init = function (config: ParserConfiguration) {
  new CommandMap(LIST_PARSER_MAP, {}, {});

  config.append(
    Configuration.local({
      handler: { macro: [LIST_PARSER_MAP] },
      priority: -3,
    }),
  );
};

export const EtoolboxConfiguration = Configuration.create("etoolbox", {
  handler: { macro: [ETOOLBOX_CMD_MAP] },
  items: {
    [LoopItem.prototype.kind]: LoopItem,
    [LoopBreakItem.prototype.kind]: LoopBreakItem,
  },
  init,
});
