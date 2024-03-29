// shorthand GetElementById
function getElement(id) { return document.getElementById(id) }

// defaults
const DEFAULT = {
  bg: null,
  showBG: true,
  units: 'pixels',
  width: 640,
  height: 360,
  unitWidth: 26,
  unitHeight: 15,
  ppu: 24,
  scale: 1,
  offsetX: 8,
  offsetY: 0,
  autocenter: true,
  color: '#ff00ff',
  thickness: 2,
};

function CopyPresetInto(preset, receptacle) {
  Object.keys(preset).forEach( prop => {
    receptacle[prop] = preset[prop];
  });
  return receptacle
}

let APPDATA = CopyPresetInto(DEFAULT, {});

// set ui defaults
function SetFormDataToAppData() {
  getElement('canvasUnits').value = APPDATA.units;
  getElement('width').value = APPDATA.width;
  getElement('height').value = APPDATA.height;
  getElement('unitWidth').value = APPDATA.unitWidth;
  getElement('unitHeight').value = APPDATA.unitHeight;
  getElement('ppu').value = APPDATA.ppu;
  getElement('scale').value = APPDATA.scale;
  getElement('offsetX').value = APPDATA.offsetX;
  getElement('offsetY').value = APPDATA.offsetY;
  getElement('autocenter').checked = APPDATA.autocenter;
  getElement('color').value = APPDATA.color;
  getElement('thickness').value = APPDATA.thickness;
}

// concrete
const WRAPPER = getElement('canvasWrapper');
const VIEWPORT = new Concrete.Viewport({
  width: APPDATA.width * APPDATA.scale,
  height: APPDATA.height * APPDATA.scale,
  container: WRAPPER,
});

const LAYERS = {
  bg: new Concrete.Layer(),
  grid: new Concrete.Layer(),
  fg: new Concrete.Layer(),
};
VIEWPORT
  .add(LAYERS.bg)
  .add(LAYERS.grid)
  .add(LAYERS.fg);

// resize canvas
function ReSizeCanvas(w, h, s) {
  let width = w * s;
  let height = h * s;

  VIEWPORT.setSize(width, height);
  // Ensure the canvas element size matches! Important for downloaded image to be WYSIWIG
  VIEWPORT.scene.canvas.width = width;
  VIEWPORT.scene.canvas.height = height;
  // Update all layers as well
  VIEWPORT.layers.forEach(layer => {
    layer.width = width;
    layer.height = height;
    layer.hit.width = width;
    layer.hit.height = height;
    layer.scene.width = width;
    layer.scene.height = height;
    layer.scene.canvas.width = width;
    layer.scene.canvas.height = height;
  });
}

// draws
function ReDrawGrid() {
  let scene = LAYERS.grid.scene;
  let ctx = scene.context;
  scene.clear();
  ctx.save();

  ctx.strokeStyle = APPDATA.color;
  ctx.lineWidth = APPDATA.thickness;
  ctx.scale(APPDATA.scale, APPDATA.scale);

  ctx.beginPath();

  // Vertical Grid
  for (let i=0; i<=APPDATA.unitWidth; i++) {
    ctx.moveTo(APPDATA.offsetX + i * APPDATA.ppu, APPDATA.offsetY);
    ctx.lineTo(APPDATA.offsetX + i * APPDATA.ppu, APPDATA.offsetY + APPDATA.unitHeight * APPDATA.ppu);
  }
  // Horizontal Grid
  for (let i=0; i<=APPDATA.unitHeight; i++) {
    ctx.moveTo(APPDATA.offsetX, APPDATA.offsetY + i * APPDATA.ppu);
    ctx.lineTo(APPDATA.offsetX + APPDATA.unitWidth * APPDATA.ppu, APPDATA.offsetY + i * APPDATA.ppu);
  }

  ctx.stroke();

  ctx.restore();
  VIEWPORT.render();
}

