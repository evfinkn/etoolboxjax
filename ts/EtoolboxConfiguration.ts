// Vaguely based on mathjax-full/ts/input/tex/newcommand/NewcommandConfiguration.ts

import {
  Configuration,
  ParserConfiguration,
} from "mathjax-full/js/input/tex/Configuration.js";
import { CommandMap } from "mathjax-full/js/input/tex/TokenMap.js";

import "./EtoolboxMappings.js";
import EtoolboxUtil from "./EtoolboxUtil.js";

/**
 * Initializes the etoolbox package.
 * @param {Configuration} config The current configuration.
 */
const init = function (config: ParserConfiguration) {
  new CommandMap(EtoolboxUtil.ETOOLBOX_COUNTER_MAP, {}, {});
  new CommandMap(EtoolboxUtil.ETOOLBOX_FLAG_MAP, {}, {});
  new CommandMap(EtoolboxUtil.ETOOLBOX_TOGGLE_MAP, {}, {});

  config.append(
    Configuration.local({
      handler: {
        macro: [
          EtoolboxUtil.ETOOLBOX_COUNTER_MAP,
          EtoolboxUtil.ETOOLBOX_FLAG_MAP,
          EtoolboxUtil.ETOOLBOX_TOGGLE_MAP,
        ],
      },
      priority: -1,
    }),
  );
};

export const EtoolboxConfiguration = Configuration.create("etoolbox", {
  handler: {
    macro: [EtoolboxUtil.ETOOLBOX_COMMAND_MAP],
  },
  options: { maxMacros: 1000 },
  init,
});
