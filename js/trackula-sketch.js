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

  this.equals = function(v, err) {
    if(!err) err = 0
    return this.subtract(v).norm() <= err
  }

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
let mushroom_images = new Map()
let image_bg = null
let font_djvu;

function preload() {
  font_djvu = loadFont('fonts/DejaVuSansMono-webfont.ttf')
  function pad(num, size){ return ('000000000' + num).substr(-size); }
  // mushroom_images.push(loadImage("images/mushroom-1.png"))
  // mushroom_images.push(loadImage("images/mushroom-2.png"))
  // mushroom_images.push(loadImage("images/mushroom-3.svg"))
  // mushroom_images.push(loadImage("images/mushroom-4.png"))
  // mushroom_images.push(loadImage("images/mushroom-5.svg"))
  // mushroom_images.push(loadImage("images/mushroom-6.png"))
  for(let i = 1; i <= 13; i++) {
    const path = "images/mushroom-" + pad(i, 2) + ".png"
    const key = hex_sha1(path) + "|" + path
    mushroom_images.set(key, loadImage(path))
  }
  image_bg = loadImage("images/mushroom-bg.jpg")
}

function get_mushroom_image(url) {
  const h = hex_sha1(url)

  const mush_key = Array
	.from(mushroom_images.keys())
	.sort()
	.reduce((a, sum) => {
	  if(a > h) { return a } else { return sum }
	}, mushroom_images[0])

  const mush = mushroom_images.get(mush_key)

  return mush
  // return random(Array.from(mushroom_images.values()))
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
	.filter(([key, value]) => value.firstParty && value.thirdParties.length > 5)
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

  this.computeReverse = function() {
    if(this.height == 0) {
      this.reverse_lines = sites.map(site => site.lines.filter(line => line.dest.equals(this.position, 1)))
      // console.log(this.reverse_lines)
    }
  }

  this.isAtPoint = function(x, y) {
    return this.visible && (this.distanceTo(x, y) < 20)
  }

  this.distanceTo = function(x, y) {
    if (!this.visible) return NaN
    return this.position.subtract(new Vector(x, y)).norm(2)
  }

  this.highlight = function(value) {
    this.highlighted = value
    this.lines.forEach(line => {
      line.highlight(value)
    })
  }

  this.show = function() {
    if(!this.visible) return

    this.lines.forEach(line => line.show())

    if(this.height > 0) {
      // stroke(this.settings.stroke)
      stroke(lineColors[this.height][2])
      strokeWeight(this.settings.strokeWeight)
      strokeWeight(2)
      fill(lineColors[this.height][2])
      ellipse(this.position.x, this.position.y, this.height * 10)
      point(this.position.x, this.position.y)
      fill(255)
      textSize(8)
      strokeWeight(2)
      text(this.website, this.position.x, this.position.y)
    } else {
      const mush_width = 150
      const mush_height = 375
      image(
	get_mushroom_image(this.website),
	this.position.x - (mush_width / 2),
	this.position.y - mush_height,
	mush_width,
	mush_height
      )
      fill(0)
      textSize(16)
      strokeWeight(2)
      text(this.website, this.position.x, this.position.y)
    }
  }
}


function random_noise(x, y) {
  return new Vector(random(0, x), random(0, y))
}

let lineColors = [
  ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 0, 1)'],
  ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 0, 1)'],
  ['rgba(60, 60, 0, 0.5)', 'rgba(255, 255, 0, 1)', 'rgba(255, 255, 255, 1)'],
  ['rgba(130, 130, 130, 0.5)', 'rgba(255, 255, 0, 1)', 'rgba(255, 255, 255, 1)'],
  ['rgba(255, 0, 0, 0.5)', 'rgba(255, 255, 0, 1)', 'rgba(255, 255, 255, 1)'],
  ['rgba(255, 255, 255, 1)', 'rgba(255, 255, 0, 1)', 'rgba(255, 0, 0, 1)'],
  ['rgba(255, 255, 255, 1)', 'rgba(255, 255, 0, 1)', 'rgba(255, 0, 0, 1)'],
  ['rgba(255, 255, 255, 1)', 'rgba(255, 255, 0, 1)', 'rgba(255, 0, 0, 1)'],
]

