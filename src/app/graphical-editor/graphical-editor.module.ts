import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MatButtonModule,
  MatToolbarModule,
  MatListModule,
  MatIconModule,
  MatMenuModule,
  MatDialogModule,
  MatSnackBarModule
} from '@angular/material';  // Material components


import { 
  NZ_I18N, 
  en_US, 
  NzModalModule, 
  NzFormModule, 
  NzInputModule, 
  NzButtonModule, 
  NzRadioModule,
  NzTableModule,
  NzPopconfirmModule,
  NzListModule,
  NzSelectModule,
} from 'ng-zorro-antd';

import { GraphicalEditorComponentComponent } from './graphical-editor-component/graphical-editor-component.component';
import { InterfacetypesDiagramComponentComponent } from './interfacetypes-diagram-component/interfacetypes-diagram-component.component';
import { ProcessorsDiagramComponentComponent } from './processors-diagram-component/processors-diagram-component.component';
import { MatTabsModule } from "@angular/material/tabs";
import { AngularSplitModule } from 'angular-split'; // https://bertrandg.github.io/angular-split/#/
import { TreeModule } from "angular-tree-component";
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { InterfacelistComponent } from './interfacelist/interfacelist.component';

@NgModule({
  declarations: [
    GraphicalEditorComponentComponent,
    InterfacetypesDiagramComponentComponent,
    ProcessorsDiagramComponentComponent,
    InterfacelistComponent],
  imports: [
    ReactiveFormsModule,
    FormsModule,
    CommonModule,
    AngularSplitModule.forChild(),
    TreeModule.forRoot(),
    // Material -----------
    MatToolbarModule,
    MatMenuModule,
    MatIconModule,
    MatListModule,
    MatDialogModule,
    MatButtonModule,
    MatTabsModule,
    MatSnackBarModule,
    HttpClientModule,

    // NG-ZORRO
    NzModalModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzRadioModule,
    NzTableModule,
    NzPopconfirmModule,
    NzListModule,
    NzSelectModule,
  ],
  exports: [
      GraphicalEditorComponentComponent,
      // InterfacetypesDiagramComponentComponent,
      // ProcessorsDiagramComponentComponent
  ],
  providers: [
        // { provide: NgZone, useFactory: () => new NgZone({})},
        // { provide: ElementRef, useFactory: () => new ElementRef({})},
        // { provide: ChangeDetectorRef, useFactory: () => new ViewRef({})},
        //
        { provide: NZ_I18N, useValue: en_US }
        ]
})
export class GraphicalEditorModule {

}
