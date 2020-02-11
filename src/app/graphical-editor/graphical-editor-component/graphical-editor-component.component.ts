import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, TemplateRef } from '@angular/core';
import { TreeNode, IActionMapping } from 'angular-tree-component';
import { Subject } from 'rxjs';
import { NzModalRef, NzModalService } from 'ng-zorro-antd';
import '../../model-manager';
import { ModelService, DiagramType, Diagram } from '../../model-manager';
import { MatMenuTrigger } from '@angular/material';
import { DiagramComponentHelper } from '../diagram-component-helper';

@Component({
  selector: 'app-graphical-editor-component',
  templateUrl: './graphical-editor-component.component.html',
  styleUrls: ['./graphical-editor-component.component.css']
})
export class GraphicalEditorComponentComponent implements OnInit {

  @ViewChild('treeRoot', { static: false }) treeRoot: ElementRef;
  proccesorSubject:Subject<{name: string, data: any}> = new Subject();
  private readonly ID_DIAGRAMS = -3;
  private readonly ID_PROCESSOR = -2;
  private readonly ID_INTERFACETYPES = -1;

  private modalRef : NzModalRef

  //Form Processor
  private proccesorIdForm : string;
  @ViewChild('formProcessorTitle', { static: false }) formProcessorTitle:TemplateRef<any>;
  @ViewChild('formProcessorContent', { static: false }) formProcessorContent:TemplateRef<any>;
  @ViewChild('formProcessorFooter', { static: false }) formProcessorFooter:TemplateRef<any>;

  //Form Create Diagram
  private numberCreateDiagramInterfaceType = 1;
  private numberCreateDiagramProcessor = 1;
  private typeCreateDiagram : string;
  @ViewChild('formCreateDiagramTitle', { static: false }) formCreateDiagramTitle:TemplateRef<any>;
  @ViewChild('formCreateDiagramContent', { static: false }) formCreateDiagramContent:TemplateRef<any>;
  @ViewChild('formCreateDiagramFooter', { static: false }) formCreateDiagramFooter:TemplateRef<any>;

  //ModelService
  modelService : ModelService;

  //Context Menu
  @ViewChild(MatMenuTrigger, {static: false}) contextMenuDiagram: MatMenuTrigger;
  contextMenuDiagramPosition = { x: '0px', y: '0px' };

  actionMappingTree : IActionMapping = {
    mouse: {

      dblClick: (tree, node, $event) => {
        if(node.level > 1) {
          let parentNode = node;
          for (let i = node.level; i > 1; i--) {
            parentNode = parentNode.parent;
          }
          switch(parentNode.data.id) {
            case this.ID_DIAGRAMS:
              this.addTabDiagram(node.data.id);
              break;
          }
        }
      },

      contextMenu: (tree, node, $event) => {
        $event.preventDefault();
      }
    }


  }

  nodes = [
    {
      id: this.ID_DIAGRAMS,
      name: 'Diagrams',
      description: "<test attribute>",
      children: [],
    },
    {
      id: this.ID_PROCESSOR,
      name: 'Processors',
      children: []
    },
    {
      id: this.ID_INTERFACETYPES,
      name: 'Interface Types',
      children: []
    }

  ];
  options = {
    actionMapping: this.actionMappingTree,
  };

  tabsDiagram : Map<BigInt,{id:BigInt, name: String, type: DiagramType}> = new Map();

  constructor(private nzModalService : NzModalService) { }

  ngOnInit() {
    this.modelService = new ModelService();
    DiagramComponentHelper.setModelService(this.modelService);
    this.eventsProcessorSubject();
  }

  private eventsProcessorSubject() {
    this.proccesorSubject.subscribe( (event) => {
      switch(event.name) {
        case "showFormProcessor":
          this.showFormProcessor(event.data.processorId);
      }
    })
  }

  private updateTree() {
    this.nodes = this.modelService.getTreeModelView();
  }

  private addTabDiagram(diagramId : bigint) {
    let diagram : Diagram = this.modelService.readDiagram(diagramId);
    this.tabsDiagram.set(diagram.id, {id: diagram.id ,name: diagram.name, type:diagram.diagramType});
  }

  private draggableModal() {
    let headersModal = <HTMLCollectionOf<HTMLDivElement>> document.getElementsByClassName("ant-modal-header");
    for (let i = 0; i < headersModal.length; i++) {
      var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
      headersModal[i].onmousedown = dragMouseDown;

      function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        // get the mouse cursor position at startup:
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        // call a function whenever the cursor moves:
        document.onmousemove = elementDrag;
      }
    
      function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        // calculate the new cursor position:
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        // set the element's new position:
        headersModal[i].parentElement.style.top = (headersModal[i].parentElement.offsetTop - pos2) + "px";
        headersModal[i].parentElement.style.left = (headersModal[i].parentElement.offsetLeft - pos1) + "px";
      }
    
