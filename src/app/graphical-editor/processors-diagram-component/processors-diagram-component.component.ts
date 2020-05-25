import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, Input, Output, EventEmitter } from '@angular/core';
import { Subject } from 'rxjs';
import {
  DiagramComponentHelper,
  StatusCreatingRelationship,
  SnackErrorDto,
  PartOfFormDto,
  GeometryCell,
} from '../diagram-component-helper';
import {
  ModelService,
  RelationshipType,
  InterfaceOrientation,
  Relationship,
  EntityRelationshipPartOf,
  Processor,
  Interface,
  ExchangeRelationship,
  ScaleRelationship,
  RoegenType,
  Sphere,
} from '../../model-manager';
import { CreateProcessorDto, ChangeInterfaceInGraphDto } from './processors-diagram-component-dto';
import { CellDto } from '../diagram-component-helper';
import { MatMenuTrigger } from '@angular/material';

const STYLE_EXCHANGE = 'strokeColor=black;perimeterSpacing=4;labelBackgroundColor=white;fontStyle=1';
const STYLE_INTERFACESCALE = 'dashed=1;strokeColor=black;perimeterSpacing=4;labelBackgroundColor=white;fontStyle=1'

@Component({
  selector: 'app-processors-diagram-component',
  templateUrl: './processors-diagram-component.component.html',
  styleUrls: ['./processors-diagram-component.component.css']
})
export class ProcessorsDiagramComponentComponent implements AfterViewInit, OnInit {

  //Enum
  RelationshipType = RelationshipType;

  @ViewChild('graphContainer', { static: true }) graphContainer: ElementRef;
  @ViewChild('processorToolbar', { static: true }) processorToolbar: ElementRef;

  @Input() proccesorSubject: Subject<{ name: string, data: any }>;
  @Input() diagramId: number;
  @Input() modelService: ModelService;

  //Emitters
  @Output("createProccesor") createProcessorEmitter = new EventEmitter<CreateProcessorDto>();
  @Output("processorForm") processorFormEmitter = new EventEmitter<CellDto>();
  @Output("snackBarError") snackBarErrorEmitter = new EventEmitter<SnackErrorDto>();
  @Output("updateTree") updateTreeEmitter = new EventEmitter<any>();
  @Output("interfaceForm") interfaceFormEmitter = new EventEmitter<CellDto>();
  @Output("exchangeForm") exchangeFormEmitter = new EventEmitter<CellDto>();
  @Output("partOfForm") partOfFormEmitter = new EventEmitter<PartOfFormDto>();
  @Output("scaleForm") scaleFormEmitter = new EventEmitter<CellDto>();

  //ContextMenuProcessor
  @ViewChild('contextMenuProcessorTrigger', { static: false }) contextMenuProcessor: MatMenuTrigger;
  contextMenuProcessorPosition = {
    x: '0px',
    y: '0px',
  }

  //ContextMenu PartOf
  @ViewChild('contextMenuPartOfTrigger', { static: false }) contextMenuPartOf: MatMenuTrigger;
  contextMenuPartOfPosition = {
    x: '0px',
    y: '0px',
  }

  //ContextMenu InterfaceScale
  @ViewChild('contextMenuInterfaceScaleTrigger', { static: false }) contextMenuInterfaceScale: MatMenuTrigger;
  contextMenuInterfaceScalePosition = {
    x: '0px',
    y: '0px',
  }

  //ContextMenu Exchange
  @ViewChild('contextMenuExchangeTrigger', { static: false }) contextMenuExchange: MatMenuTrigger;
  contextMenuExchangePosition = {
    x: '0px',
    y: '0px',
  }

  graph: mxGraph;

  relationshipSelect = DiagramComponentHelper.NOT_RELATIONSHIP;
  imageToolbarRelationship: HTMLImageElement;
  statusCreateRelationship = StatusCreatingRelationship.notCreating;
  sourceCellRelationship: mxCell;

  constructor() { }

  ngOnInit() {

  }

  ngAfterViewInit() {
    this.graph = new mxGraph(this.graphContainer.nativeElement);
    this.makeDraggableToolbar();
    this.overrideMethodsGraphPorts();
    this.eventsProcessorSubject();
    this.graphMouseEvent();
    this.customLabel();
    this.contextMenu();
    this.overrideCellSelectable();
    this.eventCellsMoveGraph();
    this.eventCellsResizeGraph();
    DiagramComponentHelper.loadDiagram(this.diagramId, this.graph);
  }

  private makeDraggableToolbar() {
    let createProcessorEmitter = this.createProcessorEmitter;
    let component = this;

    let functionProcessor = function (graph: mxGraph, evt, cell) {

      let pt: mxPoint = graph.getPointForEvent(evt);
      let createProcessorDto = new CreateProcessorDto();
      createProcessorDto.component = component;
      createProcessorDto.pt = pt;
      createProcessorEmitter.emit(createProcessorDto);
    }
    let dragElement = document.createElement("img");
    dragElement.setAttribute("src", "assets/toolbar/rectangle.gif");
    dragElement.style.height = "20px";
    dragElement.style.width = "20px";
    mxUtils.makeDraggable(this.processorToolbar.nativeElement, this.graph, functionProcessor, dragElement);
  }

  static printProcessor(diagramId, graph, entityId, x: number, y: number, width : number, height : number) {
    try {
      if (DiagramComponentHelper.modelService.readEntityAppearanceInDiagram(Number(diagramId),
        Number(entityId))) return;
      let entityModel = <Processor>DiagramComponentHelper.modelService.readEntity(Number(entityId));
      let doc = mxUtils.createXmlDocument();
      let processorDoc = doc.createElement('processor');
      processorDoc.setAttribute('name', entityModel.name);
      processorDoc.setAttribute('entityId', entityId);
      processorDoc.setAttribute('minHeight', 0);
      processorDoc.setAttribute('minWidth', 0);
      let newCellProcessor = graph.insertVertex(graph.getDefaultParent(), null, processorDoc, x, y,
        width, height);
      DiagramComponentHelper.modelService.addEntityToDiagram(Number(diagramId), Number(entityId));
      DiagramComponentHelper.modelService.updateEntityAppearanceInDiagram(Number(diagramId),
        Number(entityId), width, height, x, y);
      let childrensRelationship = DiagramComponentHelper.modelService.getRelationshipChildren(Number(entityId));
      let parentsRelationship = DiagramComponentHelper.modelService.getRelationshipParent(Number(entityId));
      ProcessorsDiagramComponentComponent.addRelationshipsProcessor(graph, newCellProcessor, childrensRelationship,
        parentsRelationship);
      for (let interfaceModel of entityModel.interfaces) {
        let cellinterface = ProcessorsDiagramComponentComponent.newCellInterface(diagramId, interfaceModel.id, newCellProcessor, graph);
        let childrensRelationship = DiagramComponentHelper.modelService.getRelationshipChildren(Number(interfaceModel.id));
        let parentsRelationship = DiagramComponentHelper.modelService.getRelationshipParent(Number(interfaceModel.id));
        ProcessorsDiagramComponentComponent.addRelationshipsInterface(graph, cellinterface,
          childrensRelationship, parentsRelationship);
      }
    } catch (error) {
      console.log(error);
    } finally {
      let encoder = new mxCodec(null);
      let xml = mxUtils.getXml(encoder.encode(graph.getModel()));
      DiagramComponentHelper.modelService.setDiagramGraph(Number(diagramId), xml);
    }
  }

