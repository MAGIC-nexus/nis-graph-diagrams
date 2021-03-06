
/******************      Model         **************/

declare class mxCell {

  constructor();
  constructor(value, geometry, style);
  constructor(value, geometry);

  id: any;
  value;
  geometry;
  style;
  vertex;
  edge;
  connectable;
  visible;
  collapsed;
  parent;
  source;
  target;
  children;
  edges;
  mxTransient;
  getId();
  setId(id);
  getValue();
  setValue(value);
  valueChanged(newValue);
  getGeometry();
  setGeometry(geometry);
  getStyle();
  setStyle(style);
  isVertex();
  setVertex(vertex);
  isEdge();
  setEdge(edge);
  isConnectable();
  setConnectable(connectable);
  isVisible();
  setVisible(visible);
  isCollapsed();
  setCollapsed(collapsed);
  getParent();
  setParent(parent);
  getTerminal(source);
  setTerminal(terminal, isSource);
  getChildCount();
  getIndex(child);
  getChildAt(index);
  insert(child, index);
  remove(index);
  removeFromParent();
  getEdgeCount();
  getEdgeIndex(edge);
  getEdgeAt(index);
  insertEdge(edge, isOutgoing);
  removeEdge(edge, isOutgoing);
  removeFromTerminal(isSource);
  getAttribute(name, defaultValue);
  getAttribute(name);
  setAttribute(name, value);

  /**
   * Returns a clone of the cell.  Uses cloneValue to clone the user object.  All fields in mxTransient are ignored during the cloning.
   */
  clone(): mxCell;

  cloneValue();
}

declare class mxGraphModel {
  
}

declare class mxGeometry {

  constructor(x, y, width, height);
  x;
  y;
  height;
  width;
  offset;
  relative;
  
}

declare class mxClient {
  static IS_SVG
  static IS_IE
  static IS_VML;
}
/******************      Model end     **************/
