const DictionaryPubMed = require('./DictionaryPubMed');
const chai = require('chai');
let should = chai.should();
const expect = chai.expect;
const fs = require('fs');
const path = require('path');

describe('DictionaryPubMed.js', () => {

  const dict = new DictionaryPubMed();

  const getEsummaryPath = path.join(__dirname, '..', 'resources', 'esummary.json');
  const getEsummaryStr = fs.readFileSync(getEsummaryPath, 'utf8');

  describe('getDictInfos', () => {
    it('returns empty result when the list of dictIDs does not '
      + ' include PubMed\'s dictID', cb => {
      dict.getDictInfos({ filter: { id: [
        ' ',
        'https://www.uniprot.org',
        'https://www.ensemblgenomes.org' ]}},
      (err, res) => {
        expect(err).to.equal(null);
        res.should.deep.equal({ items: [] });
        cb();
      });
    });

    it('returns proper dictInfo object when `options.filter` is not properly ' +
      'defined or when PubMed\'s dictID is in the list of specified dictIDs', cb => {
      let expectedResult = { items: [
        {
          id: 'https://www.ncbi.nlm.nih.gov/pubmed',
          abbrev: 'PubMed',
          name: 'PubMed'
        }
      ]};

      dict.getDictInfos({}, (err, res) => {
        expect(err).to.equal(null);
        res.should.deep.equal(expectedResult);
      });

      dict.getDictInfos({ filter: { id: [
        'http://www.ensemblgenomes.org',
        'https://www.ebi.ac.uk/complexportal',
        'https://www.ncbi.nlm.nih.gov/pubmed' ]}},
      (err, res) => {
        expect(err).to.equal(null);
        res.should.deep.equal(expectedResult);
      });

      cb();
    });
  });

  describe('getEntries', () => {
    it('returns empty result when the `options.filter.dictID` is properly ' +
      'defined and in the list of dictIDs the PubMed dictID is not included', cb => {
      dict.getEntries({filter: { dictID: ['']}}, (err, res) => {
        expect(err).to.equal(null);
        res.should.deep.equal({ items: [] });
      });

      dict.getEntries({filter: { dictID: [
        ' ',
        'https://www.uniprot.org',
        'http://www.ensemblgenomes.org'
      ]}}, (err, res) => {
        expect(err).to.equal(null);
        res.should.deep.equal({ items: [] });
      });

      cb();
    });

    it('returns \'Not implemented\' error when the `options.filter.id` ' +
      'is not properly defined even though the `options.filter.dictID` ' +
      'includes the PubMed dictID or none at all (you cannot get all ' +
      'entries paginated)', cb => {
      dict.getEntries({filter: { dictID: [
        'https://www.ncbi.nlm.nih.gov/pubmed'
      ]}}, (err, res) => {
        err.should.deep.equal({error: 'Not implemented'});
        should.not.exist(res);
      });

      dict.getEntries({filter: { dictID: [] }}, (err, res) => {
        err.should.deep.equal({error: 'Not implemented'});
        should.not.exist(res);
      });

      dict.getEntries({filter: {
        dictID: [
          'http://www.ensemblgenomes.org',
          'https://www.ncbi.nlm.nih.gov/pubmed'
        ],
        id: []
      }}, (err, res) => {
        err.should.deep.equal({error: 'Not implemented'});
        should.not.exist(res);
      });

      cb();
    });

    it('returns empty result when both the `options.filter.dictID` and ' +
        '`options.filter.id` are properly defined, but the ids are not ' +
        'proper PMIDs', cb => {
      dict.getEntries({filter: {
        dictID: ['https://www.ncbi.nlm.nih.gov/pubmed'],
        id: [ '', 'https://www.ncbi.nlm.nih.gov/pubmed/008869', '  ',
          'https://www.other.com/142208  ', 'https://www.uniprot.org/P12345'
        ]
      }}, (err, res) => {
        expect(err).to.equal(null);
        res.should.deep.equal({ items: [] });
      });

      cb();
    });
  });

  describe('getEntryMatchesForString', () => {
    it('returns empty result when the `options.filter.dictID` is properly ' +
      'defined and in the list of dictIDs the domain\'s dictID is not included', cb => {
      dict.getEntryMatchesForString('abc', {filter: { dictID: ['']}},
        (err, res) => {
          expect(err).to.equal(null);
          res.should.deep.equal({ items: [] });
        });

      dict.getEntryMatchesForString('abc', {filter: { dictID: [
        ' ',
        'https://www.uniprot.org',
        'http://www.ensemblgenomes.org']}},
      (err, res) => {
        expect(err).to.equal(null);
        res.should.deep.equal({ items: [] });
      });

      cb();
    });
  });

  describe('mapEsummaryResToEntryObj', () => {
    it('properly maps Esummary returned JSON object to a VSM entry '
      + 'object', cb => {
      dict.mapEsummaryResToEntryObj(JSON.parse(getEsummaryStr))
        .should.deep.equal(
          [
            {
              id: 'https://www.ncbi.nlm.nih.gov/pubmed/12345',
              dictID: 'https://www.ncbi.nlm.nih.gov/pubmed',
              descr: 'Rubinstein MH (J Pharm Pharmacol 1976), A new granulation method for compressed tablets [proceedings].',
              terms: [
                { str: 'PMID: 12345' }
              ],
              z: {
                articleIDs: [
                  {
                    type: 'pubmed',
                    value: '12345'
                  },
                  {
                    type: 'pii',
                    value: 'S1071575402000153'
                  },
                  {
                    type: 'rid',
                    value: '12345'
                  },
                  {
                    type: 'eid',
                    value: '12345'
                  }
                ]
              }
            }
          ]
        );

      cb();
    });
  });

  describe('mapEsummaryResToMatchObj', () => {
    it('properly maps Esummary returned JSON object to a VSM match '
      + 'object', cb => {
      dict.mapEsummaryResToMatchObj(JSON.parse(getEsummaryStr), 'str')
        .should.deep.equal(
          [
            {
              id: 'https://www.ncbi.nlm.nih.gov/pubmed/12345',
              dictID: 'https://www.ncbi.nlm.nih.gov/pubmed',
              str: 'PMID: 12345',
              descr: 'Rubinstein MH (J Pharm Pharmacol 1976), A new granulation method for compressed tablets [proceedings].',
              type: 'T',
              terms: [
                { str: 'PMID: 12345' }
              ],
              z: {
                articleIDs: [
                  {
                    type: 'pubmed',
                    value: '12345'
                  },
                  {
                    type: 'pii',
                    value: 'S1071575402000153'
                  },
                  {
                    type: 'rid',
                    value: '12345'
                  },
                  {
                    type: 'eid',
                    value: '12345'
                  }
                ]
              }
            }
          ]
        );

      cb();
    });
  });

  describe('sortMatchArray', () => {
    it('returns sorted VSM-match object array based on given PMID array', cb => {
      const arr = [
        { id: 'https://www.ncbi.nlm.nih.gov/pubmed/1' },
        { id: 'https://www.ncbi.nlm.nih.gov/pubmed/2' },
        { id: 'https://www.ncbi.nlm.nih.gov/pubmed/3' },
        { id: 'https://www.ncbi.nlm.nih.gov/pubmed/4' }
      ];

      let uids = undefined;
      dict.sortMatchArray(arr, uids).should.deep.equal(arr);

      uids = [];
      dict.sortMatchArray(arr, uids).should.deep.equal(arr);

      uids = ['3', '2', '1', '100']; // not all of them there
      dict.sortMatchArray(arr, uids).should.deep.equal(arr);

      uids.push('4');
      const expectedArr = [
        { id: 'https://www.ncbi.nlm.nih.gov/pubmed/3' },
        { id: 'https://www.ncbi.nlm.nih.gov/pubmed/2' },
        { id: 'https://www.ncbi.nlm.nih.gov/pubmed/1' },
        { id: 'https://www.ncbi.nlm.nih.gov/pubmed/4' }
      ];
      dict.sortMatchArray(arr, uids).should.deep.equal(expectedArr);

      uids = ['4', '2', '1', '3', '1', '4'];
      const expectedArr2 = [
        { id: 'https://www.ncbi.nlm.nih.gov/pubmed/4' },
        { id: 'https://www.ncbi.nlm.nih.gov/pubmed/2' },
        { id: 'https://www.ncbi.nlm.nih.gov/pubmed/1' },
        { id: 'https://www.ncbi.nlm.nih.gov/pubmed/3' }
      ];
      dict.sortMatchArray(arr, uids).should.deep.equal(expectedArr2);

      uids = ['4', '2', '1', '1', '3', '4'];
      dict.sortMatchArray(arr, uids).should.deep.equal(expectedArr2);

      uids = uids.slice(0,3);
      dict.sortMatchArray(arr, uids).should.deep.equal(arr);

      cb();
    });
  });

  describe('prepareEsummaryURL', () => {
    it('returns proper URL', cb => {
      let pmidList = [];
      dict.prepareEsummaryURL(pmidList).should.equal('');

      pmidList = ['', '  '];
      dict.prepareEsummaryURL(pmidList).should.equal('');

      pmidList = ['a', '12k', '', '0'];
      dict.prepareEsummaryURL(pmidList).should.equal('');

      pmidList.push('-2');
      pmidList.push('012');
      dict.prepareEsummaryURL(pmidList).should.equal('');

      pmidList.push('23');
      dict.prepareEsummaryURL(pmidList).should.equal('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=23&retmode=json');

      pmidList.push('99999');
      pmidList.push('1');
      dict.prepareEsummaryURL(pmidList).should.equal('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=23,99999,1&retmode=json');

      cb();
    });
  });

  describe('prepareEsearchURL', () => {
    it('returns proper URL', cb => {
      const esearchURLPart = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=as%20ta';
      const lastURLPart = '&sort=most+recent&retmode=json';
      dict.prepareEsearchURL('', {}).should.equal('');
      dict.prepareEsearchURL('as ta', {})
        .should.equal(esearchURLPart + '&retmax=50&retstart=0' + lastURLPart);
      dict.prepareEsearchURL('as ta', { page: 2 })
        .should.equal(esearchURLPart + '&retmax=50&retstart=50' + lastURLPart);
      dict.prepareEsearchURL('as ta', { page: 4, perPage: 3})
        .should.equal(esearchURLPart + '&retmax=3&retstart=9' + lastURLPart);
      dict.prepareEsearchURL('as ta', { perPage: 22})
        .should.equal(esearchURLPart + '&retmax=22&retstart=0' + lastURLPart);

      cb();
    });
  });

  describe('prepareEntrySearchURL', () => {
    it('returns proper URL', cb => {
      dict.prepareEntrySearchURL({}).should.equal('');
      dict.prepareEntrySearchURL({ page: 1, perPage: 2 }).should.equal('');
      dict.prepareEntrySearchURL({ filter: { id: ['']}, page: 1, perPage: 2 })
        .should.equal('');
      dict.prepareEntrySearchURL({ filter: { id: ['https://www.ncbi.nlm.nih.gov/pubmed/510']},
        page: 3, perPage: 20 }).should.equal('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=510&retmode=json');
      dict.prepareEntrySearchURL({ filter: {
        id: [ '', 'https://www.ncbi.nlm.nih.gov/pubmed/0008869', '  ',
          'https://www.ncbi.nlm.nih.gov/pubmed/142208  ', 'https://www.ncbi.nlm.nih.gov/pubmed/321',
          'https://www.uniprot.org/P12345']
      }}).should.equal('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=142208,321&retmode=json');

      cb();
    });
  });

  describe('prepareMatchStringSearchURL', () => {
    it('returns proper URL', cb => {
      const URLPart1 = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed';
      const URLPart2 = '&retmax=50&retstart=0&sort=most+recent&retmode=json';
      dict.prepareMatchStringSearchURL('', {}).should.equal('');
      dict.prepareMatchStringSearchURL('  ', {}).should.equal('');
      dict.prepareMatchStringSearchURL('PMC5860113', {}) // PMCID example
        .should.equal(URLPart1 + '&term=PMC5860113' + URLPart2);
      dict.prepareMatchStringSearchURL('5860113', { page: 1 }) // PMID example
        .should.equal(URLPart1 + '&term=5860113' + URLPart2);
      dict.prepareMatchStringSearchURL('10.1091/mbc.11.6.2047', {}) // doi example
        .should.equal(URLPart1 + '&term=10.1091%2Fmbc.11.6.2047' + URLPart2);

      // test several PMID forms
      dict.prepareMatchStringSearchURL('PMID:1234', {})
        .should.equal(URLPart1 + '&term=1234' + URLPart2);
      dict.prepareMatchStringSearchURL('pMiD:1234', {})
        .should.equal(URLPart1 + '&term=1234' + URLPart2);
      dict.prepareMatchStringSearchURL('pmid: 1234', {})
        .should.equal(URLPart1 + '&term=1234' + URLPart2);
      dict.prepareMatchStringSearchURL(' PMID:1234  ', {})
        .should.equal(URLPart1 + '&term=1234' + URLPart2);
      dict.prepareMatchStringSearchURL('PMID: 1234', {})
        .should.equal(URLPart1 + '&term=1234' + URLPart2);
      dict.prepareMatchStringSearchURL('PMID:   1234', {})
        .should.equal(URLPart1 + '&term=1234' + URLPart2);
      dict.prepareMatchStringSearchURL('pmid : 1234', {})
        .should.equal(URLPart1 + '&term=pmid%20%3A%201234' + URLPart2);
      dict.prepareMatchStringSearchURL('PMID:', {})
        .should.equal(URLPart1 + '&term=PMID%3A' + URLPart2);
      dict.prepareMatchStringSearchURL('PMID:r34', {})
        .should.equal(URLPart1 + '&term=PMID%3Ar34' + URLPart2);
      dict.prepareMatchStringSearchURL('PMID:34a', {})
        .should.equal(URLPart1 + '&term=PMID%3A34a' + URLPart2);
      dict.prepareMatchStringSearchURL('PMID:0', {})
        .should.equal(URLPart1 + '&term=PMID%3A0' + URLPart2);
      dict.prepareMatchStringSearchURL('PMID:00234', {})
        .should.equal(URLPart1 + '&term=PMID%3A00234' + URLPart2);

      cb();
    });
  });

  describe('buildDescr', () => {
    it('returns proper description string', cb => {
      let pmidEntry = {
        authors: [
          {
            name: 'Melancon P',
            authtype: 'Author',
            clusterid: ''
          },
          {
            name: 'Garoff H',
            authtype: 'Author',
            clusterid: ''
          }
        ],
        xyz: 'other properties with values',
        source: 'Nature Publications',
        title: 'Axomynoxils acting crazy!',
        pubdate: '1999, Dec 6th'
      };

      dict.buildDescr(pmidEntry).should.equal('Melancon P (Nature Publications 1999), Axomynoxils acting crazy!');

      pmidEntry.pubdate = 'Dec 6th, 1987';
      dict.buildDescr(pmidEntry).should.equal('Melancon P (Nature Publications Dec 6th, 1987), Axomynoxils acting crazy!');

      pmidEntry.pubdate = undefined;
      pmidEntry.source = undefined;
      dict.buildDescr(pmidEntry).should.equal('Melancon P, Axomynoxils acting crazy!');

      pmidEntry.authors = [];
      dict.buildDescr(pmidEntry).should.equal('Axomynoxils acting crazy!');

      pmidEntry.pubdate = '1999';
      dict.buildDescr(pmidEntry).should.equal('(1999), Axomynoxils acting crazy!');

      pmidEntry.pubdate = undefined;
      pmidEntry.source = 'Journal of Comedy';
      dict.buildDescr(pmidEntry).should.equal('(Journal of Comedy), Axomynoxils acting crazy!');

      cb();
    });
  });

  describe('trimEntryObjArray', () => {
    it('properly trims given array of VSM entry objects', cb => {
      const arr = [
        { id:'a', dictID: 'A', terms: [{ str: 'aaa'}] },
        { id:'b', dictID: 'B', terms: [{ str: 'bbb'}] },
        { id:'c', dictID: 'C', terms: [{ str: 'ccc'}] }
      ];

      let options = {};
      dict.trimEntryObjArray(arr, options).should.deep.equal(arr);

      options.page = 2;
      dict.trimEntryObjArray([], options).should.deep.equal([]);

      options.page = -1;
      options.perPage = 'no';
      dict.trimEntryObjArray(arr, options).should.deep.equal(arr);

      options.page = 1;
      options.perPage = 2;
      dict.trimEntryObjArray(arr, options).should.deep.equal(arr.slice(0,2));

      options.page = 2;
      dict.trimEntryObjArray(arr, options).should.deep.equal(arr.slice(2,3));

      options.page = 3;
      dict.trimEntryObjArray(arr, options).should.deep.equal([]);

      cb();
    });
  });

});