  static addRelationshipsProcessor(graph: mxGraph, newCell, childrensRelationship: Relationship[],
    parentsRelationship: Relationship[]) {
    for (let childrenRelationship of childrensRelationship) {
      if (childrenRelationship instanceof EntityRelationshipPartOf) {
        DiagramComponentHelper.printPartOfRelationship(graph, newCell, childrenRelationship);
      }
    }
    for (let parentRelationship of parentsRelationship) {
      if (parentRelationship instanceof EntityRelationshipPartOf) {
        DiagramComponentHelper.printPartOfRelationship(graph, newCell, parentRelationship);
      }
    }
  }

  static addRelationshipsInterface(graph: mxGraph, newCell, childrensRelationship: Relationship[],
    parentsRelationship: Relationship[]) {
    for (let childrenRelationship of childrensRelationship) {
      if (childrenRelationship instanceof ExchangeRelationship) {
        ProcessorsDiagramComponentComponent.printExchangeRelationship(graph, newCell, childrenRelationship);
      }
      else if (childrenRelationship instanceof ScaleRelationship) {
        ProcessorsDiagramComponentComponent.printInterfaceScaleRelationship(graph, newCell, childrenRelationship);
      }
    }
    for (let parentRelationship of parentsRelationship) {
      if (parentRelationship instanceof ExchangeRelationship) {
        ProcessorsDiagramComponentComponent.printExchangeRelationship(graph, newCell, parentRelationship);
      }
      else if (parentRelationship instanceof ScaleRelationship) {
        ProcessorsDiagramComponentComponent.printInterfaceScaleRelationship(graph, newCell, parentRelationship);
      }
    }
  }

  static printExchangeRelationship(graph: mxGraph, interfaceCell: mxCell, relationship: ExchangeRelationship) {
    for (let edge of graph.getChildEdges()) {
      if (edge.getAttribute("idRelationship") == relationship.id) {
        return;
      }
    }
    if (interfaceCell.getAttribute("entityId", "") == relationship.destinationId) {
      for (let cell of graph.getChildCells()) {
        for (let childrenCell of graph.getChildCells(cell)) {
          if (childrenCell.getAttribute("entityId") == relationship.originId) {
            let doc = mxUtils.createXmlDocument();
            let exchangeDoc = doc.createElement('exchange');
            exchangeDoc.setAttribute("name", "name");
            exchangeDoc.setAttribute("idRelationship", relationship.id);
            graph.insertEdge(graph.getDefaultParent(), null, exchangeDoc,
              childrenCell, interfaceCell, STYLE_EXCHANGE);
          }
        }
      }
    }
    if (interfaceCell.getAttribute("entityId", "") == relationship.originId) {
      for (let cell of graph.getChildCells()) {
        for (let childrenCell of graph.getChildCells(cell)) {
          if (childrenCell.getAttribute("entityId") == relationship.destinationId) {
            let doc = mxUtils.createXmlDocument();
            let exchangeDoc = doc.createElement('exchange');
            exchangeDoc.setAttribute("name", "name");
            exchangeDoc.setAttribute("exchange", relationship.id);
            graph.insertEdge(graph.getDefaultParent(), null, exchangeDoc,
              interfaceCell, childrenCell, STYLE_EXCHANGE);
          }
        }
      }
    }
  }

  static printInterfaceScaleRelationship(graph: mxGraph, interfaceCell: mxCell, relationship: ScaleRelationship) {
    for (let edge of graph.getChildEdges()) {
      if (edge.getAttribute("idRelationship") == relationship.id) {
        return;
      }
    }
    if (interfaceCell.getAttribute("entityId", "") == relationship.destinationId) {
      for (let cell of graph.getChildCells()) {
        for (let childrenCell of graph.getChildCells(cell)) {
          if (childrenCell.getAttribute("entityId") == relationship.originId) {
            let doc = mxUtils.createXmlDocument();
            let interfaceScaleDoc = doc.createElement('interfacescale');
            interfaceScaleDoc.setAttribute("name", "name");
            interfaceScaleDoc.setAttribute("idRelationship", relationship.id);
            graph.insertEdge(graph.getDefaultParent(), null, interfaceScaleDoc,
              childrenCell, interfaceCell, STYLE_INTERFACESCALE);
          }
        }
      }
    }
    if (interfaceCell.getAttribute("entityId", "") == relationship.originId) {
      for (let cell of graph.getChildCells()) {
        for (let childrenCell of graph.getChildCells(cell)) {
          if (childrenCell.getAttribute("entityId") == relationship.destinationId) {
            let doc = mxUtils.createXmlDocument();
            let interfaceScaleDoc = doc.createElement('interfacescale');
            interfaceScaleDoc.setAttribute("name", "name");
            interfaceScaleDoc.setAttribute("interfacescale", relationship.id);
            graph.insertEdge(graph.getDefaultParent(), null, interfaceScaleDoc,
              interfaceCell, childrenCell, STYLE_INTERFACESCALE);
          }
        }
      }
    }
  }

  static createInterface(processorId, interfaceTypeId) {
    const interfaceId = DiagramComponentHelper.modelService.createInterface(Number(processorId), interfaceTypeId);

    DiagramComponentHelper.modelService.diagrams.forEach((value, key) => {
      try {
        let diagramGraph = DiagramComponentHelper.getDiagram(key);
        for (let cell of diagramGraph.getChildCells()) {
          if (cell.getAttribute("entityId") == processorId) {
            diagramGraph.getModel().beginUpdate();
            ProcessorsDiagramComponentComponent.newCellInterface(key, interfaceId, cell, diagramGraph);
            diagramGraph.getModel().endUpdate();
            DiagramComponentHelper.updateGraphInModel(key, diagramGraph);
          }
        }
      } catch (err) {
        console.log(err);
      }
    });

    DiagramComponentHelper.processorSubject.next({
      name: "refreshDiagram",
      data: null,
    });
  }

