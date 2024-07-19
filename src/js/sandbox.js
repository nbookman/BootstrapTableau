'use strict';

(() => {
  const isAnchorOrHasAnchorParent = (node) => {
    while (!!node) {
      if (node.nodeName === 'A') {
        return true;
      }

      node = node.parentNode;
    }

    return false;
  };

  const blockAllClickPopups = (event) => {
    // left clicks are still allowed for navigation functionality (CSP and popup blocking covers this)
    if (isAnchorOrHasAnchorParent(event.target) &&
      (
        event.metaKey ||
        event.altKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.which == 2 || event.which == 3 ||
        event.button == 1 || event.button == 2
      )) {
      event.preventDefault();
      event.stopImmediatePropagation();
      console.log(`${event.type} prevented`);
    }
  };

  // auxclick is what is used for middle click by chrome, edge and firefox --
  //  safari does a click event for middle click
  window.addEventListener('auxclick', blockAllClickPopups, true);
  window.addEventListener('click', blockAllClickPopups, true);
  window.addEventListener('contextmenu', blockAllClickPopups, true);

  // block dispatching events that are not cancelable. Here we only block
  //  events that are marked as not cancelable. This is so that we can properly test
  //  'human clicks' in an automated fashion in our test suite.
  (function(originalDispatchEvent) {
    EventTarget.prototype.dispatchEvent = function(event) {
      if ((event.type === 'click' || event.type === 'auxclick' || event.type === 'contextmenu') && !event.cancelable) {
        return false;
      }

      return originalDispatchEvent.apply(this, arguments);
    };
  })(EventTarget.prototype.dispatchEvent);
})();