function ReDrawBG() {
  if (APPDATA.bg != null && APPDATA.showBG) {
    let scene = LAYERS.bg.scene;
    let ctx = scene.context;
    scene.clear();
    ctx.save();

    ctx.scale(APPDATA.scale, APPDATA.scale);

    ctx.drawImage(APPDATA.bg, 0, 0);

    ctx.restore();
    VIEWPORT.render();
  }
}

// updates

// === Recalculate Canvas Values ===
function ReCalculate(changed) {
  if (changed == 'height' || changed == 'unitHeight') APPDATA.ppu = parseInt(APPDATA.height / APPDATA.unitHeight);

  if (APPDATA.units == 'pixels') {
    APPDATA.unitWidth = parseInt(APPDATA.width / APPDATA.ppu);
    APPDATA.unitHeight = parseInt(APPDATA.height / APPDATA.ppu);
  } else {
    APPDATA.width = APPDATA.unitWidth * APPDATA.ppu;
    APPDATA.height = APPDATA.unitHeight * APPDATA.ppu;
  }

  if (APPDATA.autocenter) {
    let extraX = APPDATA.width - APPDATA.unitWidth * APPDATA.ppu;
    let extraY = APPDATA.height - APPDATA.unitHeight * APPDATA.ppu;
    APPDATA.offsetX = extraX * 0.5;
    APPDATA.offsetY = extraY * 0.5;
  }
}

// === Reset Canvas ===
function ResetCanvas() {
  LAYERS.fg.scene.clear();
  LAYERS.grid.scene.clear();
  LAYERS.bg.scene.clear();
  VIEWPORT.scene.clear();
  CopyPresetInto(DEFAULT, APPDATA);
  ReDraw();
}
getElement('reset').addEventListener('click', ResetCanvas);

// === Download Image ===
getElement('download').addEventListener('click', function() {
  let scale = (APPDATA.scale != 1) ? `-x${APPDATA.scale}` : ``;
  // Download file
  VIEWPORT.scene.download({
    fileName: `grid-${APPDATA.unitWidth}w${APPDATA.unitHeight}h-${APPDATA.ppu}ppu${scale}.png`
  });
});

// === Type Conversions for Form Data Updates ===
function ConvertType(v, type) {
  if (type == 'int') {
    return parseInt(v); 
  } else if (type == 'num') { 
    return Number(v); 
  } else { 
    return v; 
  }
}
function UpdateProperty(property, type) {
  return function() {
    APPDATA[property] = ConvertType(this.value, type);
    ReCalculate(property);
    ReDraw();
  }
}
function UpdateUnits() {
  return function() {
    APPDATA.units = this.value;
    if (APPDATA.units == 'pixels') {
      // Set READONLY on unit

      // Remove READONLY from px
    } else {
      // Set READONLY on px

      // Remove READONLY from unit
    }
  }
}
function UpdateCheckbox(property) {
  return function() {
    APPDATA[property] = this.checked;
    ReCalculate(property);
    ReDraw();
  }
}