  static newCellInterface(diagramId, entityId, cellTarget, graph: mxGraph) {
    let interfaceModel = <Interface>DiagramComponentHelper.modelService.readInterface(Number(entityId));
    let doc = mxUtils.createXmlDocument();
    let port = doc.createElement('interface');
    port.setAttribute('name', interfaceModel.name);
    port.setAttribute('entityId', interfaceModel.id);
    let style = "";
    if (interfaceModel.orientation == InterfaceOrientation.Input) {
      style = 'fontSize=9;shape=ellipse;resizable=0;fillColor=#FF8E8E;strokeColor=#FF0000;movable=0';
    }
    if (interfaceModel.orientation == InterfaceOrientation.Output) {
      style = 'fontSize=9;shape=ellipse;resizable=0;fillColor=#82FF89;strokeColor=#00FF0E;movable=0';
    }
    let portVertex = graph.insertVertex(cellTarget, null, port, 0, 0.5, 30, 30,
      style, true);
    portVertex.geometry.offset = new mxPoint(-15, -15);
    portVertex.geometry.relative = true;
    ProcessorsDiagramComponentComponent.printCellsInterfacePosition(diagramId, graph, cellTarget);
    return portVertex;
  }

  static printCellsInterfacePosition(diagramId, graph, cellProcessor) {
    cellProcessor.setAttribute('minWidth', 0);
    cellProcessor.setAttribute('minHeight', 0);

    let cellsInterfacePositon = ProcessorsDiagramComponentComponent.cellsInterfacePositon(cellProcessor);
    if (cellsInterfacePositon.leftTop.length > 0)
      ProcessorsDiagramComponentComponent.printCellsInterfacePositionX(diagramId, graph, cellProcessor, 30, cellsInterfacePositon.leftTop, 17, false, POSTION_INTERFACE_Y.TOP);
    if (cellsInterfacePositon.leftBottom.length > 0)
      ProcessorsDiagramComponentComponent.printCellsInterfacePositionX(diagramId, graph, cellProcessor, 30, cellsInterfacePositon.leftBottom, 17, false, POSTION_INTERFACE_Y.BOTTOM);
    if (cellsInterfacePositon.rightTop.length > 0)
      ProcessorsDiagramComponentComponent.printCellsInterfacePositionX(diagramId, graph, cellProcessor, 30, cellsInterfacePositon.rightTop, 17, true, POSTION_INTERFACE_Y.TOP);
    if (cellsInterfacePositon.rightBottom.length > 0)
      ProcessorsDiagramComponentComponent.printCellsInterfacePositionX(diagramId, graph, cellProcessor, 30, cellsInterfacePositon.rightBottom, 17, true, POSTION_INTERFACE_Y.BOTTOM);
    if (cellsInterfacePositon.rightCenter.length > 0)
      ProcessorsDiagramComponentComponent.printCellsInterfacePositionY(diagramId, graph, cellProcessor, 30, cellsInterfacePositon.rightCenter, 17, POSTION_INTERFACE_X.RIGHT);

  }

  static printCellsInterfacePositionX(diagramId, graph, cellProcessor, widthInterface: number, cellsInterface: Array<any>, space: number, afterCenter: boolean,
    positionY: POSTION_INTERFACE_Y) {
    let minWidth = widthInterface * cellsInterface.length + space * (cellsInterface.length + 1);
    if (Number(cellProcessor.getAttribute('minWidth')) < (minWidth * 2))
      cellProcessor.setAttribute('minWidth', minWidth * 2);
    if (minWidth > (cellProcessor.geometry.width / 2)) {
      let geometry = new mxGeometry(cellProcessor.geometry.x, cellProcessor.geometry.y, minWidth * 2, cellProcessor.geometry.height);
      graph.getModel().setGeometry(cellProcessor, geometry);
      DiagramComponentHelper.modelService.updateEntityAppearanceInDiagram(Number(diagramId), cellProcessor.getAttribute('entityId'),
        minWidth * 2, cellProcessor.geometry.height, cellProcessor.geometry.x, cellProcessor.geometry.y);
    }
    let incInterface = (cellProcessor.geometry.width / 2) / (cellsInterface.length + 1);
    for (let i = 0; i < cellsInterface.length; i++) {
      let centerX = incInterface * (i + 1);
      if (afterCenter) centerX += (cellProcessor.geometry.width / 2);
      centerX = centerX / cellProcessor.geometry.width;
      let centerY = positionY == POSTION_INTERFACE_Y.TOP ? 0 : 1;
      let geometry = new mxGeometry(centerX, centerY, widthInterface, widthInterface);
      geometry.offset = new mxPoint(-15, -15);
      geometry.relative = 1;
      graph.getModel().setGeometry(cellsInterface[i], geometry);
    }
  }

  static printCellsInterfacePositionY(diagramId, graph, cellProcessor, widthInterface: number, cellsInterface: Array<any>, space: number,
    positionX: POSTION_INTERFACE_X) {
    let minHeight = widthInterface * cellsInterface.length + space * (cellsInterface.length + 1);
    if (Number(cellProcessor.getAttribute('minHeight')) < minHeight)
      cellProcessor.setAttribute('minHeight', minHeight);
    if (minHeight > cellProcessor.geometry.height) {
      let geometry = new mxGeometry(cellProcessor.geometry.x, cellProcessor.geometry.y, cellProcessor.geometry.width, minHeight);
      graph.getModel().setGeometry(cellProcessor, geometry);
      DiagramComponentHelper.modelService.updateEntityAppearanceInDiagram(Number(diagramId), cellProcessor.getAttribute('entityId'),
        cellProcessor.geometry.width, minHeight, cellProcessor.geometry.x, cellProcessor.geometry.y);
    }
    let incInterface = cellProcessor.geometry.height / (cellsInterface.length + 1);
    for (let i = 0; i < cellsInterface.length; i++) {
      let centerY = incInterface * (i + 1);
      centerY = centerY / cellProcessor.geometry.height;
      let centerX = positionX == POSTION_INTERFACE_X.LEFT ? 0 : 1;
      let geometry = new mxGeometry(centerX, centerY, widthInterface, widthInterface);
      geometry.offset = new mxPoint(-15, -15);
      geometry.relative = 1;
      graph.getModel().setGeometry(cellsInterface[i], geometry);
    }
  }

