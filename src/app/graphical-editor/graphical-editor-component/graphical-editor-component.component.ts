import { Component, OnInit, ViewChild, ElementRef, TemplateRef, Renderer2, AfterViewInit } from '@angular/core';
import { TreeNode, IActionMapping } from 'angular-tree-component';
import { Subject } from 'rxjs';
import { NzModalRef, NzModalService } from 'ng-zorro-antd';
import '../../model-manager';
import { ModelService, DiagramType, Diagram } from '../../model-manager';
import { MatMenuTrigger, MatSnackBar } from '@angular/material';
import { DiagramComponentHelper, SnackErrorDto } from '../diagram-component-helper';
import { ProcessorsDiagramComponentComponent } from '../processors-diagram-component/processors-diagram-component.component';
import { CreateInterfaceTypeDto } from '../interfacetypes-diagram-component/interfacetypes-diagram-component-dto';
import { CreateProcessorDto, ProcessorFormDto } from '../processors-diagram-component/processors-diagram-component-dto';

@Component({
  selector: 'app-graphical-editor-component',
  templateUrl: './graphical-editor-component.component.html',
  styleUrls: ['./graphical-editor-component.component.css']
})
export class GraphicalEditorComponentComponent implements OnInit, AfterViewInit {

  @ViewChild('treeRoot', { static: false }) treeRoot: ElementRef;
  proccesorSubject: Subject<{ name: string, data: any }> = new Subject();
  private readonly ID_DIAGRAMS = -3;
  private readonly ID_PROCESSOR = -2;
  private readonly ID_INTERFACETYPES = -1;

  private modalRef: NzModalRef

  //Form Processor
  private proccesorIdForm: string;
  @ViewChild('formProcessorTitle', { static: false }) formProcessorTitle: TemplateRef<any>;
  @ViewChild('formProcessorContent', { static: false }) formProcessorContent: TemplateRef<any>;
  @ViewChild('formProcessorFooter', { static: false }) formProcessorFooter: TemplateRef<any>;

  //Form Create Diagram
  private numberCreateDiagramInterfaceType = 1;
  private numberCreateDiagramProcessor = 1;
  private typeCreateDiagram: string;
  @ViewChild('formCreateDiagramTitle', { static: false }) formCreateDiagramTitle: TemplateRef<any>;
  @ViewChild('formCreateDiagramContent', { static: false }) formCreateDiagramContent: TemplateRef<any>;
  @ViewChild('formCreateDiagramFooter', { static: false }) formCreateDiagramFooter: TemplateRef<any>;

  //Form Create InterfaceType
  @ViewChild('formCreateInterfaceTypeTitle', { static: false }) formCreateInterfaceTypeTitle: TemplateRef<any>;
  @ViewChild('formCreateInterfaceTypeContent', { static: false }) formCreateInterfaceTypeContent: TemplateRef<any>;
  @ViewChild('formCreateInterfaceTypeFooter', { static: false }) formCreateInterfaceTypeFooter: TemplateRef<any>;
  createInterfaceTypeDto: CreateInterfaceTypeDto;

  //Form Create Processor
  @ViewChild('formCreateProcessorTitle', { static: false }) formCreateProcessorTitle: TemplateRef<any>;
  @ViewChild('formCreateProcessorContent', { static: false }) formCreateProcessorContent: TemplateRef<any>;
  @ViewChild('formCreateProcessorFooter', { static: false }) formCreateProcessorFooter: TemplateRef<any>;
  createProcessorDto: CreateProcessorDto;

  //Context Menu
  @ViewChild(MatMenuTrigger, { static: false }) contextMenuDiagram: MatMenuTrigger;
  contextMenuDiagramPosition = { x: '0px', y: '0px' };

