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
} from '../../model-manager';
import { CreateProcessorDto } from './processors-diagram-component-dto';
import { CellDto } from '../diagram-component-helper';
import { MatMenuTrigger } from '@angular/material';
import { DiagramManager } from '../diagram-manager';

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
  @Output("interfaceForm") interfaceFormEmitter = new EventEmitter<CellDto>();
  @Output("exchangeForm") exchangeFormEmitter = new EventEmitter<CellDto>();
  @Output("partOfForm") partOfFormEmitter = new EventEmitter<PartOfFormDto>();
  @Output("scaleForm") scaleFormEmitter = new EventEmitter<CellDto>();

  //ContextMenu Processor
  @ViewChild('contextMenuProcessorTrigger', { static: false }) contextMenuProcessor: MatMenuTrigger;
  contextMenuProcessorPosition = {
    x: '0px',
    y: '0px',
  }

  //ContextMenu Multiple Processor
  @ViewChild('contextMenuMultipleProcessorTrigger', { static: false }) contextMenuMultipleProcessor: MatMenuTrigger;
  contextMenuMultipleProcessorPosition = {
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

  constructor(public diagramManager : DiagramManager) { }

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
    this.overrideRubberband();
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
      proccesorDiagramInstance.diagramManager.printProcessor(proccesorDiagramInstance.diagramId,
        element.getAttribute('data-node-id'), pt.x, pt.y, 100, 80);
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
    let proccesorDiagramInstance = this;
    var funct = function (graph, evt, cell) {
      let pt: mxPoint = graph.getPointForEvent(evt);
      let cellTarget = graph.getCellAt(pt.x, pt.y);
      if (cellTarget != null && cellTarget.value.nodeName == "processor") {
        graph.stopEditing(false);
        let interfaceTypeId = element.getAttribute("data-node-id");
        let interfaceId = DiagramComponentHelper.modelService.createInterface(Number(cellTarget.getAttribute("entityId")), Number(interfaceTypeId));
        proccesorDiagramInstance.diagramManager.printInterface(interfaceId);
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
        return DiagramComponentHelper.checkRelationshipPartOfSource(this, cell, "processor");
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
        return DiagramComponentHelper.checkRelationshipPartOfTarget(this, cell, "processor");
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
        let relationshipId = DiagramComponentHelper.modelService.createRelationship(RelationshipType.PartOf,
          Number(this.sourceCellRelationship.getAttribute("entityId", "")), Number(cell.getAttribute("entityId", "")))
        this.diagramManager.printPartOfRelationship(relationshipId);
        this.diagramManager.updateTree();
        break;
      case RelationshipType.Exchange:
        let exchangeId = DiagramComponentHelper.modelService.createRelationship(RelationshipType.Exchange, Number(this.sourceCellRelationship.getAttribute("entityId", "")),
          Number(cell.getAttribute("entityId", "")));
        this.diagramManager.printExchangeRelationship(exchangeId);
        break;
      case RelationshipType.InterfaceScale:
        let interfaceScaleId = DiagramComponentHelper.modelService.createRelationship(RelationshipType.InterfaceScale, Number(this.sourceCellRelationship.getAttribute("entityId", "")),
          Number(cell.getAttribute("entityId", "")));
        this.diagramManager.printInterfaceScaleRelationship(interfaceScaleId);
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
      let selectionCells = processorInstance.graph.getSelectionCells();
      if (selectionCells.length > 1) {
        processorInstance.contextMenuMultipleProcessorPosition.x = event.clientX + 'px';
        processorInstance.contextMenuMultipleProcessorPosition.y = event.clientY + 'px';
        processorInstance.contextMenuMultipleProcessor.menuData = { 'cells': selectionCells };
        processorInstance.contextMenuMultipleProcessor.menu.focusFirstItem('mouse');
        processorInstance.contextMenuMultipleProcessor.openMenu();
        return;
      }
      if (cell) {
        if (cell.value.nodeName.toLowerCase() == "processor") {
          processorInstance.contextMenuProcessorPosition.x = event.clientX + 'px';
          processorInstance.contextMenuProcessorPosition.y = event.clientY + 'px';
          processorInstance.contextMenuProcessor.menuData = { 'cell': cell };
          processorInstance.contextMenuProcessor.menu.focusFirstItem('mouse');
          processorInstance.contextMenuProcessor.openMenu();
          return;
        } else if (cell.value.nodeName.toLowerCase() == "partof") {
          processorInstance.contextMenuPartOfPosition.x = event.clientX + 'px';
          processorInstance.contextMenuPartOfPosition.y = event.clientY + 'px';
          processorInstance.contextMenuPartOf.menuData = { 'cell': cell };
          processorInstance.contextMenuPartOf.menu.focusFirstItem('mouse');
          processorInstance.contextMenuPartOf.openMenu();
          return;
        } else if (cell.value.nodeName.toLowerCase() == "exchange") {
          processorInstance.contextMenuExchangePosition.x = event.clientX + 'px';
          processorInstance.contextMenuExchangePosition.y = event.clientY + 'px';
          processorInstance.contextMenuExchange.menuData = { 'cell': cell };
          processorInstance.contextMenuExchange.menu.focusFirstItem('mouse');
          processorInstance.contextMenuExchange.openMenu();
          return;
        } else if (cell.value.nodeName.toLowerCase() == "interfacescale") {
          processorInstance.contextMenuInterfaceScalePosition.x = event.clientX + 'px';
          processorInstance.contextMenuInterfaceScalePosition.y = event.clientY + 'px';
          processorInstance.contextMenuInterfaceScale.menuData = { 'cell': cell };
          processorInstance.contextMenuInterfaceScale.menu.focusFirstItem('mouse');
          processorInstance.contextMenuInterfaceScale.openMenu();
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

  onContextMenuProcessorForm(cell: mxCell) {
    if (cell != undefined && cell.value.nodeName == "processor") {
      this.showFormProcessor(cell.getAttribute("entityId", ""));
    }
  }

  onContextMenuProcessorRemove(cell: mxCell) {
    DiagramComponentHelper.modelService.removeEntityFromDiagram(Number(this.diagramId), Number(cell.getAttribute('entityId', '')));
    this.diagramManager.removeEntityInDiagram(this.diagramId, cell.getAttribute('entityId', ''));
  }

  onContextMenuMultipleProcessorRemove(cells: [mxCell]) {
    let entitiesId = new Array();
    for (let cell of cells) {
      DiagramComponentHelper.modelService.removeEntityFromDiagram(Number(this.diagramId), Number(cell.getAttribute('entityId', '')));
      entitiesId.push(cell.getAttribute('entityId', ''));
    }
    this.diagramManager.removeEntitiesInDiagram(this.diagramId, entitiesId);
  }

  onContextMenuPartOfForm(cell: mxCell) {
    let partOfDto: PartOfFormDto = { cellId: cell.getAttribute('idRelationship', '') };
    this.partOfFormEmitter.emit(partOfDto);
  }

  onContextMenuPartOfRemove(cell: mxCell) {
    if (DiagramComponentHelper.modelService.checkCanDeleteRelationshipPartof(Number(cell.getAttribute('idRelationship', '')))) {
      DiagramComponentHelper.modelService.deleteRelationship(Number(cell.getAttribute('idRelationship', '')));
      this.diagramManager.removeRelationship(cell.getAttribute('idRelationship', ''));
      this.diagramManager.updateTree();
    } else {
      let relationshipErrorDto = new SnackErrorDto();
      relationshipErrorDto.message = 'Cannot delete "partof" relationship';
      this.snackBarErrorEmitter.emit(relationshipErrorDto);
    }
  }

  onContextMenuInterfaceScaleForm(cell: mxCell) {
    let scaleDto: CellDto = { cellId: cell.getAttribute('idRelationship', '') };
    this.scaleFormEmitter.emit(scaleDto);
  }

  onContextMenuInterfaceScaleRemove(cell: mxCell) {
    DiagramComponentHelper.modelService.deleteRelationship(Number(cell.getAttribute('idRelationship', '')));
    this.diagramManager.removeRelationship(cell.getAttribute('idRelationship', ''));
  }

  onContextMenuExchangeForm(cell: mxCell) {
    let exchangeDto: CellDto = { cellId: cell.getAttribute('idRelationship', '') }
    this.exchangeFormEmitter.emit(exchangeDto);
  }

  onContextMenuExchangeRemove(cell: mxCell) {
    DiagramComponentHelper.modelService.deleteRelationship(Number(cell.getAttribute('idRelationship', '')));
    this.diagramManager.removeRelationship(cell.getAttribute('idRelationship', ''));
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
          processorInstance.changePostitionProcessorInDiagram(processorInstance, cell.getAttribute('entityId'),
            cell.geometry.x, cell.geometry.y);
        }
      }
    });
  }

  private changePostitionProcessorInDiagram(processorInstance: ProcessorsDiagramComponentComponent, entityId, x, y) {
    let diagramGraph = processorInstance.graph;
    for (let cell of diagramGraph.getChildCells()) {
      if (cell.getAttribute('entityId') == entityId) {
        diagramGraph.getModel().beginUpdate();
        let geometry = new mxGeometry(x, y, cell.geometry.width, cell.geometry.height);
        diagramGraph.getModel().setGeometry(cell, geometry);
        diagramGraph.getModel().endUpdate();
        DiagramComponentHelper.modelService.updateEntityAppearanceInDiagram(Number(processorInstance.diagramId), Number(cell.getAttribute("entityId", "")),
          cell.geometry.width, cell.geometry.height, cell.geometry.x, cell.geometry.y);
        DiagramComponentHelper.updateGraphInModel(Number(processorInstance.diagramId), diagramGraph);
      }
    }
  }

  private eventCellsResizeGraph() {
    let processorInstance = this;
    this.graph.addListener(mxEvent.CELLS_RESIZED, function (sender: mxGraph, event) {
      let cellsResize: [mxCell] = event.properties.cells;
      let cellsPreviousResize: [mxGeometry] = event.properties.previous;
      console.log(event.properties);
      for (let i = 0; i < cellsResize.length; i++) {
        if (cellsResize[i].value.nodeName.toLowerCase() == 'processor') {
          let prevoiousGeometryCell = {
            x: cellsPreviousResize[i].x,
            y: cellsPreviousResize[i].y,
            height: cellsPreviousResize[i].height,
            width: cellsPreviousResize[i].width,
          }
          processorInstance.changeSizeProcessorInDiagram(processorInstance, cellsResize[i], prevoiousGeometryCell);
        }
      }
    });
  }

  private changeSizeProcessorInDiagram(processorInstance: ProcessorsDiagramComponentComponent, cell, previousGeometry) {
    let diagramGraph = processorInstance.graph;
    let cellWidth = cell.geometry.width;
    let cellHeight = cell.geometry.height;
    let cellX = cell.geometry.x;
    let cellY = cell.geometry.y;
    if (cellWidth < Number(cell.getAttribute('minWidth'))) {
      cellWidth = Number(cell.getAttribute('minWidth'));
      if (cell.geometry.x > previousGeometry.x) {
        let differenceWidth = cellWidth - cell.geometry.width;
        cellX = cellX - differenceWidth;
      }
    }
    if (cellHeight < Number(cell.getAttribute('minHeight'))) {
      cellHeight = Number(cell.getAttribute('minHeight'));
      if (cell.geometry.y > previousGeometry.y) {
        let differenceHeight = cellHeight - cell.geometry.height;
        cellX = cellX - differenceHeight;
      }
    }
    console.log(cell.geometry.x);
    console.log(previousGeometry.x);
    diagramGraph.getModel().beginUpdate();
    let geometry = new mxGeometry(cellX, cellY, cellWidth, cellHeight);
    diagramGraph.getModel().setGeometry(cell, geometry);
    diagramGraph.getModel().endUpdate();
    DiagramComponentHelper.modelService.updateEntityAppearanceInDiagram(Number(processorInstance.diagramId), Number(cell.getAttribute("entityId", "")),
      cell.geometry.width, cell.geometry.height, cell.geometry.x, cell.geometry.y);
    DiagramComponentHelper.updateGraphInModel(Number(processorInstance.diagramId), diagramGraph);
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

    rb.execute = function (evt) {
      shape.remove();
      active = false;
      var rect = new mxRectangle(this.x, this.y, this.width, this.height);
      this.graph.selectRegion(rect, evt);
    };

    rb.isActive = function (sender, me) {
      return active;
    };
  }

}