function UpdateBG(property) {
  if (property == 'bgImgURL') {
    return function() {
      getElement('bgError').innerHTML = '';
      let url = this.value || '';
      if (url) url = url.replace(/\s/g, '');
      if (url.length > 0) {
        let img = new Image();
        img.crossOrigin = 'Anonymous';
        img.addEventListener('load', () => {
          APPDATA.bg = img;
          APPDATA.width = img.naturalWidth;
          APPDATA.height = img.naturalHeight;
          getElement('clearBG').disabled = false;
          getElement('toggleBG').disabled = false;
          ReCalculate('height');
          ReDraw();
        });
        img.addEventListener('error', () => {
          console.log(img);
          getElement('bgError').innerHTML += `<p>Unable to load image from URL.</p>`;
          getElement('clearBG').disabled = false;
          getElement('toggleBG').disabled = true;
        });
        img.src = this.value;
      } else {
        getElement('bgError').innerHTML += '<p>Image URL not found!</p>';
        getElement('clearBG').disabled = false;
        getElement('toggleBG').disabled = true;
      }
    }
  }
  else {
    return function() {
      getElement('bgError').innerHTML = '';
      if (this.files && this.files[0]) {
        let FR = new FileReader();
        FR.onerror = function(ev) {
          getElement('bgError').innerHTML += `<p>Problem uploading file: ${FR.error.message}</p>`;
        }
        FR.onload = function(e) {
          let img = new Image();
          img.crossOrigin = 'Anonymous';
          img.addEventListener('load', () => {
            APPDATA.bg = img;
            APPDATA.width = img.naturalWidth;
            APPDATA.height = img.naturalHeight;
            getElement('clearBG').disabled = false;
            getElement('toggleBG').disabled = false;
            ReCalculate('height');
            ReDraw();
          });
          img.addEventListener('error', () => {
            console.log(img);
            getElement('bgError').innerHTML += `<p>Unable to load image from File.</p>`;
            getElement('clearBG').disabled = false;
            getElement('toggleBG').disabled = true;
          });
          img.src = e.target.result;
        };
        FR.readAsDataURL(this.files[0]);
      } else {
        getElement('bgError').innerHTML += '<p>File not found!</p>';
        getElement('clearBG').disabled = false;
        getElement('toggleBG').disabled = true;
      }
    }
  }
}

function ClearBG()
{
  return function() {
    LAYERS.bg.scene.clear();
    getElement('bgError').innerHTML = '';
    getElement('bgImgURL').value = '';
    getElement('bgImgFile').value = null;
    APPDATA.bg = null;
    getElement('clearBG').disabled = true;
    getElement('toggleBG').disabled = true;
    ReDraw();
  }
}

function ToggleBG()
{
  return function() {
    if (APPDATA.showBG) {
      APPDATA.showBG = false;
      getElement('clearBG').disabled = true;
      this.innerHTML = 'Show BG';
    } else {
      APPDATA.showBG = true;
      getElement('clearBG').disabled = false;
      this.innerHTML = 'Hide BG';
    }
    ReDraw();
  }
}

function ReDraw()
{
  SetFormDataToAppData();
  ReSizeCanvas(APPDATA.width, APPDATA.height, APPDATA.scale);
  ReDrawBG();
  ReDrawGrid();
}

// === Form Data Updates ===
getElement('canvasUnits').addEventListener('change', UpdateUnits(), false);
getElement('width').addEventListener('change', UpdateProperty('width', 'int'), false);
getElement('height').addEventListener('change', UpdateProperty('height', 'int'), false);
getElement('unitWidth').addEventListener('change', UpdateProperty('unitWidth', 'int'), false);
getElement('unitHeight').addEventListener('change', UpdateProperty('unitHeight', 'int'), false);
getElement('ppu').addEventListener('change', UpdateProperty('ppu', 'int'), false);
getElement('scale').addEventListener('change', UpdateProperty('scale', 'num'), false);
getElement('offsetX').addEventListener('change', UpdateProperty('offsetX', 'int'), false);
getElement('offsetY').addEventListener('change', UpdateProperty('offsetY', 'int'), false);
getElement('autocenter').addEventListener('change', UpdateCheckbox('autocenter'), false);
getElement('color').addEventListener('change', UpdateProperty('color', 'string'), false);
getElement('thickness').addEventListener('change', UpdateProperty('thickness', 'int'), false);
getElement('bgImgURL').addEventListener('change', UpdateBG('bgImgURL'), false);
getElement('bgImgFile').addEventListener('change', UpdateBG('bgImgFile'), false);
getElement('toggleBG').addEventListener('click', ToggleBG(), false);
getElement('clearBG').addEventListener('click', ClearBG(), false);

// main
CopyPresetInto(DEFAULT, APPDATA);
getElement('bgImgURL').value = (APPDATA.bg) ? APPDATA.bg.src : '';
getElement('bgImgFile').value = null;
if (!APPDATA.bg) {
  getElement('clearBG').disabled = true;
  getElement('toggleBG').disabled = true;
}
ReDraw();