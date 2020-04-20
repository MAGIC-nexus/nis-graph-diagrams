import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, Input, Output, EventEmitter } from '@angular/core';
import { RelationshipType, 
  EntityRelationshipPartOf, 
  Relationship, 
  InterfaceTypeScaleChange,
} from '../../model-manager';
import { DiagramComponentHelper, 
  StatusCreatingRelationship, 
  SnackErrorDto, 
  PartOfFormDto, 
  CellDto 
} from '../diagram-component-helper';
import { CreateInterfaceTypeDto, InterfaceTypeScaleFormDto } from './interfacetypes-diagram-component-dto';
import { Subject } from 'rxjs';

const STYLE_INTERFACETYPESCALE = 'dashed=1;strokeColor=black;perimeterSpacing=4;labelBackgroundColor=white;fontStyle=1';

@Component({
  selector: 'app-interfacetypes-diagram-component',
  templateUrl: './interfacetypes-diagram-component.component.html',
  styleUrls: ['./interfacetypes-diagram-component.component.css']
})
export class InterfacetypesDiagramComponentComponent implements AfterViewInit, OnInit {

  RelationshipType = RelationshipType;

  @ViewChild('graphContainer', { static: true }) graphContainer: ElementRef;
  @ViewChild('interfaceTypeToolbar', { static: true }) interfaceTypeToolbar: ElementRef;
  @Input() diagramId: number;
  @Input() interfaceTypeSubject: Subject<{ name: string, data: any }>;

