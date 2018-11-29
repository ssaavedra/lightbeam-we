

const capture = {
  init() {
    this.addListeners();
  },

  addListeners() {
    window.addEventListener('click',  this.clickListener, true);
  },

  clickListener(event) {
    const all_classes = [];
    const text = event.target.innerHTML;
    let node = event.target;
    while (node != document.body) {
      all_classes.push(node.className.split(' '));
      node = node.parentNode;
    }

    browser.runtime.sendMessage({
      'clicked_classes': all_classes,
      'innerHTML': text
    });
  }
};

capture.init();
