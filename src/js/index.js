// index.js

let $ = window.$;
const tableauExt = window.tableau.extensions;

let lastSaved = 0;
const throttleDelay = 200; // ms between scroll saves

// Use localStorage for durability and add radix 10 to parseInt.
let savedScroll = {
  x: parseInt(localStorage.getItem('scrollX'), 10) || 0,
  y: parseInt(localStorage.getItem('scrollY'), 10) || 0
};

/**
 * Saves the current scroll position to localStorage, throttled to prevent
 * excessive writes on every scroll event.
 */
function saveScrollPosition() {
  const now = Date.now();
  if (now - lastSaved > throttleDelay) {
    lastSaved = now;
    localStorage.setItem('scrollX', window.scrollX);
    localStorage.setItem('scrollY', window.scrollY);
    updateDebugTracker();
    logDebug(`[scroll save] ${window.scrollX}, ${window.scrollY}`);
  }
}

// Attach a listener to the window's scroll event.
window.addEventListener('scroll', saveScrollPosition);

// IIFE to contain the main extension logic.
(function () {
  /**
   * Initializes the extension, clears the old layout, and re-renders the new one.
   */
  async function init() {
    $('#dashboard-container').empty();

    try {
      await tableau.extensions.setClickThroughAsync(true);
      const dashboard = tableauExt.dashboardContent.dashboard;

      if (dashboard.objects.length === 0) {
        console.warn('Warning: No dashboard objects were found. Nothing will be rendered.');
      }

      requestAnimationFrame(() => {
        // All scroll restoration is now handled here.
        window.scrollTo(savedScroll.x, savedScroll.y);
        logDebug(`[scroll restore] ${savedScroll.x}, ${savedScroll.y}`);

        requestAnimationFrame(() => {
          logDebug(`Rendering with scrollY = ${window.scrollY}`);
          dashboard.objects.forEach(render);
        });
      });

      if (window.location.search.includes('debug=true')) {
        injectDebugUI();
      }
    } catch (error)
      console.error("Extension init error:", error);
    }
  }

  /**
   * Parses margin values from a CSS-like class name (e.g., "margin-10-20").
   * @param {string} objClasses - The string of class names.
   * @returns {number[]} An array representing top, right, bottom, left margins.
   */
  function getMarginFromObjClasses(objClasses) {
    const margin = [0, 0, 0, 0];
    if (!objClasses) return margin;

    const classNames = objClasses.split(/\s+/).reverse();
    const marginClass = classNames.find(cl => cl.startsWith('margin-'));
    if (!marginClass) return margin;

    const values = marginClass.split('-').slice(1).map(Number);
    switch (values.length) {
      case 1: return [values[0], values[0], values[0], values[0]];
      case 2: return [values[0], values[1], values[0], values[1]];
      case 3: return [values[0], values[1], values[2], values[1]];
      case 4: return values;
      default: return margin;
    }
  }

  /**
   * Renders a single dashboard object as a div with absolute positioning.
   * @param {object} obj - A dashboard object from the Tableau Extensions API.
   */
  function render(obj) {
    const [objId, objClasses = ""] = obj.name.split("|");
    const margin = getMarginFromObjClasses(objClasses);

    const $div = $('<div>', {
      id: objId,
      css: {
        position: 'absolute',
        top: `${obj.position.y + window.scrollY + margin[0]}px`,
        left: `${obj.position.x + window.scrollX + margin[3]}px`,
        width: `${obj.size.width - margin[1] - margin[3]}px`,
        height: `${obj.size.height - margin[0] - margin[2]}px`
      }
    });

    $div.addClass(objClasses);
    $('#dashboard-container').append($div);
  }

  /**
   * Injects a debug UI into the DOM if not already present.
   */
  function injectDebugUI() {
    if ($('#debug-buttons').length) return;

    const $debug = $(
      `<div id="debug-buttons" style="
        position: fixed; bottom: 10px; left: 10px; background: rgba(255,255,255,0.95);
        padding: 8px; border: 1px solid #aaa; border-radius: 4px; z-index: 99999;
        font-family: monospace; font-size: 14px; max-width: 320px;
      ">
        <div><button id="btn-save-scroll">Save Scroll</button>
        <button id="btn-restore-scroll">Restore Scroll</button></div>
        <div id="scroll-status" style="margin-top: 5px; font-size: 12px;"></div>
        <div id="log-console" style="margin-top: 8px; max-height: 120px; overflow-y: auto;
          font-size: 12px; background: #f0f0f0; padding: 4px;"></div>
      </div>`
    );

    $('body').append($debug);

    $('#btn-save-scroll').click(() => {
      localStorage.setItem('scrollX', window.scrollX);
      localStorage.setItem('scrollY', window.scrollY);
      updateDebugTracker();
      logDebug(`[manual scroll save] ${window.scrollX}, ${window.scrollY}`);
    });

    $('#btn-restore-scroll').click(() => {
      const x = parseInt(localStorage.getItem('scrollX'), 10) || 0;
      const y = parseInt(localStorage.getItem('scrollY'), 10) || 0;
      window.scrollTo(x, y);
      updateDebugTracker();
      logDebug(`[manual scroll restore] ${x}, ${y}`);
    });

    updateDebugTracker();
  }

  /**
   * Updates the scroll status text in the debug UI.
   */
  function updateDebugTracker() {
    if (!$('#debug-buttons').length) return;
    const scrollStatus = `Scroll: ${window.scrollX}, ${window.scrollY}`;
    $('#scroll-status').text(scrollStatus);
  }

  /**
   * Logs a message to the debug console UI or the browser console.
   * @param {string} message - The message to log.
   */
  function logDebug(message) {
    if (!window.location.search.includes('debug=true')) return;
    const $log = $('#log-console');
    if ($log.length) {
      const timestamp = new Date().toLocaleTimeString();
      $log.append(`<div>[${timestamp}] ${message}</div>`);
      $log.scrollTop($log[0].scrollHeight);
    } else {
      console.log('[DEBUG]', message);
    }
  }

  // When the document is ready, initialize the Tableau Extension.
  $(document).ready(() => {
    tableauExt.initializeAsync().then(() => {
      init();

      tableauExt.dashboardContent.dashboard.addEventListener(
        tableau.TableauEventType.DashboardLayoutChanged,
        init
      );
    }).catch(err => {
      console.error("Tableau Extension initialization failed:", err);
    });
  });
})();
