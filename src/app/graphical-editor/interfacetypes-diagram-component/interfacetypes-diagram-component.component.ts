import {AfterViewInit, Component, ElementRef, OnInit, ViewChild, Input} from '@angular/core';
import { ModelService, Diagram } from 'src/app/model-manager';
import { DiagramComponentHelper } from '../diagram-component-helper';

@Component({
  selector: 'app-interfacetypes-diagram-component',
  templateUrl: './interfacetypes-diagram-component.component.html',
  //template: '<div #graphContainer1 id="graphContainer1" style="border: 1px solid orange"></div>',
  styleUrls: ['./interfacetypes-diagram-component.component.css']
})
export class InterfacetypesDiagramComponentComponent implements AfterViewInit, OnInit {

  @ViewChild('graphContainer1',  {static: true }) graphContainer1: ElementRef;
  private graph : mxGraph;
  @Input() diagramId : bigint;
  @Input() modelService : ModelService;

  constructor() { }

  ngOnInit() {
    
  }

  ngAfterViewInit() {
    this.graph = new mxGraph(this.graphContainer1.nativeElement);
    DiagramComponentHelper.loadDiagram(this.diagramId, this.graph);
  }

}
