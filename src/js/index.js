let $ = window.$;
const tableauExt = window.tableau.extensions;

// Store scroll between reloads using sessionStorage
let savedScroll = {
  x: parseInt(sessionStorage.getItem('scrollX')) || 0,
  y: parseInt(sessionStorage.getItem('scrollY')) || 0
};

function saveScrollPosition() {
  sessionStorage.setItem('scrollX', window.scrollX);
  sessionStorage.setItem('scrollY', window.scrollY);
}

// Monitor user scroll and persist it
window.addEventListener('scroll', saveScrollPosition);

// Immediately apply the saved scroll (if restoring from a reload)
window.scrollTo(savedScroll.x, savedScroll.y);

(function () {
  async function init() {
    // Save scroll position before re-rendering
    saveScrollPosition();

    // Remove previously injected divs only (preserve structure)
    $('body').children('div').remove();

    try {
      await tableau.extensions.setClickThroughAsync(true);

      const dashboard = tableauExt.dashboardContent.dashboard;
      dashboard.objects.forEach(render);

      // Restore scroll after rendering (next tick)
      setTimeout(() => {
        window.scrollTo(savedScroll.x, savedScroll.y);
      }, 0);

    } catch (error) {
      console.error("Tableau extension init error:", error);
    }
  }

  // Extract margin classes like "margin-10-5-10-5" to array
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

  // Render each dashboard object as a positioned div
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

  $(document).ready(() => {
    tableauExt.initializeAsync().then(() => {
      init();

      // Rerun init when the dashboard layout changes (resizing, etc.)
      tableauExt.dashboardContent.dashboard.addEventListener(
        tableau.TableauEventType.DashboardLayoutChanged,
        init
      );
    }).catch(err => {
      console.error("Initialization failed:", err);
    });
  });
})();