  actionMappingTree: IActionMapping = {
    mouse: {

      dblClick: (tree, node, $event) => {
        if (node.level > 1) {
          let parentNode = node;
          for (let i = node.level; i > 1; i--) {
            parentNode = parentNode.parent;
          }
          switch (parentNode.data.id) {
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

  tabsDiagram: Map<Number, { id: Number, name: String, type: DiagramType }> = new Map();

  constructor(
    public modelService: ModelService,
    private nzModalService: NzModalService,
    private renderer: Renderer2,
    private snackBarService: MatSnackBar) { }

  ngOnInit() {
    DiagramComponentHelper.setModelService(this.modelService);
    this.eventsProcessorSubject();
  }

  ngAfterViewInit() {
    if (document.getElementsByClassName("cdk-overlay-container")[0] == undefined) {
      let wrapPopup = document.createElement("div");
      wrapPopup.className = "cdk-overlay-container";
      document.body.append(wrapPopup);
    }
  }

  private eventsProcessorSubject() {
    this.proccesorSubject.subscribe((event) => {
      switch (event.name) {
        case "showFormProcessor":
          this.showFormProcessor(event.data.processorId);
      }
    })
  }

  private updateTree() {
    this.nodes = this.modelService.getTreeModelView();
  }

  private addTabDiagram(diagramId: number) {
    let diagram: Diagram = this.modelService.readDiagram(diagramId);
    this.tabsDiagram.set(diagram.id, { id: diagram.id, name: diagram.name, type: diagram.diagramType });
  }

  private draggableModal() {
    let headersModal = <HTMLCollectionOf<HTMLDivElement>>document.getElementsByClassName("ant-modal-header");
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

  closeTabDiagram(diagramId: number) {
    this.tabsDiagram.delete(diagramId);
  }

  onContextMenuDiagram(event: MouseEvent, node) {
    event.preventDefault();
    this.contextMenuDiagramPosition.x = event.clientX + 'px';
    this.contextMenuDiagramPosition.y = event.clientY + 'px';
    this.contextMenuDiagram.menuData = { 'item': node };
    this.contextMenuDiagram.menu.focusFirstItem('mouse');
    this.contextMenuDiagram.openMenu();
  }

  onContextMenuDiagramDelete(node: TreeNode) {
    if (this.modelService.deleteDiagram(node.data.id)) {
      this.closeTabDiagram(node.data.id);
      this.updateTree();
    }
  }

  showFormCreateDiagram(typeDiagram: string) {
    this.typeCreateDiagram = typeDiagram;

    this.modalRef = this.nzModalService.create({
      nzTitle: this.formCreateDiagramTitle,
      nzContent: this.formCreateDiagramContent,
      nzFooter: this.formCreateDiagramFooter,
    });
    this.modalRef.afterOpen.subscribe(() => {
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

  submitCreateDiagram(event: Event) {
    event.preventDefault();
    this.createDiagram();
  }

  createDiagram() {

    let form = this.modalRef.getElement().getElementsByTagName("form")[0];
    let nameDiagram: string = form.nameDiagram.value.trim();
    let typeDiagram: DiagramType;

    switch (this.typeCreateDiagram) {
      case 'InterfaceTypes':
        typeDiagram = DiagramType.InterfaceTypes;
        break;
      case 'Processors':
        typeDiagram = DiagramType.Processors;
        break;
    }

    let diagramId = this.modelService.createDiagram(nameDiagram, typeDiagram);

    if (diagramId != -1) {
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
      this.addTabDiagram(<number>diagramId);
    } else {
      this.nzModalService.error({
        nzTitle: 'Could not create diagram',
        nzContent: 'The name "' + nameDiagram + '" already exists',
      });
    }
  }

  getParentTreeNode(node: TreeNode): string {

    if (node.level == 1) {
      return "none";
    } else if (node.level > 1) {

      let nodeParent = node;
      for (let i = node.level; i > 1; i--) {
        nodeParent = nodeParent.parent;
      }

      switch (nodeParent.id) {
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

  mouseOverTree(event: MouseEvent) {
    let target = <HTMLElement>event.target;
    if (target.getAttribute("data-node-parent") == "InterfaceTypes") {
      let clone = target.cloneNode(true);
      target.parentNode.replaceChild(clone, target);
      this.renderer.listen(clone, "mouseout", this.mouseOutTree.bind(this));
      this.proccesorSubject.next({
        name: "portDraggable",
        data: clone
      });
    }
  }

  mouseOutTree(event: MouseEvent) {
    let target = event.target;
    this.renderer.listen(target, "mouseover", this.mouseOverTree.bind(this));
  }

  showFormCreateInterfaceType(event: CreateInterfaceTypeDto) {
    this.createInterfaceTypeDto = event;

    this.modalRef = this.nzModalService.create({
      nzTitle: this.formCreateInterfaceTypeTitle,
      nzContent: this.formCreateInterfaceTypeContent,
      nzFooter: this.formCreateInterfaceTypeFooter,
    });
    this.modalRef.afterOpen.subscribe(() => {
      this.draggableModal();
      let titles = document.getElementsByClassName("title-modal");

      for (let i = 0; i < titles.length; i++) {
        titles[0].parentElement.parentElement.style.cursor = "move";
      }
    });

  }

  submitCreateInterfaceType(event: any) {
    event.preventDefault();
    this.createInterfaceType();
  }

  createInterfaceType() {
    this.modalRef.destroy();
    let form = this.modalRef.getElement().getElementsByTagName("form")[0];
    let name = form.nameInterfaceType.value.trim();
    this.createInterfaceTypeDto.component.createInterfaceType(name, this.createInterfaceTypeDto.pt);
    this.updateTree();
  }

  showFormProcessor(event: ProcessorFormDto) {

    this.modalRef = this.nzModalService.create({
      nzTitle: this.formProcessorTitle,
      nzContent: this.formProcessorContent,
      nzFooter: this.formProcessorFooter,
    });
    this.modalRef.afterOpen.subscribe(() => {
      this.draggableModal();
      let titles = document.getElementsByClassName("title-modal");

      for (let i = 0; i < titles.length; i++) {
        titles[0].parentElement.parentElement.style.cursor = "move";
      }
    });
  }

  showFormCreateProcessor(event: CreateProcessorDto) {

    this.createProcessorDto = event;

    this.modalRef = this.nzModalService.create({
      nzTitle: this.formCreateProcessorTitle,
      nzContent: this.formCreateProcessorContent,
      nzFooter: this.formCreateProcessorFooter,
    });
    this.modalRef.afterOpen.subscribe(() => {
      this.draggableModal();
      let titles = document.getElementsByClassName("title-modal");

      for (let i = 0; i < titles.length; i++) {
        titles[0].parentElement.parentElement.style.cursor = "move";
      }
    });
  }

  submitCreateProcessor(event: Event) {
    event.preventDefault();
    this.createProcessor();
  }

  createProcessor() {
    this.modalRef.destroy();
    let form = this.modalRef.getElement().getElementsByTagName("form")[0];
    let name = form.nameInterfaceType.value.trim();
    this.createProcessorDto.component.createProcessor(name, this.createProcessorDto.pt);
    this.updateTree();
  }

  showSnackBarError(event: SnackErrorDto) {
    this.snackBarService.open(event.message,null, {
      duration: 2000,
    });
  }



}
