import { ModelService, RelationshipType, EntityRelationshipPartOf } from '../model-manager';
import { Subject } from 'rxjs';

export class DiagramComponentHelper {

  static modelService: ModelService;
  static interfaceTypeSubject: Subject<{ name: string, data: any }>;
  static processorSubject: Subject<{ name: string, data: any }>;

  static readonly NOT_RELATIONSHIP = -1;

  static setModelService(modelService: ModelService) {
    DiagramComponentHelper.modelService = modelService;
  }

  static setInterfaceTypeSubject(interfaceTypeSubject: Subject<{ name: string, data: any }>) {
    DiagramComponentHelper.interfaceTypeSubject = interfaceTypeSubject;
  }

  static setProcessorSubject(processorSubject: Subject<{ name: string, data: any }>) {
    DiagramComponentHelper.processorSubject = processorSubject;
  }

  static loadDiagram(diagramId: number, graph: mxGraph) {
    let diagramXml = this.modelService.getDiagramGraph(diagramId);
    if (diagramXml == "") {
      this.updateGraphInModel(diagramId, graph);
    } else {
      graph.getModel().beginUpdate();
      try {
        let xmlDocument = mxUtils.parseXml(diagramXml);
        let decodec = new mxCodec(xmlDocument);
        decodec.decode(xmlDocument.documentElement, graph.getModel());
      } catch (error) {
        console.log(error);
      } finally {
        graph.getModel().endUpdate();
      }
    }
  }

  static getDiagram(diagramId): mxGraph {
    let graph = new mxGraph();
    let diagramXML = DiagramComponentHelper.modelService.getDiagramGraph(diagramId);
    let xmlDocument = mxUtils.parseXml(diagramXML);
    let decodec = new mxCodec(xmlDocument);
    decodec.decode(xmlDocument.documentElement, graph.getModel());
    return graph;
  }

  static updateGraphInModel(diagramId: number, graph: mxGraph) {
    let encoder = new mxCodec(null);
    let xml = mxUtils.getXml(encoder.encode(graph.getModel()));
    this.modelService.setDiagramGraph(diagramId, xml);
  }

  static printLineCreateRelationship(svg: SVGElement, cell: mxCell, mouseEvent: mxMouseEvent) {
    let x: number;
    let y: number;
    if (cell.value.nodeName.toLowerCase() == 'interface') {
      x = mouseEvent.graphX;
      y = mouseEvent.graphY;
    } else {
      x = cell.getGeometry().x + (cell.getGeometry().width / 2);
      y = cell.getGeometry().y + (cell.getGeometry().height / 2);
    }
    let line: SVGLineElement = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.classList.add("line-relationship");
    line.style.stroke = "black";
    line.style.strokeWidth = "2";
    line.style.stroke = "black";
    line.setAttribute("x1", x.toString());
    line.setAttribute("x2", x.toString());
    line.setAttribute("y1", y.toString());
    line.setAttribute("y2", y.toString());
    svg.append(line);
  }

  static moveLineCreateRelationship(line: SVGLineElement, mouseEvent: mxMouseEvent) {
    let sourceX = parseInt(line.getAttribute("x1"));
    let sourceY = parseInt(line.getAttribute("y1"));
    let positionX;
    let positionY;

    if ((mouseEvent.getGraphX() - sourceX) > 0) {
      positionX = parseInt(mouseEvent.getGraphX()) - 1;
    } else {
      positionX = parseInt(mouseEvent.getGraphX()) + 1;
    }

    if ((mouseEvent.getGraphY() - sourceY) > 0) {
      positionY = parseInt(mouseEvent.getGraphY()) - 1;
    } else {
      positionY = parseInt(mouseEvent.getGraphY()) + 1;
    }

    line.setAttribute("x2", positionX.toString());
    line.setAttribute("y2", positionY.toString());
  }

  static cancelCreateRelationship(component: any) {
    component.relationshipSelect = DiagramComponentHelper.NOT_RELATIONSHIP;
    component.imageToolbarRelationship.style.backgroundColor = "transparent";
    DiagramComponentHelper.changeStateMovableCells(component, component.graph.getChildCells(), "1");
    component.graph.setCellStyles('movable', '0', component.graph.getChildEdges());
  }

