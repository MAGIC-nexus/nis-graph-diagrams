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

}
