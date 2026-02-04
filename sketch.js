let zoneParticles = [[], []]; 
let lastSecond, lastMinute;
let mainFont, footerFont, sidebarFont; 
let city = ""; let country = "";
let locationFetched = false;
const PARTICLES_PER_SECTION = 1200; 

function preload() {
  mainFont = loadFont('MP-B.ttf'); 
  footerFont = loadFont('MS-Bk.otf');
  sidebarFont = loadFont('MP-M.ttf'); 
}

function setup() {
  createCanvas(1080, 1920); 
  fetchLocation();

  for (let s = 0; s < 2; s++) {
    let minY = (s === 0) ? 0 : 880;
    let maxY = (s === 0) ? 880 : 1920; 
    for (let i = 0; i < PARTICLES_PER_SECTION; i++) {
      zoneParticles[s].push(new Particle(0, width, minY, maxY, s));
    }
  }
  lastSecond = second();
  lastMinute = minute();
}

function draw() {
  background('#1c1b1c'); 

  let h = nf(hour(), 2);
  let m = nf(minute(), 2);
  let s = nf(second(), 2);
  
  let pFontSize = 760; 
  let yAdjust = -110;  
  let monoSpaceGutter = 240; 
  let densityStep = 11; 

  if (second() !== lastSecond) {
    applyVibration(8); 
    lastSecond = second();
  }
  
  if (minute() !== lastMinute) {
    shatterEffect();
    lastMinute = minute();
  }

  // --- TARGET GENERATION ---
  let hPts1 = textToPoints(h[0], (width/2) - monoSpaceGutter, 440 + yAdjust, pFontSize, densityStep);
  let hPts2 = textToPoints(h[1], (width/2) + monoSpaceGutter, 440 + yAdjust, pFontSize, densityStep);
  let combinedHPts = hPts1.concat(hPts2);

  let mPts1 = textToPoints(m[0], (width/2) - monoSpaceGutter, 1320 + yAdjust, pFontSize, densityStep);
  let mPts2 = textToPoints(m[1], (width/2) + monoSpaceGutter, 1320 + yAdjust, pFontSize, densityStep);
  let combinedMPts = mPts1.concat(mPts2);

  let allSectionPts = [combinedHPts, combinedMPts];

  for (let sIdx = 0; sIdx < 2; sIdx++) {
    let pts = allSectionPts[sIdx];
    for (let i = 0; i < zoneParticles[sIdx].length; i++) {
      let p = zoneParticles[sIdx][i];
      if (i < pts.length) { p.setTarget(pts[i].x, pts[i].y); } 
      else { p.setTarget(null, null); }
      p.behaviors(); 
      p.update();
      p.show();
    }
  }

  drawFooter(h + ":" + m + ":" + s, city + ", " + country);
}

function drawFooter(time, locStr) {
  let monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  let dayNames = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
  let dLine = day() + " " + monthNames[month() - 1] + " " + year() + " - " + dayNames[new Date().getDay()];
  
  stroke(255, 40); 
  strokeWeight(2);
  line(0, 880, width, 880);
  
  noStroke();
  fill(255);
  textFont(footerFont);
  textAlign(LEFT, BOTTOM);
  textSize(95); 
  text(time, 60, height - 60); 
  
  textFont(sidebarFont);
  textAlign(RIGHT, BOTTOM);
  let locTxt = locationFetched ? locStr.toUpperCase() : "MELBOURNE, AUSTRALIA";
  textSize(32);
  text(locTxt, width - 60, height - 105);
  textSize(28);
  fill(160); 
  text(dLine.toUpperCase(), width - 60, height - 65);
}

function textToPoints(txt, x, y, size, step) {
  let pts = [];
  let t = createGraphics(1000, 1000); 
  t.pixelDensity(1);
  t.textFont(mainFont); 
  t.textSize(size * 0.5); 
  t.textAlign(CENTER, CENTER);
  t.fill(255);
  t.text(txt, 500, 500);
  t.loadPixels();
  for (let i = 0; i < t.width; i += step) {
    for (let j = 0; j < t.height; j += step) {
      if (t.pixels[(i + j * t.width) * 4] > 127) {
        pts.push({ x: x + (i - 500) * 2, y: y + (j - 500) * 2 });
      }
    }
  }
  t.remove();
  return pts;
}

function applyVibration(s) {
  for (let sec of zoneParticles) {
    for (let p of sec) { p.applyForce(p5.Vector.random2D().mult(random(s))); }
  }
}

function shatterEffect() {
  for (let sec of zoneParticles) {
    for (let p of sec) { p.applyForce(p5.Vector.random2D().mult(random(250, 450))); }
  }
}