  static cellsInterfacePositon(cellProcessor): CellsInterfacePositions {
    console.log(cellProcessor);
    let cellsPostion: CellsInterfacePositions = {
      leftTop: new Array(),
      leftBottom: new Array(),
      rightTop: new Array(),
      rightBottom: new Array(),
      rightCenter: new Array(),
    }
    if (cellProcessor.children)
      for (let cellChildren of cellProcessor.children) {
        let interfaceModel = <Interface>DiagramComponentHelper.modelService.readInterface(Number(cellChildren.getAttribute('entityId')));
        if (interfaceModel.orientation == InterfaceOrientation.Input) {
          if (interfaceModel.roegenType == RoegenType.Flow && interfaceModel.sphere == Sphere.Technosphere)
            cellsPostion.leftTop.push(cellChildren);
          else if (interfaceModel.roegenType == RoegenType.Flow && interfaceModel.sphere == Sphere.Biosphere)
            cellsPostion.leftBottom.push(cellChildren);
          else if (interfaceModel.roegenType == RoegenType.Fund)
            cellsPostion.rightTop.push(cellChildren);
        } else if (interfaceModel.orientation == InterfaceOrientation.Output) {
          if (interfaceModel.roegenType == RoegenType.Flow && interfaceModel.sphere == Sphere.Biosphere)
            cellsPostion.rightBottom.push(cellChildren);
          else if (interfaceModel.roegenType == RoegenType.Flow && interfaceModel.sphere == Sphere.Technosphere)
            cellsPostion.rightCenter.push(cellChildren);
          else if (interfaceModel.roegenType == RoegenType.Fund)
            cellsPostion.rightCenter.push(cellChildren);
        }
      }
    console.log(cellsPostion);
    return cellsPostion;
  }

  static changeInterfaceInGraph(interfaceModel: Interface) {
    DiagramComponentHelper.modelService.diagrams.forEach((value, key) => {
      let diagramGraph = DiagramComponentHelper.getDiagram(key);
      diagramGraph.getModel().beginUpdate();
      for (let cell of diagramGraph.getChildCells(diagramGraph.getDefaultParent())) {
        if (cell.children)
          for (let cellChildren of cell.children) {
            if (cellChildren.getAttribute('entityId') == interfaceModel.id) {
              cellChildren.setAttribute('name', interfaceModel.name);
              ProcessorsDiagramComponentComponent.changeInterfaceStyle(key, interfaceModel, cellChildren, diagramGraph);
            }
          }
      }
      diagramGraph.getModel().endUpdate();
      let encoder = new mxCodec(null);
      let xml = mxUtils.getXml(encoder.encode(diagramGraph.getModel()));
      DiagramComponentHelper.modelService.setDiagramGraph(key, xml);
    });
  }

  static changeInterfaceStyle(diagramId, interfaceModel: Interface, cell, graph: mxGraph): void {
    if (interfaceModel.orientation == InterfaceOrientation.Input) {
      graph.setCellStyles(mxConstants.STYLE_STROKECOLOR, '#FF0000', [cell]);
      graph.setCellStyles(mxConstants.STYLE_FILLCOLOR, '#FF8E8E', [cell]);
    }
    if (interfaceModel.orientation == InterfaceOrientation.Output) {
      graph.setCellStyles(mxConstants.STYLE_STROKECOLOR, '#00FF0E', [cell]);
      graph.setCellStyles(mxConstants.STYLE_FILLCOLOR, '#82FF89', [cell]);
    }
    ProcessorsDiagramComponentComponent.printCellsInterfacePosition(diagramId, graph, cell.parent);
  }

  static createExchangeRelationship(sourceId, targetId) {
    const idRelationship = DiagramComponentHelper.modelService.createRelationship(RelationshipType.Exchange,
      Number(sourceId), Number(targetId));
    DiagramComponentHelper.modelService.diagrams.forEach((value, key) => {
      let cellSourceInDiagram = null;
      let cellTargetInDiagram = null;
      let diagramGraph = DiagramComponentHelper.getDiagram(key);
      for (let cell of diagramGraph.getChildCells()) {
        for (let childrenCell of diagramGraph.getChildCells(cell)) {
          if (childrenCell.getAttribute("entityId") == sourceId) cellSourceInDiagram = childrenCell;
          if (childrenCell.getAttribute("entityId") == targetId) cellTargetInDiagram = childrenCell;
        }
      }
      if (cellSourceInDiagram != null && cellTargetInDiagram != null) {
        diagramGraph.getModel().beginUpdate();
        const doc = mxUtils.createXmlDocument();
        const exchange = doc.createElement('exchange');
        exchange.setAttribute("name", "name");
        exchange.setAttribute("idRelationship", idRelationship);
        diagramGraph.insertEdge(diagramGraph.getDefaultParent(), null, exchange,
          cellSourceInDiagram, cellTargetInDiagram, STYLE_EXCHANGE);
        diagramGraph.getModel().endUpdate();
        const encoder = new mxCodec(null);
        const xml = mxUtils.getXml(encoder.encode(diagramGraph.getModel()));
        DiagramComponentHelper.modelService.setDiagramGraph(key, xml);
      }
    });
    DiagramComponentHelper.processorSubject.next({
      name: "refreshDiagram",
      data: null,
    });
  }

  static createInterfaceScaleRelationship(sourceId, targetId) {
    const idRelationship = DiagramComponentHelper.modelService.createRelationship(RelationshipType.InterfaceScale,
      Number(sourceId), Number(targetId));
    DiagramComponentHelper.modelService.diagrams.forEach((value, key) => {
      let cellSourceInDiagram = null;
      let cellTargetInDiagram = null;
      let diagramGraph = DiagramComponentHelper.getDiagram(key);
      for (let cell of diagramGraph.getChildCells()) {
        for (let childrenCell of diagramGraph.getChildCells(cell)) {
          if (childrenCell.getAttribute("entityId") == sourceId) cellSourceInDiagram = childrenCell;
          if (childrenCell.getAttribute("entityId") == targetId) cellTargetInDiagram = childrenCell;
        }
      }
      if (cellSourceInDiagram != null && cellTargetInDiagram != null) {
        diagramGraph.getModel().beginUpdate();
        const doc = mxUtils.createXmlDocument();
        const interfaceScale = doc.createElement('interfacescale');
        interfaceScale.setAttribute("name", "name");
        interfaceScale.setAttribute("idRelationship", idRelationship);
        diagramGraph.insertEdge(diagramGraph.getDefaultParent(), null, interfaceScale,
          cellSourceInDiagram, cellTargetInDiagram, STYLE_INTERFACESCALE);
        diagramGraph.getModel().endUpdate();
        const encoder = new mxCodec(null);
        const xml = mxUtils.getXml(encoder.encode(diagramGraph.getModel()));
        DiagramComponentHelper.modelService.setDiagramGraph(key, xml);
      }
    });
    DiagramComponentHelper.processorSubject.next({
      name: "refreshDiagram",
      data: null,
    });
  }

