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
Vector.fromObject = function(o) {
  return new Vector(o.x, o.y)
}

let content = null
let mushroom_images = new Map()
let image_bg = null
let sky_bg = null
let font_djvu;
let facts = null

async function preload() {
  font_djvu = loadFont('fonts/DejaVuSansMono-webfont.ttf')
  function pad(num, size){ return ('000000000' + num).substr(-size); }

  function loadBatch(type, mushroom_images, size) {
    for(let i = 1; i <= size; i++) {
      const path = "images/mushroom_" + type + "_" + pad(i, 2) + ".png"
      const key = type + hex_sha1(path) + "|" + path
      mushroom_images.set(key, loadImage(path))
    }
  }

  loadBatch('li', mushroom_images, 11)
  loadBatch('de', mushroom_images, 11)

  // image_bg = loadImage("images/mushroom-bg.jpg")
  image_bg = loadImage("images/bg-dark.png")
  sky_bg = loadImage("images/bg-light.png")

  let _facts = await fetch('/facts.json')
  _facts = await _facts.json()
  facts = new Map()
  for(let key in _facts.facts.es.categories) {
    facts.set(key, _facts.facts.es.categories[key])
  }

}

function get_mushroom_image(site) {
  const he = hex_sha1(site.website)
  const h = "li" + he

  if(window.debug) return mushroom_images.values().next().value

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
    branchColor: 'rgba(255, 255, 255, 0.1)',
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
    let k = Object.keys(content).map((key) => [key, content[key]])
	.filter(([key, value]) => value.firstParty && value.thirdParties.length > 7)
	.sort((a, b) => b[1].lastRequestTime - a[1].lastRequestTime)
    if(crop)
      k = k.splice(0, crop)
    return new Map(k)
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

  this.nodes_to_connect = base_roots.filter(
    node => my_first.includes(node.website)
  )

  this.lines = this.nodes_to_connect.map(node => {
    strokeWeight(this.settings.lineStrokeWeight)
    stroke(this.settings.lineStroke)
    return new SiteLine(this, node, this.height, this.highlighted, node.website)
  })

  this.computeReverse = function() {
    this.reverse_lines = []

    const concat = (x, y) => x.concat(y)
    const flatMap = (f, xs) =>
	  xs.map(f).reduce(concat, [])

    if(this.height == 0) {
      this.reverse_lines = flatMap(site => site.lines.filter(line => line.dest.equals(this.position, 1)), sites)
    } else {
    }
  }

  this.isAtPoint = function(_x, _y) {
    if(this.height == 0) {
      const topleft = {
	x: this.position.x - this.widthpx / 2,
	y: this.position.y - this.heightpx
      }

      const bottomright = {
	x: this.position.x + this.widthpx / 2,
	y: this.position.y
      }
      return topleft.x < _x && _x < bottomright.x && topleft.y < _y && _y < bottomright.y
    } else {
      return this.visible && (this.distanceTo(_x, _y) < this.height * 20 + 5)
    }
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
    this.computeReverse()
    this.reverse_lines.forEach(line => {
      line.highlight(value)
    })
  }

  this.show = function() {
    if(!this.visible) return

    this.lines.forEach(line => line.show())

    if(this.height > 0) {
      // stroke(this.settings.stroke)

      strokeWeight(this.settings.strokeWeight)
      strokeWeight(1)
      fill(lineColors[this.height][2])
      stroke(255)
      ellipse(this.position.x, this.position.y, this.height * 20)

      textWithBg(
	this.website,
	this.position.add({
	  x: 0,
	  y: 30,
	}),
	{
	  //strokeWeight: 2,
	  //textFill: 0,
	  //fill: 255,
	  //stroke: 255,
	  textSize: this.highlighted ? 22 : 8,
	}
      )
    } else {
      this.widthpx = 350
      this.heightpx = 477
      fill(0)
      stroke(0)
      image(
	get_mushroom_image(this),
	this.position.x - (this.widthpx / 2),
	this.position.y - this.heightpx + 5,
	this.widthpx,
	this.heightpx
      )

      const text_padding = min(last_scroll_position, this.heightpx - 20)

      textWithBg(
	this.website,
	this.position.subtract({
	  x: 0,
	  y: this.heightpx - text_padding
	}),
	{}
      )
    }
  }
}

