import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, Input, Output, EventEmitter } from '@angular/core';
import { Subject } from 'rxjs';
import { DiagramComponentHelper } from '../diagram-component-helper';
import { ModelService, EntityTypes } from 'src/app/model-manager';

@Component({
  selector: 'app-processors-diagram-component',
  templateUrl: './processors-diagram-component.component.html',
  //template: '<div #graphContainer2 id="graphContainer2"></div>',
  styleUrls: ['./processors-diagram-component.component.css']
})
export class ProcessorsDiagramComponentComponent implements AfterViewInit, OnInit {

  @ViewChild('graphContainer', { static: true }) graphContainer: ElementRef;
  @ViewChild('processorToolbar', { static: true }) processorToolbar: ElementRef;
  @Input() proccesorSubject: Subject<{ name: string, data: any }>;
  @Input() diagramId: number;
  @Input() modelService: ModelService;

  @Output() emitterToParent = new EventEmitter<{ name: string, data: any }>();


  private graph: mxGraph;

  constructor() { }

  ngOnInit() {

  }

  ngAfterViewInit() {
    this.graph = new mxGraph(this.graphContainer.nativeElement);
    DiagramComponentHelper.loadDiagram(this.diagramId, this.graph);
    this.makeDraggableToolbar();
    this.overrideMethodsGraphPorts();
    this.eventsProcessorSubject();
    this.graphMouseEvent();
  }

  private makeDraggableToolbar() {
    let emitterToParent = this.emitterToParent;
    let component = this;

    var functionInterfaceType = function (graph: mxGraph, evt, cell) {

      let pt: mxPoint = graph.getPointForEvent(evt);
      emitterToParent.emit({
        name: "showFormCreateProcessor",
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
    mxUtils.makeDraggable(this.processorToolbar.nativeElement, this.graph, functionInterfaceType, dragElement);
  }

  createProcessor(name: string, pt: mxPoint) {
    this.graph.getModel().beginUpdate();
    let id = this.modelService.createEntity(EntityTypes.Processor, name);
    let doc = mxUtils.createXmlDocument();
    let interfaceTypeDoc = doc.createElement('processor');
    interfaceTypeDoc.setAttribute('name', name);
    this.graph.insertVertex(this.graph.getDefaultParent(), id.toString(), interfaceTypeDoc, pt.x, pt.y,
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
      }
    });
  }

  private portDraggable(element: HTMLElement) {
    var funct = function (graph, evt, cell) {

      let pt: mxPoint = graph.getPointForEvent(evt);
      let cellTarget = graph.getCellAt(pt.x, pt.y);
      if (cellTarget != null && cellTarget.value.nodeName == "processor") {
        graph.stopEditing(false);

        graph.getModel().beginUpdate();

        let doc = mxUtils.createXmlDocument();
        let port = doc.createElement('port');
        port.setAttribute('name', 'in');
        port.setAttribute('id', element.getAttribute("data-node-id"));

        let v2 = graph.insertVertex(cellTarget, null, port, 1, 0.5, 30, 30,
          'fontSize=9;shape=ellipse;resizable=0;');
        v2.geometry.offset = new mxPoint(-15, -15);
        v2.geometry.relative = true;
        graph.getModel().endUpdate();
      }

    }
    mxUtils.makeDraggable(element, this.graph, funct);
  }

  private graphMouseEvent() {
    this.graph.addListener(mxEvent.DOUBLE_CLICK, this.doubleClickGraph.bind(this));
  }

  private doubleClickGraph(graph, evt) {
    let cellTarget = evt.getProperty('cell');

    if (cellTarget != undefined && cellTarget.value.nodeName == "processor") {
      this.showFormProcessor(cellTarget.getAttribute("id"));
    }
  }

  private showFormProcessor(cellId) {
    this.emitterToParent.emit({
      name: "showFormProcessor",
      data: {
        processorId: cellId
      }
    })
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

}
