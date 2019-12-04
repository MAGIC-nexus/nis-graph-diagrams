import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import {
  MatTooltipModule
} from '@angular/material';  // Material components

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import {GraphicalEditorModule} from "./graphical-editor/graphical-editor.module";
import { AngularSplitModule } from 'angular-split'; // https://bertrandg.github.io/angular-split/#/
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';  // Angular Browser Animations

@NgModule({
  declarations: [
      AppComponent
  ],
  imports: [
    GraphicalEditorModule,
      AngularSplitModule.forRoot(),
    // Angular
    BrowserModule,
      BrowserAnimationsModule,
    AppRoutingModule,
      MatTooltipModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
