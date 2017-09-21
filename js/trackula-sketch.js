'use strict';

/* eslint-disable */

/**
 * Basic assertion library
 */
function assert(x) {
  if(!x) {
    console.error("ASERTION FAILED:", x)
  }
}

/**
 * Displaces a position to a delta. We use this so that we don't
 * depend on transform to draw things (and thus we can know where to
 * draw lines between things).
 */
function displace(_position, delta) {
  const position = Object.assign({x: 0, y: 0}, _position)
  const dx = delta.x || 0
  const dy = delta.y || 0

  return {x: position.x + dx, y: position.y + dy}
}


function Vector() {
  this.d = Array.from(arguments)
  this.x = this.d[0]
  this.y = this.d[1]

  this.add = function(v) {
    return new Vector(this.x + v.x, this.y + v.y)
  }

  this.subtract = function(v) {
    return new Vector(this.x - v.x, this.y - v.y)
  }

  this.divided_by_integer = function(i) {
    return new Vector(this.x / i, this.y / i)
  }

  this.multiplied_by_integer = function(i) {
    return new Vector(this.x * i, this.y * i)
  }

  this.norm = function(n) {
    if(typeof n === "undefined") n = 2
    return Math.pow(
      this.d.reduce((sum, value) => {
	return sum + Math.pow(value, n)
      }, 0),
      1/n)
  }
}

let content = null
let mushroom_images = []

function preload() {
  function pad(num, size){ return ('000000000' + num).substr(-size); }
  // mushroom_images.push(loadImage("images/mushroom-1.png"))
  // mushroom_images.push(loadImage("images/mushroom-2.png"))
  // mushroom_images.push(loadImage("images/mushroom-3.svg"))
  // mushroom_images.push(loadImage("images/mushroom-4.png"))
  // mushroom_images.push(loadImage("images/mushroom-5.svg"))
  // mushroom_images.push(loadImage("images/mushroom-6.png"))
  for(let i = 1; i <= 13; i++) {
    mushroom_images.push(loadImage("images/mushroom-" + pad(i, 2) + ".png"))
  }
}

function random_mushroom_image() {
  return mushroom_images[0]
}

function Mushroot(beginX, beginY, settings) {
  let Settings = Object.assign({
    branchColor: 'rgba(255, 255, 255, 0.5)',
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
  }, settings)

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
    stroke(Settings.branchColor)
    strokeWeight(2)
    branch(beginX, beginY, Settings.startBranchLength, Settings.nest)
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

let defaultSettings = {
  strokeWeight: 40,
  stroke: 'rgba(255, 0, 0, 1)',
  lineStroke: 'rgba(255, 255, 255, 1)',
  lineStrokeWeight: 4,
}

function Site(position, website, history, settings) {
  sites.push(this)
  this.website = website
  this.history = history
  this.height = settings.height
  this.highlighted = settings.highlighted || false
  this.visible = settings.visible || settings.height != 1

  const noise = this.height > 1 ? random_noise(30, 100) : new Vector(0, 0)
  this.position = new Vector(position.x, position.y).add(noise)

  this.settings = Object.assign(defaultSettings, settings.settings)

  const base_roots = (settings.base_stratum || {roots: []}).roots
  const my_first = (this.history.first_of.get(this.website) || []).map(e => e.hostname)

  const nodes_to_connect = base_roots.filter(
    node => my_first.includes(node.website)
  )

  this.lines = nodes_to_connect.map(node => {
    strokeWeight(this.settings.lineStrokeWeight)
    stroke(this.settings.lineStroke)
    return new SiteLine(this.position, node.position, this.height, this.highlighted)
  })

  this.isAtPoint = function(x, y) {
    return this.visible && (this.distanceTo(x, y) < 20)
  }

  this.distanceTo = function(x, y) {
    if (!this.visible) return NaN
    return this.position.subtract(new Vector(x, y)).norm(2)
  }

  this.highlight = function(value, recursive) {
    if(!recursive) {
      sites.map(site => site.highlight(!value, true))
    }

    this.highlighted = value
    this.lines.forEach(line => {
      line.highlight(value)
    })
  }

  this.show = function() {
    if(!this.visible) return

    this.lines.forEach(line => line.show())

    if(this.height > 0) {
      stroke(this.settings.stroke)
      strokeWeight(this.settings.strokeWeight)
      point(this.position.x, this.position.y)
    } else {
      image(random_mushroom_image(), this.position.x - (150 / 2), this.position.y - 150,
	    150, 150)
    }
  }
}


function random_noise(x, y) {
  return new Vector(random(0, x), random(0, y))
}

let lineColors = [
  ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 0, 1)'],
  ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 0, 1)'],
  ['rgba(45, 45, 45, 1)', 'rgba(255, 255, 0, 1)'],
  ['rgba(130, 130, 130, 1)', 'rgba(255, 255, 0, 1)'],
  ['rgba(255, 255, 255, 1)', 'rgba(255, 255, 0, 1)'],
  ['rgba(255, 255, 255, 1)', 'rgba(255, 255, 0, 1)'],
  ['rgba(255, 255, 255, 1)', 'rgba(255, 255, 0, 1)'],
  ['rgba(255, 255, 255, 1)', 'rgba(255, 255, 0, 1)'],
]

