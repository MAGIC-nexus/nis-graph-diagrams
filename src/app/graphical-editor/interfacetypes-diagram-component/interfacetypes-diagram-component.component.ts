import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, Input, Output, EventEmitter } from '@angular/core';
import { ModelService, Diagram, EntityTypes, RelationshipType, InterfaceType } from '../../model-manager';
import { DiagramComponentHelper, StatusCreatingRelationship, SnackErrorDto } from '../diagram-component-helper';
import { CreateInterfaceTypeDto } from './interfacetypes-diagram-component-dto';
import { Subject } from 'rxjs';

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
  @Input() modelService: ModelService;
  @Input() interfaceTypeSubject: Subject<{ name: string, data: any }>;

  @Output("createInterfaceType") createInterfaceTypeEmitter = new EventEmitter<CreateInterfaceTypeDto>();
  @Output("snackBarError") snackBarErrorEmitter = new EventEmitter<SnackErrorDto>();
  @Output("updateTree") updateTreeEmitter = new EventEmitter<any>();

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
    this.eventsProcessorSubject();
    this.graphMouseEvent();
    this.graphEvents();
    this.customLabel();
    this.overrideCellSelectable();
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

  createInterfaceType(name: string, pt: mxPoint) {
    this.graph.getModel().beginUpdate();
    let id = this.modelService.createEntity(EntityTypes.InterfaceType, name);
    let doc = mxUtils.createXmlDocument();
    let interfaceTypeDoc = doc.createElement('interfacetype');
    interfaceTypeDoc.setAttribute('name', name);
    interfaceTypeDoc.setAttribute('entityId', id);
    this.graph.insertVertex(this.graph.getDefaultParent(), null, interfaceTypeDoc, pt.x, pt.y,
      100, 80);
    this.graph.getModel().endUpdate();
    this.modelService.addEntityToDiagram(this.diagramId, id);
    this.modelService.updateEntityAppearanceInDiagram(this.diagramId, id, 100, 80, pt.x, pt.y);
    DiagramComponentHelper.updateGraphInModel(this.diagramId, this.graph);
  }

  imageToolbarRelationshipClick(event: MouseEvent, relationshipType: RelationshipType) {
    (<HTMLImageElement>event.target).style.backgroundColor = "#B0B0B0";
    this.relationshipSelect = relationshipType;
    this.imageToolbarRelationship = <HTMLImageElement>event.target;
    this.graph.setCellStyles('movable', '0', this.graph.getChildCells());
  }

  private eventsProcessorSubject() {
    this.interfaceTypeSubject.subscribe(event => {
      switch (event.name) {
        case 'refreshDiagram':
          DiagramComponentHelper.loadDiagram(this.diagramId, this.graph);
      }
    });
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
    let cellTarget = evt.getProperty('cell');
    console.log(cellTarget);
    console.log(this.modelService);
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

  private graphEvents() {
    this.graph.addListener(mxEvent.CELLS_MOVED, this.cellsMoveGraph.bind(this));
  }

  private cellsMoveGraph(graph, event: mxEventObject) {
    let cellsMoved: [mxCell] = event.properties.cells;
    for (let cell of cellsMoved) {
      if (cell.value.nodeName.toLowerCase() == 'interfacetype') {
        this.modelService.updateEntityAppearanceInDiagram(this.diagramId, Number(cell.getAttribute("entityId", "")),
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
      }
    }

    this.graph.cellLabelChanged = function (cell: mxCell, newValue, autoSize) {
      switch (cell.value.nodeName.toLowerCase()) {
        case 'interfacetype':
          for (let diagram of interfacetypeInstance.modelService.getTreeModelViewDiagrams()) {
            DiagramComponentHelper.changeNameEntityOnlyXML(Number(diagram.id), newValue,
              Number(cell.getAttribute('entityId', '')));
          }
          interfacetypeInstance.modelService.updateEntityName(Number(cell.getAttribute('entityId', '')), newValue);
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
      }
    };
  }


  private overrideCellSelectable() {
    this.graph.isCellSelectable = function (cell) {
      if (cell.value.nodeName.toLowerCase() == 'partof') {
        return false;
      }
      var state = this.view.getState(cell);
      var style = (state != null) ? state.style : this.getCellStyle(cell);

      return this.isCellsSelectable() && !this.isCellLocked(cell) && style['selectable'] != 0;
    }
  }
}