function fetchLocation() {
  if (locationFetched) return;
  loadJSON('https://ipapi.co/json/', (data) => {
    city = data.city;
    country = data.country_name;
    locationFetched = true;
  });
}

class Particle {
  constructor(minX, maxX, minY, maxY, sectionIdx) {
    this.minX = minX; this.maxX = maxX;
    this.minY = minY; this.maxY = maxY;
    this.sectionIdx = sectionIdx;
    this.pos = createVector(random(this.minX, this.maxX), random(this.minY, this.maxY));
    this.vel = createVector();
    this.acc = createVector();
    this.target = createVector(this.pos.x, this.pos.y);
    this.noiseOff = random(10000); 
    
    this.maxspeed = 15; 
    this.maxforce = 1.2; 
    
    this.idleSizeBase = random(2, 11); 
    this.colorActive = color('#89C925'); 
    this.colorIdle = color('#2c3320');
    this.currentColor = color('#2c3320');
    this.isTargeted = false;
  }

  setTarget(x, y) {
    if (x) { this.target.set(x, y); this.isTargeted = true; } 
    else { this.isTargeted = false; }
  }

  behaviors() {
    if (this.isTargeted) {
      this.applyForce(this.arrive(this.target));
    } else {
      // -----------------------------------------------------------------------
      // HEARTBEAT BOUNCE CONTROLS (How hard it kicks)
      // -----------------------------------------------------------------------
      let bounceStrengthX = 0.5;  // Adjust this for horizontal bounce power
      let bounceStrengthY = 0.3;  // Adjust this for vertical bounce power
      // -----------------------------------------------------------------------

      // The "thump" timing logic
      let pulseValue = pow(sin(frameCount * 0.05 + this.noiseOff), 12);
      
      let n = noise(this.pos.x * 0.001, this.pos.y * 0.001, frameCount * 0.002 + this.noiseOff);
      let angle = map(n, 0, 1, -TWO_PI * 2, TWO_PI * 2);
      
      // Calculate how the pulse affects movement
      let kickX = cos(angle) * (pulseValue * bounceStrengthX);
      let kickY = sin(angle) * (pulseValue * bounceStrengthY);
      
      // Basic drift + the heartbeat kick
      let drift = p5.Vector.fromAngle(angle).mult(0.08);
      this.applyForce(drift);
      this.applyForce(createVector(kickX, kickY));
      
      // Keep them away from the screen edges
      if (this.pos.x < 80) this.applyForce(createVector(0.1, 0));
      if (this.pos.x > width - 80) this.applyForce(createVector(-0.1, 0));
    }
  }

  applyForce(f) { this.acc.add(f); }

  update() {
    this.vel.add(this.acc).limit(this.maxspeed);
    this.pos.add(this.vel);
    this.acc.mult(0);
    this.vel.mult(0.96); 

    if (this.pos.x < this.minX || this.pos.x > this.maxX) this.vel.x *= -0.2;
    if (this.pos.y < this.minY || this.pos.y > this.maxY) this.vel.y *= -0.2;
    this.pos.x = constrain(this.pos.x, this.minX, this.maxX);
    this.pos.y = constrain(this.pos.y, this.minY, this.maxY);
  }

  arrive(t) {
    let desired = p5.Vector.sub(t, this.pos);
    let d = desired.mag();
    let speed = (d < 120) ? map(d, 0, 120, 0, this.maxspeed) : this.maxspeed;
    desired.setMag(speed);
    return p5.Vector.sub(desired, this.vel).limit(this.maxforce);
  }

  show() {
    let targetC = this.isTargeted ? this.colorActive : this.colorIdle;
    this.currentColor = lerpColor(this.currentColor, targetC, 0.1);
    stroke(this.currentColor);
    
    if (this.isTargeted) {
      let sectionHeight = this.maxY - this.minY;
      let relativeY = (this.pos.y - this.minY) / sectionHeight;
      
      // --- TAPER SETTINGS ---
      let weight;
      if (this.sectionIdx === 0) {
        weight = map(pow(1 - relativeY, 0.8), 0, 1, 1.2, 34); 
      } else {
        weight = map(pow(1 - relativeY, 1.2), 0, 1, 1.4, 34);
      }
      strokeWeight(weight);
    } else {
      // --- HEARTBEAT SIZE PULSE ---
      let pulse = pow(sin(frameCount * 0.05 + this.noiseOff), 8); 
      let breatheScale = map(pulse, 0, 1, 1.0, 1.8);
      strokeWeight(this.idleSizeBase * breatheScale);
    }
    point(this.pos.x, this.pos.y);
  }
}