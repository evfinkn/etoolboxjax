import type { ParserConfiguration } from "mathjax-full/js/input/tex/Configuration.js";

import { Configuration } from "mathjax-full/js/input/tex/Configuration.js";
import { CommandMap } from "mathjax-full/js/input/tex/TokenMap.js";

import "./CounterMappings.js";

import { COUNTER_CMD_MAP, COUNTER_MAP } from "./CounterUtil.js";
import { NumberItem } from "./Items.js";

/**
 * Initializes the counter package.
 * @param {Configuration} config The current configuration.
 */
const init = function (config: ParserConfiguration) {
  new CommandMap(COUNTER_MAP, {}, {});

  config.append(
    Configuration.local({
      handler: { macro: [COUNTER_MAP] },
      priority: -3,
    }),
  );
};

export const CounterConfiguration = Configuration.create("counter", {
  handler: { macro: [COUNTER_CMD_MAP] },
  init,
  items: { number: NumberItem },
});
