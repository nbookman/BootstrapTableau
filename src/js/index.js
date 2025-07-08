let $ = window.$;
const tableauExt = window.tableau.extensions;

(function () {
    const $scrollContainer = $('#scroll-container');
    const $contentRoot = $('#content-root');
    let savedScroll = { x: 0, y: 0 };
    let hasRenderedOnce = false;

    async function init() {
        // Save scroll position from container if re-rendering
        if (hasRenderedOnce) {
            savedScroll.x = $scrollContainer.scrollLeft();
            savedScroll.y = $scrollContainer.scrollTop();
        }

        // Clear only the dynamic content
        $contentRoot.empty();

        try {
            await tableau.extensions.setClickThroughAsync(true);
            const dashboard = tableauExt.dashboardContent.dashboard;

            // Render each object inside the content root
            dashboard.objects.forEach(render);

            if (hasRenderedOnce) {
                requestAnimationFrame(() => {
                    $scrollContainer.scrollLeft(savedScroll.x);
                    $scrollContainer.scrollTop(savedScroll.y);
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
        }).addClass(objClasses).appendTo($contentRoot);
    }

    $(document).ready(() => {
        tableauExt.initializeAsync().then(() => {
            init();

            tableauExt.dashboardContent.dashboard.addEventListener(
                tableau.TableauEventType.DashboardLayoutChanged,
                init
            );

            $scrollContainer.on('scroll', () => {
                if (hasRenderedOnce) {
                    savedScroll.x = $scrollContainer.scrollLeft();
                    savedScroll.y = $scrollContainer.scrollTop();
                }
            });
        }).catch(err => {
            console.error("Initialization failed:", err);
        });
    });
})();
