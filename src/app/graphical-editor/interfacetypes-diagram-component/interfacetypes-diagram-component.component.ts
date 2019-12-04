import {AfterViewInit, Component, ElementRef, OnInit, ViewChild} from '@angular/core';

@Component({
  selector: 'app-interfacetypes-diagram-component',
  // templateUrl: './interfacetypes-diagram-component.component.html',
  template: '<div #graphContainer1 id="graphContainer1" style="border: 1px solid orange"></div>',
  styleUrls: ['./interfacetypes-diagram-component.component.css']
})
export class InterfacetypesDiagramComponentComponent implements AfterViewInit, OnInit {

  @ViewChild('graphContainer1',  {static: true }) graphContainer1: ElementRef;

  constructor() { }

  ngOnInit() {
  }

  ngAfterViewInit() {
    const graph1 = new mxGraph(this.graphContainer1.nativeElement);

    try {
      const parent = graph1.getDefaultParent();
      graph1.getModel().beginUpdate();

      const vertex1 = graph1.insertVertex(parent, '1', 'Vertex 1', 0, 0, 200, 80);
      const vertex2 = graph1.insertVertex(parent, '2', 'Vertex 2', 0, 0, 200, 80);

      graph1.insertEdge(parent, '', '', vertex1, vertex2);
    } finally {
      graph1.getModel().endUpdate();
      new mxHierarchicalLayout(graph1).execute(graph1.getDefaultParent());
    }
  }

}