function textWithBg(content, position, options) {
  position = Vector.fromObject(position)
  let settings = Object.assign({
    fill: 'rgba(0, 0, 0, 0.7)',
    stroke: 'rgba(0, 0, 0, 0.7)',
    strokeWeight: 2,
    textFill: 255,
    textStroke: 0,
    textSize: 16,
    wPaddingFactor: 1.2,
    hPaddingFactor: 2,
  }, options)

  fill(settings.fill)
  stroke(settings.stroke)
  strokeWeight(settings.strokeWeight)
  textSize(settings.textSize)
  const $tw = textWidth(content)
  const rsizew = $tw * settings.wPaddingFactor
  const rsizeh = textSize() * settings.hPaddingFactor
  rect(position.x - rsizew / 2,
       position.y - rsizeh / 1.5,
       rsizew,
       rsizeh,
       10, 10, 10, 10)
  fill(settings.textFill)
  stroke(settings.textStroke)
  text(content,
       position.x - $tw / 2,
       position.y)
}


function random_noise(x, y) {
  return new Vector(random(0, x), random(0, y))
}

let lineColors = [
  ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.4)', 'rgba(255, 255, 255, 0.6)'],
  ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.6)'],
  ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.6)'],
  ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.6)'],
  ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.6)'],
  ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.6)'],
  ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.6)'],
  ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.6)'],
  ['rgba(125, 125, 125, 0.1)', 'rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.6)'],
  ['rgba(50, 50, 50, 0.1)', 'rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.6)'],
  ['rgba(0, 0, 0, 0.1)', 'rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.6)'],
  ['rgba(130, 130, 130, 0.5)', 'rgba(255, 255, 255, 1)', 'rgba(255, 255, 255, 0.6)'],
  ['rgba(60, 60, 0, 0.5)', 'rgba(255, 255, 255, 1)', 'rgba(255, 255, 255, 0.6)'],
  ['rgba(255, 0, 0, 0.5)', 'rgba(255, 255, 255, 1)', 'rgba(255, 255, 255, 0.6)'],
  ['rgba(255, 255, 255, 1)', 'rgba(255, 255, 0, 1)', 'rgba(255, 0, 0, 1)'],
  ['rgba(255, 255, 255, 1)', 'rgba(255, 255, 0, 1)', 'rgba(255, 0, 0, 1)'],
  ['rgba(255, 255, 255, 1)', 'rgba(255, 255, 0, 1)', 'rgba(255, 0, 0, 1)'],
]

