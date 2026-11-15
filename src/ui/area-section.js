import { createPolygonArea, createRectangleArea } from '../geo/area-of-interest.js';

const AREA_MODE = Object.freeze({ PRESET: 'preset', RECTANGLE: 'rectangle', POLYGON: 'polygon', CIRCLE: 'circle' });
const SELECTED_CLASS = 'is-selected';
const ACTIVE_CLASS = 'is-active';

const MESSAGES = Object.freeze({
  rectangleStarted: 'Click and drag on the map to draw the rectangle.',
  rectangleTooSmall: 'Rectangle too small — drag a larger area.',
  polygonStarted: 'Click to add vertices · double-click or Finish to close.',
  polygonTooFewVertices: 'A polygon needs at least 3 vertices.',
  drawingCancelled: 'Drawing cancelled.',
});

export function createAreaSection({ elements, tools, presetPicker, circleForm, getMapCenter, notify, onAreaSelected }) {
  const { modeButtons, panes, rectangleButton, polygonStartButton, polygonUndoButton, polygonFinishButton } = elements;

  function selectMode(mode) {
    stopDrawing();
    tools.pointPicking.disable();
    modeButtons.forEach((button) => button.classList.toggle(SELECTED_CLASS, button.dataset.areaMode === mode));
    panes.forEach((pane) => { pane.hidden = pane.dataset.areaPane !== mode; });
    if (mode === AREA_MODE.PRESET) {
      presetPicker.reselect();
    }
    if (mode === AREA_MODE.CIRCLE) {
      circleForm.prefillCenter(getMapCenter());
      tools.pointPicking.enable(circleForm.pickCenter);
    }
  }

  function startRectangle() {
    stopDrawing();
    rectangleButton.classList.add(ACTIVE_CLASS);
    notify(MESSAGES.rectangleStarted);
    tools.rectangle.start({
      onComplete: (bounds) => finishDrawing(createRectangleArea('Custom rectangle', bounds)),
      onInvalid: () => { stopDrawing(); notify(MESSAGES.rectangleTooSmall); },
    });
  }

  function startPolygon() {
    stopDrawing();
    polygonStartButton.classList.add(ACTIVE_CLASS);
    notify(MESSAGES.polygonStarted);
    tools.polygon.start({
      onComplete: (positions) => finishDrawing(createPolygonArea(`Custom polygon (${positions.length} vertices)`, [[positions]])),
      onInvalid: () => notify(MESSAGES.polygonTooFewVertices),
    });
  }

  function finishDrawing(area) {
    stopDrawing();
    onAreaSelected(area);
  }

  function stopDrawing() {
    tools.rectangle.cancel();
    tools.polygon.cancel();
    [rectangleButton, polygonStartButton].forEach((button) => button.classList.remove(ACTIVE_CLASS));
  }

  function cancelDrawing() {
    if (tools.rectangle.isActive() || tools.polygon.isActive()) {
      stopDrawing();
      notify(MESSAGES.drawingCancelled);
    }
  }

  modeButtons.forEach((button) => button.addEventListener('click', () => selectMode(button.dataset.areaMode)));
  rectangleButton.addEventListener('click', startRectangle);
  polygonStartButton.addEventListener('click', startPolygon);
  polygonUndoButton.addEventListener('click', () => tools.polygon.undo());
  polygonFinishButton.addEventListener('click', () => tools.polygon.finish());

  return { initialize: () => presetPicker.initialize(), cancelDrawing };
}
