import { ProcessorsDiagramComponentComponent } from './processors-diagram-component.component';
import { InterfaceOrientation } from 'src/app/model-manager';

export class CreateProcessorDto {
    pt: mxPoint;
    component: ProcessorsDiagramComponentComponent;
}

export interface ChangeInterfaceInGraphDto {
    diagramId : number;
    cellId;
    name: string;
    orientation: InterfaceOrientation;
}