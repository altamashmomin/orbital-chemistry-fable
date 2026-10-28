// Topic directory. One import line and one register line per topic, alphabetical by id.
// Branch convention: a topic/<id> branch adds src/topics/<id>/ plus its two lines here and
// touches nothing else in this file, so parallel topic branches merge without conflicts.
import { registerTopic } from './registry.js';
import { functionalGroups } from './functional-groups/index.js';
import { mechanisms } from './mechanisms/index.js';
import { molecularShapes } from './molecular-shapes/index.js';

registerTopic(functionalGroups);
registerTopic(mechanisms);
registerTopic(molecularShapes);

export * from './registry.js';
