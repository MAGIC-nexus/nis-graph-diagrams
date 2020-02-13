import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, Input, Output, EventEmitter } from '@angular/core';
import { ModelService, Diagram, EntityTypes } from 'src/app/model-manager';
import { DiagramComponentHelper } from '../diagram-component-helper';

@Component({
  selector: 'app-interfacetypes-diagram-component',
  templateUrl: './interfacetypes-diagram-component.component.html',
  //template: '<div #graphContainer1 id="graphContainer1" style="border: 1px solid orange"></div>',
  styleUrls: ['./interfacetypes-diagram-component.component.css']
})
export class InterfacetypesDiagramComponentComponent implements AfterViewInit, OnInit {

  @ViewChild('graphContainer1', { static: true }) graphContainer1: ElementRef;
  @ViewChild('interfaceTypeToolbar', { static: true }) interfaceTypeToolbar: ElementRef;
  private graph: mxGraph;
  @Input() diagramId: bigint;
  @Input() modelService: ModelService;

  @Output() emitterToParent = new EventEmitter<{ name: string, data: any }>();

  constructor() { }

  ngOnInit() {

  }

  ngAfterViewInit() {
    this.graph = new mxGraph(this.graphContainer1.nativeElement);
    DiagramComponentHelper.loadDiagram(this.diagramId, this.graph);
    this.makeDraggableToolbar();
  }

  private makeDraggableToolbar() {
    let modelService = this.modelService;
    let emitterToParent = this.emitterToParent;
    let component = this;

    var functionInterfaceType = function (graph: mxGraph, evt, cell) {

      let pt: mxPoint = graph.getPointForEvent(evt);
      emitterToParent.emit({
        name: "showFormCreateInterfaceType",
        data: {
          pt: pt,
          component: component,
        }
      });
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

}
