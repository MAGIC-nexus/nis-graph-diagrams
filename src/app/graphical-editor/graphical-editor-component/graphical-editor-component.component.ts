import { Component, OnInit, ViewChild, ElementRef, TemplateRef, Renderer2, AfterViewInit } from '@angular/core';
import { TreeNode, IActionMapping } from 'angular-tree-component';
import { Subject } from 'rxjs';
import { NzModalRef, NzModalService } from 'ng-zorro-antd';
import '../../model-manager';
import {
  ModelService, DiagramType, Diagram, ProcessorFunctionalOrStructural,
  ProcessorAccounted, ProcessorSubsystemType, Processor, InterfaceOrientation,
  Sphere, RoegenType, Interface, InterfaceType, InterfaceValue,
} from '../../model-manager';
import { MatMenuTrigger, MatSnackBar } from '@angular/material';
import { DiagramComponentHelper, SnackErrorDto } from '../diagram-component-helper';
import { CreateInterfaceTypeDto } from '../interfacetypes-diagram-component/interfacetypes-diagram-component-dto';
import {
  CreateProcessorDto, ProcessorFormDto, InterfaceFormDto, ChangeInterfaceInGraphDto
} from '../processors-diagram-component/processors-diagram-component-dto';
import { ProcessorsDiagramComponentComponent } from '../processors-diagram-component/processors-diagram-component.component';

@Component({
  selector: 'app-graphical-editor-component',
  templateUrl: './graphical-editor-component.component.html',
  styleUrls: ['./graphical-editor-component.component.css']
})
export class GraphicalEditorComponentComponent implements OnInit, AfterViewInit {

  //Enums
  ProcessorFunctionalOrStructuralEnum = ProcessorFunctionalOrStructural;
  ProcessorAccountedEnum = ProcessorAccounted;
  ProcessorSubsystemTypeEnum = ProcessorSubsystemType;
  InterfaceOrientationEnum = InterfaceOrientation;
  SphereEnum = Sphere;
  RoegenTypeEnum = RoegenType;

  @ViewChild('treeRoot', { static: false }) treeRoot: ElementRef;
  proccesorSubject: Subject<{ name: string, data: any }> = new Subject();
  interfaceTypeSubject: Subject<{ name: string, data: any }> = new Subject();
  private readonly ID_DIAGRAMS = -3;
  private readonly ID_PROCESSOR = -2;
  private readonly ID_INTERFACETYPES = -1;

  private modalRef: NzModalRef

  //Form Processor
  private proccesorIdForm;
  private oldNameFormProcessor: string;
  nameFormProcessor: string;
  levelFormProcessor: string;
  systemFormProcessor: string;
  geolocationFormProcessor: string;
  descriptionFormProcessor: string;
  functionalOrStructuralFormProcessor: ProcessorFunctionalOrStructural;
  accountedFormProcessor: ProcessorAccounted;
  subsystemTypeFormProcessor: ProcessorSubsystemType;
  @ViewChild('formProcessorTitle', { static: false }) formProcessorTitle: TemplateRef<any>;
  @ViewChild('formProcessorContent', { static: false }) formProcessorContent: TemplateRef<any>;
  @ViewChild('formProcessorFooter', { static: false }) formProcessorFooter: TemplateRef<any>;

  //Form Interface
  private interfaceIdForm;
  private oldNameFormInterface: string;
  nameFormInterface: string;
  descriptionFormInterface: string;
  orientationFormInterface: InterfaceOrientation;
  private oldOrientationFormInterface: InterfaceOrientation;
  sphereFormInterface: Sphere;
  roegenTypeFormInterface: RoegenType;
  oppositeSubsystemTypeFormInterface: ProcessorSubsystemType;
  @ViewChild('formInterafaceTitle', { static: false }) formInterafaceTitle: TemplateRef<any>;
  @ViewChild('formInterfaceContent', { static: false }) formInterfaceContent: TemplateRef<any>;
  @ViewChild('formInterfaceFooter', { static: false }) formInterfaceFooter: TemplateRef<any>;
  //Interface Values
  listInterfaceValues;
  nextIdInterfaceValues;

