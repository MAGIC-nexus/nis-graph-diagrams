import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, Input, Output, EventEmitter } from '@angular/core';
import { Subject } from 'rxjs';
import { DiagramComponentHelper, StatusCreatingRelationship, SnackErrorDto, PartOfFormDto, } from '../diagram-component-helper';
import { ModelService, EntityTypes, RelationshipType, InterfaceOrientation } from '../../model-manager';
import { CreateProcessorDto, ChangeInterfaceInGraphDto } from './processors-diagram-component-dto';
import { CellDto } from '../diagram-component-helper';
import { MatMenuTrigger } from '@angular/material';

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
  @ViewChild(MatMenuTrigger, { static: false }) contextMenuProcessor: MatMenuTrigger;
  contextMenuProcessorPosition = {
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

  createProcessor(name: string, pt: mxPoint) {
    this.graph.getModel().beginUpdate();
    let id = this.modelService.createEntity(EntityTypes.Processor, name);
    let doc = mxUtils.createXmlDocument();
    let processorDoc = doc.createElement('processor');
    processorDoc.setAttribute('name', name);
    processorDoc.setAttribute('entityId', id);
    this.graph.insertVertex(this.graph.getDefaultParent(), null, processorDoc, pt.x, pt.y,
      100, 80);
    this.graph.getModel().endUpdate();
    this.modelService.addEntityToDiagram(this.diagramId, id);
    this.modelService.updateEntityAppearanceInDiagram(this.diagramId, id, 100, 80, pt.x, pt.y);
    DiagramComponentHelper.updateGraphInModel(this.diagramId, this.graph);
  }

  private eventsProcessorSubject() {

    this.proccesorSubject.subscribe(event => {
      switch (event.name) {
        case "portDraggable":
          this.portDraggable(event.data);
          break;
        case 'refreshDiagram':
          DiagramComponentHelper.loadDiagram(this.diagramId, this.graph);
          break;
      }
    });
  }

  private portDraggable(element: HTMLElement) {
    let processorsDiagramInstance = this;
    var funct = function (graph, evt, cell) {
      let pt: mxPoint = graph.getPointForEvent(evt);
      let cellTarget = graph.getCellAt(pt.x, pt.y);
      if (cellTarget != null && cellTarget.value.nodeName == "processor") {
        graph.stopEditing(false);
        let interfaceTypeId = element.getAttribute("data-node-id");
        let id = processorsDiagramInstance.modelService.createInterface(Number(cellTarget.getAttribute("entityId")),
          Number(interfaceTypeId));
        if (id >= 0) {
          graph.getModel().beginUpdate();
          let nameInterfaceType = processorsDiagramInstance.modelService.readEntity(Number(interfaceTypeId)).name;
          let doc = mxUtils.createXmlDocument();
          let port = doc.createElement('interface');
          port.setAttribute('name', nameInterfaceType);
          port.setAttribute('entityId', id);
          let portVertex = graph.insertVertex(cellTarget, null, port, 1, 0.5, 30, 30,
            'fontSize=9;shape=ellipse;resizable=0;fillColor=#FF8E8E;strokeColor=#FF0000');
          portVertex.geometry.offset = new mxPoint(-15, -15);
          portVertex.geometry.relative = true;
          graph.getModel().endUpdate();
          DiagramComponentHelper.updateGraphInModel(processorsDiagramInstance.diagramId,
            processorsDiagramInstance.graph);
        }
      }

    }
    mxUtils.makeDraggable(element, this.graph, funct);
  }

  static changeInterfaceInGraphEvent(dto: ChangeInterfaceInGraphDto) {
    let diagramXML = DiagramComponentHelper.modelService.getDiagramGraph(dto.diagramId);
    console.log('entre');
    if (diagramXML != "") {
      let updateGraphXML = false;
      let model = <any>new mxGraphModel();
      let xmlDocument = mxUtils.parseXml(diagramXML);
      let decodec = new mxCodec(xmlDocument);
      decodec.decode(xmlDocument.documentElement, model);
      let cells = model.cells;
      for (let key in cells) {
        if (cells[key].value != undefined && cells[key].value.nodeName.toLowerCase() == 'processor') {
          if(ProcessorsDiagramComponentComponent.changeInterfaceInGraph(dto, cells[key], model)) updateGraphXML = true;
        }
      }
      if (updateGraphXML) {
        let encoder = new mxCodec(null);
        let xml = mxUtils.getXml(encoder.encode(model));
        DiagramComponentHelper.modelService.setDiagramGraph(Number(dto.diagramId), xml);
      }
    }
  }

  static changeInterfaceInGraph(dto: ChangeInterfaceInGraphDto, cell, model): boolean {
    let updateGraphInXML = false;
    if (cell.children) {
      for (let childProcessor of cell.children) {
        if (childProcessor.value.nodeName.toLowerCase() == 'interface'
          && childProcessor.getAttribute('entityId') == dto.cellId) {
          childProcessor.setAttribute('name', dto.name);
          updateGraphInXML = true;
          model.beginUpdate();
          let graph = new mxGraph();
          if (dto.orientation == InterfaceOrientation.Input) {
            graph.setCellStyles(mxConstants.STYLE_STROKECOLOR, '#FF0000', [childProcessor]);
            graph.setCellStyles(mxConstants.STYLE_FILLCOLOR, '#FF8E8E', [childProcessor]);
          }
          if (dto.orientation == InterfaceOrientation.Output) {
            graph.setCellStyles(mxConstants.STYLE_STROKECOLOR, '#00FF0E', [childProcessor]);
            graph.setCellStyles(mxConstants.STYLE_FILLCOLOR, '#82FF89', [childProcessor]);
          }
          model.endUpdate();
        }
      }
    }
    return updateGraphInXML;
  }

  imageToolbarRelationshipClick(event: MouseEvent, relationshipType: RelationshipType) {
    this.relationshipSelect = relationshipType;
    if (this.imageToolbarRelationship != null) {
      this.imageToolbarRelationship.style.backgroundColor = "transparent";
    }
    (<HTMLImageElement>event.target).style.backgroundColor = "#B0B0B0";
    this.imageToolbarRelationship = <HTMLImageElement>event.target;
    let childCells = this.graph.getChildCells();
    DiagramComponentHelper.changeStateMovableCells(this, childCells, "0");
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
          let exchangeDto : CellDto = { cellId: cellTarget.getAttribute('idRelationship', '') }
          this.exchangeFormEmitter.emit(exchangeDto);
          break;
        case 'partof':
          let partOfDto : PartOfFormDto = { cellId: cellTarget.getAttribute('idRelationship', '')};
          this.partOfFormEmitter.emit(partOfDto);
          break;
        case 'interfacescale': 
          let scaleDto : CellDto = { cellId: cellTarget.getAttribute('idRelationship', '')};
          this.scaleFormEmitter.emit(scaleDto);
          break;
      }
    }
  }

  private mouseDownGraph(sender: mxGraph, mouseEvent: mxMouseEvent) {
    let cell: mxCell = mouseEvent.getCell();
    if (this.relationshipSelect != DiagramComponentHelper.NOT_RELATIONSHIP &&
      this.statusCreateRelationship == StatusCreatingRelationship.notCreating) {
      if (cell != null && this.checkRelationshipCellSource(cell)) {
        let svg = sender.container.getElementsByTagName("svg")[0];
        DiagramComponentHelper.printLineCreateRelationship(svg, cell, mouseEvent);
        this.statusCreateRelationship = StatusCreatingRelationship.creating;
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

  private checkRelationshipInterfaceScaleSource(cell) : boolean {
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
      this.statusCreateRelationship = StatusCreatingRelationship.notCreating;
      let svg: SVGElement = sender.container.getElementsByTagName("svg")[0];
      let lineRelationship = <SVGLineElement>svg.getElementsByClassName("line-relationship")[0];
      lineRelationship.remove();
      if (cell != null && this.checkRelationshipCellTarget(cell)) {
        this.createRelationship(cell);
      } else {
        DiagramComponentHelper.cancelCreateRelationship(this);
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
        DiagramComponentHelper.createPartOfRelationship(this, cell);
        break;
      case RelationshipType.Exchange:
        this.createExchangeRelationship(cell);
        break;
      case RelationshipType.InterfaceScale:
        this.createInterfaceScaleRelationship(cell);
    }
  }

  private createExchangeRelationship(cell: mxCell) {
    this.graph.getModel().beginUpdate();
    let doc = mxUtils.createXmlDocument();
    let id = this.modelService.createRelationship(RelationshipType.Exchange,
      Number(this.sourceCellRelationship.getAttribute("entityId", "")), Number(cell.getAttribute("entityId", "")));
    let exchangeOfDoc = doc.createElement('exchange');
    exchangeOfDoc.setAttribute("name", "name");
    exchangeOfDoc.setAttribute("idRelationship", id);
    this.graph.insertEdge(this.graph.getDefaultParent(), null, exchangeOfDoc,
      this.sourceCellRelationship, cell, 'strokeColor=red;perimeterSpacing=4;labelBackgroundColor=white;fontStyle=1');
    this.graph.getModel().endUpdate();
    let childCells = this.graph.getChildCells();
    DiagramComponentHelper.changeStateMovableCells(this, childCells, "1");
    DiagramComponentHelper.updateGraphInModel(this.diagramId, this.graph);
    DiagramComponentHelper.changeStateMovableCells(this, childCells, "0");
  }

  private createInterfaceScaleRelationship(cell) {
    this.graph.getModel().beginUpdate();
    let doc = mxUtils.createXmlDocument();
    let id = this.modelService.createRelationship(RelationshipType.InterfaceScale,
      Number(this.sourceCellRelationship.getAttribute("entityId", "")), Number(cell.getAttribute("entityId", "")));
    let exchangeOfDoc = doc.createElement('interfacescale');
    exchangeOfDoc.setAttribute("name", "name");
    exchangeOfDoc.setAttribute("idRelationship", id);
    this.graph.insertEdge(this.graph.getDefaultParent(), null, exchangeOfDoc,
      this.sourceCellRelationship, cell, 'strokeColor=green;perimeterSpacing=4;labelBackgroundColor=white;fontStyle=1');
    this.graph.getModel().endUpdate();
    let childCells = this.graph.getChildCells();
    DiagramComponentHelper.changeStateMovableCells(this, childCells, "1");
    DiagramComponentHelper.updateGraphInModel(this.diagramId, this.graph);
    DiagramComponentHelper.changeStateMovableCells(this, childCells, "0");
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
    let processorFormDto : CellDto = {
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
            DiagramComponentHelper.changeNameEntityOnlyXML(Number(diagram.id), newValue,
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

  private overrideCellSelectable() {
    this.graph.isCellSelectable = function (cell : mxCell) {
      if (cell.isEdge()) {
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
          processorInstance.modelService.updateEntityAppearanceInDiagram(processorInstance.diagramId, Number(cell.getAttribute("entityId", "")),
            cell.geometry.width, cell.geometry.height, cell.geometry.x, cell.geometry.y);
        }
      }
      DiagramComponentHelper.updateGraphInModel(processorInstance.diagramId, processorInstance.graph);
    });
  }

}
