import { ModelService, RelationshipType, EntityRelationshipPartOf } from '../model-manager';
import { ProcessorsDiagramComponentComponent } from './processors-diagram-component/processors-diagram-component.component';
import { InterfacetypesDiagramComponentComponent } from './interfacetypes-diagram-component/interfacetypes-diagram-component.component';
import { Subject } from 'rxjs';

export class DiagramComponentHelper {

  static modelService: ModelService;
  static interfaceTypeSubject: Subject<{ name: string, data: any }>;
  static processorSubject: Subject<{ name: string, data: any }>;

  static readonly NOT_RELATIONSHIP = -1;
  static readonly STYLE_PART_OF = 'endArrow=block;endFill=0;strokeColor=black;perimeterSpacing=4;' +
    'labelBackgroundColor=white;fontStyle=1';

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

  static cancelCreateRelationship(component: ProcessorsDiagramComponentComponent | InterfacetypesDiagramComponentComponent) {
    component.relationshipSelect = DiagramComponentHelper.NOT_RELATIONSHIP;
    component.imageToolbarRelationship.style.backgroundColor = "transparent";
    DiagramComponentHelper.changeStateMovableCells(component, component.graph.getChildCells(), "1");
    component.graph.setCellStyles('movable', '0', component.graph.getChildEdges());
  }

  static checkRelationshipPartOfSource(component: ProcessorsDiagramComponentComponent | InterfacetypesDiagramComponentComponent,
    cell): Boolean {
    let typeCells = "";
    if (component instanceof ProcessorsDiagramComponentComponent) typeCells = "processor";
    else if (component instanceof InterfacetypesDiagramComponentComponent) typeCells = "interfaceType";
    if (cell.value.nodeName.toLowerCase() != 'processor' && cell.value.nodeName.toLowerCase() != 'interfacetype') {
      if (!cell.isEdge()) {
        let relationshipErrorDto = new SnackErrorDto();
        relationshipErrorDto.message = `A relationship of type "part of" should be the union between two boxes of type "${typeCells}"`;
        component.snackBarErrorEmitter.emit(relationshipErrorDto);
      }
      return false;
    };
    return true;
  }

