import { ModelService, RelationshipType } from '../model-manager';
import { ProcessorsDiagramComponentComponent } from './processors-diagram-component/processors-diagram-component.component';
import { InterfacetypesDiagramComponentComponent } from './interfacetypes-diagram-component/interfacetypes-diagram-component.component';

export class DiagramComponentHelper {

  static modelService: ModelService;

  static readonly NOT_RELATIONSHIP = -1;

  static setModelService(modelService: ModelService) {
    DiagramComponentHelper.modelService = modelService;
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

  static updateGraphInModel(diagramId: number, graph: mxGraph) {
    let encoder = new mxCodec(null);
    let xml = mxUtils.getXml(encoder.encode(graph.getModel()));
    this.modelService.setDiagramGraph(diagramId, xml);
  }

  static printLineCreateRelationship(svg: SVGElement, cell : mxCell, mouseEvent : mxMouseEvent) {
    let x : number;
    let y : number;
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

  static cancelCreateRelationship(component: ProcessorsDiagramComponentComponent | InterfacetypesDiagramComponentComponent) {
    component.relationshipSelect = DiagramComponentHelper.NOT_RELATIONSHIP;
    component.imageToolbarRelationship.style.backgroundColor = "transparent";
    DiagramComponentHelper.changeStateMovableCells(component, component.graph.getChildCells(), "1");
    component.graph.setCellStyles('movable', '0', component.graph.getChildEdges());
  }

  static checkRelationshipPartOfSource(component: ProcessorsDiagramComponentComponent | InterfacetypesDiagramComponentComponent,
    cell): Boolean {
    if (cell.value.nodeName.toLowerCase() != 'processor' && cell.value.nodeName.toLowerCase() != 'interfacetype') {
      let relationshipErrorDto = new SnackErrorDto();
      relationshipErrorDto.message = 'A relationship of type "part of" should be the union between two boxes of type "processor"';
      component.snackBarErrorEmitter.emit(relationshipErrorDto);
      return false;
    };
    return true;
  }

  static checkRelationshipPartOfTarget(component: ProcessorsDiagramComponentComponent | InterfacetypesDiagramComponentComponent,
    cell): Boolean {
    if (cell.value.nodeName.toLowerCase() != 'processor' && cell.value.nodeName.toLowerCase() != 'interfacetype') {
      let relationshipErrorDto = new SnackErrorDto();
      relationshipErrorDto.message = 'A relationship of type "part of" should be the union between two boxes of type "processor"';
      component.snackBarErrorEmitter.emit(relationshipErrorDto);
      return false;
    };
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

  static createPartOfRelationship(component: ProcessorsDiagramComponentComponent | InterfacetypesDiagramComponentComponent,
    cell) {
    component.graph.getModel().beginUpdate();
    let doc = mxUtils.createXmlDocument();
    let id = component.modelService.createRelationship(RelationshipType.PartOf,
      Number(component.sourceCellRelationship.getAttribute("entityId", "")), Number(cell.getAttribute("entityId", "")));
    let partOfDoc = doc.createElement('partof');
    partOfDoc.setAttribute("name", "name");
    partOfDoc.setAttribute("idRelationship", id);
    component.graph.insertEdge(component.graph.getDefaultParent(), null, partOfDoc,
      component.sourceCellRelationship, cell, 'strokeColor=black;perimeterSpacing=4;labelBackgroundColor=white;fontStyle=1');
    component.graph.getModel().endUpdate();
    let childCells = component.graph.getChildCells();
    DiagramComponentHelper.changeStateMovableCells(component, childCells, "1");
    DiagramComponentHelper.updateGraphInModel(component.diagramId, component.graph);
    DiagramComponentHelper.changeStateMovableCells(component, childCells, "0");
    component.updateTreeEmitter.emit(null);
  }

  static changeNameEntityById(component: ProcessorsDiagramComponentComponent | InterfacetypesDiagramComponentComponent,
    name: string, id) {
    let updateGraphXML = false;
    component.graph.getModel().beginUpdate();
    let cells: [mxCell] = component.graph.getChildCells();
    for (let cell of cells) {
      if (cell.getAttribute('entityId', '') == id) {
        cell.setAttribute('name', name);
        component.modelService.updateEntityName(Number(cell.getAttribute('entityId', '')), name);
        component.updateTreeEmitter.emit(null);
        component.graph.getModel().endUpdate();
        component.graph.refresh();
        updateGraphXML = true;
      }
    }
    if (updateGraphXML) DiagramComponentHelper.updateGraphInModel(component.diagramId, component.graph);
  }

  static changeStateMovableCells(component : ProcessorsDiagramComponentComponent | InterfacetypesDiagramComponentComponent,
     cells, typeMove : string) {
    for (let cell of cells) {
      component.graph.setCellStyles('movable', typeMove, [cell]);
      if(cell.children) {
        DiagramComponentHelper.changeStateMovableCells(component, cell.children, typeMove)
      }
    }
  }

}

export class SnackErrorDto {
  message: string;
}

export interface ChangeNameEntityDto {
  cellId,
  name: string;
}

export enum StatusCreatingRelationship {
  notCreating,
  creating,
}
