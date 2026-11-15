const EDGE_MARGIN_PX = 8;
const CURSOR_OFFSET_PX = 14;

export function createTooltip(element) {
  function show(content, event) {
    element.replaceChildren(...renderContent(content));
    element.hidden = false;
    position(event);
  }

  function hide() {
    element.hidden = true;
  }

  function position({ clientX, clientY }) {
    const { offsetWidth: width, offsetHeight: height } = element;
    const fitsRight = clientX + CURSOR_OFFSET_PX + width <= window.innerWidth - EDGE_MARGIN_PX;
    const fitsBelow = clientY + CURSOR_OFFSET_PX + height <= window.innerHeight - EDGE_MARGIN_PX;
    element.style.left = `${fitsRight ? clientX + CURSOR_OFFSET_PX : clientX - width - CURSOR_OFFSET_PX}px`;
    element.style.top = `${fitsBelow ? clientY + CURSOR_OFFSET_PX : clientY - height - CURSOR_OFFSET_PX}px`;
  }

  return { show, hide };
}

function renderContent({ title, badge, rows = [], notes = [] }) {
  const heading = document.createElement('div');
  heading.className = 'tooltip-title';
  heading.textContent = title;
  if (badge) {
    const badgeElement = document.createElement('span');
    badgeElement.className = 'tooltip-badge';
    badgeElement.textContent = ` ${badge}`;
    heading.append(badgeElement);
  }
  return [heading, ...rows.map(renderRow), ...notes.map(renderNote)];
}

function renderRow([label, value]) {
  const row = document.createElement('div');
  row.className = 'tooltip-row';
  const labelElement = document.createElement('span');
  labelElement.textContent = label;
  const valueElement = document.createElement('span');
  valueElement.className = 'tooltip-value';
  valueElement.textContent = value;
  row.append(labelElement, valueElement);
  return row;
}

function renderNote(text) {
  const note = document.createElement('div');
  note.className = 'tooltip-note';
  note.textContent = text;
  return note;
}