function SiteLine(source, dest, height, highlighted) {
  source = new Vector(source.x, source.y)
  dest = new Vector(dest.x, dest.y)

  const ds = dest.subtract(source)
  const distance = Math.sqrt(Math.pow(ds.x, 2) + Math.pow(ds.y, 2))
  const segments = max(1, parseInt(distance / 80))
  const dds = ds.divided_by_integer(segments)
  const noise_amount = 0.02 * distance

  let prev = source

  this.lines = [source]
  for(let x = 0; x < segments; x++) {
    prev = prev.add(dds)
    this.lines.push(
      prev.add(random_noise(noise_amount, noise_amount))
    )
  }
  this.lines.push(dest)

  this.show = function () {
    const lines = this.lines

    stroke(lineColors[height][highlighted + 0])
    strokeWeight(4)
    console.log("Showing line at height: ", height, lineColors[height][highlighted + 0])

    let prev = source
    for(let i = 0; i < lines.length - 1; i++) {
      line(lines[i].x, lines[i].y, lines[i + 1].x, lines[i + 1].y)
      point(lines[i].x, lines[i].y)
      point(lines[i + 1].x, lines[i + 1].y)
      push()
      translate(lines[i].x, lines[i].y)
      rotate(random(-PI/3, PI/3))
      let r = new Mushroot(0, 0, {startBranchLength: 20, nest: min(3, max(segments, 8))})
      // r.show()
      pop()
      prev = lines[i]
    }
  }
}

function RootStratum(_height, position, websites, base_stratum, history) {
  const padding = width / websites.length

  this.position = position
  this.height = _height
  this.websites = websites
  this.roots = this.websites.map(
    (website, idx) =>
      new Site(displace(position, {x: padding / 2 + idx * padding}), website, history, {
	settings: {},
	height: _height,
	base_stratum: base_stratum,
      }))
  this.show = function() {
    this.roots.forEach(root => root.show())
  }
}

function Underworld(history, position) {
  this.position = Object.assign({x: 0, y: 0}, position)
  const padding = 250

  const strata = stratify(history)
  const base_stratum = new RootStratum(0, this.position, strata[0], null, history)

  this.strata = strata.map(
    (stratum, index) => new RootStratum(index, displace(this.position, {y: (Math.pow(1.5, index) - 1) * padding}), stratum, base_stratum, history)
  )

  this.show = function() {
    for(let stratum = 0; stratum < this.strata.length; stratum++) {
      this.strata[stratum].show(this.strata[0])
    }
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

  stroke(255, 255, 255)
  fill(255, 255, 255)
  line(0, 0, width, 0)

  let mushroom_width = width / num_mushrooms


  let underworld = new Underworld(history, {y: 0})
  underworld.show()

  push()
  for(let step = 0; step < num_mushrooms; step++) {
    let t = new Mushroot(mushroom_width)
    // t.show()
    translate(mushroom_width, 0)
  }

  pop()

  pop()
}

function draw() {
  
}
