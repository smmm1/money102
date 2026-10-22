/* Shared Moneyeep shell is defined in each page's HTML and styled by ui-system.css.
   Keep this file intentionally non-invasive: do not rewrite navigation, move headers,
   inject controls, or attach audio feedback after page scripts have initialized. */
(function () {
  'use strict';
  document.documentElement.classList.add('moneyeep-ui-ready');
})();
