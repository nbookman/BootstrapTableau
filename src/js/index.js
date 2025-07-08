// It's best practice to wrap your extension code in a self-invoking function
// to avoid polluting the global scope.
(function () {
  'use strict';

  // Wait for the DOM to be fully loaded before running any extension code
  $(document).ready(function () {
    // Initialize the Tableau Extensions API
    tableau.extensions.initializeAsync().then(function () {
      console.log('Extension Initialized: Ready to position overlays.');
      // Once initialized, call the main function to set up the dynamic positioning
      initializeDynamicOverlays();
    }, function (err) {
      // Log any errors that occur during initialization
      console.error('Error during extension initialization:', err.toString());
    });
  });

  /**
   * This is the main function that sets up all the logic for dynamically
   * positioning the overlay elements.
   */
  function initializeDynamicOverlays() {
    const dashboard = tableau.extensions.dashboardContent.dashboard;
    const parentWin = window.parent;

    /**
     * Finds all target objects on the dashboard and updates their corresponding
     * overlay elements. This function is called on load, on scroll, and on
     * any dashboard layout change.
     */
    function updateAllOverlays() {
      // Loop through every object on the dashboard
      dashboard.objects.forEach(dashboardObject => {
        // ASSUMPTION: Your logic identifies target containers by checking for a pipe '|'
        // in the object's name, as described in your problem description.
        if (dashboardObject.name.includes('|')) {
          // ASSUMPTION: You create an overlay element with an ID that corresponds
          // to the dashboard object's ID. For example, 'overlay-15' for object ID 15.
          const overlayElement = document.getElementById('overlay-' + dashboardObject.id);

          if (overlayElement) {
            // If the overlay exists, call the function to reposition it.
            repositionSingleOverlay(dashboardObject, overlayElement, parentWin);
          }
        }
      });
    }

    /**
     * Calculates and applies the correct position and size for a single overlay element.
     * @param {object} targetObject - The Tableau dashboard object to be overlaid.
     * @param {HTMLElement} overlayElement - The HTML overlay element.
     * @param {Window} parentWin - The parent window object containing the dashboard.
     */
    function repositionSingleOverlay(targetObject, overlayElement, parentWin) {
      // First, check if the target Tableau object is currently visible.
      // If not, hide the overlay element as well.
      if (!targetObject.isVisible) {
        overlayElement.style.display = 'none';
        return;
      } else {
        overlayElement.style.display = 'block'; // Or 'flex', or your default display type
      }

      // --- CORRECTED SYNTAX ---
      // Get the parent window's current scroll position.
      // This includes a fallback for older browsers like Internet Explorer. [1, 2, 3]
      const parentScrollY = parentWin.scrollY || parentWin.pageYOffset || 0;
      const parentScrollX = parentWin.scrollX || parentWin.pageXOffset || 0;

      // Get the target's static position from the Tableau API. [4]
      const targetPos = targetObject.position;

      // --- THE CORE FIX ---
      // Calculate the target's correct position relative to the VISIBLE viewport
      // by subtracting the parent's scroll offset from the static dashboard position.
      const targetViewportY = targetPos.y - parentScrollY;
      const targetViewportX = targetPos.x - parentScrollX;

      // Apply the newly calculated, scroll-aware position to the overlay.
      // This assumes your overlay elements use `position: fixed;` in your CSS.
      overlayElement.style.top = `${targetViewportY}px`;
      overlayElement.style.left = `${targetViewportX}px`;

      // Also ensure the size of the overlay matches the target container.
      overlayElement.style.width = `${targetObject.size.width}px`;
      overlayElement.style.height = `${targetObject.size.height}px`;
    }

    // --- Performance-Optimized Event Listeners ---

    let ticking = false; // A flag to ensure our repositioning logic doesn't run too often.

    // Listener 1: For when the user scrolls the dashboard.
    // This uses requestAnimationFrame to ensure smooth, non-janky scrolling. [5]
    parentWin.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          updateAllOverlays();
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true }); // '{ passive: true }' is a key performance optimization. [6, 7, 8]

    // Listener 2: For when the dashboard layout changes (e.g., objects are resized or moved).
    // This makes the solution robust against more than just scrolling. [9, 10, 11]
    dashboard.addEventListener(tableau.TableauEventType.DashboardLayoutChanged, () => {
      console.log('Dashboard layout changed. Recalculating all overlay positions.');
      updateAllOverlays();
    });

    // --- Initial Positioning ---
    // Run the function once on load to correctly position everything initially.
    updateAllOverlays();
  }
})();
