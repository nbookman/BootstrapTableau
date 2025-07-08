let $ = window.$;
const tableauExt = window.tableau.extensions;

let lastSaved = 0;
const throttleDelay = 200; // ms between scroll saves

// Use localStorage for better durability
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

// Add scroll listener
window.addEventListener('scroll', saveScrollPosition);

// Restore scroll immediately (best effort early)
console.log('[scroll restore init]', savedScroll);
window.scrollTo(savedScroll.x, savedScroll.y);

// Tableau extension bootstrap
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