  static changeSizeProcessorInDiagram(diagramId, entityId, width, height) {
    let diagramGraph = DiagramComponentHelper.getDiagram(Number(diagramId));
    for (let cell of diagramGraph.getChildCells()) {
      if (cell.getAttribute('entityId') == entityId) {
        let cellWidth = width;
        let cellHeight = height;
        if (cellWidth < Number(cell.getAttribute('minWidth'))) {
          cellWidth = Number(cell.getAttribute('minWidth'));
        }
        if (cellHeight < Number(cell.getAttribute('minHeight'))) {
          cellHeight = Number(cell.getAttribute('minHeight'));
        }
        diagramGraph.getModel().beginUpdate();
        let geometry = new mxGeometry(cell.geometry.x, cell.geometry.y, cellWidth, cellHeight);
        diagramGraph.getModel().setGeometry(cell, geometry);
        diagramGraph.getModel().endUpdate();
        DiagramComponentHelper.modelService.updateEntityAppearanceInDiagram(Number(diagramId), Number(cell.getAttribute("entityId", "")),
          cell.geometry.width, cell.geometry.height, cell.geometry.x, cell.geometry.y);
        DiagramComponentHelper.updateGraphInModel(Number(diagramId), diagramGraph);
      }
    }
    DiagramComponentHelper.processorSubject.next({
      name: "refreshDiagram",
      data: null,
    });
  }

  static changePostitionProcessorInDiagram(diagramId, entityId, x, y)  {
    let diagramGraph = DiagramComponentHelper.getDiagram(Number(diagramId));
    for (let cell of diagramGraph.getChildCells()) {
      if (cell.getAttribute('entityId') == entityId) {
        diagramGraph.getModel().beginUpdate();
        let geometry = new mxGeometry(x, y, cell.geometry.width, cell.geometry.height);
        diagramGraph.getModel().setGeometry(cell, geometry);
        diagramGraph.getModel().endUpdate();
        DiagramComponentHelper.modelService.updateEntityAppearanceInDiagram(Number(diagramId), Number(cell.getAttribute("entityId", "")),
          cell.geometry.width, cell.geometry.height, cell.geometry.x, cell.geometry.y);
        DiagramComponentHelper.updateGraphInModel(Number(diagramId), diagramGraph);
      }
    }
    DiagramComponentHelper.processorSubject.next({
      name: "refreshDiagram",
      data: null,
    });
  }

  private eventsProcessorSubject() {
    this.proccesorSubject.subscribe(event => {
      switch (event.name) {
        case "portDraggable":
          this.portDraggable(event.data);
          if (this.statusCreateRelationship == StatusCreatingRelationship.creating)
            DiagramComponentHelper.changeStateMovableCells(this, this.graph.getChildCells(), "0");
          break;
        case 'refreshDiagram':
          DiagramComponentHelper.loadDiagram(this.diagramId, this.graph);
          if (this.statusCreateRelationship == StatusCreatingRelationship.creating)
            DiagramComponentHelper.changeStateMovableCells(this, this.graph.getChildCells(), "0");
          break;
        case 'processorDraggableTree':
          this.proccesorDraggableTree(event.data);
          break;
      }
    });
  }

  private proccesorDraggableTree(element: HTMLElement) {
    let proccesorDiagramInstance = this;
    const funct = (graph, evt, cell) => {
      let pt: mxPoint = graph.getPointForEvent(evt);
      proccesorDiagramInstance.graph.getModel().beginUpdate();
      ProcessorsDiagramComponentComponent.printProcessor(proccesorDiagramInstance.diagramId,
        proccesorDiagramInstance.graph, element.getAttribute('data-node-id'), pt.x, pt.y, 100, 80);
      proccesorDiagramInstance.graph.getModel().endUpdate();
      DiagramComponentHelper.loadDiagram(proccesorDiagramInstance.diagramId, proccesorDiagramInstance.graph);
    }
    let dragElement = document.createElement("img");
    dragElement.setAttribute("src", "assets/toolbar/rectangle.gif");
    dragElement.style.height = "20px";
    dragElement.style.width = "20px";
    mxUtils.makeDraggable(element, this.graph, funct);
  }

  private portDraggable(element: HTMLElement) {
    var funct = function (graph, evt, cell) {
      let pt: mxPoint = graph.getPointForEvent(evt);
      let cellTarget = graph.getCellAt(pt.x, pt.y);
      if (cellTarget != null && cellTarget.value.nodeName == "processor") {
        graph.stopEditing(false);
        let interfaceTypeId = element.getAttribute("data-node-id");
        ProcessorsDiagramComponentComponent.createInterface(Number(cellTarget.getAttribute("entityId")),
          Number(interfaceTypeId));
      }

    }
    mxUtils.makeDraggable(element, this.graph, funct);
  }

  imageToolbarRelationshipClick(event: MouseEvent, relationshipType: RelationshipType) {
    if (this.imageToolbarRelationship) this.imageToolbarRelationship.style.backgroundColor = "transparent";
    (<HTMLImageElement>event.target).style.backgroundColor = "#B0B0B0";
    if (this.relationshipSelect == relationshipType) DiagramComponentHelper.cancelCreateRelationship(this);
    else {
      this.relationshipSelect = relationshipType;
      this.imageToolbarRelationship = <HTMLImageElement>event.target;
      this.statusCreateRelationship = StatusCreatingRelationship.creating;
      DiagramComponentHelper.changeStateMovableCells(this, this.graph.getChildCells(), "0");
    }
  }

  private graphMouseEvent() {
    this.graph.addListener(mxEvent.DOUBLE_CLICK, this.doubleClickGraph.bind(this));
    this.graph.addMouseListener(
      {
        mouseDown: this.mouseDownGraph.bind(this),
        mouseMove: this.mouseMoveGraph.bind(this),
        mouseUp: this.mouseUpGraph.bind(this),
      }
    )
  }

  private doubleClickGraph(graph, evt) {
    let cellTarget: mxCell = evt.getProperty('cell');
    if (cellTarget) {
      console.log(cellTarget);
      switch (cellTarget.value.nodeName.toLowerCase()) {
        case 'interface':
          let interfaceDto: CellDto = { cellId: cellTarget.getAttribute('entityId', '') };
          this.interfaceFormEmitter.emit(interfaceDto);
          break;
        case 'exchange':
          let exchangeDto: CellDto = { cellId: cellTarget.getAttribute('idRelationship', '') }
          this.exchangeFormEmitter.emit(exchangeDto);
          break;
        case 'partof':
          let partOfDto: PartOfFormDto = { cellId: cellTarget.getAttribute('idRelationship', '') };
          this.partOfFormEmitter.emit(partOfDto);
          break;
        case 'interfacescale':
          let scaleDto: CellDto = { cellId: cellTarget.getAttribute('idRelationship', '') };
          this.scaleFormEmitter.emit(scaleDto);
          break;
      }
    }
  }

