import { findPositions } from './inferringSignature';

export const discoveryPhase = (names, setupCode) => {
    const positions = findPositions(setupCode, names);
    return positions;
};
