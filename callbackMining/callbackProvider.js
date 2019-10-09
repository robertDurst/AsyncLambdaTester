const path = require('path');
const fs = require('fs');

const mineCallbacks = () => {
  const minedDataDir = path.join(__dirname, './minedData');

  function getCallbacks(baseObjectName, functionName) {
    const matchingCallbacks = [];

    const minedDataFiles = fs.readdirSync(minedDataDir);
    for (let i = 0; i < minedDataFiles.length; i++) {
      const minedDataFile = minedDataFiles[i];
      const minedData = JSON.parse(fs.readFileSync(path.join(minedDataDir, minedDataFile)));
      for (let j = 0; j < minedData.length; j++) {
        const callbackEntry = minedData[j];
        if (typeof baseObjectName !== 'undefined' && callbackEntry.receiverBase !== baseObjectName) { continue; }
        if (typeof functionName !== 'undefined' && callbackEntry.receiverCallee !== functionName) { continue; }

        matchingCallbacks.push(callbackEntry.callback);
      }
    }

    return matchingCallbacks;
  }

  module.exports.getCallbacks = getCallbacks;
};

mineCallbacks();
