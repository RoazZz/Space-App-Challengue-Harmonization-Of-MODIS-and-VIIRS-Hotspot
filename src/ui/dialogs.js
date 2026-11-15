export function bindDialog({ dialog, openButtons = [], closeButtons = [], onOpen = () => {} }) {
  function open() {
    onOpen();
    dialog.showModal();
  }

  openButtons.forEach((button) => button.addEventListener('click', open));
  closeButtons.forEach((button) => button.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });

  return { open };
}