  private mouseDownGraph(sender: mxGraph, mouseEvent: mxMouseEvent) {
    let cell: mxCell = mouseEvent.getCell();
    if (this.relationshipSelect != DiagramComponentHelper.NOT_RELATIONSHIP &&
      this.statusCreateRelationship == StatusCreatingRelationship.creating) {
      if (cell != null && this.checkRelationshipCellSource(cell)) {
        let svg = sender.container.getElementsByTagName("svg")[0];
        DiagramComponentHelper.printLineCreateRelationship(svg, cell, mouseEvent);
        this.sourceCellRelationship = cell;
      } else {
        DiagramComponentHelper.cancelCreateRelationship(this);
      }
    }
  }


  private checkRelationshipCellSource(cell): Boolean {
    switch (this.relationshipSelect) {
      case RelationshipType.PartOf:
        return DiagramComponentHelper.checkRelationshipPartOfSource(this, cell);
      case RelationshipType.Exchange:
        return this.checkRelationshipExchangeSource(cell);
      case RelationshipType.InterfaceScale:
        return this.checkRelationshipInterfaceScaleSource(cell);
    }
    return false;
  }

  private checkRelationshipExchangeSource(cell): boolean {
    if (cell.value.nodeName.toLowerCase() != 'interface') {
      if (!cell.isEdge()) {
        let relationshipErrorDto = new SnackErrorDto();
        relationshipErrorDto.message = 'A relationship of type "exchange" should be the union between two entity of type "interface"';
        this.snackBarErrorEmitter.emit(relationshipErrorDto);
      }
      return false;
    }

    return true;
  }

  private checkRelationshipInterfaceScaleSource(cell): boolean {
    if (cell.value.nodeName.toLowerCase() != 'interface') {
      if (!cell.isEdge()) {
        let relationshipErrorDto = new SnackErrorDto();
        relationshipErrorDto.message = 'A relationship of type "interfaceScale" should be the union between two entity of type "interface"';
        this.snackBarErrorEmitter.emit(relationshipErrorDto);
      }
      return false;
    }

    return true;
  }

  private mouseUpGraph(sender, mouseEvent: mxMouseEvent) {
    let cell: mxCell = mouseEvent.getCell();

    if (this.statusCreateRelationship == StatusCreatingRelationship.creating) {
      let svg: SVGElement = sender.container.getElementsByTagName("svg")[0];
      let lineRelationship = <SVGLineElement>svg.getElementsByClassName("line-relationship")[0];
      if (lineRelationship) {
        lineRelationship.remove();
      }
      if (cell != null && this.checkRelationshipCellTarget(cell)) {
        this.createRelationship(cell);
      } else {
        DiagramComponentHelper.cancelCreateRelationship(this);
        this.statusCreateRelationship = StatusCreatingRelationship.notCreating;
      }
    }
  }

  private checkRelationshipCellTarget(cell): Boolean {
    switch (this.relationshipSelect) {
      case RelationshipType.PartOf:
        return DiagramComponentHelper.checkRelationshipPartOfTarget(this, cell);
      case RelationshipType.Exchange:
        return this.checkRelationshipExchangeTarget(cell);
      case RelationshipType.InterfaceScale:
        return this.checkRelationshipInterfaceScaleTarget(cell);
    }
    return false;
  }

  private checkRelationshipExchangeTarget(cell: mxCell): boolean {
    if (cell.value.nodeName.toLowerCase() != 'interface') {
      let relationshipErrorDto = new SnackErrorDto();
      relationshipErrorDto.message = 'A relationship of type "exchange" should be the union between two entity of type "interface"';
      this.snackBarErrorEmitter.emit(relationshipErrorDto);
      return false;
    }
    if (Number(cell.getAttribute("entityId", "")) == Number(this.sourceCellRelationship.getAttribute("entityId", ""))) {
      return false;
    }
    let messageError = this.modelService.checkCanCreateRelationship(RelationshipType.Exchange,
      Number(this.sourceCellRelationship.getAttribute("entityId", "")), Number(cell.getAttribute("entityId", "")));
    if (messageError != "") {
      let relationshipErrorDto = new SnackErrorDto();
      relationshipErrorDto.message = messageError;
      this.snackBarErrorEmitter.emit(relationshipErrorDto);
      return false;
    }
    return true;
  }

  private checkRelationshipInterfaceScaleTarget(cell: mxCell): boolean {
    if (cell.value.nodeName.toLowerCase() != 'interface') {
      let relationshipErrorDto = new SnackErrorDto();
      relationshipErrorDto.message = 'A relationship of type "interfaceScale" should be the union between two entity of type "interface"';
      this.snackBarErrorEmitter.emit(relationshipErrorDto);
      return false;
    }
    if (Number(cell.getAttribute("entityId", "")) == Number(this.sourceCellRelationship.getAttribute("entityId", ""))) {
      return false;
    }
    let messageError = this.modelService.checkCanCreateRelationship(RelationshipType.InterfaceScale,
      Number(this.sourceCellRelationship.getAttribute("entityId", "")), Number(cell.getAttribute("entityId", "")));
    if (messageError != "") {
      let relationshipErrorDto = new SnackErrorDto();
      relationshipErrorDto.message = messageError;
      this.snackBarErrorEmitter.emit(relationshipErrorDto);
      return false;
    }
    return true;
  }

  private createRelationship(cell) {
    switch (this.relationshipSelect) {
      case RelationshipType.PartOf:
        DiagramComponentHelper.createPartOfRelationship(this.sourceCellRelationship.getAttribute("entityId", ""),
          cell.getAttribute("entityId", ""));
        this.updateTreeEmitter.emit(null);
        break;
      case RelationshipType.Exchange:
        ProcessorsDiagramComponentComponent.createExchangeRelationship(this.sourceCellRelationship.getAttribute("entityId", ""),
          cell.getAttribute("entityId", ""));
        break;
      case RelationshipType.InterfaceScale:
        ProcessorsDiagramComponentComponent.createInterfaceScaleRelationship(this.sourceCellRelationship.getAttribute("entityId", ""),
          cell.getAttribute("entityId", ""));
    }
  }



  private mouseMoveGraph(sender, mouseEvent: mxMouseEvent) {
    let svg: SVGElement = sender.container.getElementsByTagName("svg")[0];
    let lineRelationship = <SVGLineElement>svg.getElementsByClassName("line-relationship")[0];
    if (this.statusCreateRelationship == StatusCreatingRelationship.creating &&
      lineRelationship != undefined) {
      DiagramComponentHelper.moveLineCreateRelationship(lineRelationship, mouseEvent);
    }
  }

  private showFormProcessor(cellId) {
    let processorFormDto: CellDto = {
      cellId: cellId
    };
    this.processorFormEmitter.emit(processorFormDto);
  }

