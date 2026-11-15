const HIDDEN_CLASS = 'panels-hidden';
const LAYOUT_SETTLE_DELAY_MS = 50;
const FIT_PADDING_WITH_PANEL = Object.freeze({ paddingTopLeft: [340, 70], paddingBottomRight: [610, 40] });
const FIT_PADDING_WITHOUT_PANEL = Object.freeze({ paddingTopLeft: [30, 70], paddingBottomRight: [30, 40] });

export function bindPanelVisibility(button, map) {
  const isHidden = () => document.body.classList.contains(HIDDEN_CLASS);

  button.addEventListener('click', () => {
    document.body.classList.toggle(HIDDEN_CLASS);
    button.textContent = isHidden() ? 'Show panels' : 'Hide panels';
    setTimeout(() => map.invalidateSize(), LAYOUT_SETTLE_DELAY_MS);
  });

  return { fitPadding: () => (isHidden() ? FIT_PADDING_WITHOUT_PANEL : FIT_PADDING_WITH_PANEL) };
}