      function closeDragElement() {
        // stop moving when mouse button is released:
        document.onmouseup = null;
        document.onmousemove = null;
      }
    }
  }

  closeTabDiagram(diagramId : bigint) {
    this.tabsDiagram.delete(diagramId);
  }

  onContextMenuDiagram(event : MouseEvent, node) {
    event.preventDefault();
    this.contextMenuDiagramPosition.x = event.clientX + 'px';
    this.contextMenuDiagramPosition.y = event.clientY + 'px';
    this.contextMenuDiagram.menuData = { 'item': node };
    this.contextMenuDiagram.menu.focusFirstItem('mouse');
    this.contextMenuDiagram.openMenu();
  }

  onContextMenuDiagramDelete(node : TreeNode) {
    if( this.modelService.deleteDiagram(node.data.id) ) {
      this.closeTabDiagram(node.data.id);
      this.updateTree();
    }
  }

  showFormProcessor(id : string) {

    if (this.proccesorIdForm != undefined && this.proccesorIdForm != id) {
      this.proccesorIdForm = id;
    }

    this.modalRef = this.nzModalService.create({
      nzTitle: this.formProcessorTitle,
      nzContent: this.formProcessorContent,
      nzFooter: this.formProcessorFooter,
    });
    this.modalRef.afterOpen.subscribe( () => {
      this.draggableModal();
      let titles = document.getElementsByClassName("title-modal");

      for (let i = 0; i < titles.length; i++) {
        titles[0].parentElement.parentElement.style.cursor = "move";
      }
    });
  }

  showFormCreateDiagram(typeDiagram : string) {
    this.typeCreateDiagram = typeDiagram;

    this.modalRef = this.nzModalService.create({
      nzTitle: this.formCreateDiagramTitle,
      nzContent: this.formCreateDiagramContent,
      nzFooter: this.formCreateDiagramFooter,
    });
    this.modalRef.afterOpen.subscribe( () => {
      let form = this.modalRef.getElement().getElementsByTagName("form")[0];
      this.draggableModal();
      let titles = document.getElementsByClassName("title-modal");

      switch (this.typeCreateDiagram) {
        case 'InterfaceTypes':
          form.nameDiagram.value = 'InterfaceType #' + this.numberCreateDiagramInterfaceType;
          break;
        case 'Processors':
          form.nameDiagram.value = 'Processor #' + this.numberCreateDiagramProcessor;
          break;
      }

      for (let i = 0; i < titles.length; i++) {
        titles[0].parentElement.parentElement.style.cursor = "move";
      }
    });
  }

  closeModal() {
    this.modalRef.destroy();
  }

  submitCreateDiagram(event : Event) {
    event.preventDefault();
    this.createDiagram();
  }

  createDiagram() {

    let form = this.modalRef.getElement().getElementsByTagName("form")[0];
    let nameDiagram : string = form.nameDiagram.value.trim();
    let typeDiagram : DiagramType;

    switch (this.typeCreateDiagram) {
      case 'InterfaceTypes':
        typeDiagram = DiagramType.InterfaceTypes;
        break;
      case 'Processors':
        typeDiagram = DiagramType.Processors;
        break;
    }

    let diagramId = this.modelService.createDiagram(nameDiagram, typeDiagram);

    if (diagramId != -1n) {
      this.modalRef.destroy();
      switch (this.typeCreateDiagram) {
        case 'InterfaceTypes':
          this.numberCreateDiagramInterfaceType++;
          break;
        case 'Processors':
          this.numberCreateDiagramProcessor++;
          break;
      }
      this.updateTree();
      this.addTabDiagram(<bigint>diagramId);
    } else {
      this.nzModalService.error({
        nzTitle: 'Could not create diagram',
        nzContent: 'The name "' + nameDiagram + '" already exists',
      });
    }
  }

  getParentTreeNode(node: TreeNode) : string {

    if (node.level == 1) {
      return "none";
    } else if (node.level > 1) {
      
      let nodeParent = node;
      for(let i = node.level; i > 1; i--) {
        nodeParent = nodeParent.parent;
      }

      switch(nodeParent.id) {
        case this.ID_DIAGRAMS:
          return "Diagrams"
        case this.ID_PROCESSOR:
          return "Processors"
        case this.ID_INTERFACETYPES:
          return "InterfaceTypes"
      }
    }

    return "";
  }
  
  mouseOverTree(event : Event) {
    this.proccesorSubject.next({
      name:"mouseOverTree",
      data: event.target
    });
  }

}
