'use strict';

var PouchDB = require('pouchdb');
var Promise = require('bluebird');
var log = require('debug')('pouchdb:socket:pouch-creator');

function createLocalPouch(args) {

  if (typeof args[0] === 'string') {
    args = [{name: args[0]}];
  }

  // TODO: there is probably a smarter way to be safe about filepaths
  args[0].name = args[0].name.replace('.', '').replace('/', '');
  return Promise.resolve({
    pouch: new PouchDB(args[0])
  });
}

const cache = {}
function createHttpPouch(options) {
  var remoteUrl = options.remoteUrl;
  // chop off last '/'
  if (remoteUrl[remoteUrl.length - 1] === '/') {
    remoteUrl = remoteUrl.substring(0, remoteUrl.length -1);
  }
  return function (args) {
    if (typeof args[0] === 'string') {
      args = [{name: args[0]}];
    }
    const { name } = args[0]
    const pouch = cache[name] || new PouchDB(name)
    if(!(name in cache)) {
      cache[name] = pouch
      pouch.sync(new PouchDB(remoteUrl + '/' + name), { live: true, retry: true })
      log('creating new local pouch for syncing "%s"', name)
    } else {
      log('using existing pouch for syncing "%s"', name)
    }
    return Promise.resolve({
      pouch: cache[name]
    });
  };
}

function makePouchCreator(options) {
  if (options.remoteUrl) {
    return createHttpPouch(options);
  }
  if (!options.pouchCreator) {
    return createLocalPouch;
  }
  return function (args) {
    var name = typeof args[0] === 'string' ? args[0] : args[0].name;
    var res = options.pouchCreator(name);
    if (res instanceof PouchDB) {
      return {pouch: res};
    } else {
      return res;
    }
  };
}

module.exports = makePouchCreator;