function SiteLine(source, dest, height, highlighted, textOnHighlight) {
  source = new Vector(source.position.x, source.position.y)
  dest = new Vector(dest.position.x, dest.position.y)
  this.source = source
  this.dest = dest
  this.height = height
  this.textOnHighlight = textOnHighlight || ""

  const ds = dest.subtract(source)
  const distance = Math.sqrt(Math.pow(ds.x, 2) + Math.pow(ds.y, 2))
  const segments = max(1, parseInt(distance / 100))
  const dds = ds.divided_by_integer(segments)
  const noise_amount = 0.025 * distance

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

    stroke(lineColors[this.height][this.highlighted + 0])

    const weight = 1 + this.highlighted * 10 + Math.pow(this.height / 2, 3)
    strokeWeight(weight)

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

    if(this.highlighted)
      this.showText()
  }

  this.showText = function () {
    let scrollPosition = last_scroll_position + 100

    const ab = this.source.subtract(this.dest)
    const m = ab.y / ab.x

    const base_y = scrollPosition

    const base_x = (base_y - this.source.y) / m + this.source.x

    const v = new Vector(base_x, base_y)

    if(v.y > this.dest.y && v.y < this.source.y) {
      textWithBg(this.textOnHighlight, v, {})
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

  this.roots.map(r => r.computeReverse())

  this.show = function() {
    this.roots.forEach(site => site.show())
  }
}

function Underworld(history, position) {
  const padding = 140
  const strata = stratify(history)

  this.refit = function (position) {
    sites = []
    this.position = Object.assign({x: 0, y: 0}, position)

    this.base_stratum = new RootStratum(0, this.position, strata[0], null, history)

    this.strata = strata.map(
      (stratum, index) => new RootStratum(index, displace(this.position, {y: (Math.pow(1.6, index) - 1) * padding}), stratum, this.base_stratum, history)
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
let num_mushrooms = 5
let history
let placement
let last_scroll_position = 0

async function windowResized() {
  resizeCanvas(window.windowWidth - 50, window.windowHeight * 2.5)
  placement = 3 * windowHeight / 4
  underworld.refit({y: placement})
  draw()
}

async function setup() {
  content = await storeChild.getAll()
  history = new History(num_mushrooms, content)

  textFont(font_djvu)
  const canvas = createCanvas(window.windowWidth - 50, window.windowHeight * 2.5)
  canvas.parent('visualization')
  placement = 3 * windowHeight / 4
  underworld = new Underworld(history, {y: placement})
  noLoop()

  await drawNoticeTrackers()
}

function draw() {
  background(0)
  push()

  let debug = !!window.location.search.match('debug')
  let mushroom_width = width / num_mushrooms
  if(debug) {
    stroke(255, 255, 255)
    fill(220, 255, 255)
    rect(0, 0, width, placement)
    window.debug = debug
  } else {
    image(
      sky_bg,
      0,
      0,
      sky_bg.width, sky_bg.height
    )
    stroke(0)
    line(0, placement, width, placement)

    image(
      image_bg,
      0,
      placement,
      image_bg.width, image_bg.height
    )
  }
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
  } else {
    draw()
  }
}

async function drawNoticeTrackers() {
  const h = new History(undefined, history.full_content)
  const trackers = Array.from(h.first_of.keys()).map((e) => [e, h.first_of.get(e).length]).sort((a, b) => a[1] < b[1])

  const percent1 = trackers[0][1] * 100 / Array.from(h.first_parties.keys()).length
  const percent2 = trackers[1][1] * 100 / Array.from(h.first_parties.keys()).length

  document.getElementById('trackertop1').innerHTML = '<h3>Tracker #1: '+ percent1.toFixed(1) +'% de los sitios</h3><p style="margin:0">' + trackers[0][0] + '</p>'
  document.getElementById('trackertop2').innerHTML = '<h3>Tracker #2: '+ percent2.toFixed(1) +'% de los sitios</h3><p style="margin:0">' + trackers[1][0] + '</p>'

}


window.addEventListener('scroll', (e) => {
  last_scroll_position = window.scrollY
  window.requestAnimationFrame(() => draw())

  Array.from(document.querySelectorAll('.didyouknow.from-left')).map((e) => {
    const offset = parseInt(e.dataset.scrollOffset)
    const maxleft = parseInt(e.dataset.maxLeft)
    const curleft = window.getComputedStyle(e).left

    e.style.left = Math.min(
      maxleft,
      Math.max(
	parseInt(curleft),
	window.scrollY + offset
      )
    ) + 'px'
  })
})

window.addEventListener('DOMContentLoaded', (e) => {
  document.getElementById('didyouknow-holder').addEventListener(
    'mouseenter', (e) => {
      const text = random(random(Array.from(facts.values())))
      document.getElementById('didyouknow-text').innerHTML = text
    })
})
