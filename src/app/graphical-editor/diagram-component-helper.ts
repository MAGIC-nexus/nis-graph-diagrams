import { ModelService } from '../model-manager';

export class DiagramComponentHelper {

    static modelService: ModelService;

    static setModelService(modelService: ModelService) {
        DiagramComponentHelper.modelService =  modelService;
    }

    static loadDiagram(diagramId: bigint, graph : mxGraph) {
         let diagramXml = this.modelService.getDiagramGraph(diagramId);
        if (diagramXml == "") {
          this.updateGraphInModel(diagramId,graph);
        } else {
          graph.getModel().beginUpdate();
          try {
            let xmlDocument = mxUtils.parseXml(diagramXml);
            let decodec = new mxCodec(xmlDocument);
            decodec.decode(xmlDocument.documentElement, graph.getModel());
          } catch (error) {
            console.log(error);
          } finally {
            graph.getModel().endUpdate();
          }
        }
        
    }

    static updateGraphInModel(diagramId: bigint, graph: mxGraph) {
      let encoder = new mxCodec(null);
      let xml = mxUtils.getXml(encoder.encode(graph.getModel()));
      this.modelService.setDiagramGraph(diagramId,xml);
    }
}