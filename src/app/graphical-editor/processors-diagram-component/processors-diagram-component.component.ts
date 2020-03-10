import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, Input, Output, EventEmitter } from '@angular/core';
import { Subject } from 'rxjs';
import { DiagramComponentHelper, StatusCreatingRelationship, SnackErrorDto, ChangeNameEntityDto } from '../diagram-component-helper';
import { ModelService, EntityTypes, RelationshipType, InterfaceType, InterfaceOrientation } from '../../model-manager';
import { CreateProcessorDto, ProcessorFormDto, InterfaceFormDto, ChangeInterfaceInGraphDto } from './processors-diagram-component-dto';
import { MatMenuTrigger } from '@angular/material';

@Component({
  selector: 'app-processors-diagram-component',
  templateUrl: './processors-diagram-component.component.html',
  styleUrls: ['./processors-diagram-component.component.css']
})
export class ProcessorsDiagramComponentComponent implements AfterViewInit, OnInit {

  RelationshipType = RelationshipType;

  @ViewChild('graphContainer', { static: true }) graphContainer: ElementRef;
  @ViewChild('processorToolbar', { static: true }) processorToolbar: ElementRef;

  @Input() proccesorSubject: Subject<{ name: string, data: any }>;
  @Input() diagramId: number;
  @Input() modelService: ModelService;

  //Emitters
  @Output("createProccesor") createProcessorEmitter = new EventEmitter<CreateProcessorDto>();
  @Output("processorForm") processorFormEmitter = new EventEmitter<ProcessorFormDto>();
  @Output("snackBarError") snackBarErrorEmitter = new EventEmitter<SnackErrorDto>();
  @Output("updateTree") updateTreeEmitter = new EventEmitter<any>();
  @Output("interfaceForm") interfaceFormEmitter = new EventEmitter<InterfaceFormDto>();

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
  sourceCellRelationship : mxCell;

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
        case "changeNameCellsById":
          this.changeNameEntityById(event.data);
          break;
        case "changeInterfaceInGraph":
          this.changeInterfaceInGraphEvent(event.data);
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

  private changeNameEntityById(event : ChangeNameEntityDto) {
    DiagramComponentHelper.changeNameEntityById(this, event.name, event.cellId);
  }

  private changeInterfaceInGraphEvent(event : ChangeInterfaceInGraphDto) {
    let updateGraphXML = false;
    let cells: [mxCell] = this.graph.getChildCells();
    for (let cell of cells) {
      if (cell.value.nodeName.toLowerCase() == 'processor') {
        updateGraphXML = this.changeInterfaceInGraph(event, cell);
      }
    }
    if (updateGraphXML) DiagramComponentHelper.updateGraphInModel(this.diagramId, this.graph);
  }

  private changeInterfaceInGraph(event : ChangeInterfaceInGraphDto, cell : mxCell) : boolean {
    let updateGraphInXML = false;
    if (cell.children) {
      this.graph.getModel().beginUpdate();
      for(let childProcessor of cell.children) {
        if(childProcessor.value.nodeName.toLowerCase() == 'interface' 
        && childProcessor.getAttribute('entityId') == event.cellId) {
          childProcessor.setAttribute('name', event.name);
          if(event.orientation == InterfaceOrientation.Input) {
            this.graph.setCellStyles(mxConstants.STYLE_STROKECOLOR, '#FF0000', [childProcessor]);
            this.graph.setCellStyles(mxConstants.STYLE_FILLCOLOR, '#FF8E8E', [childProcessor]);
          }
          if(event.orientation == InterfaceOrientation.Output) {
            this.graph.setCellStyles(mxConstants.STYLE_STROKECOLOR, '#00FF0E', [childProcessor]);
            this.graph.setCellStyles(mxConstants.STYLE_FILLCOLOR, '#82FF89', [childProcessor]);
          }
        }
      }
      this.graph.getModel().endUpdate();
      this.graph.refresh();
    }
    return updateGraphInXML;
  }

  imageToolbarRelationshipClick(event: MouseEvent, relationshipType: RelationshipType) {
    (<HTMLImageElement>event.target).style.backgroundColor = "#B0B0B0";
    this.relationshipSelect = relationshipType;
    this.imageToolbarRelationship = <HTMLImageElement>event.target;
    this.graph.setCellStyles('movable', '0', this.graph.getChildCells());
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
    let cellTarget : mxCell = evt.getProperty('cell');
    if (cellTarget) {
      switch(cellTarget.value.nodeName.toLowerCase()) {
        case 'interface':
          let interfaceDto : InterfaceFormDto = { cellId : cellTarget.getAttribute('entityId', '')};
          this.interfaceFormEmitter.emit(interfaceDto);
      }
    }
  }

  private mouseDownGraph(sender: mxGraph, mouseEvent: mxMouseEvent) {
    let cell: mxCell = mouseEvent.getCell();
    if (this.relationshipSelect != DiagramComponentHelper.NOT_RELATIONSHIP &&
      this.statusCreateRelationship == StatusCreatingRelationship.notCreating) {
      if (cell != null && this.checkRelationshipCellSource(cell)) {
        let svg = sender.container.getElementsByTagName("svg")[0];
        DiagramComponentHelper.printLineCreateRelationship(svg, cell);
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
    }
    return false;
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
    }
    return false;
  }

  private createRelationship(cell) {
    switch (this.relationshipSelect) {
      case RelationshipType.PartOf:
        DiagramComponentHelper.createPartOfRelationship(this, cell);
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
    let processorFormDto = new ProcessorFormDto();
    processorFormDto.cellId = cellId;
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
        case 'partof':
          return 'partof';
        case 'interface':
          let portName = cell.getAttribute('name', 'Processor').toUpperCase();
          if (portName.length < 3) {
            return portName;
          } else {
            return portName.substring(0, 3);
          }
      }
    }

    this.graph.cellLabelChanged = function (cell: mxCell, newValue, autoSize) {
      switch (cell.value.nodeName.toLowerCase()) {
        case 'processor':
          try {
            let edit = {
              cell: cell,
              attribute: "name",
              value: newValue,
              previous: newValue,
              execute: function () {
                if (this.cell != null) {
                  var tmp = this.cell.getAttribute(this.attribute);

                  if (this.previous == null) {
                    this.cell.value.removeAttribute(this.attribute);
                  }
                  else {
                    this.cell.setAttribute(this.attribute, this.previous);
                  }

                  this.previous = tmp;
                }
              }
            };
            processorInstance.modelService.updateEntityName(Number(cell.getAttribute('entityId', '')), newValue);
            processorInstance.updateTreeEmitter.emit(null);
            this.getModel().execute(edit);
          }
          finally {
            this.getModel().endUpdate();
          }
          break;
      }
      DiagramComponentHelper.updateGraphInModel(processorInstance.diagramId, this);
    }

    this.graph.getEditingValue = function (cell: mxCell) {
      switch (cell.value.nodeName.toLowerCase()) {
        case 'processor':
          return cell.getAttribute('name', 'interfaceType');
        case 'partof':
          return 'partof';
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

}
