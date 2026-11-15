const SELECTED_CLASS = 'is-selected';

export function bindBaseLayerPicker(buttons, baseLayers) {
  function select(selectedButton) {
    buttons.forEach((button) => button.classList.toggle(SELECTED_CLASS, button === selectedButton));
    baseLayers.show(selectedButton.dataset.baseLayer);
  }

  buttons.forEach((button) => button.addEventListener('click', () => select(button)));
  select(buttons.find((button) => button.classList.contains(SELECTED_CLASS)) ?? buttons[0]);
}
