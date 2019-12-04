import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GraphicalEditorComponentComponent } from './graphical-editor-component.component';

describe('GraphicalEditorComponentComponent', () => {
  let component: GraphicalEditorComponentComponent;
  let fixture: ComponentFixture<GraphicalEditorComponentComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GraphicalEditorComponentComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GraphicalEditorComponentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
