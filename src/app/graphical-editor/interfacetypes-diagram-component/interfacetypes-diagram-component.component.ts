import {AfterViewInit, Component, ElementRef, OnInit, ViewChild, Input} from '@angular/core';
import { ModelService, Diagram } from 'src/app/model-manager';

@Component({
  selector: 'app-interfacetypes-diagram-component',
  templateUrl: './interfacetypes-diagram-component.component.html',
  //template: '<div #graphContainer1 id="graphContainer1" style="border: 1px solid orange"></div>',
  styleUrls: ['./interfacetypes-diagram-component.component.css']
})
export class InterfacetypesDiagramComponentComponent implements AfterViewInit, OnInit {

  @ViewChild('graphContainer1',  {static: true }) graphContainer1: ElementRef;
  private graph1 : mxGraph;
  @Input() diagramName;
  @Input() modelService : ModelService;

  constructor() { }

  ngOnInit() {
    
  }

  ngAfterViewInit() {
    console.log(this.diagramName);
    this.loadDiagram();
  }

  private loadDiagram() {
    this.graph1 = new mxGraph(this.graphContainer1.nativeElement);
    let diagramXml = this.modelService.getDiagramGraph(this.diagramName);
    if (diagramXml == "") {
      let encoder = new mxCodec(null);
      let xml =  mxUtils.getXml(encoder.encode(this.graph1.getModel()));
      this.modelService.setDiagramGraph(this.diagramName, xml);
    } else {
      this.graph1.getModel().beginUpdate();
      try {
        var doc = mxUtils.parseXml(diagramXml);
        var codec = new mxCodec(doc);
        codec.decode(doc.documentElement, this.graph1.getModel());
      } catch (error) {
        console.log(error);
      } finally {
        this.graph1.getModel().endUpdate();
      }
    }
    
  }

}
