

const capture = {
  init() {
    this.addListeners()
  },

  addListeners() {
    window.addEventListener("click",  this.clickListener, true)
  },

  clickListener(event) {
    console.log("Got click event", event)
    const all_classes = []
    const text = event.target.innerHTML
    let node = event.target
    while(node != document.body) {
      all_classes.push(node.className.split(" "))
      node = node.parentNode
    }

    console.log("Got all classes to be", all_classes)

    browser.runtime.sendMessage({
      "clicked_classes": all_classes,
      "innerHTML": text
    })
  }

}
//*/

console.log("Trackula CS: Pre-init")
capture.init();
console.log("Trackula CS: Initialized OK")
