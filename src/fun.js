module.exports = { getLastPartOfURL, fixedEncodeURIComponent,
  removeDuplicates, isJSONString, cmpIntegerStrings, limiter };

function getLastPartOfURL(entryId) {
  return entryId.split('/').pop();
}

function fixedEncodeURIComponent(str) {
  // encode also characters: !, ', (, ), and *
  return encodeURIComponent(str).replace(/[!'()*]/g,
    c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

function removeDuplicates(arr) {
  return [...new Set(arr)];
}

function isJSONString(str) {
  try {
    let json = JSON.parse(str);
    return (json && typeof json === 'object');
  } catch (e) {
    return false;
  }
}

function cmpIntegerStrings(a, b) {
  a = parseInt(a);
  b = parseInt(b);

  return a < b
    ? -1
    : a > b
      ? 1
      : 0;
}

/**
 * For details see: https://patmigliaccio.com/rate-limiting/
  */
function limiter(fn, wait) {
  let isCalled = false;
  let calls = [];

  let caller = function() {
    if (calls.length && !isCalled) {
      isCalled = true;
      calls.shift().call();
      setTimeout(function() {
        isCalled = false;
        caller();
      }, wait);
    }
  };

  return function() {
    calls.push(fn.bind(this, ...arguments));
    caller();
  };
}