import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { TreeNode } from 'angular-tree-component';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-graphical-editor-component',
  templateUrl: './graphical-editor-component.component.html',
  styleUrls: ['./graphical-editor-component.component.css']
})
export class GraphicalEditorComponentComponent implements OnInit {

  @ViewChild('treeRoot', { static: false }) treeRoot: ElementRef;
  parentSubject:Subject<any> = new Subject();

  nodes = [
    {
      id: 1,
      name: 'Diagrams',
      description: "<test attribute>",
      children: [
        { id: 12, name: 'InterfaceTypes diagram #1' },
        { id: 13, name: 'Processors diagram #1' }
      ]
    },
    {
      id: 2,
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
      id: 3,
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
  options = {};

  constructor() { }

  ngOnInit() {
  }


  setAttributeParentTreeNode(node: TreeNode) {

    if (node.level == 1) {
      return "none";
    } else if (node.level > 1) {
      
      let nodeParent = node;
      for(let i = node.level; i > 1; i--) {
        nodeParent = nodeParent.parent;
      }

      switch(nodeParent.id) {
        case 1:
          return "Diagrams"
        case 2:
          return "Processors"
        case 3:
          return "InterfaceTypes"
      }
    }

    return "";
  }

  TreeToggleExpanded(event) {
    this.parentSubject.next('toogleExpanded');
  }

}
