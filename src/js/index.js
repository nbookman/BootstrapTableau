let $ = window.$;
const tableauExt = window.tableau.extensions;

(function () {
    // Robustly stored scroll position
    let savedScroll = { x: 0, y: 0 };
    let hasRenderedOnce = false;

    async function init() {
        // Save scroll position after first render
        if (hasRenderedOnce) {
            savedScroll.x = window.scrollX;
            savedScroll.y = window.scrollY;
        }

        // Clear only injected divs, not entire body
        $('body').children('div').filter(function() {
            return this.id !== 'tableau_placeholder';
        }).remove();

        try {
            await tableau.extensions.setClickThroughAsync(true);
            const dashboard = tableauExt.dashboardContent.dashboard;

            // Render all dashboard objects
            dashboard.objects.forEach(render);

            // Delay scroll restore to avoid race with rendering
            if (hasRenderedOnce) {
                requestAnimationFrame(() => {
                    window.scrollTo(savedScroll.x, savedScroll.y);
                });
            }

            hasRenderedOnce = true;
        } catch (error) {
            console.error("Tableau extension error:", error);
        }
    }

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

    $(document).ready(() => {
        tableauExt.initializeAsync().then(() => {
            init();

            tableauExt.dashboardContent.dashboard.addEventListener(
                tableau.TableauEventType.DashboardLayoutChanged,
                init
            );

            $(window).on('scroll', () => {
                if (hasRenderedOnce) {
                    savedScroll.x = window.scrollX;
                    savedScroll.y = window.scrollY;
                }
            });
        }).catch(err => {
            console.error("Initialization failed:", err);
        });
    });
})();
