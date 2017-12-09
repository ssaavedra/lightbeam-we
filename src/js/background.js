'use strict';

async function checkFirstRun() {
/*
  if (await store.isFirstRun()) {
    browser.tabs.create({ url: 'first-run.html' });
  }
  */
}

checkFirstRun();

// async function runLightbeam() {
//   // Checks to see if Lightbeam is already open.
//   // Returns true if it is, false if not.
//   async function isOpen() {
//     const tabs = await browser.tabs.query({});
//     const fullUrl = browser.extension.getURL('index.html');
//     const lightbeamTabs = tabs.filter((tab) => {
//       return (tab.url === fullUrl);
//     });
//     return lightbeamTabs[0] || false;
//   }

//   const lightbeamTab = await isOpen();
//   if (!lightbeamTab) {
//     // only open a new Lightbeam instance if one isn't already open.
//     browser.tabs.create({ url: 'index.html' });
//   } else if (!lightbeamTab.active) {
//      // re-focus Lightbeam if it is already open but lost focus
//     browser.tabs.update(lightbeamTab.id, {active: true});
//   }
// }

async function runTrackula() {
  // Checks to see if the Trackula tab is already open.
  // Returns true if it is, false if not.
  async function isOpen() {
    const tabs = await browser.tabs.query({});
    const fullUrl = browser.extension.getURL('trackula.html');
    const trackulaTabs = tabs.filter((tab) => {
      return (tab.url === fullUrl);
    });
    return trackulaTabs[0] || false;
  }

  const trackulaTab = await isOpen();
  if (!trackulaTab) {
    // only open a new Lightbeam instance if one isn't already open.
    browser.tabs.create({ url: 'trackula.html' });
  } else if (!trackulaTab.active) {
     // re-focus Lightbeam if it is already open but lost focus
    browser.tabs.update(trackulaTab.id, {active: true});
  }
}

// When the user clicks browserAction icon in toolbar, run Lightbeam
browser.browserAction.onClicked.addListener(runTrackula);
