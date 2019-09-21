/**
 * File used to quick test the `getEntryMatchesForString` function of
 * `DictionaryPubMed.js`
 */

const DictionaryPubMed = require('../src/DictionaryPubMed');

const dict = new DictionaryPubMed({ log: true, apiKey: '' });

dict.getEntryMatchesForString('logical modeling', { page: 1, perPage: 3, z: [] },
  (err, res) => {
    if (err) console.log(JSON.stringify(err, null, 4));
    else {
      console.log(JSON.stringify(res, null, 4));
      console.log('\n#Results: ' + res.items.length);
    }
  }
);
