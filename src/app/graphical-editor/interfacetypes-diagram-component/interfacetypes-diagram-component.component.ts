import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, Input, Output, EventEmitter } from '@angular/core';
import { ModelService, Diagram, EntityTypes, RelationshipType } from '../../model-manager';
import { DiagramComponentHelper, StatusCreatingRelationship, SnackErrorDto } from '../diagram-component-helper';
import { CreateInterfaceTypeDto } from './interfacetypes-diagram-component-dto';

@Component({
  selector: 'app-interfacetypes-diagram-component',
  templateUrl: './interfacetypes-diagram-component.component.html',
  //template: '<div #graphContainer1 id="graphContainer1" style="border: 1px solid orange"></div>',
  styleUrls: ['./interfacetypes-diagram-component.component.css']
})
export class InterfacetypesDiagramComponentComponent implements AfterViewInit, OnInit {

  RelationshipType = RelationshipType;

  @ViewChild('graphContainer', { static: true }) graphContainer: ElementRef;
  @ViewChild('interfaceTypeToolbar', { static: true }) interfaceTypeToolbar: ElementRef;
  @Input() diagramId: number;
  @Input() modelService: ModelService;

  @Output("createInterfaceType") createInterfaceTypeEmitter = new EventEmitter<CreateInterfaceTypeDto>();
  @Output("snackBarError") snackBarErrorEmitter = new EventEmitter<SnackErrorDto>();
  @Output("updateTree") updateTreeEmitter = new EventEmitter<any>();

  graph: mxGraph;

  relationshipSelect = DiagramComponentHelper.NOT_RELATIONSHIP;
  imageToolbarRelationship: HTMLImageElement;
  statusCreateRelationship = StatusCreatingRelationship.notCreating;
  sourceCellRelationship;

  constructor() { }

  ngOnInit() {

  }

  ngAfterViewInit() {
    this.graph = new mxGraph(this.graphContainer.nativeElement);
    DiagramComponentHelper.loadDiagram(this.diagramId, this.graph);
    this.makeDraggableToolbar();
    this.graphMouseEvent();
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
    this.graph.insertVertex(this.graph.getDefaultParent(), id.toString(), interfaceTypeDoc, pt.x, pt.y,
      100, 80);
    this.graph.getModel().endUpdate();
    this.modelService.addEntityToDiagram(this.diagramId, id);
    this.modelService.updateEntityAppearanceInDiagram(this.diagramId,id,100,80,pt.x,pt.y);
    DiagramComponentHelper.updateGraphInModel(this.diagramId, this.graph);
  }

  imageToolbarRelationshipClick(event: MouseEvent, relationshipType: RelationshipType) {
    console.log("entre");
    (<HTMLImageElement>event.target).style.backgroundColor = "#B0B0B0";
    this.relationshipSelect = relationshipType;
    this.imageToolbarRelationship = <HTMLImageElement>event.target;
    this.graph.setCellStyles('movable', '0', this.graph.getChildCells());
  }

  private graphMouseEvent() {
    this.graph.addMouseListener(
      {
        mouseDown: this.mouseDownGraph.bind(this),
        mouseMove: this.mouseMoveGraph.bind(this),
        mouseUp: this.mouseUpGraph.bind(this),
      }
    )
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

  private mouseUpGraph(sender, mouseEvent : mxMouseEvent) {
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

  private checkRelationshipCellTarget(cell) : Boolean {
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
}
