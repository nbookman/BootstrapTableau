let $ = window.$;
const tableauExt = window.tableau.extensions;

(function () {
  // Store scroll position sent from parent page
  let savedScroll = { x: 0, y: 0 };
  let hasRenderedOnce = false;

  // Listen for scroll updates from parent window via postMessage
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'scroll') {
      console.log('Received scroll message in iframe:', event.data.scrollX, event.data.scrollY);
      savedScroll.x = event.data.scrollX;
      savedScroll.y = event.data.scrollY;
    }
  });

  async function init() {
    // Save scroll only after first render (not from iframe window scroll)
    if (hasRenderedOnce) {
      // We don't update savedScroll here because iframe scroll may not match parent scroll
      // Instead, rely on parent scroll messages to keep savedScroll accurate
    }

    // Remove previously injected divs (but preserve any non-generated content)
    $('body').children('div').filter(function () {
      return this.id !== 'tableau_placeholder';
    }).remove();

    try {
      await tableau.extensions.setClickThroughAsync(true);

      const dashboard = tableauExt.dashboardContent.dashboard;

      // Render each dashboard object as absolutely positioned div
      dashboard.objects.forEach(render);

      // Restore scroll position in iframe AFTER render, using scroll position from parent
      if (hasRenderedOnce) {
        // Use requestAnimationFrame to ensure DOM is fully painted before scrolling
        requestAnimationFrame(() => {
          window.scrollTo(savedScroll.x, savedScroll.y);
        });
      }

      hasRenderedOnce = true;
    } catch (error) {
      console.error("Tableau extension error:", error);
    }
  }

  // Utility: Parse margin values from object classes like 'margin-10-5-10-5'
  function getMarginFromObjClasses(objClasses) {
    const margin = [0, 0, 0, 0];
    if (!objClasses) return margin;

    const classNames = objClasses.trim().split(/\s+/).reverse();
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

  // Create a div for each dashboard object with position and size
  function render(obj) {
    const [objId, objClasses = ""] = obj.name.split("|");
    const margin = getMarginFromObjClasses(objClasses);

    const style = {
      position: 'absolute',
      top: `${obj.position.y + margin[0]}px`,
      left: `${obj.position.x + margin[3]}px`,
      width: `${obj.size.width - margin[1] - margin[3]}px`,
      height: `${obj.size.height - margin[0] - margin[2]}px`
    };

    $('<div>', {
      id: objId,
      css: style
    }).addClass(objClasses).appendTo('body');
  }

  // On document ready, initialize Tableau extension and set up event handlers
  $(document).ready(() => {
    tableauExt.initializeAsync().then(() => {
      init();

      // Re-run init() if dashboard layout changes (resizing, etc.)
      tableauExt.dashboardContent.dashboard.addEventListener(
        tableau.TableauEventType.DashboardLayoutChanged,
        init
      );

      // Note: We DO NOT listen to iframe scroll events because
      // iframe scroll does not correspond to parent scroll.
      // We rely entirely on parent scroll messages to update savedScroll.
    }).catch(err => {
      console.error("Initialization failed:", err);
    });
  });
})();
