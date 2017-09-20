'use strict';

/* eslint-disable */

function assert(x) {
  if(!x) {
    console.log("ASERTION FAILED:", x)
  }
}

let content = null

function Mushroom(mushroom_width) {
  this.show = function () {
    stroke(255, 255, 255)
    fill(255, 255, 255)
    strokeWeight(40)
    point(mushroom_width / 2, -100)
  }
}


function Mushroot(mushroom_width) {
  let Settings = {
    branchColor: '#FFFFFF',
    nest: 5,
    startBranchLength: 130,
    rightBranchMagnificationRate: [0.3, 0.8],
    centerBranchMagnificationRate: [0.6, 0.9],
    leftBranchMagnificationRate: [0.3, 0.8],
    rightRotation: Math.PI / 4,
    leftRotation: Math.PI / 4,
    rotationcenter: [-0.3, 0.3],
    rightRotationRate: [0.6, 0.8],
    leftRotationRate: [0.6, 0.8]
  }

  function branch(beginX, beginY, length, nest) {
    // --- decrement nest ---
    if (nest === undefined) nest = 10;
    if (nest === 0) {
      return;
    }

    if (length <= 0.01) return;

    // --- draw line ---
    var endX = beginX;
    var endY = beginY + length;
    line(beginX, beginY, endX, endY);
    if (nest === 1) {
      return;
    }
    
    // --- new branch (recursion) ---
    var rotateRight  =  Settings.rightRotation * random.apply(null, Settings.rightRotationRate);
    var rotateCenter =  random.apply(null, Settings.rotationCenter);
    var rotateLeft   = -Settings.leftRotation  * random.apply(null, Settings.leftRotationRate);

    translate(endX, endY);

    rotate(rotateRight);
    branch(0, 0, length * random.apply(null, Settings.rightBranchMagnificationRate), nest - 1);
    rotate(-rotateRight);

    rotate(rotateCenter);
    branch(0, 0, length * random.apply(null, Settings.centerBranchMagnificationRate), nest - 1);
    rotate(-rotateCenter);

    rotate(rotateLeft);
    branch(0, 0, length * random.apply(null, Settings.leftBranchMagnificationRate), nest - 1);
    rotate(-rotateLeft);

    translate(-endX, -endY);
  }

  this.show = function () {
    push()
    translate(mushroom_width / 2, 0)
    stroke(255, 255, 255)
    strokeWeight(2)
    branch(0, 0, Settings.startBranchLength, Settings.nest)
    pop()
  }
}

class History {
  constructor (latest_num, content) {
    this.full_content = content
    this.first_parties = this.latestNFirstParties(content, latest_num)
    this.first_of = new Map()
    this.findConnections()
  }

  latestNFirstParties(content, crop) {
    return new Map(
      Object.keys(content).map((key) => [key, content[key]])
	.filter(([key, value]) => value.firstParty)
	.sort((a, b) => b[1].lastRequestTime - a[1].lastRequestTime)
	.splice(0, crop)
    )
  }

  findConnections() {
    const content = this.first_parties
    for(let [name, first] of content.entries()) {
      assert (first.firstParty)
      first.thirdParties.map(
	(third) =>
	  this.addConnection(third, first)
      )
    }
  }

  addConnection(first, third) {
    if(this.first_of.has(first)) {
      this.first_of.get(first).push(third)
    } else {
      this.first_of.set(first, [third])
    }
  }
}

function ThirdParty(hostname, history) {
  this.height = history.first_of.get(hostname).length
  this.show = function() {
  }
}

function stratify(history) {
  const first_map = Array.from(history.first_of)
  const max_connections = max(first_map.map(([key, value]) => value.length))

  const root_strata = new Array(max_connections + 1)

  root_strata[0] = Array.from(history.first_parties.values()).map(e => e.hostname)

  for(let stratum = 1; stratum <= max_connections; stratum++) {
    root_strata[stratum] = first_map
      .filter(([key, value]) => value.length === stratum)
      .map(([key, value]) => key)
  }

  return root_strata
}

function ThirdRoot(website, _height) {
  this.show = function() {
    strokeWeight(8 * (_height + 1))
    stroke(255, 255, 0)
    point(0, 0)
  }
}

function RootStratum(_height, websites, history) {
  this.height = _height
  this.websites = websites
  this.roots = this.websites.map(website => new ThirdRoot(website, _height))
  this.show = function() {
    push()
    translate(width / this.roots.length / 2, 0)
    this.roots.forEach(
      (root, num) => {
	root.show()
	translate(width / this.roots.length, 0)
      }
    )
    pop()
  }
}

function Underworld(history) {
  this.strata = stratify(history).map(
    (stratum, index) => new RootStratum(index, stratum, history)
  )

  this.show = function() {
    push()

    for(let stratum = 0; stratum < this.strata.length; stratum++) {
      this.strata[stratum].show()
      translate(0, 100)
    }
    pop()
  }
}


async function setup() {
  content = await storeChild.getAll()

  let num_mushrooms = 5

  let history = new History(num_mushrooms, content)

  createCanvas(window.windowWidth - 50, window.windowHeight * 1.5)
  background(0)

  push()
  translate(0, height / 4)
  push()

  stroke(255, 255, 255)
  fill(255, 255, 255)
  line(0, 0, width, 0)

  let mushroom_width = width / num_mushrooms

  for(let step = 0; step < num_mushrooms; step++) {
    let m = new Mushroom(mushroom_width)
    m.show()
    translate(mushroom_width, 0)
  }
  pop()

  let underworld = new Underworld(history)
  underworld.show()

  push()
  for(let step = 0; step < num_mushrooms; step++) {
    let t = new Mushroot(mushroom_width)
    t.show()
    translate(mushroom_width, 0)
  }

  pop()

  pop()
}

function draw() {
  
}
