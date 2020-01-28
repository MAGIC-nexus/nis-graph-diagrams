import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, Input } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-processors-diagram-component',
  // templateUrl: './processors-diagram-component.component.html',
  template: '<div #graphContainer2 id="graphContainer2"></div>',
  styleUrls: ['./processors-diagram-component.component.css']
})
export class ProcessorsDiagramComponentComponent implements AfterViewInit, OnInit {

  @ViewChild('graphContainer2', { static: true }) graphContainer2: ElementRef;
  @Input() parentSubject: Subject<any>;

  private graph2;

  constructor() { }

  ngOnInit() {

  }

  ngAfterViewInit() {
    this.graph2 = new mxGraph(this.graphContainer2.nativeElement);

    try {
      const parent = this.graph2.getDefaultParent();
      this.graph2.getModel().beginUpdate();

      const vertex1 = this.graph2.insertVertex(parent, '1', 'Vertex 3', 0, 0, 200, 80);
      const vertex2 = this.graph2.insertVertex(parent, '2', 'Vertex 4', 0, 0, 200, 80);

      this.graph2.insertEdge(parent, '', '', vertex1, vertex2);
    } finally {
      this.graph2.getModel().endUpdate();
      new mxHierarchicalLayout(this.graph2).execute(this.graph2.getDefaultParent());
    }

    this.overrideMethodsGraphPorts();
    this.eventsTree();


  }

  private overrideMethodsGraphPorts() {

    let graph = this.graph2;

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

  private eventsTree() {

    this.parentSubject.subscribe((event: { name: string, data: any }) => {

      switch (event.name) {
        case "mouseOverTree":
          if (event.data.getAttribute("data-node-parent") == "InterfaceTypes") {
            console.log(event.data);
            let clone = event.data.cloneNode(true);
            event.data.parentNode.replaceChild(clone, event.data);

            var funct = function (graph, evt, cell) {

              graph.stopEditing(false);
              let pt: mxPoint = graph.getPointForEvent(evt);
              let cellTarget = graph.getCellAt(pt.x, pt.y);

              graph.getModel().beginUpdate();

              let doc = mxUtils.createXmlDocument();
              let prueba = doc.createElement('in');

              let v2 = graph.insertVertex(cellTarget, null, prueba, 1, 0.5, 30, 30,
                'fontSize=9;shape=ellipse;resizable=0;');
              v2.geometry.offset = new mxPoint(-15, -15);
              v2.geometry.relative = true;
              graph.getModel().endUpdate();

            }
            mxUtils.makeDraggable(clone, this.graph2, funct);
          }
          break;
      }
    });
  }

}