  private overrideMethodsGraphPorts() {

    let graph = this.graph;

    // Removes folding icon for relative children
    graph.isCellFoldable = function (cell, collapse) {
      var childCount = this.model.getChildCount(cell);

      for (var i = 0; i < childCount; i++) {
        var child = this.model.getChildAt(cell, i);
        var geo = this.getCellGeometry(child);

        if (geo != null && geo.relative) {
          return false;
        }
      }

      return childCount > 0;
    };

    // Returns the relative position of the given child
    function getRelativePosition(state, dx, dy) {
      if (state != null) {
        var model = graph.getModel();
        var geo = model.getGeometry(state.cell);

        if (geo != null && geo.relative && !model.isEdge(state.cell)) {
          var parent = model.getParent(state.cell);

          if (model.isVertex(parent)) {
            var pstate = graph.view.getState(parent);

            if (pstate != null) {
              var scale = graph.view.scale;
              var x = state.x + dx;
              var y = state.y + dy;

              if (geo.offset != null) {
                x -= geo.offset.x * scale;
                y -= geo.offset.y * scale;
              }

              x = (x - pstate.x) / pstate.width;
              y = (y - pstate.y) / pstate.height;

              if (Math.abs(y - 0.5) <= Math.abs((x - 0.5) / 2)) {
                x = (x > 0.5) ? 1 : 0;
                y = Math.min(1, Math.max(0, y));
              }
              else {
                x = Math.min(1, Math.max(0, x));
                y = (y > 0.5) ? 1 : 0;
              }

              return new mxPoint(x, y);
            }
          }
        }
      }

      return null;
    };

    // Replaces translation for relative children
    graph.translateCell = function (cell, dx, dy) {
      var rel = getRelativePosition(this.view.getState(cell), dx * graph.view.scale, dy * graph.view.scale);

      if (rel != null) {
        var geo = this.model.getGeometry(cell);

        if (geo != null && geo.relative) {
          geo = geo.clone();
          geo.x = rel.x;
          geo.y = rel.y;

          this.model.setGeometry(cell, geo);
        }
      }
      else {
        mxGraph.prototype.translateCell.apply(this, arguments);
      }
    };

    // Replaces move preview for relative children
    graph.graphHandler.getDelta = function (me) {
      var point = mxUtils.convertPoint(this.graph.container, me.getX(), me.getY());
      var delta = new mxPoint(point.x - this.first.x, point.y - this.first.y);

      if (this.cells != null && this.cells.length > 0 && this.cells[0] != null) {
        var state = this.graph.view.getState(this.cells[0]);
        var rel = getRelativePosition(state, delta.x, delta.y);

        if (rel != null) {
          var pstate = this.graph.view.getState(this.graph.model.getParent(state.cell));

          if (pstate != null) {
            delta = new mxPoint(pstate.x + pstate.width * rel.x - state.getCenterX(),
              pstate.y + pstate.height * rel.y - state.getCenterY());
          }
        }
      }

      return delta;
    };

    // Relative children cannot be removed from parent
    graph.graphHandler.shouldRemoveCellsFromParent = function (parent, cells, evt) {
      return cells.length == 0 && !cells[0].geometry.relative && mxGraphHandler.prototype.shouldRemoveCellsFromParent.apply(this, arguments);
    };

    // Enables moving of relative children
    graph.isCellLocked = function (cell) {
      return false;
    };

    new mxRubberband(graph);
  }

  private customLabel() {
    let processorInstance = this;

    this.graph.convertValueToString = (cell: mxCell) => {
      switch (cell.value.nodeName.toLowerCase()) {
        case 'processor':
          return cell.getAttribute('name', 'Processor');
        case 'interface':
          let portName = cell.getAttribute('name', 'Processor').toUpperCase();
          if (portName.length < 3) {
            return portName;
          } else {
            return portName.substring(0, 3);
          }
        case 'partof':
          return 'partOf';
        case 'exchange':
          return 'exchange';
        case 'interfacescale':
          return 'interfaceScale';
      }
    }

    this.graph.cellLabelChanged = function (cell: mxCell, newValue, autoSize) {
      switch (cell.value.nodeName.toLowerCase()) {
        case 'processor':
          for (let diagram of processorInstance.modelService.getTreeModelViewDiagrams()) {
            DiagramComponentHelper.changeNameEntityOnlyXML(Number(diagram.modelId), newValue,
              Number(cell.getAttribute('entityId', '')));
          }
          processorInstance.modelService.updateEntityName(Number(cell.getAttribute('entityId', '')), newValue);
          processorInstance.proccesorSubject.next({
            name: "refreshDiagram",
            data: null,
          });
          break;
      }
    }

    this.graph.getEditingValue = function (cell: mxCell) {
      switch (cell.value.nodeName.toLowerCase()) {
        case 'processor':
          return cell.getAttribute('name', 'interfaceType');
        case 'partof':
          return 'partof';
        case 'exchange':
          return 'exchange';
        case 'interfacescale':
          return 'interfaceScale';
      }
    };
  }

  private contextMenu() {

    mxEvent.disableContextMenu(this.graphContainer.nativeElement);

    let processorInstance = this;

    function createPopupMenu(cell: mxCell, event: PointerEvent) {
      if (cell.value.nodeName.toLowerCase() == "processor") {
        processorInstance.contextMenuProcessorPosition.x = event.clientX + 'px';
        processorInstance.contextMenuProcessorPosition.y = event.clientY + 'px';
        processorInstance.contextMenuProcessor.menuData = { 'cell': cell };
        processorInstance.contextMenuProcessor.menu.focusFirstItem('mouse');
        processorInstance.contextMenuProcessor.openMenu();
      } else if (cell.value.nodeName.toLowerCase() == "partof") {
        processorInstance.contextMenuPartOfPosition.x = event.clientX + 'px';
        processorInstance.contextMenuPartOfPosition.y = event.clientY + 'px';
        processorInstance.contextMenuPartOf.menuData = { 'cell': cell };
        processorInstance.contextMenuPartOf.menu.focusFirstItem('mouse');
        processorInstance.contextMenuPartOf.openMenu();
      } else if (cell.value.nodeName.toLowerCase() == "exchange") {
        processorInstance.contextMenuExchangePosition.x = event.clientX + 'px';
        processorInstance.contextMenuExchangePosition.y = event.clientY + 'px';
        processorInstance.contextMenuExchange.menuData = { 'cell': cell };
        processorInstance.contextMenuExchange.menu.focusFirstItem('mouse');
        processorInstance.contextMenuExchange.openMenu();
      } else if (cell.value.nodeName.toLowerCase() == "interfacescale") {
        processorInstance.contextMenuInterfaceScalePosition.x = event.clientX + 'px';
        processorInstance.contextMenuInterfaceScalePosition.y = event.clientY + 'px';
        processorInstance.contextMenuInterfaceScale.menuData = { 'cell': cell };
        processorInstance.contextMenuInterfaceScale.menu.focusFirstItem('mouse');
        processorInstance.contextMenuInterfaceScale.openMenu();
      }
    }

    this.graph.popupMenuHandler.factoryMethod = function (menu, cell, evt: PointerEvent) {
      (<HTMLDivElement>document.getElementsByClassName("cdk-overlay-container")[0]).oncontextmenu = (evt) => {
        evt.preventDefault();
        return false;
      };
      if (cell != null) {
        return createPopupMenu(cell, evt);
      }
    };
  }

