const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

export function svgElement(tag, attributes = {}, children = []) {
  const element = document.createElementNS(SVG_NAMESPACE, tag);
  Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, String(value)));
  children.forEach((child) => element.append(typeof child === 'string' ? document.createTextNode(child) : child));
  return element;
}

export function svgText(text, attributes) {
  return svgElement('text', attributes, [text]);
}

export function hatchPatternDefinitions(prefix) {
  return svgElement('defs', {}, [
    svgElement('pattern', { id: `${prefix}-no-data`, width: 5, height: 5, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, [
      svgElement('rect', { width: 5, height: 5, fill: '#161c22' }),
      svgElement('line', { x1: 0, y1: 0, x2: 0, y2: 5, stroke: '#36414c', 'stroke-width': 1.6 }),
    ]),
    svgElement('pattern', { id: `${prefix}-partial`, width: 4, height: 4, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(-45)' }, [
      svgElement('line', { x1: 0, y1: 0, x2: 0, y2: 4, stroke: '#ffffff', 'stroke-opacity': 0.75, 'stroke-width': 1 }),
    ]),
  ]);
}
