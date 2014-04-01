const BYTE_TO_MEGABYTE = 1/1048576;

const GARBAGE_COLLECTOR_DURATION_WARNING = 100;


(function init() {
  function setup() {
    let elements = [].slice.call(document.querySelectorAll("[data-tooltip]"));

    elements.forEach(function (element) {
      element.onmouseover = function () {
        self.postMessage({ type: "update_tooltip", data: this.dataset.tooltip });
      };
    });

    // https://bugzilla.mozilla.org/show_bug.cgi?id=660857
    // TODO: Remove this when bug 660857 is fixed; otherwise
    // we have to resort to the following workaround:
    document.getElementById("splash").style.display = "none";
    document.getElementById("init").style.display = "inline";
  };

  // Wait for the window to finish loading before running the callback.
  function runOnLoad(window) {
    // Listen for one load event before checking the window type
    window.addEventListener("load", function runOnce() {
      window.removeEventListener("load", runOnce, false);
      setup();
    }, false);
  }

  if (window.document.readyState == "complete") {
    setup();
  } else {
    // Wait for the window to load before continuing
    runOnLoad(window);
  }
})();


/**
 * Get the duration of the given GC or CC entry
 */
var getDuration = function (aEntry) {
  let keys = ['max_slice_pause', 'duration',
              'MaxPause', 'max_pause',
              'Total', 'TotalTime', 'total_time'];

  for each (let key in keys) {
    if (key in aEntry) {
      return aEntry[key];
    }
  };

  return undefined;
}

/**
 * Hide the initialization element and show real values
 */
var hideInitText = function () {
  document.getElementById("init").style.display = "none";
  document.getElementById("data").style.display = "inline";
  document.getElementById("logger").style.display = "inline-block";

  // Prevents execution of above DOM calls
  hideInitText = function () { return; }
};

/**
 * Check if the GC entry is an incremental GC
 */
var isIncrementalGC = function (aEntry) {
  let keys = ['MaxPause', 'max_pause'];

  if ('nonincremental_reason' in aEntry)
    return aEntry['nonincremental_reason'] === 'none';

  for each (let key in keys) {
    if (key in aEntry) {
      return true;
    }
  }

  return false;
}

/**
 * Check if the CC entry is an incremental CC
 */
var isIncrementalCC = function (aEntry) {
  if ('total_slice_pause' in aEntry) {
    return aEntry['total_slice_pause'] < aEntry['duration'];
  }

  return false;
}

var isIncrementalCollection = function (aType, aEntry) {
  switch (aType) {
    case "gc":
      return isIncrementalGC(aEntry);
      break;
    case "cc":
      return isIncrementalCC(aEntry);
      break;
  }

  return false;
}


/**
 * Update the values of the specified collector
 */
var updateCollector = function (aType, aData) {
  hideInitText();

  let duration = getDuration(aData['current'][aType]);
  let age;

  if (aData['previous'][aType]) {
    let currentTime = aData['current'][aType]['timestamp'];
    let previousTime = aData['previous'][aType]['timestamp'];
    age = (currentTime - previousTime - duration) * 0.001;
  }

  let elem_duration = document.querySelector('#' + aType + ' .duration');
  elem_duration.textContent = duration + 'ms';

  if (duration >= GARBAGE_COLLECTOR_DURATION_WARNING) {
    elem_duration.className = 'duration warning';
  }
  else {
    elem_duration.className = 'duration';
  }

  let elem_age = document.querySelector('#' + aType + ' .age');
  elem_age.textContent = (age === undefined) ? '' : ' (' + age.toFixed(1) + 's)';

  var elem_label = document.querySelector('#' + aType + ' .label');
  elem_label.textContent = (isIncrementalCollection(aType, aData['current'][aType]) ? 'i': '')
                          + aType.toUpperCase() + ': ';

}


self.on("message", function (aMessage) {
  let { type, data } = aMessage;

  switch (type) {
    case "update_cycle_collector":
      updateCollector('cc', data);
      break;

    case "update_garbage_collector":
      updateCollector('gc', data);
      break;

    case "update_logger":
      let logger = document.getElementById("logger");
      logger.className = (data["active"]) ? "enabled" : "disabled";
      break;
    case "update_memory":
      hideInitText();

      // Update widget with current memory usage
      ["resident"].forEach(function (aType) {
        if (data[aType]) {
          let element = document.querySelector("#" + aType + " .data");
          element.textContent = Math.round(data[aType] * BYTE_TO_MEGABYTE) + "MB";
        }
      });
      break;
  }
});
