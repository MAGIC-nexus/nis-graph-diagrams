import {AfterViewInit, Component, ElementRef, OnInit, ViewChild, Input} from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-processors-diagram-component',
  // templateUrl: './processors-diagram-component.component.html',
  template: '<div #graphContainer2 id="graphContainer2"></div>',
  styleUrls: ['./processors-diagram-component.component.css']
})
export class ProcessorsDiagramComponentComponent implements AfterViewInit, OnInit {

  @ViewChild('graphContainer2',  {static: true }) graphContainer2: ElementRef;
  @Input() parentSubject:Subject<any>;

  constructor() { }

  ngOnInit() {
    
  }

  ngAfterViewInit() {
    const graph2 = new mxGraph(this.graphContainer2.nativeElement);

    try {
      const parent = graph2.getDefaultParent();
      graph2.getModel().beginUpdate();

      const vertex1 = graph2.insertVertex(parent, '1', 'Vertex 3', 0, 0, 200, 80);
      const vertex2 = graph2.insertVertex(parent, '2', 'Vertex 4', 0, 0, 200, 80);

      graph2.insertEdge(parent, '', '', vertex1, vertex2);
    } finally {
      graph2.getModel().endUpdate();
      new mxHierarchicalLayout(graph2).execute(graph2.getDefaultParent());
    }

    this.parentSubject.subscribe(event => {
      if (event == "Expanded") {

      }
    });
  }

  

}
