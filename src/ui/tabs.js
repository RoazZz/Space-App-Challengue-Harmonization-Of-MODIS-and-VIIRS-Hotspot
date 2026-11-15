const SELECTED_CLASS = 'is-selected';

export function bindTabs({ buttons, panes, onChange }) {
  function select(tabName) {
    buttons.forEach((button) => button.classList.toggle(SELECTED_CLASS, button.dataset.tab === tabName));
    panes.forEach((pane) => { pane.hidden = pane.dataset.tabPane !== tabName; });
    onChange(tabName);
  }

  buttons.forEach((button) => button.addEventListener('click', () => select(button.dataset.tab)));
}

export function bindSegmentedControl(buttons, attributeName, onSelect) {
  buttons.forEach((button) => button.addEventListener('click', () => {
    buttons.forEach((other) => other.classList.toggle(SELECTED_CLASS, other === button));
    onSelect(button.dataset[attributeName]);
  }));
}
