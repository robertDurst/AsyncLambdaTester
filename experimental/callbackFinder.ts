import {Source} from './utils';

const rawSource = `import { map } from 'lodash'; map()`;
const src = new Source(rawSource);
console.log(src.getSignatureInfo());