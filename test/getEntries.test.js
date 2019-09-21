/**
 * File used to quick test the `getEntries` function of
 * `DictionaryPubMed.js`
 */

const DictionaryPubMed = require('../src/DictionaryPubMed');

const dict = new DictionaryPubMed({ log: true, apiKey: '' });

dict.getEntries({
  filter: {
    id: [
      'uniprot/P12323',
      'https://www.ncbi.nlm.nih.gov/pubmed/3124780237483278493',
      'https://www.ncbi.nlm.nih.gov/pubmed/1',
      'https://www.ncbi.nlm.nih.gov/pubmed/10',
      'https://www.ncbi.nlm.nih.gov/pubmed/20',
      'https://www.ncbi.nlm.nih.gov/pubmed/2',
    ]
  },
  page: 1,
  perPage: 4,
  z: true
}, (err, res) => {
  if (err) console.log(JSON.stringify(err, null, 4));
  else {
    console.log(JSON.stringify(res, null, 4));
    console.log('\n#Results: ' + res.items.length);
  }
});