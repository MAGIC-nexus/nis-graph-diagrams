import { ProcessorsDiagramComponentComponent } from './processors-diagram-component.component';

export class CreateProcessorDto {
    pt: mxPoint;
    component: ProcessorsDiagramComponentComponent;
}

export class ProcessorFormDto {
    cellId;
}

export interface InterfaceFormDto {
    cellId;
}