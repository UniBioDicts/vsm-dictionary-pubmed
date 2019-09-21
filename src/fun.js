module.exports = { getLastPartOfURL, fixedEncodeURIComponent,
  removeDuplicates, isJSONString, cmpIntegerStrings };

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