# vsm-dictionary-pubmed

<!-- badges: start -->
[![Build Status](https://travis-ci.com/UniBioDicts/vsm-dictionary-pubmed.svg?branch=master)](https://travis-ci.com/UniBioDicts/vsm-dictionary-pubmed)
[![codecov](https://codecov.io/gh/UniBioDIcts/vsm-dictionary-pubmed/branch/master/graph/badge.svg)](https://codecov.io/gh/UniBioDIcts/vsm-dictionary-pubmed)
[![npm version](https://img.shields.io/npm/v/vsm-dictionary-pubmed)](https://www.npmjs.com/package/vsm-dictionary-pubmed)
[![Downloads](https://img.shields.io/npm/dm/vsm-dictionary-pubmed)](https://www.npmjs.com/package/vsm-dictionary-pubmed)
[![License](https://img.shields.io/npm/l/vsm-dictionary-pubmed)](#license)
<!-- badges: end -->

## Summary

`vsm-dictionary-pubmed` is an implementation 
of the 'VsmDictionary' parent-class/interface (from the package
[`vsm-dictionary`](https://github.com/vsmjs/vsm-dictionary)), that uses 
NCBI's [Programming Utilities (E-utilities) API](https://www.ncbi.nlm.nih.gov/books/NBK25501/) 
to interact with [Entrez's](https://www.ncbi.nlm.nih.gov/Web/Search/entrezfs.html) 
PubMed MEDLINE database and retrieve bibliographic information for articles from 
the biomedical literature.

Note that **PubMed** is actually a search engine that is used to access biomedical 
literature not only from MEDLINE, but also from other life science journals 
and online books. So, even though PubMed is not the actual database that holds 
the literature data, it's commonly referred to as such and that's why we named 
this vsm-dictionary after it.

## Install

Run: `npm install`

## Example use

Create a `test.js` file and include this code:

```javascript
const DictionaryPubMed = require('./DictionaryPubMed');
const dict = new DictionaryPubMed({ log: true, apiKey: ''});

dict.getEntryMatchesForString('logical modeling', { page: 1, perPage: 10 }, 
  (err, res) => {
    if (err) 
      console.log(JSON.stringify(err, null, 4));
    else
      console.log(JSON.stringify(res, null, 4));
  }
);
```
Then, run `node test.js`

Note that by using no API key (as in the example above - empty string or absent `apiKey` property) 
the **upper limit of requests/sec to NCBI's Entrez system is 3**. 
A registered NCBI user can request for an API key, which will increase this 
limit to **10 requests/sec** (see [blog post](https://ncbiinsights.ncbi.nlm.nih.gov/2017/11/02/new-api-keys-for-the-e-utilities/)). 
This limit is very important because the [vsm-autocomplete](https://github.com/vsmjs/vsm-autocomplete) module 
that uses a vsm-dictionary as input, sends many such requests/sec since when 
someone types a string in the input-field component, it uses the `getEntryMatchesForString`
function of the underlying vsm-dictionary (and typing fast for example can trigger
many such calls). When the requests exceed the aforementioned
limit in each case, an error object is returned from the Entrez servers (HTTP 429).

In order to account for this limit, we have implemented a rate limiter function that 
accumulates in a queue the requests to NCBI's servers (see below the specification
for `getEntries` and `getEntryMatchesForString` to see the exact URL requests) and 
sends only *one request per 200 ms* - thus ensuring that we will never receive 
back that error **when using a proper API key**.

## Tests

Run `npm test`, which runs the source code tests with Mocha.  
If you want to quickly live test the E-utilities API, go to the 
`test` directory and run:
```
node getEntries.test.js
node getEntryMatchesForString.test.js
```

## 'Build' configuration

To use a VsmDictionary in Node.js, one can simply run `npm install` and then
use `require()`. But it is also convenient to have a version of the code that
can just be loaded via a &lt;script&gt;-tag in the browser.

Therefore, we included `webpack.config.js`, which is a Webpack configuration file for 
generating such a browser-ready package.

By running `npm build`, the built file will appear in a 'dist' subfolder. 
You can use it by including: 
`<script src="../dist/vsm-dictionary-pubmed.min.js"></script>` in the
header of an HTML file.

## Specification

Like all VsmDictionary subclass implementations, this package follows
the parent class [specification](https://github.com/vsmjs/vsm-dictionary/blob/master/Dictionary.spec.md).
In the next sections we will explain the mapping between the data 
offered by two of Entrez's E-utilities (*esearch* and *esummary*) and the 
corresponding VSM objects. Find the documentation for the API here: 
https://dataguide.nlm.nih.gov/eutilities/utilities.html.

Note that in the next functions, whenever we sent requests to NCBI's servers and 
receive an error response that is not a valid JSON string that we can parse, we 
formulate the error as a JSON object ourselves in the following format:
```
{
  status: <number>,
  error: <response> 
}
```
where the *response* from the server is JSON stringified. 

### Map PubMed Data to DictInfo VSM object

This specification relates to the function:  
 `getDictInfos(options, cb)`

If the `options.filter.id` is not properly defined 
or the `https://www.ncbi.nlm.nih.gov/pubmed` dictID is included in the 
list of ids used for filtering, `getDictInfos` returns a static object 
with the following properties:
- `id`: 'https://www.ncbi.nlm.nih.gov/pubmed' (will be used as a `dictID`)
- `abbrev`: 'PubMed'
- `name`: 'PubMed'

Otherwise, an empty result is returned.

### Map Esummary to Entry VSM object

This specification relates to the function:  
 `getEntries(options, cb)`

Firstly, if the `options.filter.dictID` is properly defined and in the list of 
dictIDs the `https://www.ncbi.nlm.nih.gov/pubmed` dictID is not included, then 
an **empty array** of entry objects is returned.

If the `options.filter.id` is properly defined (with IDs like
`https://www.ncbi.nlm.nih.gov/pubmed/12345`) then we use a query like this:

```
https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=1,10,20,2&retmode=json&api_key=xyz
```

For the above URL, we provide a brief description for each sub-part: 
- The first part refers to the E-utilities base URL: https://eutils.ncbi.nlm.nih.gov/entrez/eutils/
- The second part refers to the E-utility used (*esummary*)
- The third part refers to the database that we request data from (*pubmed*)
- The fourth part is the *entry IDs* (PubMed-specific ids or **PMIDs**), comma separated (we extract the last part 
of the PubMed-specific URI for each ID). Note that for VSM the URI ID is 
something like: `https://www.ncbi.nlm.nih.gov/pubmed/12345`.
- The fifth part defines the format of the returned data (JSON)
- The last part defines the API key which is the (string) value of the property 
`apiKey` given to the `DictionaryPubMed` constructor.

Otherwise, we get an error object back since the API does not support the retrieval
of all PubMed ids information (paginated):
```
{ 
  error: 'Not implemented' 
}
```

When using the E-utilities esummary API, we get back a JSON object with a *result* 
property whose value is the object of returned results. 
This object has *as keys the PMIDs* and values objects which include the 
information for each PMID (the *summaries* so to say). 
We now provide a mapping of each PMID's information object properties to 
VSM-entry specific properties:

PMID field | Type | Required | VSM entry/match object property | Notes  
:---:|:---:|:---:|:---:|:---:
`Object.keys(result)` | Array | YES | `id` | The VSM entry id is the full URI, not just the PMID
`Object.keys(result)` | Array | YES | `str`, `terms[i].str` | The main term is 'PMID:\<PMID\>' 
`result[PMID].authors[0].name, result[PMID].source, result[PMID].pubdate, result[PMID].title` | Strings | NO | `descr` | The `descr` form is: {main author's name} ({Journal} {publication year}), {title}
`result[PMID].articleids` | Array | YES | `z.articleIDs` | We map the whole array

Note that the whole point of the above mapping is to have a good enough `descr`
string, so that a user (curator) will be able to distinguish an entry article 
from the others (the PMID is enough for the computer, but not for humans).

After mapping the results to VSM objects, we sort them based on the PMID value 
and then prune them according to the values `options.page` (default: 1) and 
`options.perPage` (default: 50).

### Map Esearch to Match VSM object

This specification relates to the function:  
 `getEntryMatchesForString(str, options, cb)`

Firstly, if the `options.filter.dictID` is properly defined and in the list of 
dictIDs the `https://www.ncbi.nlm.nih.gov/pubmed` dictID is not included, then 
an **empty array** of match objects is returned.

Otherwise, we use **two URLs**: one to get the relevant PMIDs that match the 
requested string term (using the *esearch* endpoint) and one like in the `getEntries` 
case, to get the article summaries matching the previously-found PMIDs (using the *esummary* endpoint). 
An example of these two queries, when searching for `logical modeling` as `str`, 
would be:
```
https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=logical%20modeling&retmax=3&retstart=0&sort=most+recent&retmode=json
https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=31515732,31407132,31347261&retmode=json
```

For the second URL, concerning the *esummary* endpoint, a description of each 
sub-part was given in the section above.
For the first URL, concerning the *esearch* endpoing, we now provide a brief 
description for each sub-part: 
- The first part refers to the E-utilities base URL: https://eutils.ncbi.nlm.nih.gov/entrez/eutils/
- The second part refers to the E-utility used (*esearch*)
- The third part refers to the database that we request data from (*pubmed*)
- The fourth part is the term that we request to search PMIDs for.
- The `retmax` and `retstart` parameters define which and how many results will 
be included in the returned result. They depend on the `options.page` and 
`options.perPage` options. Default values are 50 and 0 respectively.
- The `sort` parameter defines the returned order of the the PMIDs. The default 
value is `most recent`. Other acceptable values are:
    - `journal`
    - `pub+date`
    - `relevance`
    - `title`
    - `author`  
This option can be defined in the constructor:   
`const dict = new DictionaryPubMed({ sort: 'relevance' });`
- The last part defines the format of the returned data (JSON)
- There can also be a part that defines the API key as in the `esummary` case.

The first URL returns an object (let's call it `res`) and we get the PMIDs 
associated with the searched term `str` as an array of strings (the value of the 
`res.esearchresult.idlist`). We then use the returned PMIDs to fill in the second
URL and get back the respective article summaries which we map to VSM-match
objects as shown in the table above for the `getEntries(options, cb)` case.

Note that the **most efficient way to get back a specific article** is to 
search using a string `str` that matches the PMID or the PMC or the DOI
number of that article. For example any of the following `str` will return one
result (VSM-match object corresponding to the article):
- `7717779`
- `PMID:7717779`
- `Pmid: 7717779`
- `pmiD: 7717779` (note that the PMID keyword is case-insensitive)
- `PMC1234567`
- `10.1097/00000658-199503000-00007` (**not `DOI: <doi string>`**)

## License

This project is licensed under the AGPL license - see [LICENSE.md](LICENSE.md).
