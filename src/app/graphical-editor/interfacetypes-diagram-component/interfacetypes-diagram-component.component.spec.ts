import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { InterfacetypesDiagramComponentComponent } from './interfacetypes-diagram-component.component';

describe('InterfacetypesDiagramComponentComponent', () => {
  let component: InterfacetypesDiagramComponentComponent;
  let fixture: ComponentFixture<InterfacetypesDiagramComponentComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ InterfacetypesDiagramComponentComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(InterfacetypesDiagramComponentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
