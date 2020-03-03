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

  static printLineCreateRelationship(svg: SVGElement, cell) {
    let line: SVGLineElement = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.classList.add("line-relationship");
    line.style.stroke = "black";
    line.style.strokeWidth = "2";
    line.style.stroke = "black";
    let cellCenterX: number = cell.getGeometry().x + (cell.getGeometry().width / 2);
    let cellCenterY: number = cell.getGeometry().y + (cell.getGeometry().height / 2);
    line.setAttribute("x1", cellCenterX.toString());
    line.setAttribute("x2", cellCenterX.toString());
    line.setAttribute("y1", cellCenterY.toString());
    line.setAttribute("y2", cellCenterY.toString());
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
    component.graph.setCellStyles('movable', '1', component.graph.getChildCells());
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
    cell) : Boolean {
    if (cell.value.nodeName.toLowerCase() != 'processor') {
      let relationshipErrorDto = new SnackErrorDto();
      relationshipErrorDto.message = 'A relationship of type "part of" should be the union between two boxes of type "processor"';
      component.snackBarErrorEmitter.emit(relationshipErrorDto);
      return false;
    };
    let messageError = this.modelService.checkCanCreateRelationship(RelationshipType.PartOf, Number(cell.id), 
      Number(component.sourceCellRelationship.id));
    if (messageError != "") {
      let relationshipErrorDto = new SnackErrorDto();
      relationshipErrorDto.message = messageError;
      component.snackBarErrorEmitter.emit(relationshipErrorDto);
      return false;
    }
    return true;
  }

}

export class SnackErrorDto {
  message: string;
}

export enum StatusCreatingRelationship {
  notCreating,
  creating,
}