const Dictionary = require('vsm-dictionary');
const { getLastPartOfURL, fixedEncodeURIComponent,
  removeDuplicates, isJSONString, cmpIntegerStrings } = require('./fun');

module.exports = class DictionaryPubMed extends Dictionary {

  constructor(options) {
    const opt = options || {};
    super(opt);

    // PubMed-specific parameters
    this.pubMedDictID = 'https://www.ncbi.nlm.nih.gov/pubmed';

    // E-utilities parameters
    this.eutilsDatabase = 'pubmed';
    this.eutilsAPIkey = (typeof opt.apiKey === 'string')
      ? opt.apiKey
      : '57d456615939f9d1897d794ccb6fd1099408';
    this.eutilsRestURL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/';
    this.esummaryRestURL = this.eutilsRestURL + 'esummary.fcgi?db='
        + this.eutilsDatabase + '&id=$ids';
    this.esearchRestURL = this.eutilsRestURL + 'esearch.fcgi?db='
        + this.eutilsDatabase + '&term=$queryString';
    this.esearchSortOption = (typeof opt.sort === 'string')
      ? opt.sort
      : 'most+recent';
    this.eutilsFormat = 'json';

    this.perPageDefault = 50;

    // enable the console.log() usage
    this.enableLogging = opt.log || false;
  }

  getDictInfos(options, cb) {
    let res = {
      items: [
        {
          id: this.pubMedDictID,
          abbrev: 'PubMed',
          name:   'PubMed'
        }
      ]
    };

    if (!this.hasProperFilterIDProperty(options)) {
      return cb(null, res);
    } else {
      return (options.filter.id.includes(this.pubMedDictID))
        ? cb(null, res)
        : cb(null, { items: [] });
    }
  }

  getEntries(options, cb) {
    if (this.hasProperFilterDictIDProperty(options)
      && !options.filter.dictID.includes(this.pubMedDictID)) {
      return cb(null, { items: [] });
    }

    // Getting all entries (paginated) is not supported
    if (!this.hasProperFilterIDProperty(options))
      return cb({ error: 'Not implemented' });

    const url = this.prepareEntrySearchURL(options);
    if (url === '') return cb(null, { items: [] });

    if (this.enableLogging)
      console.log('URL: ' + url);

    this.request(url, (err, res) => {
      if (err) return cb(err);

      let entryObjArray = this.mapEsummaryResToEntryObj(res);

      // sort by id no matter what!
      entryObjArray = entryObjArray.sort((a,b) => {
        return cmpIntegerStrings(getLastPartOfURL(a.id), getLastPartOfURL(b.id));
      });

      // prune results
      entryObjArray = Dictionary.zPropPrune(
        this.trimEntryObjArray(entryObjArray, options), options.z
      );

      cb(err, { items: entryObjArray });
    });
  }

  getEntryMatchesForString(str, options, cb) {
    if ((!str) || (str.trim() === '')) return cb(null, {items: []});

    if (this.hasProperFilterDictIDProperty(options)
      && !options.filter.dictID.includes(this.pubMedDictID)) {
      return cb(null, { items: [] });
    }

    const eSearchURL = this.prepareMatchStringSearchURL(str, options);
    if (eSearchURL === '') return cb(null, { items: [] });

    if (this.enableLogging)
      console.log('URL: ' + eSearchURL);

    this.request(eSearchURL, (err, res) => {
      if (err) return cb(err);
      let pmidList = this.mapEsearchResToPMIDs(res);

      const eSummaryURL = this.prepareEsummaryURL(pmidList);
      if (eSummaryURL === '') return cb(null, { items: [] });

      if (this.enableLogging)
        console.log('URL: ' + eSummaryURL);

      this.request(eSummaryURL, (err, res) => {
        if (err) return cb(err);
        let matchObjArray = this.mapEsummaryResToMatchObj(res, str);

        // z-prune results
        let arr = Dictionary.zPropPrune(matchObjArray, options.z);

        cb(err, { items: arr });
      });
    });
  }

  mapEsearchResToPMIDs(res) {
    let pmidList = res.esearchresult.idlist;
    return (typeof pmidList === 'undefined')
      ? []
      : pmidList;
  }

  mapEsummaryResToEntryObj(res) {
    return Object.keys(res.result).reduce((resObj, PMID) => {
      // PMID is an integer (no leading zeros) and there is no error
      if ((/^[1-9]\d*/.test(PMID))
        && (typeof res.result[PMID].error === 'undefined')) {
        let mainTerm = 'PMID: ' + PMID;
        resObj.push({
          id: this.pubMedDictID + '/' + PMID,
          dictID: this.pubMedDictID,
          descr: this.buildDescr(res.result[PMID]),
          terms: [
            {
              str: mainTerm
            }
          ],
          z: {
            articleIDs: this.buildArticleIDs(res.result[PMID].articleids)
          }
        });
      }
      return resObj;
    }, []);
  }

  mapEsummaryResToMatchObj(res, str) {
    let arr = Object.keys(res.result).reduce((resObj, PMID) => {
      // PMID is an integer (no leading zeros) and there is no error
      if ((/^[1-9]\d*/.test(PMID))
        && (typeof res.result[PMID].error === 'undefined')) {
        let mainTerm = 'PMID: ' + PMID;
        resObj.push({
          id: this.pubMedDictID + '/' + PMID,
          dictID: this.pubMedDictID,
          str: mainTerm,
          descr: this.buildDescr(res.result[PMID]),
          type: mainTerm.startsWith(str.trimLeft()) ? 'S' : 'T',
          terms: [
            {
              str: mainTerm
            }
          ],
          z: {
            articleIDs: this.buildArticleIDs(res.result[PMID].articleids)
          }
        });
      }
      return resObj;
    }, []);

    // the uids array has the proper order of the PMID results
    return this.sortMatchArray(arr, res.result.uids);
  }

  sortMatchArray(arr, uids) {
    if (typeof uids === 'undefined' || !Array.isArray(uids)
      || !arr.every(matchObj => uids.includes(getLastPartOfURL(matchObj.id)))) {
      return arr;
    }
    else {
      let pmids = removeDuplicates(uids);
      return pmids.reduce((res, pmid) => {
        let obj = arr.find(matchObj => {
          return matchObj.id.includes(pmid);
        });

        if (obj) res.push(obj);

        return res;
      }, []);
    }
  }

  prepareEsummaryURL(pmidList) {
    // keep only numbers > 0
    pmidList = pmidList.filter(id => /^\+?[1-9]\d*$/.test(id));
    if (pmidList.length === 0) return '';

    let url = this.esummaryRestURL;
    let ids = pmidList.join();

    url = url.replace('$ids', ids);

    url += '&retmode=' + this.eutilsFormat;

    if (this.eutilsAPIkey !== '')
      url += '&api_key=' + this.eutilsAPIkey;

    return url;
  }

  prepareEsearchURL(str, options) {
    if (str === '') return '';

    let url = this.esearchRestURL;
    url = url.replace('$queryString', fixedEncodeURIComponent(str));

    let pageSize = this.hasProperPerPageProperty(options)
      ? options.perPage
      : this.perPageDefault;

    url += '&retmax=' + pageSize;

    let start = this.hasProperPageProperty(options)
      ? (options.page - 1) * pageSize
      : 0;

    url += '&retstart=' + start;

    url += '&sort=' + this.esearchSortOption;
    url += '&retmode=' + this.eutilsFormat;

    if (this.eutilsAPIkey !== '')
      url += '&api_key=' + this.eutilsAPIkey;
    return url;
  }

  prepareEntrySearchURL(options) {
    if (this.hasProperFilterIDProperty(options)) {
      let pmidList = options.filter.id.filter(
        id => id.trim().startsWith(this.pubMedDictID)
      );
      pmidList = pmidList.map(id => getLastPartOfURL(id).trim());
      return this.prepareEsummaryURL(pmidList);
    } else {
      return '';
    }
  }

  prepareMatchStringSearchURL(str, options) {
    str = str.trim();

    // PMID hack
    let PMIDRegex = /pmid: *(\d+)$/i;
    let match = str.match(PMIDRegex);
    str = (match)
      ? match[1].startsWith('0') ? str : match[1]
      : str;

    return this.prepareEsearchURL(str, options);
  }

  buildDescr(pmidEntry) {
    // {main author's name} ({Journal} {publication year}), {title}
    let descr = '';

    let mainAuthor = '';
    if ((typeof pmidEntry.authors !== 'undefined') && pmidEntry.authors.length > 0)
      mainAuthor = pmidEntry.authors[0].name;

    let journal = '';
    let year = '';
    if (typeof pmidEntry.source !== 'undefined')
      journal = pmidEntry.source;
    if (typeof pmidEntry.pubdate !== 'undefined') {
      // take the first 4-digit number (publication year)
      let dateStr = pmidEntry.pubdate.trim();
      let yearRegex = /^(\d{4}).*/;
      let match = dateStr.match(yearRegex);
      if (match) {
        year = match[1];
      } else {
        year = dateStr;
      }
    }

    let parenthesisStr = '';
    if (journal !== '' && year !== '')
      parenthesisStr += '(' + journal + ' ' + year + ')';
    else if (journal !== '' && year === '')
      parenthesisStr += '(' + journal + ')';
    else if (journal === '' && year !== '')
      parenthesisStr += '(' + year + ')';

    let title = '';
    if (typeof pmidEntry.title !== 'undefined')
      title = pmidEntry.title;

    if (mainAuthor !== '')
      descr += mainAuthor;
    if (parenthesisStr !== '')
      if (mainAuthor !== '')
        descr += ' ' + parenthesisStr;
      else
        descr += parenthesisStr;
    if (title !== '')
      if ((parenthesisStr !== '') || (mainAuthor !== ''))
        descr += ', ' + title;
      else
        descr += title;

    return descr;
  }

  buildArticleIDs(articlesIDs) {
    if (typeof articlesIDs === 'undefined') return [];
    else
      return articlesIDs.map(idObj => ({type: idObj.idtype, value: idObj.value}));
  }

  trimEntryObjArray(arr, options) {
    let numOfResults = arr.length;
    let page = this.hasProperPageProperty(options)
      ? options.page
      : 1;
    let pageSize = this.hasProperPerPageProperty(options)
      ? options.perPage
      : this.perPageDefault;

    return arr.slice(
      ((page - 1) * pageSize),
      Math.min(page * pageSize, numOfResults)
    );
  }

  hasProperFilterDictIDProperty(options) {
    return options.hasOwnProperty('filter')
      && options.filter.hasOwnProperty('dictID')
      && Array.isArray(options.filter.dictID)
      && options.filter.dictID.length !== 0;
  }

  hasProperFilterIDProperty(options) {
    return options.hasOwnProperty('filter')
      && options.filter.hasOwnProperty('id')
      && Array.isArray(options.filter.id)
      && options.filter.id.length !== 0;
  }

  hasProperPageProperty(options) {
    return options.hasOwnProperty('page')
      && Number.isInteger(options.page)
      && options.page >= 1;
  }

  hasProperPerPageProperty(options) {
    return options.hasOwnProperty('perPage')
      && Number.isInteger(options.perPage)
      && options.perPage >= 1;
  }

  request(url, cb) {
    const req = this.getReqObj();
    req.onreadystatechange = function () {
      if (req.readyState === 4) {
        if (req.status !== 200) {
          let response = req.responseText;
          if (isJSONString(response)) {
            cb(JSON.parse(response));
          } else {
            let err = '{ "status": ' + req.status
              + ', "error": ' + JSON.stringify(response) + '}';
            cb(JSON.parse(err));
          }
        }
        else {
          try {
            const response = JSON.parse(req.responseText);
            cb(null, response);
          } catch (err) {
            cb(err);
          }
        }
      }
    };
    req.open('GET', url, true);
    req.send();
  }

  getReqObj() {
    return new (typeof XMLHttpRequest !== 'undefined'
      ? XMLHttpRequest // In browser
      : require('xmlhttprequest').XMLHttpRequest  // In Node.js
    )();
  }

};