  //Form Create Diagram
  private numberCreateDiagramInterfaceType = 1;
  private numberCreateDiagramProcessor = 1;
  nameValidationFormCreateDiagram;
  nameErrorTipFormCreateDiagram;
  nameFormCreateDiagram;
  private typeCreateDiagram: string;
  @ViewChild('formCreateDiagramTitle', { static: false }) formCreateDiagramTitle: TemplateRef<any>;
  @ViewChild('formCreateDiagramContent', { static: false }) formCreateDiagramContent: TemplateRef<any>;
  @ViewChild('formCreateDiagramFooter', { static: false }) formCreateDiagramFooter: TemplateRef<any>;

  //Form Create InterfaceType
  nameFormCreateInterfaceType = "";
  nameValidationFormCreateInterfaceType = "";
  @ViewChild('formCreateInterfaceTypeTitle', { static: false }) formCreateInterfaceTypeTitle: TemplateRef<any>;
  @ViewChild('formCreateInterfaceTypeContent', { static: false }) formCreateInterfaceTypeContent: TemplateRef<any>;
  @ViewChild('formCreateInterfaceTypeFooter', { static: false }) formCreateInterfaceTypeFooter: TemplateRef<any>;
  createInterfaceTypeDto: CreateInterfaceTypeDto;

  //Form Create Processor
  nameFormCreateProcessor = "";
  nameValidationFormCreateProcessor = "";
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

