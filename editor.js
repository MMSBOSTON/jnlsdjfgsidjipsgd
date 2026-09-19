/* ==========================================================
   MAJESTIC — Конструктор одежды
   ========================================================== */
(function(){
  'use strict';

  var SIZE = 1024;

  var GARMENTS = [
    { id:'tshirt', name:'Футболка',  slot:'jbib_000_u',  mesh:'torso',
      svg:'<path d="M6 4 2 7l2 3 1-1v10h10V9l1 1 2-3-4-3s-1 2-3 2-3-2-3-2Z"/>' },
    { id:'hoodie', name:'Худи',      slot:'jbib_001_u',  mesh:'torso',
      svg:'<path d="M6 5 3 7l1 4v9h10V11l1-4-3-2s-1 2-3 2-3-2-3-2Z"/>' },
    { id:'jacket', name:'Куртка',    slot:'jbib_002_u',  mesh:'torso',
      svg:'<path d="M5 5 2 8v12h5V8l1-3H5Zm8 0-1 3v12h5V8l-3-3h-1Z"/>' },
    { id:'pants',  name:'Штаны',     slot:'lowr_000_u',  mesh:'legs',
      svg:'<path d="M5 3h8l1 15h-4l-1-9-1 9H4Z"/>' },
    { id:'shorts', name:'Шорты',     slot:'lowr_001_u',  mesh:'legs',
      svg:'<path d="M4 4h10l1 9h-5l-1-4-1 4H3Z"/>' },
    { id:'shoes',  name:'Кроссовки', slot:'feet_000_u',  mesh:'feet',
      svg:'<path d="M2 12V9h3l2-3 3 2 4 2c1 .5 1 2 1 2H2Z"/>' },
    { id:'cap',    name:'Кепка',     slot:'p_head_000',  mesh:'head',
      svg:'<path d="M4 10a6 6 0 0 1 12 0H4Z"/><path d="M16 10h4l-1 2h-3"/>' },
    { id:'gloves', name:'Перчатки',  slot:'hand_000_u',  mesh:'hands',
      svg:'<path d="M5 13V7a1 1 0 0 1 2 0v-1a1 1 0 0 1 2 0v1a1 1 0 0 1 2 0v6Z"/>' },
  ];

  var TOOLS = [
    { id:'brush',  name:'Кисть',    svg:'<path d="M4 20l4-1 9-9-3-3-9 9-1 4Z"/><path d="M14 6l3 3 2-2-3-3Z"/>' },
    { id:'eraser', name:'Ластик',   svg:'<path d="M5 15 13 7l4 4-8 8H5v-4Z"/><path d="M9 19h10"/>' },
    { id:'fill',   name:'Заливка',  svg:'<path d="M5 11 12 4l7 7-7 7-7-7Z"/><path d="M19 15c0 2-1 3-2 3s-2-1-2-3 2-3 2-3 2 1 2 3Z"/>' },
    { id:'line',   name:'Линия',    svg:'<path d="M4 20 20 4"/>' },
    { id:'rect',   name:'Прямоуг.', svg:'<rect x="4" y="6" width="16" height="12" rx="1"/>' },
    { id:'circle', name:'Круг',     svg:'<circle cx="12" cy="12" r="8"/>' },
    { id:'text',   name:'Текст',    svg:'<path d="M5 6h14M12 6v13M8 19h8"/>' },
    { id:'image',  name:'Картинка', svg:'<rect x="3" y="4" width="18" height="16" rx="1"/><circle cx="9" cy="10" r="2"/><path d="m3 18 6-6 4 4 4-4 4 4"/>' },
  ];

  var SWATCHES = [
    '#ffffff','#d4d4d4','#a3a3a3','#737373','#525252','#404040','#262626','#000000',
    '#e05252','#e08a52','#e0c852','#8ad652','#52d6b8','#5296d6','#8a52d6','#d652b8',
  ];

  var state = {
    garment: 'tshirt',
    tool: 'brush',
    color: '#ffffff',
    size: 24,
    opacity: 1,
    layers: [],
    activeLayer: 0,
    drawing: false,
    startX: 0, startY: 0,
    lastX: 0, lastY: 0,
    history: [],
    historyIdx: -1,
    canvas: null,
    ctx: null,
    three: null,
    texture: null,
    textureRaf: null,
  };

  /* ---------- Layers ---------- */
  function makeLayer(name){
    var c = document.createElement('canvas');
    c.width = SIZE; c.height = SIZE;
    var ctx = c.getContext('2d');
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    return { name: name, canvas: c, ctx: ctx, visible: true, opacity: 1 };
  }

  function activeLayer(){ return state.layers[state.activeLayer]; }

  /* ---------- Colors ---------- */
  function hexToRgb(hex){
    var m = hex.replace('#','');
    if (m.length === 3) m = m.split('').map(function(x){ return x + x; }).join('');
    return {
      r: parseInt(m.slice(0,2),16),
      g: parseInt(m.slice(2,4),16),
      b: parseInt(m.slice(4,6),16),
    };
  }

  /* ---------- History ---------- */
  function pushHistory(){
    var snap = state.layers.map(function(l){
      return {
        name: l.name,
        visible: l.visible,
        opacity: l.opacity,
        data: l.canvas.toDataURL('image/png'),
      };
    });
    state.history = state.history.slice(0, state.historyIdx + 1);
    state.history.push(snap);
    if (state.history.length > 15) state.history.shift();
    state.historyIdx = state.history.length - 1;
    updateHistoryButtons();
  }

  function restoreHistory(idx){
    var snap = state.history[idx];
    if (!snap) return;

    var pending = snap.length;
    var newLayers = snap.map(function(s){
      var c = document.createElement('canvas');
      c.width = SIZE; c.height = SIZE;
      var ctx = c.getContext('2d');
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      var obj = { name: s.name, canvas: c, ctx: ctx, visible: s.visible, opacity: s.opacity };
      var img = new Image();
      img.onload = function(){
        ctx.drawImage(img, 0, 0);
        pending--;
        if (pending === 0){ redraw(); renderLayers(); updateHistoryButtons(); }
      };
      img.onerror = function(){
        pending--;
        if (pending === 0){ redraw(); renderLayers(); updateHistoryButtons(); }
      };
      img.src = s.data;
      return obj;
    });

    state.layers = newLayers;
    if (state.activeLayer >= state.layers.length)
      state.activeLayer = state.layers.length - 1;
  }

  function updateHistoryButtons(){
    var u = document.getElementById('undoBtn');
    var r = document.getElementById('redoBtn');
    if (u) u.disabled = state.historyIdx <= 0;
    if (r) r.disabled = state.historyIdx >= state.history.length - 1;
  }

  /* ---------- Render composite ---------- */
  function redraw(){
    if (!state.ctx) return;
    var c = state.ctx;
    c.clearRect(0, 0, SIZE, SIZE);
    for (var i = 0; i < state.layers.length; i++){
      var layer = state.layers[i];
      if (!layer.visible) continue;
      c.globalAlpha = layer.opacity;
      c.drawImage(layer.canvas, 0, 0);
    }
    c.globalAlpha = 1;
    scheduleTextureUpdate();
  }

  function redrawWithPreview(shapeFn){
    redraw();
    if (!shapeFn) return;
    var c = state.ctx;
    c.save();
    c.globalAlpha = state.opacity;
    c.strokeStyle = state.color;
    c.fillStyle = state.color;
    c.lineWidth = state.size;
    c.lineCap = 'round'; c.lineJoin = 'round';
    shapeFn(c);
    c.restore();
  }

  function scheduleTextureUpdate(){
    if (state.textureRaf) return;
    state.textureRaf = requestAnimationFrame(function(){
      state.textureRaf = null;
      if (state.texture) state.texture.needsUpdate = true;
    });
  }

  /* ---------- 3D ---------- */
  function initThree(container){
    if (!window.THREE) throw new Error('THREE не загружен');

    var w = container.clientWidth || 320;
    var h = container.clientHeight || 280;

    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);

    var camera = new THREE.PerspectiveCamera(32, w/h, 0.1, 100);
    camera.position.set(0, 2.2, 7);
    camera.lookAt(0, 2, 0);

    var renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    var d1 = new THREE.DirectionalLight(0xffffff, 0.85);
    d1.position.set(4, 8, 6);
    scene.add(d1);
    var d2 = new THREE.DirectionalLight(0xffffff, 0.3);
    d2.position.set(-5, 4, -6);
    scene.add(d2);

    var bodyMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a, roughness: 0.95, metalness: 0.0,
    });

    var mann = new THREE.Group();

    var torso = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.9, 2.0, 32), bodyMat);
    torso.position.y = 2.25; mann.add(torso);

    var neck = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.35, 16), bodyMat);
    neck.position.y = 3.4; mann.add(neck);

    var head = new THREE.Mesh(new THREE.SphereGeometry(0.46, 24, 24), bodyMat);
    head.position.y = 3.9; mann.add(head);

    [-1, 1].forEach(function(side){
      var arm = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.16, 1.9, 16), bodyMat);
      arm.position.set(side * 1.05, 2.3, 0);
      arm.rotation.z = side * 0.14;
      mann.add(arm);

      var hand = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), bodyMat);
      hand.position.set(side * 1.2, 1.3, 0);
      mann.add(hand);

      var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.25, 2.2, 20), bodyMat);
      leg.position.set(side * 0.42, 0.9, 0);
      mann.add(leg);

      var foot = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.2, 0.72), bodyMat);
      foot.position.set(side * 0.42, -0.28, 0.14);
      mann.add(foot);
    });
    scene.add(mann);

    var garmentGroup = new THREE.Group();
    scene.add(garmentGroup);

    // IMPORTANT: keep flipY default true — canvas top maps to cylinder top
    var tex = new THREE.CanvasTexture(state.canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.anisotropy = 4;
    state.texture = tex;

    var mat = new THREE.MeshStandardMaterial({
      map: tex,
      side: THREE.DoubleSide,
      roughness: 0.85,
      metalness: 0.05,
      transparent: true,
    });

    var controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 2, 0);
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.minDistance = 4;
    controls.maxDistance = 12;
    controls.minPolarAngle = 0.3;
    controls.maxPolarAngle = Math.PI * 0.72;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.8;
    controls.update();

    var instance = {
      scene: scene, camera: camera, renderer: renderer,
      controls: controls, garmentGroup: garmentGroup,
      mat: mat, tex: tex,
    };
    state.three = instance;

    buildGarmentMesh(state.garment);

    function onResize(){
      var W = container.clientWidth || 320;
      var H = container.clientHeight || 280;
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      renderer.setSize(W, H, false);
    }
    instance.onResize = onResize;
    window.addEventListener('resize', onResize);

    (function animate(){
      // stop if we've been replaced or unmounted
      if (state.three !== instance) return;
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    })();
  }

  function buildGarmentMesh(garmentId){
    var t = state.three;
    if (!t) return;
    var garment = null;
    for (var i = 0; i < GARMENTS.length; i++){
      if (GARMENTS[i].id === garmentId){ garment = GARMENTS[i]; break; }
    }
    if (!garment) garment = GARMENTS[0];

    // Properly remove and dispose all previous meshes
    while (t.garmentGroup.children.length > 0){
      var child = t.garmentGroup.children[0];
      t.garmentGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
    }

    var mat = t.mat;

    function add(mesh){ t.garmentGroup.add(mesh); }

    if (garment.mesh === 'torso'){
      var geo = new THREE.CylinderGeometry(0.96, 1.02, 2.05, 40, 1, true);
      var m = new THREE.Mesh(geo, mat);
      m.position.y = 2.25;
      add(m);
    }
    else if (garment.mesh === 'legs'){
      [-1, 1].forEach(function(side){
        var geo = new THREE.CylinderGeometry(0.34, 0.3, 2.15, 24, 1, true);
        var m = new THREE.Mesh(geo, mat);
        m.position.set(side * 0.42, 0.9, 0);
        add(m);
      });
    }
    else if (garment.mesh === 'feet'){
      [-1, 1].forEach(function(side){
        var geo = new THREE.BoxGeometry(0.46, 0.24, 0.78);
        var m = new THREE.Mesh(geo, mat);
        m.position.set(side * 0.42, -0.28, 0.14);
        add(m);
      });
    }
    else if (garment.mesh === 'head'){
      var geoH = new THREE.SphereGeometry(0.5, 24, 12, 0, Math.PI*2, 0, Math.PI*0.6);
      var mH = new THREE.Mesh(geoH, mat);
      mH.position.y = 3.92;
      add(mH);

      var geoB = new THREE.RingGeometry(0.48, 0.75, 24, 1, 0, Math.PI);
      var mB = new THREE.Mesh(geoB, mat);
      mB.rotation.x = -Math.PI / 2 + 0.05;
      mB.position.set(0, 3.92, 0.15);
      add(mB);
    }
    else if (garment.mesh === 'hands'){
      [-1, 1].forEach(function(side){
        var geo = new THREE.SphereGeometry(0.21, 20, 20);
        var m = new THREE.Mesh(geo, mat);
        m.position.set(side * 1.2, 1.3, 0);
        add(m);
      });
    }
  }

  /* ---------- Drawing input ---------- */
  function getPos(e){
    var r = state.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) / r.width * SIZE,
      y: (e.clientY - r.top) / r.height * SIZE,
    };
  }

  function startDraw(e){
    if (state.drawing) return;
    var p = getPos(e);
    state.drawing = true;
    state.startX = p.x; state.startY = p.y;
    state.lastX = p.x; state.lastY = p.y;

    var t = state.tool;

    if (t === 'brush' || t === 'eraser'){
      var l = activeLayer();
      var c = l.ctx;
      c.save();
      c.globalAlpha = state.opacity;
      c.lineCap = 'round'; c.lineJoin = 'round';
      c.lineWidth = t === 'eraser' ? state.size * 2 : state.size;
      c.strokeStyle = state.color;
      c.globalCompositeOperation = t === 'eraser' ? 'destination-out' : 'source-over';
      c.beginPath();
      c.moveTo(p.x, p.y);
      c.lineTo(p.x + 0.01, p.y + 0.01);
      c.stroke();
      c.restore();
      redraw();
    }
    else if (t === 'fill'){
      floodFill(p.x, p.y);
      state.drawing = false;
    }
    else if (t === 'text'){
      addText(p.x, p.y);
      state.drawing = false;
    }
    else if (t === 'image'){
      placeImage(p.x, p.y);
      state.drawing = false;
    }
  }

  function moveDraw(e){
    if (!state.drawing) return;
    var p = getPos(e);
    var t = state.tool;

    if (t === 'brush' || t === 'eraser'){
      var l = activeLayer();
      var c = l.ctx;
      c.save();
      c.globalAlpha = state.opacity;
      c.lineCap = 'round'; c.lineJoin = 'round';
      c.lineWidth = t === 'eraser' ? state.size * 2 : state.size;
      c.strokeStyle = state.color;
      c.globalCompositeOperation = t === 'eraser' ? 'destination-out' : 'source-over';
      c.beginPath();
      c.moveTo(state.lastX, state.lastY);
      c.lineTo(p.x, p.y);
      c.stroke();
      c.restore();
      state.lastX = p.x; state.lastY = p.y;
      redraw();
    }
    else if (t === 'line' || t === 'rect' || t === 'circle'){
      drawShapePreview(p.x, p.y, e.shiftKey);
    }
    state.lastX = p.x; state.lastY = p.y;
  }

  function endDraw(e){
    if (!state.drawing) return;
    var p = getPos(e);
    var t = state.tool;

    if (t === 'brush' || t === 'eraser'){
      pushHistory();
    }
    else if (t === 'line' || t === 'rect' || t === 'circle'){
      commitShape(p.x, p.y, e.shiftKey);
      pushHistory();
      redraw();
    }
    state.drawing = false;
  }

  function drawShapePreview(x, y, square){
    redrawWithPreview(function(c){
      c.beginPath();
      if (state.tool === 'line'){
        c.moveTo(state.startX, state.startY);
        c.lineTo(x, y);
        c.stroke();
      }
      else if (state.tool === 'rect'){
        var w = x - state.startX, h = y - state.startY;
        if (square){
          var s = Math.min(Math.abs(w), Math.abs(h));
          w = Math.sign(w) * s; h = Math.sign(h) * s;
        }
        c.strokeRect(state.startX, state.startY, w, h);
      }
      else if (state.tool === 'circle'){
        var rx = Math.abs(x - state.startX) / 2;
        var ry = Math.abs(y - state.startY) / 2;
        var cx = state.startX + (x - state.startX) / 2;
        var cy = state.startY + (y - state.startY) / 2;
        c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        c.stroke();
      }
    });
  }

  function commitShape(x, y, square){
    var l = activeLayer();
    var c = l.ctx;
    c.save();
    c.globalAlpha = state.opacity;
    c.strokeStyle = state.color;
    c.fillStyle = state.color;
    c.lineWidth = state.size;
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath();

    if (state.tool === 'line'){
      c.moveTo(state.startX, state.startY);
      c.lineTo(x, y);
      c.stroke();
    }
    else if (state.tool === 'rect'){
      var w = x - state.startX, h = y - state.startY;
      if (square){
        var s = Math.min(Math.abs(w), Math.abs(h));
        w = Math.sign(w) * s; h = Math.sign(h) * s;
      }
      c.strokeRect(state.startX, state.startY, w, h);
    }
    else if (state.tool === 'circle'){
      var rx = Math.abs(x - state.startX) / 2;
      var ry = Math.abs(y - state.startY) / 2;
      var cx = state.startX + (x - state.startX) / 2;
      var cy = state.startY + (y - state.startY) / 2;
      c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      c.stroke();
    }
    c.restore();
  }

  /* ---------- Flood fill ---------- */
  function floodFill(startX, startY){
    var l = activeLayer();
    var W = SIZE, H = SIZE;
    var img = l.ctx.getImageData(0, 0, W, H);
    var data = img.data;

    var ix = Math.floor(startX);
    var iy = Math.floor(startY);
    if (ix < 0 || ix >= W || iy < 0 || iy >= H) return;

    var startIdx = (iy * W + ix) * 4;
    var target = [data[startIdx], data[startIdx+1], data[startIdx+2], data[startIdx+3]];

    var rgb = hexToRgb(state.color);
    // Force full opacity for fill — partial alpha breaks repeat fills
    var fill = [rgb.r, rgb.g, rgb.b, 255];

    if (target[0] === fill[0] && target[1] === fill[1] &&
        target[2] === fill[2] && target[3] === fill[3]) return;

    var tolerance = 24;

    function match(i){
      return Math.abs(data[i]   - target[0]) <= tolerance &&
             Math.abs(data[i+1] - target[1]) <= tolerance &&
             Math.abs(data[i+2] - target[2]) <= tolerance &&
             Math.abs(data[i+3] - target[3]) <= tolerance;
    }

    var seen = new Uint8Array(W * H);
    var stack = [[ix, iy]];

    while (stack.length){
      var pt = stack.pop();
      var sx = pt[0], sy = pt[1];
      if (sx < 0 || sx >= W || sy < 0 || sy >= H) continue;
      if (seen[sy * W + sx]) continue;
      if (!match((sy * W + sx) * 4)) continue;

      var x1 = sx;
      while (x1 > 0 && !seen[sy * W + (x1 - 1)] && match((sy * W + (x1 - 1)) * 4)) x1--;
      var x2 = sx;
      while (x2 < W - 1 && !seen[sy * W + (x2 + 1)] && match((sy * W + (x2 + 1)) * 4)) x2++;

      for (var xi = x1; xi <= x2; xi++){
        var ii = (sy * W + xi) * 4;
        seen[sy * W + xi] = 1;
        data[ii]   = fill[0];
        data[ii+1] = fill[1];
        data[ii+2] = fill[2];
        data[ii+3] = fill[3];

        if (sy > 0 && !seen[(sy-1) * W + xi] && match(((sy-1) * W + xi) * 4))
          stack.push([xi, sy-1]);
        if (sy < H-1 && !seen[(sy+1) * W + xi] && match(((sy+1) * W + xi) * 4))
          stack.push([xi, sy+1]);
      }
    }

    l.ctx.putImageData(img, 0, 0);
    redraw();
    pushHistory();
  }

  /* ---------- Text ---------- */
  function addText(x, y){
    var text = window.prompt('Введите текст:');
    if (!text) return;
    var size = Math.max(24, state.size * 3);
    var l = activeLayer();
    var c = l.ctx;
    c.save();
    c.globalAlpha = state.opacity;
    c.fillStyle = state.color;
    c.font = '700 ' + size + "px 'Inter', sans-serif";
    c.textBaseline = 'top';
    c.fillText(text, x, y);
    c.restore();
    redraw();
    pushHistory();
  }

  /* ---------- Image ---------- */
  function placeImage(x, y){
    var inp = document.getElementById('imageInput');
    if (!inp) return;
    inp.onchange = function(e){
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function(ev){
        var img = new Image();
        img.onload = function(){
          var maxSide = 512;
          var scale = Math.min(1, maxSide / Math.max(img.width, img.height));
          var w = img.width * scale;
          var h = img.height * scale;
          var l = activeLayer();
          l.ctx.save();
          l.ctx.globalAlpha = state.opacity;
          l.ctx.drawImage(img, x - w/2, y - h/2, w, h);
          l.ctx.restore();
          redraw();
          pushHistory();
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(f);
      inp.value = '';
    };
    inp.click();
  }

  /* ---------- Texture name for export ---------- */
  function getTextureName(slot){
    // jbib_000_u → jbib ; p_head_000 → p_head
    var category = slot.replace(/_\d+.*$/, '');
    var isProp = category.indexOf('p_') === 0;
    return isProp
      ? category + '_diff_000_a'
      : category + '_diff_000_a_uni';
  }

  /* ---------- Export ---------- */
  function exportPNG(){
    var g = findGarment(state.garment);
    var slot = document.getElementById('slotSelect');
    var useSlot = (slot && slot.value) ? slot.value : g.slot;
    var texName = getTextureName(useSlot);
    var link = document.createElement('a');
    link.download = texName + '.png';
    link.href = state.canvas.toDataURL('image/png');
    link.click();
    toast('PNG скачан: ' + texName + '.png');
  }

  function exportZIP(){
    if (typeof JSZip === 'undefined'){ toast('JSZip не загрузился'); return; }
    var g = findGarment(state.garment);
    var slotEl = document.getElementById('slotSelect');
    var slot = (slotEl && slotEl.value) ? slotEl.value : g.slot;
    var texName = getTextureName(slot);

    var zip = new JSZip();
    var root = zip.folder('MajesticCustomClothing');
    var dataUrl = state.canvas.toDataURL('image/png');
    var base64 = dataUrl.split(',')[1];
    root.file('textures/' + texName + '.png', base64, { base64: true });
    root.file('README.txt', buildReadme(g, slot, texName));
    root.file('FixArchive.bat', buildBat());

    zip.generateAsync({ type:'blob' }).then(function(blob){
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'MajesticCustom_' + slot + '.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function(){ URL.revokeObjectURL(url); }, 4000);
      toast('ZIP готов');
    });
  }

  function findGarment(id){
    for (var i = 0; i < GARMENTS.length; i++){
      if (GARMENTS[i].id === id) return GARMENTS[i];
    }
    return GARMENTS[0];
  }

  function buildReadme(g, slot, texName){
    var date = new Date().toLocaleString('ru-RU');
    return [
      '============================================================',
      ' MAJESTIC CUSTOM CLOTHING',
      ' Тип: ' + g.name + ' (' + g.id + ')',
      ' Слот: ' + slot,
      ' Текстура: ' + texName + '.png (1024x1024)',
      ' Создано: ' + date,
      '============================================================',
      '',
      'КАК УСТАНОВИТЬ',
      '------------------------------------------------------------',
      '1) Открой OpenIV, включи Edit mode.',
      '',
      '2) Открой путь к нужному .ytd (например для jbib):',
      '   GTA V / mods / update / x64 / dlcpacks / <любой dlc> / dlc.rpf',
      '   / x64 / models / cdimages / <dlc>_<gender>.rpf / <pack> /',
      '   ' + texName + '.ytd',
      '',
      '3) Двойной клик на .ytd -> Import -> выбери PNG из папки',
      '   textures/ этого архива. OpenIV сконвертирует в DDS.',
      '',
      '4) Сохрани архив.',
      '',
      'ARCHIVEFIX — ОБЯЗАТЕЛЬНО',
      '------------------------------------------------------------',
      '1) Запусти GTA 5 (нужна для получения ключей).',
      '2) В cmd рядом с ArchiveFix.exe: ArchiveFix.exe fetch',
      '3) Перетащи изменённый dlc.rpf на ArchiveFix.exe',
      '   или запусти FixArchive.bat — он обработает все dlc.rpf.',
      '',
      'Если менял вложенный .rpf — фиксить ДВАЖДЫ:',
      '   сначала <dlc>_<gender>.rpf, потом dlc.rpf.',
      '',
      'НОВЫЙ СЛОТ (ОПЦИЯ)',
      '------------------------------------------------------------',
      'Если хочешь новый слот вместо замены — используй grzyClothTool',
      'https://grzy.tools/ — он создаёт dlc.rpf с кастомными слотами.',
      'PNG из этого архива можно вставить в паки от grzyClothTool.',
      '============================================================',
    ].join('\r\n');
  }

  function buildBat(){
    return [
      '@echo off',
      'setlocal enabledelayedexpansion',
      'chcp 65001 >nul',
      'title ArchiveFix Helper',
      'if not exist "ArchiveFix.exe" (',
      '    echo [!] ArchiveFix.exe не найден рядом с этим файлом.',
      '    pause',
      '    exit /b 1',
      ')',
      'echo [*] fetch (нужна запущенная GTA 5)...',
      'ArchiveFix.exe fetch',
      'if errorlevel 1 ( echo [!] Ошибка fetch. pause & exit /b 1 )',
      'set COUNT=0',
      'for /r %%F in (dlc.rpf) do (',
      '    echo     [FIX] %%F',
      '    ArchiveFix.exe "%%F"',
      '    set /a COUNT+=1',
      ')',
      'echo [OK] Обработано: !COUNT!',
      'pause',
      'endlocal',
    ].join('\r\n');
  }

  /* ---------- Toast ---------- */
  function toast(msg){
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('is-open');
    clearTimeout(el._t);
    el._t = setTimeout(function(){ el.classList.remove('is-open'); }, 2600);
  }

  /* ---------- UI rendering ---------- */
  function renderGarmentGrid(){
    var wrap = document.getElementById('garmentGrid');
    if (!wrap) return;
    wrap.innerHTML = GARMENTS.map(function(g){
      return '<button class="garment-btn ' + (state.garment === g.id ? 'is-active' : '') +
        '" data-garment="' + g.id + '">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
        'stroke-linecap="round" stroke-linejoin="round">' + g.svg + '</svg>' +
        '<span>' + g.name + '</span></button>';
    }).join('');
  }

  function renderToolGrid(){
    var wrap = document.getElementById('toolGrid');
    if (!wrap) return;
    wrap.innerHTML = TOOLS.map(function(t){
      return '<button class="tool-btn ' + (state.tool === t.id ? 'is-active' : '') +
        '" title="' + t.name + '" data-tool="' + t.id + '">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
        'stroke-linecap="round" stroke-linejoin="round">' + t.svg + '</svg></button>';
    }).join('');
  }

  function renderSwatches(){
    var wrap = document.getElementById('swatches');
    if (!wrap) return;
    wrap.innerHTML = SWATCHES.map(function(c){
      return '<button class="swatch" style="background:' + c + '" data-color="' + c + '" title="' + c + '"></button>';
    }).join('');
  }

  function renderLayers(){
    var wrap = document.getElementById('layersList');
    if (!wrap) return;
    wrap.innerHTML = state.layers.map(function(l, i){
      var eyeSvg = l.visible
        ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/>'
        : '<path d="M17 18a10 10 0 0 1-14 0M1 1l22 22M9.9 4.2A10 10 0 0 1 22 12a10 10 0 0 1-3 5.3"/>';
      return '<div class="layer-row ' + (i === state.activeLayer ? 'is-active' : '') + '" data-idx="' + i + '">' +
        '<button class="layer-vis ' + (l.visible ? '' : 'off') + '" data-vis="' + i + '" title="Видимость">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' + eyeSvg + '</svg>' +
        '</button>' +
        '<span class="layer-name">' + l.name + '</span>' +
        '<input type="range" class="layer-op" data-op="' + i + '" min="0" max="100" value="' +
        Math.round(l.opacity * 100) + '">' +
        '</div>';
    }).join('');
  }

  function renderSlotSelect(){
    var sel = document.getElementById('slotSelect');
    if (!sel) return;
    sel.innerHTML = GARMENTS.map(function(g){
      return '<option value="' + g.slot + '">' + g.slot + ' — ' + g.name + '</option>';
    }).join('');
    var g = findGarment(state.garment);
    if (g) sel.value = g.slot;
  }

  /* ---------- Color setter ---------- */
  function setColor(hex){
    state.color = hex;
    var cp = document.getElementById('colorPicker');
    var ch = document.getElementById('colorHex');
    if (cp) cp.value = hex;
    if (ch) ch.value = hex.toUpperCase();
  }

  /* ---------- UI bindings ---------- */
  function bindUI(){
    var gGrid = document.getElementById('garmentGrid');
    if (gGrid) gGrid.addEventListener('click', function(e){
      var b = e.target.closest('[data-garment]');
      if (!b) return;
      state.garment = b.dataset.garment;
      renderGarmentGrid();
      renderSlotSelect();
      buildGarmentMesh(state.garment);
    });

    var tGrid = document.getElementById('toolGrid');
    if (tGrid) tGrid.addEventListener('click', function(e){
      var b = e.target.closest('[data-tool]');
      if (!b) return;
      state.tool = b.dataset.tool;
      renderToolGrid();
    });

    var sw = document.getElementById('swatches');
    if (sw) sw.addEventListener('click', function(e){
      var b = e.target.closest('[data-color]');
      if (!b) return;
      setColor(b.dataset.color);
    });

    var cp = document.getElementById('colorPicker');
    if (cp) cp.addEventListener('input', function(e){ setColor(e.target.value); });

    var ch = document.getElementById('colorHex');
    if (ch) ch.addEventListener('change', function(e){
      var v = e.target.value.trim();
      if (/^#?[0-9a-fA-F]{6}$/.test(v)) setColor(v.charAt(0) === '#' ? v : '#' + v);
      else setColor(state.color);
    });

    var bs = document.getElementById('brushSize');
    if (bs) bs.addEventListener('input', function(e){
      state.size = +e.target.value;
      var el = document.getElementById('brushSizeVal');
      if (el) el.textContent = state.size;
    });

    var bo = document.getElementById('brushOpacity');
    if (bo) bo.addEventListener('input', function(e){
      state.opacity = +e.target.value / 100;
      var el = document.getElementById('brushOpacityVal');
      if (el) el.textContent = e.target.value;
    });

    var ll = document.getElementById('layersList');
    if (ll){
      ll.addEventListener('click', function(e){
        var vis = e.target.closest('[data-vis]');
        if (vis){
          var i = +vis.dataset.vis;
          state.layers[i].visible = !state.layers[i].visible;
          renderLayers();
          redraw();
          return;
        }
        var row = e.target.closest('.layer-row');
        if (row){
          state.activeLayer = +row.dataset.idx;
          renderLayers();
        }
      });
      ll.addEventListener('input', function(e){
        var op = e.target.closest('[data-op]');
        if (!op) return;
        var i = +op.dataset.op;
        state.layers[i].opacity = +op.value / 100;
        redraw();
      });
    }

    var addL = document.getElementById('addLayerBtn');
    if (addL) addL.addEventListener('click', function(){
      state.layers.push(makeLayer('Слой ' + (state.layers.length + 1)));
      state.activeLayer = state.layers.length - 1;
      renderLayers();
      pushHistory();
    });

    var undo = document.getElementById('undoBtn');
    if (undo) undo.addEventListener('click', function(){
      if (state.historyIdx <= 0) return;
      state.historyIdx--;
      restoreHistory(state.historyIdx);
    });

    var redo = document.getElementById('redoBtn');
    if (redo) redo.addEventListener('click', function(){
      if (state.historyIdx >= state.history.length - 1) return;
      state.historyIdx++;
      restoreHistory(state.historyIdx);
    });

    var clr = document.getElementById('clearLayerBtn');
    if (clr) clr.addEventListener('click', function(){
      activeLayer().ctx.clearRect(0, 0, SIZE, SIZE);
      redraw();
      pushHistory();
    });

    var tg = document.getElementById('toggleGrid');
    if (tg) tg.addEventListener('click', function(){
      var wrap = document.querySelector('.canvas-wrap');
      if (!wrap) return;
      wrap.classList.toggle('show-grid');
      tg.classList.toggle('is-active');
    });

    var ep = document.getElementById('exportPngBtn');
    if (ep) ep.addEventListener('click', exportPNG);
    var ez = document.getElementById('exportZipBtn');
    if (ez) ez.addEventListener('click', exportZIP);
  }

  /* ---------- Canvas events ---------- */
  function onCanvasDown(e){ e.preventDefault(); startDraw(e); }
  function onWinMove(e){ moveDraw(e); }
  function onWinUp(e){ endDraw(e); }

  function onTouchStart(e){
    var t = e.touches[0];
    if (!t) return;
    e.preventDefault();
    startDraw({ clientX: t.clientX, clientY: t.clientY });
  }
  function onTouchMove(e){
    var t = e.touches[0];
    if (!t) return;
    e.preventDefault();
    moveDraw({ clientX: t.clientX, clientY: t.clientY });
  }
  function onTouchEnd(e){
    e.preventDefault();
    endDraw({ clientX: state.lastX, clientY: state.lastY });
  }

  /* ---------- Mount ---------- */
  function mount(){
    var container = document.getElementById('view');
    if (!container) return;

    container.innerHTML = [
      '<div class="page editor-page">',
      '  <aside class="editor-col">',
      '    <div class="panel">',
      '      <div class="panel-title">Тип одежды</div>',
      '      <div class="garment-grid" id="garmentGrid"></div>',
      '    </div>',
      '    <div class="panel">',
      '      <div class="panel-title">Инструменты</div>',
      '      <div class="tool-grid" id="toolGrid"></div>',
      '      <label class="field">',
      '        <span>Размер</span>',
      '        <input type="range" id="brushSize" min="1" max="120" value="' + state.size + '">',
      '        <b id="brushSizeVal">' + state.size + '</b>',
      '      </label>',
      '      <label class="field">',
      '        <span>Прозр.</span>',
      '        <input type="range" id="brushOpacity" min="1" max="100" value="100">',
      '        <b id="brushOpacityVal">100</b>',
      '      </label>',
      '    </div>',
      '    <div class="panel">',
      '      <div class="panel-title">Цвет</div>',
      '      <div class="color-input-row">',
      '        <input type="color" id="colorPicker" value="' + state.color + '">',
      '        <input type="text" id="colorHex" value="' + state.color.toUpperCase() + '" maxlength="7">',
      '      </div>',
      '      <div class="swatches" id="swatches"></div>',
      '    </div>',
      '  </aside>',
      '  <section class="editor-col center">',
      '    <div class="canvas-wrap show-grid">',
      '      <canvas id="paintCanvas" width="' + SIZE + '" height="' + SIZE + '"></canvas>',
      '    </div>',
      '    <div class="canvas-toolbar">',
      '      <button class="mini-btn" id="undoBtn" disabled>Отменить</button>',
      '      <button class="mini-btn" id="redoBtn" disabled>Вернуть</button>',
      '      <button class="mini-btn" id="clearLayerBtn">Очистить слой</button>',
      '      <button class="mini-btn is-active" id="toggleGrid">Сетка</button>',
      '      <span class="canvas-info">' + SIZE + ' × ' + SIZE + ' · RGBA</span>',
      '    </div>',
      '  </section>',
      '  <aside class="editor-col">',
      '    <div class="panel">',
      '      <div class="panel-title">3D превью</div>',
      '      <div class="preview-3d" id="preview3d"></div>',
      '    </div>',
      '    <div class="panel">',
      '      <div class="panel-title">',
      '        Слои',
      '        <button class="mini-icon-btn" id="addLayerBtn" title="Добавить слой">',
      '          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">',
      '            <path d="M12 5v14M5 12h14"/>',
      '          </svg>',
      '        </button>',
      '      </div>',
      '      <div class="layers" id="layersList"></div>',
      '    </div>',
      '    <div class="panel">',
      '      <div class="panel-title">Экспорт</div>',
      '      <label class="field">',
      '        <span>Слот</span>',
      '        <select id="slotSelect"></select>',
      '      </label>',
      '      <button class="btn btn-primary btn-block" id="exportPngBtn" style="margin-top:14px">Скачать PNG</button>',
      '      <button class="btn btn-ghost btn-block" id="exportZipBtn" style="margin-top:8px">Скачать ZIP для GTA</button>',
      '      <p class="export-note">PNG импортируется в OpenIV как замена diffuse-текстуры (.ytd) выбранного слота.</p>',
      '    </div>',
      '  </aside>',
      '</div>',
    ].join('');

    state.canvas = document.getElementById('paintCanvas');
    state.ctx = state.canvas.getContext('2d');
    state.ctx.lineJoin = 'round';
    state.ctx.lineCap = 'round';

    state.layers = [makeLayer('Слой 1')];
    state.activeLayer = 0;
    state.history = [];
    state.historyIdx = -1;

    var preview = document.getElementById('preview3d');
    try {
      initThree(preview);
    } catch (err){
      console.error('Three init failed:', err);
      preview.innerHTML = '<div class="preview-fallback">3D превью недоступно<br>' +
        '(не удалось загрузить Three.js)</div>';
    }

    renderGarmentGrid();
    renderToolGrid();
    renderSwatches();
    renderLayers();
    renderSlotSelect();
    bindUI();

    pushHistory();
    redraw();

    // input
    var cv = state.canvas;
    cv.addEventListener('mousedown', onCanvasDown);
    window.addEventListener('mousemove', onWinMove);
    window.addEventListener('mouseup', onWinUp);

    cv.addEventListener('touchstart', onTouchStart, { passive:false });
    cv.addEventListener('touchmove', onTouchMove, { passive:false });
    cv.addEventListener('touchend', onTouchEnd, { passive:false });
  }

  /* ---------- Unmount ---------- */
  function unmount(){
    var cv = state.canvas;
    if (cv){
      cv.removeEventListener('mousedown', onCanvasDown);
      cv.removeEventListener('touchstart', onTouchStart);
      cv.removeEventListener('touchmove', onTouchMove);
      cv.removeEventListener('touchend', onTouchEnd);
    }
    window.removeEventListener('mousemove', onWinMove);
    window.removeEventListener('mouseup', onWinUp);

    if (state.three){
      window.removeEventListener('resize', state.three.onResize);
      if (state.three.renderer){
        state.three.renderer.dispose();
        if (state.three.renderer.domElement && state.three.renderer.domElement.parentNode){
          state.three.renderer.domElement.parentNode.removeChild(state.three.renderer.domElement);
        }
      }
      state.three = null;
    }
    if (state.textureRaf){
      cancelAnimationFrame(state.textureRaf);
      state.textureRaf = null;
    }
    state.texture = null;
    state.canvas = null;
    state.ctx = null;
    state.drawing = false;
  }

  window.MajesticEditor = { mount: mount, unmount: unmount };
})();