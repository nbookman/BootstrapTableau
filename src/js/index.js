let $ = window.$;
const tableauExt = window.tableau.extensions;

(function () {
    // Variables to store current scroll position
    let scrollX = 0;
    let scrollY = 0;

    async function init() {
        // Save the current scroll position before clearing the DOM
        scrollX = window.scrollX;
        scrollY = window.scrollY;

        // Remove all elements from the body to prepare for re-render
        $('body').empty();

        // Allow HTML elements to receive click events
        tableau.extensions.setClickThroughAsync(true).then(() => {
            let dashboard = tableauExt.dashboardContent.dashboard;

            // Render each dashboard object as a DOM element
            dashboard.objects.forEach(obj => {
                render(obj);
            });

            // Restore the scroll position after rendering
            $(window).scrollTop(scrollY);
            $(window).scrollLeft(scrollX);
        }).catch((error) => {
            console.error(error.message); // Log any errors
        });
    }

    function getMarginFromObjClasses(objClasses) {
        const margin = [0, 0, 0, 0]; // Default margins: top, right, bottom, left
        if (!objClasses) return margin;

        const classNames = objClasses.split(/\s+/); // Split classes by whitespace
        classNames.reverse(); // Prioritize last margin class if multiple exist

        const marginClass = classNames.find((cl) => cl.startsWith('margin-'));
        if (!marginClass) return margin;

        // Extract numerical margin values from class name
        const marginValues = marginClass.split('-').slice(1).map(v => parseInt(v));

        // Interpret margin shorthand
        if (marginValues.length === 1) {
            const [all] = marginValues;
            return [all, all, all, all];
        }
        if (marginValues.length === 2) {
            const [vertical, horizontal] = marginValues;
            return [vertical, horizontal, vertical, horizontal];
        }
        if (marginValues.length === 3) {
            const [top, horizontal, bottom] = marginValues;
            return [top, horizontal, bottom, horizontal];
        }
        if (marginValues.length === 4) {
            return marginValues; // Use all four values as-is
        }

        return margin; // Fallback if format is invalid
    }

    async function render(obj) {
        // Split object name to extract ID and optional CSS classes
        let objNameAndClasses = obj.name.split("|");
        let objId = objNameAndClasses[0];
        let objClasses = objNameAndClasses[1] || "";

        // Get margin values for positioning adjustments
        const margin = getMarginFromObjClasses(objClasses);

        // Define CSS for the element based on dashboard object position and size
        let props = {
            id: `${objId}`,
            css: {
                'position': 'absolute',
                'top': `${parseInt(obj.position.y) + margin[0]}px`,
                'left': `${parseInt(obj.position.x) + margin[3]}px`,
                'width': `${parseInt(obj.size.width) - margin[1] - margin[3]}px`,
                'height': `${parseInt(obj.size.height) - margin[0] - margin[2]}px`
            }
        };

        // Create and style the HTML element
        let $div = $('<div>', props);
        $div.addClass(objClasses);

        // Append the new element to the body
        $('body').append($div);
    }

    $(document).ready(() => {
        tableauExt.initializeAsync().then(() => {
            init(); // Initial rendering

            // Re-initialize if the dashboard layout changes (e.g. resize)
            tableauExt.dashboardContent.dashboard.addEventListener(
                tableau.TableauEventType.DashboardLayoutChanged,
                init
            );

            // Track scroll position on window scroll events
            $(window).on('scroll', () => {
                scrollX = window.scrollX;
                scrollY = window.scrollY;
            });
        }, (err) => {
            console.log("Broken"); // Initialization failed
        });
    });
})();
