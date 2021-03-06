import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, Input, Output, EventEmitter, ɵConsole } from '@angular/core';
import {
  RelationshipType,
} from '../../model-manager';
import {
  DiagramComponentHelper,
  StatusCreatingRelationship,
  SnackErrorDto,
  PartOfFormDto,
  CellDto,
  GeometryCell,
} from '../diagram-component-helper';
import { CreateInterfaceTypeDto, InterfaceTypeScaleFormDto } from './interfacetypes-diagram-component-dto';
import { Subject } from 'rxjs';
import { MatMenuTrigger } from '@angular/material';
import { DiagramManager } from '../diagram-manager';

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
  @Output("partOfForm") partOfFormEmitter = new EventEmitter<PartOfFormDto>();
  @Output("interfaceTypeForm") interfaceTypeFormEmitter = new EventEmitter<CellDto>();
  @Output("interfaceTypeScaleForm") interfaceTypeScaleFormEmitter = new EventEmitter<InterfaceTypeScaleFormDto>();

  graph: mxGraph;

  relationshipSelect = DiagramComponentHelper.NOT_RELATIONSHIP;
  imageToolbarRelationship: HTMLImageElement;
  statusCreateRelationship = StatusCreatingRelationship.notCreating;
  sourceCellRelationship: mxCell;

  //ContextMenu PartOf
  @ViewChild('contextMenuPartOfTrigger', { static: false }) contextMenuPartOf: MatMenuTrigger;
  contextMenuPartOfPosition = {
    x: '0px',
    y: '0px',
  }

  //ContextMenu InterfaceTypeScale
  @ViewChild('contextMenuInterfaceTypeScaleTrigger', { static: false }) contextMenuInterfaceTypeScale: MatMenuTrigger;
  contextMenuInterfaceTypeScalePosition = {
    x: '0px',
    y: '0px',
  }

  //ContextMenu InterfaceTypeScale
  @ViewChild('contextMenuInterfaceTypeTrigger', { static: false }) contextMenuInterfaceType: MatMenuTrigger;
  contextMenuInterfaceTypePosition = {
    x: '0px',
    y: '0px',
  }

  //ContextMenu Multiple InterfaceTypeScale
  @ViewChild('contextMenuMultipleInterfaceTypeTrigger', { static: false }) contextMenuMultipleInterfaceType: MatMenuTrigger;
  contextMenuMultipleInterfaceTypePosition = {
    x: '0px',
    y: '0px',
  }


  constructor(public diagramManager: DiagramManager) { }

  ngOnInit() {

  }

  ngAfterViewInit() {
    this.graph = new mxGraph(this.graphContainer.nativeElement);
    this.makeDraggableToolbar();
    this.eventsInterfaceTypeSubject();
    this.graphMouseEvent();
    this.customLabel();
    this.overrideCellSelectable();
    this.contextMenu();
    this.eventCellsMoveGraph()
    this.eventCellsResizeGraph();
    this.overrideRubberband();
    DiagramComponentHelper.loadDiagram(this.diagramId, this.graph);
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
    if (this.relationshipSelect == relationshipType) DiagramComponentHelper.cancelCreateRelationship(this);
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
      interfaceDiagramInstance.diagramManager.printInterfaceType(interfaceDiagramInstance.diagramId, element.getAttribute('data-node-id'), pt.x, pt.y, 100, 80);
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
        return DiagramComponentHelper.checkRelationshipPartOfSource(this, cell, "interfaceTypes");
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
        return DiagramComponentHelper.checkRelationshipPartOfTarget(this, cell, "interfaceTypes");
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
    if (Number(cell.getAttribute("entityId", "")) == Number(this.sourceCellRelationship.getAttribute("entityId", ""))) {
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
        let partOfId = DiagramComponentHelper.modelService.createRelationship(RelationshipType.PartOf,
          Number(this.sourceCellRelationship.getAttribute("entityId", "")), Number(cell.getAttribute("entityId", "")))
        this.diagramManager.printPartOfRelationship(partOfId);
        this.diagramManager.updateTree();
        break;
      case RelationshipType.InterfaceTypeScale:
        let interfaceTypeScaleId = DiagramComponentHelper.modelService.createRelationship(RelationshipType.InterfaceTypeScale,
          Number(this.sourceCellRelationship.getAttribute("entityId", "")), Number(cell.getAttribute("entityId", "")));
        this.diagramManager.printInterfaceTypeScaleRelationship(interfaceTypeScaleId);
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
            DiagramComponentHelper.changeNameEntityOnlyXML(Number(diagram.modelId), newValue,
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

  private contextMenu() {
    mxEvent.disableContextMenu(this.graphContainer.nativeElement);

    let interfaceTypeInstance = this;

    function createPopupMenu(cell: mxCell, event: PointerEvent) {
      let selectionCells = interfaceTypeInstance.graph.getSelectionCells();
      if (selectionCells.length > 1) {
        interfaceTypeInstance.contextMenuMultipleInterfaceTypePosition.x = event.clientX + 'px';
        interfaceTypeInstance.contextMenuMultipleInterfaceTypePosition.y = event.clientY + 'px';
        interfaceTypeInstance.contextMenuMultipleInterfaceType.menuData = { 'cells': selectionCells };
        interfaceTypeInstance.contextMenuMultipleInterfaceType.menu.focusFirstItem('mouse');
        interfaceTypeInstance.contextMenuMultipleInterfaceType.openMenu();
        return;
      }
      if (cell) {
        if (cell.value.nodeName.toLowerCase() == "interfacetype") {
          interfaceTypeInstance.contextMenuInterfaceTypePosition.x = event.clientX + 'px';
          interfaceTypeInstance.contextMenuInterfaceTypePosition.y = event.clientY + 'px';
          interfaceTypeInstance.contextMenuInterfaceType.menuData = { 'cell': cell };
          interfaceTypeInstance.contextMenuInterfaceType.menu.focusFirstItem('mouse');
          interfaceTypeInstance.contextMenuInterfaceType.openMenu();
          return;
        }
        else if (cell.value.nodeName.toLowerCase() == "partof") {
          interfaceTypeInstance.contextMenuPartOfPosition.x = event.clientX + 'px';
          interfaceTypeInstance.contextMenuPartOfPosition.y = event.clientY + 'px';
          interfaceTypeInstance.contextMenuPartOf.menuData = { 'cell': cell };
          interfaceTypeInstance.contextMenuPartOf.menu.focusFirstItem('mouse');
          interfaceTypeInstance.contextMenuPartOf.openMenu();
          return;
        } else if (cell.value.nodeName.toLowerCase() == "interfacetypescale") {
          interfaceTypeInstance.contextMenuInterfaceTypeScalePosition.x = event.clientX + 'px';
          interfaceTypeInstance.contextMenuInterfaceTypeScalePosition.y = event.clientY + 'px';
          interfaceTypeInstance.contextMenuInterfaceTypeScale.menuData = { 'cell': cell };
          interfaceTypeInstance.contextMenuInterfaceTypeScale.menu.focusFirstItem('mouse');
          interfaceTypeInstance.contextMenuInterfaceTypeScale.openMenu();
          return;
        }
      }
    }

    this.graph.popupMenuHandler.factoryMethod = function (menu, cell, evt: PointerEvent) {
      (<HTMLDivElement>document.getElementsByClassName("cdk-overlay-container")[0]).oncontextmenu = (evt) => {
        evt.preventDefault();
        return false;
      };
      return createPopupMenu(cell, evt);
    };
  }

  onContextMenuInterfaceTypeForm(cell: mxCell) {
    if (cell != undefined && cell.value.nodeName == "interfacetype") {
      let interfaceTypeDto: CellDto = { cellId: cell.getAttribute('entityId', '') }
      this.interfaceTypeFormEmitter.emit(interfaceTypeDto);
    }
  }

  onContextMenuInterfaceTypeRemove(cell: mxCell) {
    DiagramComponentHelper.modelService.removeEntityFromDiagram(Number(this.diagramId), Number(cell.getAttribute('entityId', '')));
    this.diagramManager.removeEntityInDiagram(this.diagramId, cell.getAttribute('entityId', ''));
  }

  onContextMenuMultipleInterfaceTypeRemove(cells: [mxCell]) {
    let entitiesId = new Array();
    for (let cell of cells) {
      DiagramComponentHelper.modelService.removeEntityFromDiagram(Number(this.diagramId), Number(cell.getAttribute('entityId', '')));
      entitiesId.push(cell.getAttribute('entityId', ''));
    }
    this.diagramManager.removeEntitiesInDiagram(this.diagramId, entitiesId);
  }

  onContextMenuPartOfForm(cell) {
    let partOfDto: PartOfFormDto = { cellId: cell.getAttribute('idRelationship', '') };
    this.partOfFormEmitter.emit(partOfDto);
  }

  onContextMenuPartOfRemove(cell) {
    DiagramComponentHelper.modelService.deleteRelationship(Number(cell.getAttribute('idRelationship', '')));
    this.diagramManager.removeRelationship(cell.getAttribute('idRelationship', ''));
    this.diagramManager.updateTree();
  }

  onContextMenuInterfaceScaleForm(cell) {
    let interfacetypescaleDto: InterfaceTypeScaleFormDto = { cellId: cell.getAttribute('idRelationship', '') };
    this.interfaceTypeScaleFormEmitter.emit(interfacetypescaleDto);
  }

  onContextMenuInterfaceScalRemove(cell) {
    DiagramComponentHelper.modelService.deleteRelationship(Number(cell.getAttribute('idRelationship', '')));
    this.diagramManager.removeRelationship(cell.getAttribute('idRelationship', ''));
  }

  private eventCellsMoveGraph() {
    let interfaceTypeInstance = this;
    this.graph.addListener(mxEvent.CELLS_MOVED, function (sender, event) {
      let cellsMoved: [mxCell] = event.properties.cells;
      for (let cell of cellsMoved) {
        if (cell.value.nodeName.toLowerCase() == 'interfacetype') {
          interfaceTypeInstance.changePostitionInterfaceTypeInDiagram(interfaceTypeInstance, cell.getAttribute('entityId'),
            cell.geometry.x, cell.geometry.y);
        }
      }
    });
  }

  changePostitionInterfaceTypeInDiagram(interfaceInstance: InterfacetypesDiagramComponentComponent, entityId, x, y) {
    let diagramGraph = interfaceInstance.graph;
    for (let cell of diagramGraph.getChildCells()) {
      if (cell.getAttribute('entityId') == entityId) {
        diagramGraph.getModel().beginUpdate();
        let geometry = new mxGeometry(x, y, cell.geometry.width, cell.geometry.height);
        diagramGraph.getModel().setGeometry(cell, geometry);
        diagramGraph.getModel().endUpdate();
        DiagramComponentHelper.modelService.updateEntityAppearanceInDiagram(Number(interfaceInstance.diagramId), Number(cell.getAttribute("entityId", "")),
          cell.geometry.width, cell.geometry.height, cell.geometry.x, cell.geometry.y);
        DiagramComponentHelper.updateGraphInModel(Number(interfaceInstance.diagramId), diagramGraph);
      }
    }
  }


  private eventCellsResizeGraph() {
    let interfaceTypeInstance = this;
    this.graph.addListener(mxEvent.CELLS_RESIZED, function (sender: mxGraph, event) {
      let cellsResize: [mxCell] = event.properties.cells;
      for (let cell of cellsResize) {
        if (cell.value.nodeName.toLowerCase() == 'interfacetype') {
          interfaceTypeInstance.changeSizeInterfaceTypeInDiagram(interfaceTypeInstance, cell);
        }
      }
    });
  }

  private changeSizeInterfaceTypeInDiagram(interfaceInstance: InterfacetypesDiagramComponentComponent, cell) {
    let diagramGraph = interfaceInstance.graph;
    DiagramComponentHelper.modelService.updateEntityAppearanceInDiagram(Number(interfaceInstance.diagramId), Number(cell.getAttribute("entityId", "")),
      cell.geometry.width, cell.geometry.height, cell.geometry.x, cell.geometry.y);
    DiagramComponentHelper.updateGraphInModel(Number(interfaceInstance.diagramId), diagramGraph);
  }

  private overrideRubberband() {

    let rb = new mxRubberband(this.graph);
    let active = false;
    let shape: SVGRectElement;
    let svg = this.graphContainer.nativeElement.getElementsByTagName("svg")[0];

    rb.createShape = function () {
      if (active == false) {
        shape = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        shape.style.fill = '#4550FF33';
        shape.style.stroke = 'blue';
        shape.style.strokeWidth = '2';
        svg.append(shape);
        active = true;
        this.sharedDiv = document.createElement('div');
        this.sharedDiv.className = 'mxRubberband';
        this.sharedDiv.style.display = 'none';
      }

      this.graph.container.appendChild(this.sharedDiv);
      var result = this.sharedDiv;

      // if (mxClient.IS_SVG && (!mxClient.IS_IE || document.documentMode >= 10) && this.fadeOut) {
      //   this.sharedDiv = null;
      // }

      return result;
    }

    rb.repaint = function () {
      if (active == true) {
        var x = this.currentX - this.graph.panDx;
        var y = this.currentY - this.graph.panDy;

        this.x = Math.min(this.first.x, x);
        this.y = Math.min(this.first.y, y);
        this.width = Math.max(this.first.x, x) - this.x;
        this.height = Math.max(this.first.y, y) - this.y;

        shape.setAttribute("x", this.x.toString());
        shape.setAttribute("y", this.y.toString());
        shape.setAttribute("width", this.width.toString());
        shape.setAttribute("height", this.height.toString());
      }
    }

    rb.execute = function(evt)
    {
      shape.remove();
      active = false;
      var rect = new mxRectangle(this.x, this.y, this.width, this.height);
      this.graph.selectRegion(rect, evt);
    };
    
    rb.isActive = function(sender, me)
    {
      return active;
    };
  }


}