  @Output("createInterfaceType") createInterfaceTypeEmitter = new EventEmitter<CreateInterfaceTypeDto>();
  @Output("snackBarError") snackBarErrorEmitter = new EventEmitter<SnackErrorDto>();
  @Output("updateTree") updateTreeEmitter = new EventEmitter<any>();
  @Output("partOfForm") partOfFormEmitter = new EventEmitter<PartOfFormDto>();
  @Output("interfaceTypeForm") interfaceTypeFormEmitter = new EventEmitter<CellDto>();
  @Output("interfaceTypeScaleForm") interfaceTypeScaleFormEmitter = new EventEmitter<InterfaceTypeScaleFormDto>();

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
    this.eventsInterfaceTypeSubject();
    this.graphMouseEvent();
    this.graphEvents();
    this.customLabel();
    this.overrideCellSelectable();
    DiagramComponentHelper.loadDiagram(this.diagramId, this.graph);
  }

  static printInterfaceType(diagramId, graph, name: string, pt: mxPoint, entityId) {
    try {
      if  (DiagramComponentHelper.modelService.readEntityAppearanceInDiagram(Number(diagramId),
      Number(entityId))) return;
      let doc = mxUtils.createXmlDocument();
      let interfaceTypeDoc = doc.createElement('interfacetype');
      interfaceTypeDoc.setAttribute('name', name);
      interfaceTypeDoc.setAttribute('entityId', entityId);
      let newCellInterfaceType = graph.insertVertex(graph.getDefaultParent(), null, interfaceTypeDoc, pt.x, pt.y,
        100, 80);
      DiagramComponentHelper.modelService.addEntityToDiagram(diagramId, entityId);
      DiagramComponentHelper.modelService.updateEntityAppearanceInDiagram(diagramId,
        entityId, 100, 80, pt.x, pt.y);
      let childrensRelationship = DiagramComponentHelper.modelService.getRelationshipChildren(Number(entityId));
      let parentsRelationship = DiagramComponentHelper.modelService.getRelationshipParent(Number(entityId));
      InterfacetypesDiagramComponentComponent.addPartOfRelationships(graph, newCellInterfaceType, childrensRelationship,
        parentsRelationship);
    } catch (error) {
      console.log(error);
    } finally {
      let encoder = new mxCodec(null);
      let xml = mxUtils.getXml(encoder.encode(graph.getModel()));
      DiagramComponentHelper.modelService.setDiagramGraph(Number(diagramId), xml);
    }
  }

  static addPartOfRelationships(graph: mxGraph, newCell, childrensRelationship: Relationship[],
    parentsRelationship: Relationship[]) {
    for (let childrenRelationship of childrensRelationship) {
      if (childrenRelationship instanceof EntityRelationshipPartOf) {
        DiagramComponentHelper.printPartOfRelationship(graph, newCell, childrenRelationship);
      }
      if (childrenRelationship instanceof InterfaceTypeScaleChange) {
        InterfacetypesDiagramComponentComponent.printInterfaceTypeScaleRelationship(graph, newCell, childrenRelationship);
      }
    }
    for (let parentRelationship of parentsRelationship) {
      if (parentRelationship instanceof EntityRelationshipPartOf) {
        DiagramComponentHelper.printPartOfRelationship(graph, newCell, parentRelationship);
      }
      if (parentRelationship instanceof InterfaceTypeScaleChange) {
        InterfacetypesDiagramComponentComponent.printInterfaceTypeScaleRelationship(graph, newCell, parentRelationship);
      }
    }
  }

  static createInterfaceTypeScaleRelationship(sourceId, targetId) {
    let id = DiagramComponentHelper.modelService.createRelationship(RelationshipType.InterfaceTypeScale,
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
        const doc = mxUtils.createXmlDocument();
        const interfaceTypeScale = doc.createElement('interfacetypescale');
        interfaceTypeScale.setAttribute("name", "name");
        interfaceTypeScale.setAttribute("idRelationship", id);
        diagramGraph.insertEdge(diagramGraph.getDefaultParent(), null, interfaceTypeScale,
          cellSourceInDiagram, cellTargetInDiagram, STYLE_INTERFACETYPESCALE);
        diagramGraph.getModel().endUpdate();
        const encoder = new mxCodec(null);
        const xml = mxUtils.getXml(encoder.encode(diagramGraph.getModel()));
        DiagramComponentHelper.modelService.setDiagramGraph(key, xml);
      }
    });
    DiagramComponentHelper.interfaceTypeSubject.next({
      name: "refreshDiagram",
      data: null,
    });
  }

  static printInterfaceTypeScaleRelationship(graph: mxGraph, newCell: mxCell, relationship: InterfaceTypeScaleChange) {
    console.log(graph.getChildEdges());
    for (let edge of graph.getChildEdges()) {
      if (edge.getAttribute("idRelationship") == relationship.id) {
        return;
      }
    }
    if (newCell.getAttribute("entityId", "") == relationship.destinationId) {
      for (let cell of graph.getChildCells()) {
        if (cell.getAttribute("entityId") == relationship.originId) {
          const doc = mxUtils.createXmlDocument();
          const interfaceTypeScale = doc.createElement('interfacetypescale');
          interfaceTypeScale.setAttribute("name", "name");
          interfaceTypeScale.setAttribute("idRelationship", relationship.id);
          graph.insertEdge(graph.getDefaultParent(), null, interfaceTypeScale,
            cell, newCell, STYLE_INTERFACETYPESCALE);
        }
      }
    }
    if (newCell.getAttribute("entityId", "") == relationship.originId) {
      for (let cell of graph.getChildCells()) {
        if (cell.getAttribute("entityId") == relationship.destinationId) {
          const doc = mxUtils.createXmlDocument();
          const interfaceTypeScale = doc.createElement('interfacetypescale');
          interfaceTypeScale.setAttribute("name", "name");
          interfaceTypeScale.setAttribute("idRelationship", relationship.id);
          graph.insertEdge(graph.getDefaultParent(), null, interfaceTypeScale,
            newCell, cell, STYLE_INTERFACETYPESCALE);
        }
      }
    }
  }

  private makeDraggableToolbar() {
    let createInterfaceTypeEmitter = this.createInterfaceTypeEmitter;
    let component = this;

    let functionInterfaceType = function (graph: mxGraph, evt, cell) {

      let pt: mxPoint = graph.getPointForEvent(evt);
      let createInterfaceTypeDto = new CreateInterfaceTypeDto();
      createInterfaceTypeDto.pt = pt;
      createInterfaceTypeDto.component = component;
      createInterfaceTypeEmitter.emit(createInterfaceTypeDto);
    }
    let dragElement = document.createElement("img");
    dragElement.setAttribute("src", "assets/toolbar/rectangle.gif");
    dragElement.style.height = "20px";
    dragElement.style.width = "20px";
    mxUtils.makeDraggable(this.interfaceTypeToolbar.nativeElement, this.graph, functionInterfaceType, dragElement);
  }

  imageToolbarRelationshipClick(event: MouseEvent, relationshipType: RelationshipType) {
    if (this.imageToolbarRelationship) this.imageToolbarRelationship.style.backgroundColor = "transparent";
    (<HTMLImageElement>event.target).style.backgroundColor = "#B0B0B0";
    if(this.relationshipSelect == relationshipType) DiagramComponentHelper.cancelCreateRelationship(this);
    else {
      this.relationshipSelect = relationshipType;
      this.imageToolbarRelationship = <HTMLImageElement>event.target;
      this.statusCreateRelationship = StatusCreatingRelationship.creating;
      DiagramComponentHelper.changeStateMovableCells(this, this.graph.getChildCells(), "0");
    }
  }

  private eventsInterfaceTypeSubject() {
    this.interfaceTypeSubject.subscribe(event => {
      switch (event.name) {
        case 'refreshDiagram':
          DiagramComponentHelper.loadDiagram(this.diagramId, this.graph);
          if (this.statusCreateRelationship == StatusCreatingRelationship.creating)
            DiagramComponentHelper.changeStateMovableCells(this, this.graph.getChildCells(), "0");
          break;
        case 'interfaceTypeDraggableTree':
          this.interfaceTypeDraggableTree(event.data);
          break;
      }
    });
  }

  private interfaceTypeDraggableTree(element: HTMLElement) {
    let interfaceDiagramInstance = this;
    const funct = (graph, evt, cell) => {
      let pt: mxPoint = graph.getPointForEvent(evt);
      interfaceDiagramInstance.graph.getModel().beginUpdate();
      InterfacetypesDiagramComponentComponent.printInterfaceType(interfaceDiagramInstance.diagramId,
        interfaceDiagramInstance.graph, element.innerText, pt, element.getAttribute('data-node-id'));
      interfaceDiagramInstance.graph.getModel().endUpdate();
      DiagramComponentHelper.loadDiagram(interfaceDiagramInstance.diagramId, interfaceDiagramInstance.graph);
    }
    let dragElement = document.createElement("img");
    dragElement.setAttribute("src", "assets/toolbar/rectangle.gif");
    dragElement.style.height = "20px";
    dragElement.style.width = "20px";
    mxUtils.makeDraggable(element, this.graph, funct);
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
    console.log(cellTarget);
    console.log(DiagramComponentHelper.modelService);
    if (cellTarget) {
      switch (cellTarget.value.nodeName.toLowerCase()) {
        case 'partof':
          let partOfDto: PartOfFormDto = { cellId: cellTarget.getAttribute('idRelationship', '') };
          this.partOfFormEmitter.emit(partOfDto);
          break;
        case 'interfacetypescale':
          let interfacetypescaleDto: InterfaceTypeScaleFormDto = { cellId: cellTarget.getAttribute('idRelationship', '') };
          this.interfaceTypeScaleFormEmitter.emit(interfacetypescaleDto);
          break;
        case 'interfacetype':
          let interfaceTypeDto: CellDto = { cellId: cellTarget.getAttribute('entityId', '') }
          this.interfaceTypeFormEmitter.emit(interfaceTypeDto);
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
      case RelationshipType.InterfaceTypeScale:
        return this.checkRelationshipInterfaceTypeScaleSource(cell);
    }
    return false;
  }

  private checkRelationshipInterfaceTypeScaleSource(cell): boolean {
    if (cell.value.nodeName.toLowerCase() != 'interfacetype') {
      if (!cell.isEdge()) {
        let relationshipErrorDto = new SnackErrorDto();
        relationshipErrorDto.message = 'A relationship of type "interfaceTypeScale" should be the union between two entity of type "interfaceType"';
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
      lineRelationship.remove();
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
      case RelationshipType.InterfaceTypeScale:
        return this.checkRelationshipInterfaceTypeScaleTarget(cell);
    }
    return false;
  }

  private checkRelationshipInterfaceTypeScaleTarget(cell: mxCell): boolean {
    if (cell.value.nodeName.toLowerCase() != 'interfacetype') {
      let relationshipErrorDto = new SnackErrorDto();
      relationshipErrorDto.message = 'A relationship of type "interfaceTypeScale" should be the union between two entity of type "interfaceType"';
      this.snackBarErrorEmitter.emit(relationshipErrorDto);
      return false;
    }
    if(Number(cell.getAttribute("entityId", "")) == Number(this.sourceCellRelationship.getAttribute("entityId", ""))) {
      return false;
    }
    let messageError = DiagramComponentHelper.modelService.checkCanCreateRelationship(RelationshipType.InterfaceTypeScale,
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
      case RelationshipType.InterfaceTypeScale:
        InterfacetypesDiagramComponentComponent.createInterfaceTypeScaleRelationship(
          this.sourceCellRelationship.getAttribute("entityId", ""),
          cell.getAttribute("entityId", ""));
        break;
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

  private graphEvents() {
    this.graph.addListener(mxEvent.CELLS_MOVED, this.cellsMoveGraph.bind(this));
  }

  private cellsMoveGraph(graph, event: mxEventObject) {
    let cellsMoved: [mxCell] = event.properties.cells;
    for (let cell of cellsMoved) {
      if (cell.value.nodeName.toLowerCase() == 'interfacetype') {
        DiagramComponentHelper.modelService.updateEntityAppearanceInDiagram(this.diagramId, Number(cell.getAttribute("entityId", "")),
          cell.geometry.width, cell.geometry.height, cell.geometry.x, cell.geometry.y);
      }
      DiagramComponentHelper.updateGraphInModel(this.diagramId, this.graph);
    }
  }

  private customLabel() {
    let interfacetypeInstance = this;

    this.graph.convertValueToString = (cell: mxCell) => {
      switch (cell.value.nodeName.toLowerCase()) {
        case 'interfacetype':
          return cell.getAttribute('name', 'interfaceType');
        case 'partof':
          return 'partof';
        case 'interfacetypescale':
          return 'interfacetypescale';
      }
    }

    this.graph.cellLabelChanged = function (cell: mxCell, newValue, autoSize) {
      switch (cell.value.nodeName.toLowerCase()) {
        case 'interfacetype':
          for (let diagram of DiagramComponentHelper.modelService.getTreeModelViewDiagrams()) {
            DiagramComponentHelper.changeNameEntityOnlyXML(Number(diagram.id), newValue,
              Number(cell.getAttribute('entityId', '')));
          }
          DiagramComponentHelper.modelService.updateEntityName(Number(cell.getAttribute('entityId', '')), newValue);
          interfacetypeInstance.interfaceTypeSubject.next({
            name: "refreshDiagram",
            data: null,
          });
          DiagramComponentHelper.updateGraphInModel(interfacetypeInstance.diagramId, this);
          break;
      }

    }

    this.graph.getEditingValue = function (cell: mxCell) {
      switch (cell.value.nodeName.toLowerCase()) {
        case 'interfacetype':
          return cell.getAttribute('name', 'interfaceType');
        case 'partof':
          return 'partof';
        case 'interfacetypescale':
          return 'interfacetypescale';
      }
    };
  }


  private overrideCellSelectable() {
    this.graph.isCellSelectable = function (cell) {
      if (cell.isEdge()) {
        return false;
      }
      var state = this.view.getState(cell);
      var style = (state != null) ? state.style : this.getCellStyle(cell);

      return this.isCellsSelectable() && !this.isCellLocked(cell) && style['selectable'] != 0;
    }
  }
}
