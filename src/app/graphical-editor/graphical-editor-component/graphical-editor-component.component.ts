import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { TreeNode, IActionMapping, TREE_ACTIONS } from 'angular-tree-component';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-graphical-editor-component',
  templateUrl: './graphical-editor-component.component.html',
  styleUrls: ['./graphical-editor-component.component.css']
})
export class GraphicalEditorComponentComponent implements OnInit {

  @ViewChild('treeRoot', { static: false }) treeRoot: ElementRef;
  treeProccesorSubject:Subject<{name: string, data: any}> = new Subject();
  private readonly ID_DIAGRAMS = -3;
  private readonly ID_PROCESSOR = -2;
  private readonly ID_INTERFACETYPES = -1;

  nodes = [
    {
      id: this.ID_DIAGRAMS,
      name: 'Diagrams',
      description: "<test attribute>",
      children: [
        { id: 12, name: 'InterfaceTypes diagram #1' },
        { id: 13, name: 'Processors diagram #1' }
      ]
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
  };

  

  constructor() { }

  ngOnInit() {
    this.draggableModal();
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
    this.treeProccesorSubject.next({
      name:"mouseOverTree",
      data: event.target
    });
  }

  draggableModal() {
    let headersModal = <HTMLCollectionOf<HTMLDivElement>> document.getElementsByClassName("header-modal");
    for (let i = 0; i < headersModal.length; i++) {
      console.log(headersModal[i]);
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

}