  onContextMenuProcessorForm(cell: mxCell) {
    if (cell != undefined && cell.value.nodeName == "processor") {
      this.showFormProcessor(cell.getAttribute("entityId", ""));
    }
  }

  onContextMenuProcessorRemove(cell: mxCell) {
    this.graph.getModel().beginUpdate();
    DiagramComponentHelper.removeEntityInDiagram(this.diagramId, this.graph, cell.getAttribute('entityId', ''));
    this.graph.getModel().endUpdate();
    DiagramComponentHelper.loadDiagram(this.diagramId, this.graph);
  }

  onContextMenuPartOfForm(cell: mxCell) {
    let partOfDto: PartOfFormDto = { cellId: cell.getAttribute('idRelationship', '') };
    this.partOfFormEmitter.emit(partOfDto);
  }

  onContextMenuPartOfRemove(cell: mxCell) {
    DiagramComponentHelper.removeRelationship(cell.getAttribute('idRelationship', ''));
    this.updateTreeEmitter.emit(null);
  }

  onContextMenuInterfaceScaleForm(cell: mxCell) {
    let scaleDto: CellDto = { cellId: cell.getAttribute('idRelationship', '') };
    this.scaleFormEmitter.emit(scaleDto);
  }

  onContextMenuInterfaceScaleRemove(cell: mxCell) {
    DiagramComponentHelper.removeRelationship(cell.getAttribute('idRelationship', ''));
  }

  onContextMenuExchangeForm(cell: mxCell) {
    let exchangeDto: CellDto = { cellId: cell.getAttribute('idRelationship', '') }
    this.exchangeFormEmitter.emit(exchangeDto);
  }

  onContextMenuExchangeRemove(cell: mxCell) {
    DiagramComponentHelper.removeRelationship(cell.getAttribute('idRelationship', ''));
  }

  private overrideCellSelectable() {
    this.graph.isCellSelectable = function (cell: mxCell) {
      if (cell.isEdge() || cell.value.nodeName.toLowerCase() == 'interface') {
        return false;
      }
      var state = this.view.getState(cell);
      var style = (state != null) ? state.style : this.getCellStyle(cell);

      return this.isCellsSelectable() && !this.isCellLocked(cell) && style['selectable'] != 0;
    }
  }

  private eventCellsMoveGraph() {
    let processorInstance = this;
    this.graph.addListener(mxEvent.CELLS_MOVED, function (sender, event) {
      let cellsMoved: [mxCell] = event.properties.cells;
      for (let cell of cellsMoved) {
        if (cell.value.nodeName.toLowerCase() == 'processor') {
          ProcessorsDiagramComponentComponent.changePostitionProcessorInDiagram(processorInstance.diagramId, cell.getAttribute('entityId'),
          cell.geometry.x, cell.geometry.y);
        }
      }
    });
  }

  private eventCellsResizeGraph() {
    let processorInstance = this;
    this.graph.addListener(mxEvent.CELLS_RESIZED, function (sender: mxGraph, event) {
      let cellsResize: [mxCell] = event.properties.cells;
      let cellsPreviousResize: [mxGeometry] = event.properties.previous;
      console.log(event.properties);
      for (let i = 0; i < cellsResize.length ; i++) {
        if (cellsResize[i].value.nodeName.toLowerCase() == 'processor') {
          let newGeometryCell = {
            x: cellsResize[i].geometry.x,
            y: cellsResize[i].geometry.y,
            height: cellsResize[i].geometry.height,
            width: cellsResize[i].geometry.width,
          }
          let prevoiousGeometryCell = {
            x: cellsPreviousResize[i].x,
            y: cellsPreviousResize[i].y,
            height: cellsPreviousResize[i].height,
            width: cellsPreviousResize[i].width,
          }
          processorInstance.changeSizeProcessorInDiagram(processorInstance.diagramId, cellsResize[i].getAttribute('entityId'),
            newGeometryCell, prevoiousGeometryCell);
        }
      }
    });
  }

  /* In the "newGeometry" parameter just change the height and width, the old and new geometry are needed 
  to correct the positioning when you change it in the editor */
  private changeSizeProcessorInDiagram(diagramId, entityId, newGeometry : GeometryCell, previousGeometry: GeometryCell) {
    let diagramGraph = DiagramComponentHelper.getDiagram(Number(diagramId));
    for (let cell of diagramGraph.getChildCells()) {
      if (cell.getAttribute('entityId') == entityId) {
        let cellWidth = newGeometry.width;
        let cellHeight = newGeometry.height;
        let cellX = newGeometry.x;
        let cellY = newGeometry.y;
        if (cellWidth < Number(cell.getAttribute('minWidth'))) {
          if(newGeometry.x > previousGeometry.x) {
            let differenceWidth = Number(cell.getAttribute('minWidth')) - cellWidth;
            cellX = cellX - differenceWidth;
          }
          cellWidth = Number(cell.getAttribute('minWidth'));
        }
        if (cellHeight < Number(cell.getAttribute('minHeight'))) {
          if(newGeometry.y > previousGeometry.y) {
            let differenceHeight = Number(cell.getAttribute('minHeight')) - cellHeight;
            cellY = cellY - differenceHeight;
          }
          cellHeight = Number(cell.getAttribute('minHeight'));
        }
        diagramGraph.getModel().beginUpdate();
        let geometry = new mxGeometry(cellX, cellY, cellWidth, cellHeight);
        diagramGraph.getModel().setGeometry(cell, geometry);
        diagramGraph.getModel().endUpdate();
        DiagramComponentHelper.modelService.updateEntityAppearanceInDiagram(Number(diagramId), Number(cell.getAttribute("entityId", "")),
          cell.geometry.x, cell.geometry.y, cell.geometry.width, cell.geometry.height);
        DiagramComponentHelper.updateGraphInModel(Number(diagramId), diagramGraph);
      }
    }
    DiagramComponentHelper.processorSubject.next({
      name: "refreshDiagram",
      data: null,
    });
  }

}

export interface CellsInterfacePositions {
  leftTop: Array<any>;
  leftBottom: Array<any>;
  rightTop: Array<any>;
  rightBottom: Array<any>;
  rightCenter: Array<any>;
}

enum POSTION_INTERFACE_Y {
  TOP,
  BOTTOM,
}


enum POSTION_INTERFACE_X {
  RIGHT,
  LEFT,
}