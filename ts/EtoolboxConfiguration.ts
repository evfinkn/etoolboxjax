// Vaguely based on mathjax-full/ts/input/tex/newcommand/NewcommandConfiguration.ts

import {
  Configuration,
  ParserConfiguration,
} from "mathjax-full/js/input/tex/Configuration.js";
import { CommandMap } from "mathjax-full/js/input/tex/TokenMap.js";

import "./EtoolboxMappings.js";
import {
  ETOOLBOX_COMMAND_MAP,
  ETOOLBOX_COUNTER_MAP,
  ETOOLBOX_FLAG_MAP,
  ETOOLBOX_TOGGLE_MAP,
} from "./EtoolboxUtil.js";

/**
 * Initializes the etoolbox package.
 * @param {Configuration} config The current configuration.
 */
const init = function (config: ParserConfiguration) {
  new CommandMap(ETOOLBOX_COUNTER_MAP, {}, {});
  new CommandMap(ETOOLBOX_FLAG_MAP, {}, {});
  new CommandMap(ETOOLBOX_TOGGLE_MAP, {}, {});

  config.append(
    Configuration.local({
      handler: {
        macro: [ETOOLBOX_COUNTER_MAP, ETOOLBOX_FLAG_MAP, ETOOLBOX_TOGGLE_MAP],
      },
      priority: -1,
    }),
  );
};

export const EtoolboxConfiguration = Configuration.create("etoolbox", {
  handler: {
    macro: [ETOOLBOX_COMMAND_MAP],
  },
  options: { maxMacros: 1000 },
  init,
});