function SiteLine(source, dest, height, highlighted) {
  source = new Vector(source.x, source.y)
  dest = new Vector(dest.x, dest.y)
  this.source = source
  this.dest = dest

  const ds = dest.subtract(source)
  const distance = Math.sqrt(Math.pow(ds.x, 2) + Math.pow(ds.y, 2))
  const segments = max(1, parseInt(distance / 100))
  const dds = ds.divided_by_integer(segments)
  const noise_amount = 0.02 * distance

  let prev = source

  this.highlighted = highlighted
  this.lines = [source]
  for(let x = 0; x < segments; x++) {
    prev = prev.add(dds)
    this.lines.push(
      prev.add(random_noise(noise_amount, noise_amount))
    )
  }
  this.lines.push(dest)

  this.highlight = function(value) {
    this.highlighted = value
  }

  this.show = function () {
    const lines = this.lines

    stroke(lineColors[height][this.highlighted + 0])
    strokeWeight(1 + this.highlighted * 10)

    let prev = source
    for(let i = 0; i < lines.length - 1; i++) {
      line(lines[i].x, lines[i].y, lines[i + 1].x, lines[i + 1].y)
      point(lines[i].x, lines[i].y)
      point(lines[i + 1].x, lines[i + 1].y)
      push()
      translate(lines[i].x, lines[i].y)
      rotate(random(-PI/3, PI/3))
      let r = new Mushroot(0, 0, {startBranchLength: 20, nest: min(4, max(segments, 8))})
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
    this.roots.forEach(site => site.show())
  }
}

function Underworld(history, position) {
  const padding = 150
  const strata = stratify(history)

  this.refit = function (position) {
    sites = []
    this.position = Object.assign({x: 0, y: 0}, position)

    this.base_stratum = new RootStratum(0, this.position, strata[0], null, history)

    this.strata = strata.map(
      (stratum, index) => new RootStratum(index, displace(this.position, {y: (Math.pow(1.7, index) - 1) * padding}), stratum, this.base_stratum, history)
    )
    
    this.base_stratum.roots.forEach(site => site.computeReverse())
  }



  this.show = function() {
    for(let stratum = this.strata.length - 1; stratum >= 0; stratum--) {
      this.strata[stratum].show()
    }
    sites.filter((e) => e.highlighted).forEach((e) => e.show())
  }

  this.refit(position)
}


let underworld
let sites = []
let num_mushrooms = 6
let history
let placement

async function windowResized() {
  resizeCanvas(window.windowWidth - 50, window.windowHeight * 7)
  placement = 3 * windowHeight / 4
  underworld.refit({y: placement})
  draw()
}

async function setup() {
  content = await storeChild.getAll()
  history = new History(num_mushrooms, content)

  textFont(font_djvu)
  const canvas = createCanvas(window.windowWidth - 50, window.windowHeight * 7)
  canvas.parent('visualization')
  placement = 3 * windowHeight / 4
  underworld = new Underworld(history, {y: placement})
  noLoop()
}

function draw() {
  clear()
  background(0)

  push()
  stroke(255, 255, 255)
  fill(220, 255, 255)
  rect(0, 0, width, placement)
  let mushroom_width = width / num_mushrooms
  line(0, placement, width, placement)
  image(
    image_bg,
    0,
    placement,
    image_bg.width, image_bg.height
  )
  if(underworld)
    underworld.show()
  pop()
}

function mouseClicked() {

  // First, de-highlight everything
  sites.map(site => site.highlight(false))

  // Find whether we are over a tracker point
  const matching = sites
	.filter(site => site.isAtPoint(mouseX, mouseY))
	.sort((a, b) => b.distanceTo(mouseX, mouseY) - a.distanceTo(mouseX, mouseY))
	.reverse()
  // matching.map((site, idx) => ellipse(site.position.x, site.position.y, idx * 4))
  if(matching.length) {
    matching[0].highlight(true)
    draw()
    matching[0].show() // Draw again to put the text in the sites over the rest
  }
}