  static checkRelationshipPartOfTarget(component: ProcessorsDiagramComponentComponent | InterfacetypesDiagramComponentComponent,
    cell): Boolean {
    let typeCells = "";
    if (component instanceof ProcessorsDiagramComponentComponent) typeCells = "processor";
    else if (component instanceof InterfacetypesDiagramComponentComponent) typeCells = "interfaceType";
    if (cell.value.nodeName.toLowerCase() != 'processor' && cell.value.nodeName.toLowerCase() != 'interfacetype') {
      if (!cell.isEdge()) {
        let relationshipErrorDto = new SnackErrorDto();
        relationshipErrorDto.message = `A relationship of type "part of" should be the union between two boxes of type "${typeCells}"`;
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

  static createPartOfRelationship(sourceId, targetId) {
    let id = DiagramComponentHelper.modelService.createRelationship(RelationshipType.PartOf,
      Number(sourceId), Number(targetId));
    DiagramComponentHelper.modelService.diagrams.forEach((value, key) => {
      let cellSourceInDiagram = null;
      let cellTargetInDiagram = null;
      let diagramGraph = DiagramComponentHelper.getDiagram(key);
      for (let cell of diagramGraph.getChildCells()) {
        if (cell.getAttribute("entityId") == sourceId) cellSourceInDiagram = cell;
        if (cell.getAttribute("entityId") == targetId) cellTargetInDiagram = cell;
      }
      if (cellSourceInDiagram != null && cellTargetInDiagram != null) {
        diagramGraph.getModel().beginUpdate();
        let doc = mxUtils.createXmlDocument();
        let partOfDoc = doc.createElement('partof');
        partOfDoc.setAttribute("name", "name");
        partOfDoc.setAttribute("idRelationship", id);
        diagramGraph.insertEdge(diagramGraph.getDefaultParent(), null, partOfDoc,
          cellSourceInDiagram, cellTargetInDiagram, DiagramComponentHelper.STYLE_PART_OF);
        diagramGraph.getModel().endUpdate();
        let encoder = new mxCodec(null);
        let xml = mxUtils.getXml(encoder.encode(diagramGraph.getModel()));
        DiagramComponentHelper.modelService.setDiagramGraph(key, xml);
      }
    });
    DiagramComponentHelper.interfaceTypeSubject.next({
      name: "refreshDiagram",
      data: null,
    });
    DiagramComponentHelper.processorSubject.next({
      name: "refreshDiagram",
      data: null,
    });
  }

  static printPartOfRelationship(graph: mxGraph, newCell: mxCell, relationship: EntityRelationshipPartOf) {
    for (let edge of graph.getChildEdges()) {
      if (edge.getAttribute("idRelationship") == relationship.id) {
        return;
      }
    }
    if (newCell.getAttribute("entityId", "") == relationship.destinationId) {
      for (let cell of graph.getChildCells()) {
        if (cell.getAttribute("entityId") == relationship.originId) {
          let doc = mxUtils.createXmlDocument();
          let partOfDoc = doc.createElement('partof');
          partOfDoc.setAttribute("name", "name");
          partOfDoc.setAttribute("idRelationship", relationship.id);
          graph.insertEdge(graph.getDefaultParent(), null, partOfDoc,
            cell, newCell, DiagramComponentHelper.STYLE_PART_OF);
        }
      }
    }
    if (newCell.getAttribute("entityId", "") == relationship.originId) {
      for (let cell of graph.getChildCells()) {
        if (cell.getAttribute("entityId") == relationship.destinationId) {
          let doc = mxUtils.createXmlDocument();
          let partOfDoc = doc.createElement('partof');
          partOfDoc.setAttribute("name", "name");
          partOfDoc.setAttribute("idRelationship", relationship.id);
          graph.insertEdge(graph.getDefaultParent(), null, partOfDoc,
            newCell, cell, DiagramComponentHelper.STYLE_PART_OF);
        }
      }
    }
  }

  static changeNameEntityById(component: ProcessorsDiagramComponentComponent | InterfacetypesDiagramComponentComponent,
    name: string, id) {
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

  static changeStateMovableCells(component: ProcessorsDiagramComponentComponent | InterfacetypesDiagramComponentComponent,
    cells, typeMove: string) {
    for (let cell of cells) {
      component.graph.setCellStyles('movable', typeMove, [cell]);
      if (cell.children) {
        DiagramComponentHelper.changeStateMovableCells(component, cell.children, typeMove)
      }
    }
  }

  static removeRelationship(relationshipId) {
    if (DiagramComponentHelper.modelService.deleteRelationship(Number(relationshipId)) == 0) {
      DiagramComponentHelper.modelService.diagrams.forEach((value, key) => {
        let diagramGraph = DiagramComponentHelper.getDiagram(key);
        let edgeRemove = null;
        for (let edge of diagramGraph.getChildEdges(diagramGraph.getDefaultParent())) {
          if (edge.getAttribute('idRelationship', '') == relationshipId)
            edgeRemove = edge;
        }
        if (edgeRemove != null) {
          diagramGraph.getModel().beginUpdate();
          diagramGraph.getModel().remove(edgeRemove);
          diagramGraph.getModel().endUpdate();
          let encoder = new mxCodec(null);
          let xml = mxUtils.getXml(encoder.encode(diagramGraph.getModel()));
          DiagramComponentHelper.modelService.setDiagramGraph(key, xml);
        }
      });
    }
    DiagramComponentHelper.interfaceTypeSubject.next({
      name: "refreshDiagram",
      data: null,
    });
    DiagramComponentHelper.processorSubject.next({
      name: "refreshDiagram",
      data: null,
    });
  }

  static removeEntity(entityId) {
    if (DiagramComponentHelper.modelService.deleteEntity(Number(entityId), true) != -1) {
      DiagramComponentHelper.modelService.diagrams.forEach((value, key) => {
        let diagramGraph = DiagramComponentHelper.getDiagram(key);
        diagramGraph.getModel().beginUpdate();
        for (let cell of diagramGraph.getChildCells(diagramGraph.getDefaultParent())) {
          if(cell.getAttribute('entityId') == entityId) {
            diagramGraph.removeCells([cell], true);
          }
        }
        diagramGraph.getModel().endUpdate();
        let encoder = new mxCodec(null);
        let xml = mxUtils.getXml(encoder.encode(diagramGraph.getModel()));
        DiagramComponentHelper.modelService.setDiagramGraph(key, xml);
      })
    }
    DiagramComponentHelper.interfaceTypeSubject.next({
      name: "refreshDiagram",
      data: null,
    });
    DiagramComponentHelper.processorSubject.next({
      name: "refreshDiagram",
      data: null,
    });
  }

  static removeEntityInDiagram(diagramId, graph : mxGraph, entityId) {
    try {
      if (!DiagramComponentHelper.modelService.removeEntityFromDiagram(Number(diagramId), Number(entityId))) {
        return;
      }
      for (let cell of graph.getChildCells()) {
        if (cell.getAttribute("entityId") == entityId) {
          graph.removeCells([cell], true);
        };
      }
    } catch (err) {
      console.log(err)
    } finally {
      let encoder = new mxCodec(null);
      let xml = mxUtils.getXml(encoder.encode(graph.getModel()));
      console.log(xml);
      DiagramComponentHelper.modelService.setDiagramGraph(Number(diagramId), xml);
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
