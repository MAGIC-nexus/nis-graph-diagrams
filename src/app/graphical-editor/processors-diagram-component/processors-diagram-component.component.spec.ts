import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ProcessorsDiagramComponentComponent } from './processors-diagram-component.component';

describe('ProcessorsDiagramComponentComponent', () => {
  let component: ProcessorsDiagramComponentComponent;
  let fixture: ComponentFixture<ProcessorsDiagramComponentComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ProcessorsDiagramComponentComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ProcessorsDiagramComponentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
