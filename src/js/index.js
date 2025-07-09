let $ = window.$;
const tableauExt = window.tableau.extensions;

//Wrap everything into an anonymous function
(function () {
    async function init() {
        //clean up any divs from the last initialization
        $('body').empty();
        tableau.extensions.setClickThroughAsync(true).then(() => {
            let dashboard = tableauExt.dashboardContent.dashboard;
            //Loop through the Objects on the Dashboard and render the HTML Objects
            dashboard.objects.forEach(obj => {
                render(obj);
            })
        }).catch((error) => {
            // Can throw an error if called from a dialog or on Tableau Desktop
            console.error(error.message);
        });
    }

    function getMarginFromObjClasses(objClasses){
        const margin = [0, 0, 0, 0];
        if (!objClasses) return margin;

        const classNames = objClasses.split(/\s+/)
        classNames.reverse();
        const marginClass = classNames.find((cl) => cl.startsWith('margin-'));
        if (!marginClass) return margin;

        const marginValues = marginClass.split('-').slice(1).map(v => parseInt(v))
        if (marginValues.length === 1) {
            const [all] = marginValues
            return [all, all, all, all]
        }

        if (marginValues.length === 2) {
            const [vertical, horizontal] = marginValues
            return [vertical, horizontal, vertical, horizontal]
        }

        if (marginValues.length === 3) {
            const [top, horizontal, bottom] = marginValues
            return [top, horizontal, bottom, horizontal]
        }

        if (marginValues.length === 4) {
            return marginValues
        }

        return margin;
    }

    function updateElementPositions() {
        const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;
        
        // Show scroll position in page title for debugging
        document.title = `Scroll: X=${scrollX}, Y=${scrollY}`;
        
        let dashboard = tableauExt.dashboardContent.dashboard;
        dashboard.objects.forEach(obj => {
            let objId = obj.name.split("|")[0];
            let objClasses = obj.name.split("|")[1];
            const margin = getMarginFromObjClasses(objClasses);
            
            let $element = $(`#${objId}`);
            if ($element.length > 0) {
                $element.css({
                    'top': `${parseInt(obj.position.y) + margin[0] - scrollY}px`,
                    'left': `${parseInt(obj.position.x) + margin[3] - scrollX}px`
                });
            }
        });
    }

    async function render(obj) {
        let objNameAndClasses = obj.name.split("|");
        //Parse the Name and Classes from the Object Name
        let objId = objNameAndClasses[0];
        let objClasses;
        //Check if there are classes on the object
        if (objNameAndClasses.length > 1) {
            objClasses = objNameAndClasses[1];
        }
        //Create the initial object with CSS Props
        
        // we need to check for padding classes first, as they must be handled via positioning
        const margin = getMarginFromObjClasses(objClasses)
        
        // Get current scroll position for viewport-relative positioning
        const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;
        
        //Here we set the CSS props to match the location of the objects on the Dashboard
        let props = {
            id: `${objId}`,
            css: {
                'position': 'fixed',
                'top': `${parseInt(obj.position.y) + margin[0] - scrollY}px`,
                'left': `${parseInt(obj.position.x) + margin[3] - scrollX}px`,
                'width': `${parseInt(obj.size.width) - margin[1] - margin[3]}px`,
                'height': `${parseInt(obj.size.height) - margin[0] - margin[2]}px`
            }
        }
        let $div = $('<div>', props);
        //Add the class to the HTML Body
        $div.addClass(objClasses);
        $('body').append($div);
    }

    $(document).ready(() => {
        tableauExt.initializeAsync().then(() => {
            init();
            //Register an event handler for Dashboard Object resize
            //Supports automatic sized dashboards and reloads
            let resizeEventHandler = tableauExt.dashboardContent.dashboard.addEventListener(tableau.TableauEventType.DashboardLayoutChanged, init);
            
            //Since scroll events don't work in Tableau Desktop, use polling to detect scroll changes
            alert('Setting up scroll position polling...');
            
            let lastScrollX = 0;
            let lastScrollY = 0;
            let scrollCheckCount = 0;
            
            function checkScrollPosition() {
                const currentScrollX = window.pageXOffset || document.documentElement.scrollLeft;
                const currentScrollY = window.pageYOffset || document.documentElement.scrollTop;
                
                scrollCheckCount++;
                
                // Show we're checking (every 60 checks = ~1 second)
                if (scrollCheckCount % 60 === 0) {
                    document.title = `Checking scroll: X=${currentScrollX}, Y=${currentScrollY}`;
                }
                
                if (currentScrollX !== lastScrollX || currentScrollY !== lastScrollY) {
                    alert(`Scroll detected! X: ${lastScrollX}→${currentScrollX}, Y: ${lastScrollY}→${currentScrollY}`);
                    updateElementPositions();
                    lastScrollX = currentScrollX;
                    lastScrollY = currentScrollY;
                }
            }
            
            // Poll every 16ms (~60fps)
            setInterval(checkScrollPosition, 16);
        }, (err) => {
            console.log("Broken")
        });
    });

})();