  static checkRelationshipPartOfSource(component, cell, typeCell): Boolean {
    if (cell.value.nodeName.toLowerCase() != 'processor' && cell.value.nodeName.toLowerCase() != 'interfacetype') {
      if (!cell.isEdge()) {
        let relationshipErrorDto = new SnackErrorDto();
        relationshipErrorDto.message = `A relationship of type "part of" should be the union between two boxes of type "${typeCell}"`;
        component.snackBarErrorEmitter.emit(relationshipErrorDto);
      }
      return false;
    };
    return true;
  }

  static checkRelationshipPartOfTarget(component, cell, typeCell): Boolean {
    if (cell.value.nodeName.toLowerCase() != 'processor' && cell.value.nodeName.toLowerCase() != 'interfacetype') {
      if (!cell.isEdge()) {
        let relationshipErrorDto = new SnackErrorDto();
        relationshipErrorDto.message = `A relationship of type "part of" should be the union between two boxes of type "${typeCell}"`;
        component.snackBarErrorEmitter.emit(relationshipErrorDto);
      }
      return false;
    };
    if (Number(cell.getAttribute("entityId", "")) == Number(component.sourceCellRelationship.getAttribute("entityId", ""))) {
      return false;
    }
    let messageError = this.modelService.checkCanCreateRelationship(RelationshipType.PartOf, Number(cell.getAttribute("entityId", "")),
      Number(component.sourceCellRelationship.getAttribute("entityId", "")));
    if (messageError != "") {
      let relationshipErrorDto = new SnackErrorDto();
      relationshipErrorDto.message = messageError;
      component.snackBarErrorEmitter.emit(relationshipErrorDto);
      return false;
    }
    return true;
  }

  static changeNameEntityById(component, name: string, id) {
    let updateGraphXML = false;
    component.graph.getModel().beginUpdate();
    let cells: [mxCell] = component.graph.getChildCells();
    for (let cell of cells) {
      if (cell.getAttribute('entityId', '') == id) {
        cell.setAttribute('name', name);
        DiagramComponentHelper.modelService.updateEntityName(Number(cell.getAttribute('entityId', '')), name);
        component.updateTreeEmitter.emit(null);
        component.graph.getModel().endUpdate();
        component.graph.refresh();
        updateGraphXML = true;
      }
    }
    if (updateGraphXML) DiagramComponentHelper.updateGraphInModel(component.diagramId, component.graph);
  }

  static changeNameEntityOnlyXML(diagramId: number, name: string, id) {
    let diagramXML = DiagramComponentHelper.modelService.getDiagramGraph(diagramId);
    if (diagramXML != "") {
      let updateGraphXML = false;
      let model = <any>new mxGraphModel();
      model.beginUpdate();
      try {
        let xmlDocument = mxUtils.parseXml(diagramXML);
        let decodec = new mxCodec(xmlDocument);
        decodec.decode(xmlDocument.documentElement, model);
        let cells = model.cells;
        for (let key in cells) {
          if (cells[key].value != undefined && cells[key].getAttribute('entityId', '') == id) {
            cells[key].setAttribute('name', name);
            DiagramComponentHelper.modelService.updateEntityName(Number(cells[key].getAttribute('entityId', '')), name);
            model.endUpdate();
            updateGraphXML = true;
          }
        }
      } catch (error) {
        console.log(error);
      } finally {
        model.endUpdate();
      }
      if (updateGraphXML) {
        let encoder = new mxCodec(null);
        let xml = mxUtils.getXml(encoder.encode(model));
        DiagramComponentHelper.modelService.setDiagramGraph(Number(diagramId), xml);
      }
    }
  }

  static changeStateMovableCells(component, cells, typeMove: string) {
    for (let cell of cells) {
      component.graph.setCellStyles('movable', typeMove, [cell]);
    }
  }

}

export enum StatusCreatingRelationship {
  notCreating,
  creating,
}

export class SnackErrorDto {
  message: string;
}

export interface ChangeNameEntityDto {
  cellId,
  name: string;
}

export interface PartOfFormDto {
  cellId;
}

export interface CellDto {
  cellId;
}

export interface GeometryCell {
  x: number;
  y: number;
  height: number;
  width: number;
}
