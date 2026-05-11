document.addEventListener('DOMContentLoaded', () => {
  const workspace = document.querySelector('.workspace');
  const pool = document.getElementById('pool');
  const platesArea = document.getElementById('plates-area');
  const drawingCanvas = document.getElementById('drawing-canvas');
  const drawingCtx = drawingCanvas.getContext('2d');
  
  // UI Controls
  const btnTokenDec = document.getElementById('btn-token-dec');
  const btnTokenInc = document.getElementById('btn-token-inc');
  const tokenCountSpan = document.getElementById('token-count');
  
  const btnPlateDec = document.getElementById('btn-plate-dec');
  const btnPlateInc = document.getElementById('btn-plate-inc');
  const plateCountSpan = document.getElementById('plate-count');
  
  const btnReset = document.getElementById('btn-reset');
  const btnHandwriting = document.getElementById('btn-handwriting');
  const btnPen = document.getElementById('btn-pen');
  const btnCircle = document.getElementById('btn-circle');
  const btnClearDrawing = document.getElementById('btn-clear-drawing');
  const handwritingControls = document.querySelector('.handwriting-controls');

  let tokensCount = 12;
  let platesCount = 3;
  let plates = [];
  let tokens = [];
  let handwritingEnabled = false;
  let drawingTool = 'pen';
  let savedDrawings = [];
  let activeDrawing = null;

  // ドラッグ＆ドロップのステート
  let activeToken = null;
  let initialX;
  let initialY;
  let tokenStartX;
  let tokenStartY;

  function init() {
    renderPlates();
    renderTokens();
    updateDisplays();
    resizeDrawingCanvas();
  }

  function updateDisplays() {
    tokenCountSpan.textContent = tokensCount;
    plateCountSpan.textContent = platesCount;
  }

  function renderPlates() {
    platesArea.innerHTML = '';
    plates = [];
    for (let i = 0; i < platesCount; i++) {
      const plate = document.createElement('div');
      plate.classList.add('plate');
      plate.dataset.plate = i + 1;
      platesArea.appendChild(plate);
      plates.push(plate);
    }
  }

  function renderTokens() {
    pool.innerHTML = '';
    tokens = [];
    for (let i = 0; i < tokensCount; i++) {
      const token = document.createElement('div');
      token.classList.add('token');
      token.innerHTML = `<svg><use href="#flower-token"></use></svg>`;
      pool.appendChild(token);
      tokens.push(token);

      token.addEventListener('pointerdown', dragStart);
    }
    arrangeTokensGrid();
  }

  function arrangeTokensGrid() {
    const poolRect = pool.getBoundingClientRect();
    if (poolRect.width === 0) return; // 描画前ガード
    
    const tokenSize = 64;
    const margin = 12; // おはじき間の隙間
    const padding = 20; // エリアの余白

    // 1行に配置できる最大数を計算
    const availableWidth = poolRect.width - padding * 2;
    const cols = Math.max(1, Math.floor((availableWidth + margin) / (tokenSize + margin)));

    tokens.forEach((token, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;

      const x = padding + col * (tokenSize + margin);
      const y = padding + row * (tokenSize + margin);

      token.style.left = `${x}px`;
      token.style.top = `${y}px`;
    });
  }
  
  // Controls Event Listeners
  btnTokenDec.addEventListener('click', () => {
    if (tokensCount > 1) {
      tokensCount--;
      renderTokens(); // 数が変わったので初期位置にリセット
      updateDisplays();
    }
  });

  btnTokenInc.addEventListener('click', () => {
    if (tokensCount < 40) { // 上限を設定
      tokensCount++;
      renderTokens();
      updateDisplays();
    }
  });

  btnPlateDec.addEventListener('click', () => {
    if (platesCount > 1) {
      platesCount--;
      renderPlates();
      renderTokens(); // お皿が変わったのでおはじきもリセット
      updateDisplays();
    }
  });

  btnPlateInc.addEventListener('click', () => {
    if (platesCount < 10) {
      platesCount++;
      renderPlates();
      renderTokens();
      updateDisplays();
    }
  });

  btnReset.addEventListener('click', () => {
    renderTokens();
  });

  // --- 手書きモード ---
  btnHandwriting.addEventListener('click', () => {
    handwritingEnabled = !handwritingEnabled;
    workspace.classList.toggle('handwriting-active', handwritingEnabled);
    handwritingControls.classList.toggle('is-enabled', handwritingEnabled);
    btnHandwriting.setAttribute('aria-pressed', String(handwritingEnabled));
    resizeDrawingCanvas();
  });

  btnPen.addEventListener('click', () => setDrawingTool('pen'));
  btnCircle.addEventListener('click', () => setDrawingTool('circle'));
  btnClearDrawing.addEventListener('click', () => {
    savedDrawings = [];
    activeDrawing = null;
    redrawCanvas();
  });

  drawingCanvas.addEventListener('pointerdown', drawingStart);
  drawingCanvas.addEventListener('pointermove', drawingMove);
  drawingCanvas.addEventListener('pointerup', drawingEnd);
  drawingCanvas.addEventListener('pointercancel', drawingEnd);

  function setDrawingTool(tool) {
    drawingTool = tool;
    btnPen.classList.toggle('is-active', tool === 'pen');
    btnCircle.classList.toggle('is-active', tool === 'circle');
    btnPen.setAttribute('aria-pressed', String(tool === 'pen'));
    btnCircle.setAttribute('aria-pressed', String(tool === 'circle'));
  }

  function resizeDrawingCanvas() {
    const rect = workspace.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const pixelRatio = window.devicePixelRatio || 1;
    drawingCanvas.width = Math.round(rect.width * pixelRatio);
    drawingCanvas.height = Math.round(rect.height * pixelRatio);
    drawingCtx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    redrawCanvas();
  }

  function getDrawingPoint(e) {
    const rect = drawingCanvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  function drawingStart(e) {
    if (!handwritingEnabled) return;
    e.preventDefault();

    const point = getDrawingPoint(e);
    if (drawingTool === 'circle') {
      activeDrawing = { type: 'circle', start: point, end: point };
    } else {
      activeDrawing = { type: 'pen', points: [point] };
    }
    drawingCanvas.setPointerCapture(e.pointerId);
  }

  function drawingMove(e) {
    if (!activeDrawing) return;
    e.preventDefault();

    const point = getDrawingPoint(e);
    if (activeDrawing.type === 'circle') {
      activeDrawing.end = point;
    } else {
      activeDrawing.points.push(point);
    }
    redrawCanvas(activeDrawing);
  }

  function drawingEnd(e) {
    if (!activeDrawing) return;
    e.preventDefault();

    const drawing = activeDrawing;
    activeDrawing = null;
    if (!isTinyDrawing(drawing)) {
      savedDrawings.push(drawing);
    }
    if (drawingCanvas.hasPointerCapture(e.pointerId)) {
      drawingCanvas.releasePointerCapture(e.pointerId);
    }
    redrawCanvas();
  }

  function isTinyDrawing(drawing) {
    if (drawing.type === 'pen') {
      return drawing.points.length < 2;
    }

    const width = Math.abs(drawing.end.x - drawing.start.x);
    const height = Math.abs(drawing.end.y - drawing.start.y);
    return width < 8 || height < 8;
  }

  function redrawCanvas(previewDrawing = null) {
    const rect = drawingCanvas.getBoundingClientRect();
    drawingCtx.clearRect(0, 0, rect.width, rect.height);

    savedDrawings.forEach(drawDrawing);
    if (previewDrawing) {
      drawDrawing(previewDrawing);
    }
  }

  function drawDrawing(drawing) {
    drawingCtx.save();
    drawingCtx.strokeStyle = '#e03131';
    drawingCtx.lineWidth = 5;
    drawingCtx.lineCap = 'round';
    drawingCtx.lineJoin = 'round';

    if (drawing.type === 'circle') {
      const x = Math.min(drawing.start.x, drawing.end.x);
      const y = Math.min(drawing.start.y, drawing.end.y);
      const width = Math.abs(drawing.end.x - drawing.start.x);
      const height = Math.abs(drawing.end.y - drawing.start.y);
      drawingCtx.beginPath();
      drawingCtx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
      drawingCtx.stroke();
      drawingCtx.restore();
      return;
    }

    drawingCtx.beginPath();
    drawing.points.forEach((point, index) => {
      if (index === 0) {
        drawingCtx.moveTo(point.x, point.y);
      } else {
        drawingCtx.lineTo(point.x, point.y);
      }
    });
    drawingCtx.stroke();
    drawingCtx.restore();
  }

  // --- ドラッグ＆ドロップロジック ---
  function dragStart(e) {
    if (handwritingEnabled) return;
    if (e.button !== 0 && e.type === 'mousedown') return;

    activeToken = e.currentTarget;
    tokenStartX = parseFloat(activeToken.style.left) || 0;
    tokenStartY = parseFloat(activeToken.style.top) || 0;
    initialX = e.clientX;
    initialY = e.clientY;

    activeToken.classList.add('dragging');
    activeToken.setPointerCapture(e.pointerId);

    activeToken.addEventListener('pointermove', drag);
    activeToken.addEventListener('pointerup', dragEnd);
    activeToken.addEventListener('pointercancel', dragEnd);
  }

  function drag(e) {
    if (!activeToken) return;
    e.preventDefault();

    const currentX = e.clientX;
    const currentY = e.clientY;
    const dx = currentX - initialX;
    const dy = currentY - initialY;

    activeToken.style.left = `${tokenStartX + dx}px`;
    activeToken.style.top = `${tokenStartY + dy}px`;

    checkPlatesHover(currentX, currentY);
  }

  function dragEnd(e) {
    if (!activeToken) return;

    const currentX = e.clientX;
    const currentY = e.clientY;

    activeToken.classList.remove('dragging');
    activeToken.removeEventListener('pointermove', drag);
    activeToken.removeEventListener('pointerup', dragEnd);
    activeToken.removeEventListener('pointercancel', dragEnd);
    activeToken.releasePointerCapture(e.pointerId);

    const overPlate = checkPlatesHover(currentX, currentY, true);
    
    clearPlatesHover();
    activeToken = null;
  }

  function checkPlatesHover(x, y, isDrop = false) {
    let hoveredPlate = null;
    plates.forEach(plate => {
      const rect = plate.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        hoveredPlate = plate;
        if (!isDrop) {
          plate.classList.add('drag-over');
        }
      } else {
        plate.classList.remove('drag-over');
      }
    });
    return hoveredPlate;
  }

  function clearPlatesHover() {
    plates.forEach(plate => plate.classList.remove('drag-over'));
  }

  // ヘルプボタンの処理
  const helpBtn = document.getElementById('help-btn');
  if (helpBtn) {
    helpBtn.addEventListener('click', () => {
      alert('おはじきをドラッグして、お皿に分けてみましょう！\n上部のボタンでおはじきとお皿の数を変更できます。');
    });
  }

  // ウィンドウリサイズ時におはじきを再整列
  window.addEventListener('resize', () => {
    // 全てのおはじきが pool の中にある時（ドラッグや移動前）のみ整列させるのが理想ですが、
    // シンプルにするため、リセットボタンと同じ挙動（初期位置に戻す）にします。
    // もし配置済みのものを動かしたくない場合は工夫が必要ですが、ここでは再描画します。
    renderTokens();
    resizeDrawingCanvas();
  });

  // 初回描画（DOMのレイアウト計算が終わったタイミングで実行）
  requestAnimationFrame(() => {
    // 確実にgetBoundingClientRect()が取れるよう少し遅延させる
    setTimeout(init, 50);
  });
});
