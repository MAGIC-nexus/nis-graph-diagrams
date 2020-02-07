import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MatButtonModule,
  MatToolbarModule,
  MatListModule,
  MatIconModule,
  MatMenuModule,
  MatDialogModule
} from '@angular/material';  // Material components


import { NgZorroAntdModule, NZ_I18N, en_US } from 'ng-zorro-antd';

import { GraphicalEditorComponentComponent } from './graphical-editor-component/graphical-editor-component.component';
import { InterfacetypesDiagramComponentComponent } from './interfacetypes-diagram-component/interfacetypes-diagram-component.component';
import { ProcessorsDiagramComponentComponent } from './processors-diagram-component/processors-diagram-component.component';
import { MatTabsModule } from "@angular/material/tabs";
import { AngularSplitModule } from 'angular-split'; // https://bertrandg.github.io/angular-split/#/
import { TreeModule } from "angular-tree-component";
import { HttpClientModule } from '@angular/common/http';

@NgModule({
  declarations: [
    GraphicalEditorComponentComponent,
    InterfacetypesDiagramComponentComponent,
    ProcessorsDiagramComponentComponent],
  imports: [
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
    HttpClientModule,

    NgZorroAntdModule,
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
