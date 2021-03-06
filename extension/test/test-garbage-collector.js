const prefs = require("sdk/preferences/service");

const config = require("../lib/config");

exports.test_javascript_memory_pref_enabled = function (test) {
  // We have to require the garbage collector to initialize the module
  var gc = require("../lib/garbage-collector");
  test.assert(prefs.get(gc.reporter.pref_gc_notifications));
}
