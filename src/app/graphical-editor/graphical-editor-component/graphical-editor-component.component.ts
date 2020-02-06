import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, TemplateRef } from '@angular/core';
import { TreeNode, IActionMapping } from 'angular-tree-component';
import { Subject } from 'rxjs';
import { NzModalRef, NzModalService } from 'ng-zorro-antd';
import '../../model-manager';
import { ModelService, DiagramType } from '../../model-manager';

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
  private typeCreateDiagram : string;
  @ViewChild('formCreateDiagramTitle', { static: false }) formCreateDiagramTitle:TemplateRef<any>;
  @ViewChild('formCreateDiagramContent', { static: false }) formCreateDiagramContent:TemplateRef<any>;
  @ViewChild('formCreateDiagramFooter', { static: false }) formCreateDiagramFooter:TemplateRef<any>;

  //ModelService
  modelService : ModelService;

  actionMappingTree : IActionMapping = {
    mouse: {
      dblClick: (tree, node, $event) => {
        console.log(node);
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
      children: [
        {
          id: 25, name: 'Netherlands',
          children: [
            {
              id: 26,
              name: 'FoodProduction',
              children: [
                {id: 267, name: 'Vegetables'}
              ]
            },
            {
              id: 27,
              name: 'EnergyProduction',
              children: [
                {id: 277, name: 'Fuels'},
                  {id: 278, name: 'Electricity'},
              ]
            }

          ]
        },
        {
          id: 26, name: 'Brazil',
          children: [
            {
              id: 261,
              name: 'FoodProduction',
              children: [
                {id: 2667, name: 'Vegetables'}
              ]
            }
          ]
        }

      ]
    },
    {
      id: this.ID_INTERFACETYPES,
      name: 'InterfaceTypes',
      children: [
        { id: 35, name: 'Food' },
        {
          id: 36,
          name: 'Vegetables',
          children: [
            { id: 367, name: 'Tomato' }
          ]
        }
      ]
    }

  ];
  options = {
    actionMapping: this.actionMappingTree,
  };

  

  constructor(private nzModalService : NzModalService) { }

  ngOnInit() {
    this.modelService = new ModelService();
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
    this.modalRef = this.nzModalService.create({
      nzTitle: this.formCreateDiagramTitle,
      nzContent: this.formCreateDiagramContent,
      nzFooter: this.formCreateDiagramFooter,
    });
    this.modalRef.afterOpen.subscribe( () => {
      this.draggableModal();
      let titles = document.getElementsByClassName("title-modal");

      for (let i = 0; i < titles.length; i++) {
        titles[0].parentElement.parentElement.style.cursor = "move";
      }
    });
    this.typeCreateDiagram = typeDiagram;
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

    if (this.modelService.createDiagram(nameDiagram, typeDiagram)) {
      this.modalRef.destroy();
    } else {
      this.nzModalService.error({
        nzTitle: 'Could not create diagram',
        nzContent: 'The name "' + nameDiagram + '" already exists',
      });
    }
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

  setAttributeParentTreeNode(node: TreeNode) {

    if (node.level == this.ID_DIAGRAMS || node.level == this.ID_INTERFACETYPES 
      || node.level == this.ID_PROCESSOR) {
      return "none";
    } else if (node.level >= 1) {
      
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
