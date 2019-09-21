const { getLastPartOfURL, fixedEncodeURIComponent,
  removeDuplicates, isJSONString, cmpIntegerStrings } = require('./fun');
const chai = require('chai'); chai.should();
const expect = chai.expect;
const fs = require('fs');
const path = require('path');

describe('fun.js', () => {

  const getEsummaryPath = path.join(__dirname, '..', 'resources', 'esummary.json');
  const getEsummaryStr = fs.readFileSync(getEsummaryPath, 'utf8');

  describe('getLastPartOfURL', () => {
    it('returns the last part of a URL', cb => {
      const url1 = 'http://data.bioontology.org/ontologies/RH-MESH';
      const url2 = 'https://www.uniprot.org/uniprot/P12345';
      const url3 = 'a/b/e';
      const url4 = 'string';

      getLastPartOfURL(url1).should.equal('RH-MESH');
      getLastPartOfURL(url2).should.equal('P12345');
      getLastPartOfURL(url3).should.equal('e');
      getLastPartOfURL(url4).should.equal('string');

      cb();
    });
  });

  describe('fixedEncodeURIComponent', () => {
    it('tests the difference between the standard encoding function ' +
      'and the updated implementation (compatible with RFC 3986)', cb => {
      encodeURIComponent('!').should.equal('!');
      fixedEncodeURIComponent('!').should.equal('%21');

      encodeURIComponent('\'').should.equal('\'');
      fixedEncodeURIComponent('\'').should.equal('%27');

      encodeURIComponent('(').should.equal('(');
      fixedEncodeURIComponent('(').should.equal('%28');

      encodeURIComponent(')').should.equal(')');
      fixedEncodeURIComponent(')').should.equal('%29');

      encodeURIComponent('*').should.equal('*');
      fixedEncodeURIComponent('*').should.equal('%2A');

      cb();
    });
  });

  describe('removeDuplicates', () => {
    it('returns proper results', cb => {
      removeDuplicates([]).should.deep.equal([]);
      removeDuplicates([1,2,3]).should.deep.equal([1,2,3]);
      removeDuplicates([1,2,1,3,1,2]).should.deep.equal([1,2,3]);
      removeDuplicates(['r','t','t','s','r','e','s'])
        .should.deep.equal(['r','t','s','e']);
      cb();
    });
  });

  describe('isJSONString', () => {
    it('returns true or false whether the given string is a JSON string or ' +
      'not!', cb => {
      expect(isJSONString('')).to.equal(false);
      expect(isJSONString([])).to.equal(false);
      expect(isJSONString({})).to.equal(false);
      expect(isJSONString('{}')).to.equal(true);
      expect(isJSONString('This is not a JSON string.')).to.equal(false);
      expect(isJSONString('["foo","bar",{"foo":"bar"}]')).to.equal(true);
      expect(isJSONString('{"myCount": null}')).to.equal(true);
      expect(isJSONString(getEsummaryStr)).to.equal(true);

      cb();
    });
  });

  describe('cmpIntegerStrings', () => {
    it('returns proper value denoting the sorting order of the comparing ' +
      'integer strings', cb => {
      // both inputs have to be integers
      cmpIntegerStrings('', '').should.equal(0);
      cmpIntegerStrings('1', '').should.equal(0);

      // a == b
      cmpIntegerStrings('1', '1').should.equal(0);
      cmpIntegerStrings('-1', '-1').should.equal(0);
      cmpIntegerStrings('02', '2').should.equal(0); // left zeros are 'trimmed'

      // a < b
      cmpIntegerStrings('1', '2').should.equal(-1);
      cmpIntegerStrings('-1', '2').should.equal(-1);
      cmpIntegerStrings('0', '2').should.equal(-1);
      cmpIntegerStrings('0', '10').should.equal(-1);
      cmpIntegerStrings('1', '10').should.equal(-1);
      cmpIntegerStrings('100', '1000').should.equal(-1);
      cmpIntegerStrings('01', '10').should.equal(-1);

      // a > b
      cmpIntegerStrings('10', '2').should.equal(1);
      cmpIntegerStrings('3', '1').should.equal(1);
      cmpIntegerStrings('20', '2').should.equal(1);

      cb();
    });
  });
});