  private getAllDiagramsModel() {
    return this.modelService.getTreeModelViewDiagrams();
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
    this.nameValidationFormCreateDiagram = "";

    this.modalRef = this.nzModalService.create({
      nzTitle: this.formCreateDiagramTitle,
      nzContent: this.formCreateDiagramContent,
      nzFooter: this.formCreateDiagramFooter,
      nzWrapClassName: 'vertical-center-modal',
    });
    this.modalRef.afterOpen.subscribe(() => {
      this.draggableModal();
      let titles = document.getElementsByClassName("title-modal");

      switch (this.typeCreateDiagram) {
        case 'InterfaceTypes':
          this.nameFormCreateDiagram = 'InterfaceType #' + this.numberCreateDiagramInterfaceType;
          break;
        case 'Processors':
          this.nameFormCreateDiagram = 'Processor #' + this.numberCreateDiagramProcessor;
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

  createDiagram(): boolean {
    if (this.nameFormCreateDiagram == "") {
      this.nameValidationFormCreateDiagram = "error";
      this.nameErrorTipFormCreateDiagram = "The name cannot be empty";
      return false;
    }

    let typeDiagram: DiagramType;

    switch (this.typeCreateDiagram) {
      case 'InterfaceTypes':
        typeDiagram = DiagramType.InterfaceTypes;
        break;
      case 'Processors':
        typeDiagram = DiagramType.Processors;
        break;
    }

    let diagramId = this.modelService.createDiagram(this.nameFormCreateDiagram.trim(), typeDiagram);

    if (diagramId == -1) {
      this.nameValidationFormCreateDiagram = "error";
      this.nameErrorTipFormCreateDiagram = `The name ${this.nameFormCreateDiagram.trim()} already exists`;
      return false;
    }

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
    return true;

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
    this.nameValidationFormCreateInterfaceType = "";
    this.nameFormCreateInterfaceType = "";
    this.createInterfaceTypeDto = event;

    this.modalRef = this.nzModalService.create({
      nzTitle: this.formCreateInterfaceTypeTitle,
      nzContent: this.formCreateInterfaceTypeContent,
      nzFooter: this.formCreateInterfaceTypeFooter,
      nzWrapClassName: 'vertical-center-modal',
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

  createInterfaceType(): boolean {
    if (this.nameFormCreateInterfaceType == "") {
      this.nameValidationFormCreateInterfaceType = "error";
      return false;
    }
    this.modalRef.destroy();
    this.createInterfaceTypeDto.component.createInterfaceType(this.nameFormCreateInterfaceType.trim(),
      this.createInterfaceTypeDto.pt);
    this.updateTree();
    return true;
  }

  doubleClickProcessorTree(node: TreeNode) {
    let processorFormDto = new ProcessorFormDto();
    processorFormDto.cellId = node.data.id;
    this.showFormProcessor(processorFormDto);
  }

  showFormProcessor(event: ProcessorFormDto) {

    let processor = <Processor>this.modelService.readEntity(Number(event.cellId));
    if (processor instanceof Processor) {
      this.proccesorIdForm = event.cellId;
      this.oldNameFormProcessor = processor.name;
      this.nameFormProcessor = processor.name;
      this.levelFormProcessor = processor.level;
      this.systemFormProcessor = processor.system;
      this.geolocationFormProcessor = processor.geolocation;
      this.functionalOrStructuralFormProcessor = processor.functionalOrStructural;
      this.accountedFormProcessor = processor.accounted;
      this.subsystemTypeFormProcessor = processor.subsystemType;
      this.descriptionFormProcessor = processor.description;

      this.modalRef = this.nzModalService.create({
        nzTitle: this.formProcessorTitle,
        nzContent: this.formProcessorContent,
        nzFooter: this.formProcessorFooter,
        nzWrapClassName: 'vertical-center-modal',
        nzBodyStyle: { height: '350px', overflowY: 'scroll' },
      });
      this.modalRef.afterOpen.subscribe(() => {
        this.draggableModal();
        let titles = document.getElementsByClassName("title-modal");

        for (let i = 0; i < titles.length; i++) {
          titles[0].parentElement.parentElement.style.cursor = "move";
        }
      });

    }
  }

  submitProcessorForm(event) {
    event.preventDefault();
    this.updateProcessor();
  }

  updateProcessor() {
    this.modalRef.destroy();
    let processor = new Processor();
    processor.name = this.nameFormProcessor;
    processor.level = this.levelFormProcessor;
    processor.system = this.systemFormProcessor;
    processor.geolocation = this.geolocationFormProcessor;
    processor.functionalOrStructural = this.functionalOrStructuralFormProcessor;
    processor.accounted = this.accountedFormProcessor;
    processor.subsystemType = this.subsystemTypeFormProcessor;
    processor.description = this.descriptionFormProcessor;
    this.modelService.updateEntity(Number(this.proccesorIdForm), processor);
    if (this.oldNameFormProcessor != this.nameFormProcessor) {
      for (let diagram of this.getAllDiagramsModel()) {
        DiagramComponentHelper.changeNameEntityOnlyXML(Number(diagram.id), this.nameFormProcessor, this.proccesorIdForm);
      }
      this.proccesorSubject.next({
        name: "refreshDiagram",
        data: null,
      });
    }
  }

  showFormCreateProcessor(event: CreateProcessorDto) {

    this.createProcessorDto = event;
    this.nameValidationFormCreateProcessor = "";
    this.nameFormCreateProcessor = "";

    this.modalRef = this.nzModalService.create({
      nzTitle: this.formCreateProcessorTitle,
      nzContent: this.formCreateProcessorContent,
      nzFooter: this.formCreateProcessorFooter,
      nzWrapClassName: 'vertical-center-modal',
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
    this.createProcessor();
    event.preventDefault();
  }

  createProcessor() {
    let validate = true;
    this.nameFormCreateProcessor = this.nameFormCreateProcessor.trim();
    if (this.nameFormCreateProcessor == "") {
      validate = false;
      this.nameValidationFormCreateProcessor = "error";
    }
    if (validate) {
      this.modalRef.destroy();
      this.createProcessorDto.component.createProcessor(this.nameFormCreateProcessor, this.createProcessorDto.pt);
      this.updateTree();
    }
  }

  showFormInterface(event: InterfaceFormDto) {
    let interfaceEntity = <Interface>this.modelService.readInterface(Number(event.cellId));
    if (interfaceEntity instanceof Interface) {

      this.interfaceIdForm = event.cellId;
      this.nameFormInterface = interfaceEntity.name;
      this.oldNameFormInterface = interfaceEntity.name;
      this.descriptionFormInterface = interfaceEntity.description;
      this.orientationFormInterface = interfaceEntity.orientation;
      this.oldOrientationFormInterface = interfaceEntity.orientation;
      this.roegenTypeFormInterface = interfaceEntity.roegenType;
      this.oppositeSubsystemTypeFormInterface = interfaceEntity.oppositeSubsystemType;
      this.sphereFormInterface = interfaceEntity.sphere;
      this.listInterfaceValues = [];
      this.nextIdInterfaceValues = 0;
      let listInterfaceValues = interfaceEntity.values;
      for (let interfaceValue of listInterfaceValues) {
        this.listInterfaceValues.push({
          id: this.nextIdInterfaceValues,
          value: interfaceValue.value,
          unit: interfaceValue.unit,
          relativeTo: interfaceValue.relativeTo,
          time: interfaceValue.time,
          source: interfaceValue.source,
        });
        this.nextIdInterfaceValues++;
      }
      this.modalRef = this.nzModalService.create({
        nzTitle: this.formInterafaceTitle,
        nzContent: this.formInterfaceContent,
        nzFooter: this.formInterfaceFooter,
        nzWrapClassName: 'vertical-center-modal',
        nzBodyStyle: { height: '350px', overflowY: 'scroll', paddingTop: '0px' },
      });
      this.modalRef.afterOpen.subscribe(() => {
        this.draggableModal();
        let titles = document.getElementsByClassName("title-modal");

        for (let i = 0; i < titles.length; i++) {
          titles[0].parentElement.parentElement.style.cursor = "move";
        }
      });
    }
  }

  submitInterfaceForm(event: Event) {
    this.updateInterface();
    event.preventDefault();
  }

  updateInterface() {
    this.modalRef.destroy();
    let interfaceEntity = new Interface();
    interfaceEntity.name = this.nameFormInterface;
    interfaceEntity.orientation = this.orientationFormInterface;
    interfaceEntity.roegenType = this.roegenTypeFormInterface;
    interfaceEntity.oppositeSubsystemType = this.oppositeSubsystemTypeFormInterface;
    interfaceEntity.sphere = this.sphereFormInterface;
    interfaceEntity.description = this.descriptionFormInterface;
    let interfaceValues = new Array<InterfaceValue>();
    for (let interfaceValue of this.listInterfaceValues) {
      let auxInterfaceValue = new InterfaceValue();
      auxInterfaceValue.value = interfaceValue.value;
      auxInterfaceValue.time = interfaceValue.time;
      auxInterfaceValue.source = interfaceValue.source;
      auxInterfaceValue.relativeTo = interfaceValue.relativeTo;
      auxInterfaceValue.unit = interfaceValue.unit;
      interfaceValues.push(auxInterfaceValue);
    }
    this.modelService.updateInterface(Number(this.interfaceIdForm), interfaceEntity);
    this.modelService.updateInterfaceValues(Number(this.interfaceIdForm), interfaceValues);
    if (this.oldNameFormInterface != this.nameFormInterface ||
      this.oldOrientationFormInterface != this.orientationFormInterface) {
      for (let diagram of this.getAllDiagramsModel()) {
        let data: ChangeInterfaceInGraphDto = {
          diagramId: Number(diagram.id),
          cellId: this.interfaceIdForm,
          name: this.nameFormInterface,
          orientation: this.orientationFormInterface,
        };
        ProcessorsDiagramComponentComponent.changeInterfaceInGraphEvent(data);
      }
      this.proccesorSubject.next({
        name: "refreshDiagram",
        data: null,
      });
    }
  }

  changeListInterfaceValues(event) {
    this.listInterfaceValues = event;
  }

  showSnackBarError(event: SnackErrorDto) {
    this.snackBarService.open(event.message, null, {
      duration: 2000,
    });
  }



}
