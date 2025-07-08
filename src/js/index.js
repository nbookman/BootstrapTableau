let $ = window.$;
const tableauExt = window.tableau.extensions;

let lastSaved = 0;
const throttleDelay = 200; // ms between scroll saves

// Use localStorage for durability
let savedScroll = {
  x: parseInt(localStorage.getItem('scrollX')) || 0,
  y: parseInt(localStorage.getItem('scrollY')) || 0
};

function saveScrollPosition() {
  const now = Date.now();
  if (now - lastSaved > throttleDelay) {
    lastSaved = now;
    localStorage.setItem('scrollX', window.scrollX);
    localStorage.setItem('scrollY', window.scrollY);
    console.log('[scroll save]', window.scrollX, window.scrollY);
  }
}

window.addEventListener('scroll', saveScrollPosition);

console.log('[scroll restore init]', savedScroll);
window.scrollTo(savedScroll.x, savedScroll.y);

(function () {
  async function init() {
    saveScrollPosition(); // pre-cleanup

    $('body').children('div').remove();

    try {
      await tableau.extensions.setClickThroughAsync(true);

      const dashboard = tableauExt.dashboardContent.dashboard;
      dashboard.objects.forEach(render);

      // Restore scroll again after DOM is painted
      setTimeout(() => {
        console.log('[scroll restore post-render]', savedScroll);
        window.scrollTo(savedScroll.x, savedScroll.y);
      }, 50);

      // Inject debug UI only if ?debug=true is in URL
      if (window.location.search.includes('debug=true')) {
        injectDebugUI();
      }

    } catch (error) {
      console.error("Extension init error:", error);
    }
  }

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

  function render(obj) {
    const [objId, objClasses = ""] = obj.name.split("|");
    const margin = getMarginFromObjClasses(objClasses);

    const $div = $('<div>', {
      id: objId,
      css: {
        position: 'absolute',
        top: `${obj.position.y + margin[0]}px`,
        left: `${obj.position.x + margin[3]}px`,
        width: `${obj.size.width - margin[1] - margin[3]}px`,
        height: `${obj.size.height - margin[0] - margin[2]}px`
      }
    });

    $div.addClass(objClasses);
    $('body').append($div);
  }

  function injectDebugUI() {
    // Avoid multiple injection
    if ($('#debug-buttons').length) return;

    const $debug = $(`
      <div id="debug-buttons" style="
        position: fixed; bottom: 10px; left: 10px; 
        background: rgba(255,255,255,0.9); padding: 8px; 
        border: 1px solid #aaa; border-radius: 4px; z-index: 99999;
        font-family: monospace; font-size: 14px;
      ">
        <button id="btn-save-scroll">Save Scroll</button>
        <button id="btn-restore-scroll">Restore Scroll</button>
      </div>
    `);

    const markers = [500, 1000, 1500];
    markers.forEach(pos => {
      $debug.append(`<div class="scroll-marker" style="
        position:absolute; left: 0; width: 100%; height: 2px; background: red; top: ${pos}px;
      "></div>`);
    });

    $('body').append($debug);

    $('#btn-save-scroll').click(() => {
      localStorage.setItem('scrollX', window.scrollX);
      localStorage.setItem('scrollY', window.scrollY);
      console.log('[manual scroll save]', window.scrollX, window.scrollY);
    });

    $('#btn-restore-scroll').click(() => {
      const x = parseInt(localStorage.getItem('scrollX') || 0);
      const y = parseInt(localStorage.getItem('scrollY') || 0);
      console.log('[manual scroll restore]', x, y);
      window.scrollTo(x, y);
    });
  }

  $(document).ready(() => {
    tableauExt.initializeAsync().then(() => {
      init();

      tableauExt.dashboardContent.dashboard.addEventListener(
        tableau.TableauEventType.DashboardLayoutChanged,
        init
      );
    }).catch(err => {
      console.error("Initialization failed:", err);
    });
  });
})();
