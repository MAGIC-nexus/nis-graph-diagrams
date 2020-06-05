import { Injectable } from "@angular/core";
import { DiagramComponentHelper } from './graphical-editor/diagram-component-helper';
import {
    Relationship,
    EntityRelationshipPartOf,
    InterfaceTypeScaleChange,
    Processor,
    Interface,
    InterfaceOrientation,
    RoegenType, Sphere,
    ExchangeRelationship,
    ScaleRelationship
} from './model-manager';

const STYLE_INTERFACETYPESCALE = 'dashed=1;strokeColor=black;perimeterSpacing=4;labelBackgroundColor=white;fontStyle=1';
const STYLE_EXCHANGE = 'strokeColor=black;perimeterSpacing=4;labelBackgroundColor=white;fontStyle=1';
const STYLE_INTERFACESCALE = 'dashed=1;strokeColor=black;perimeterSpacing=4;labelBackgroundColor=white;fontStyle=1'
const STYLE_PART_OF = 'endArrow=block;endFill=0;strokeColor=black;perimeterSpacing=4;labelBackgroundColor=white;fontStyle=1';

interface CellsInterfacePositions {
    leftTop: Array<any>;
    leftBottom: Array<any>;
    rightTop: Array<any>;
    rightBottom: Array<any>;
    rightCenter: Array<any>;
}

enum POSTION_INTERFACE_Y {
    TOP,
    BOTTOM,
}


enum POSTION_INTERFACE_X {
    RIGHT,
    LEFT,
}

@Injectable()
export class DiagramManager {

    private readonly ID_DIAGRAMS = -3;
    private readonly ID_PROCESSOR = -2;
    private readonly ID_INTERFACETYPES = -1;

    public nodes = [
        {
            id: this.ID_DIAGRAMS,
            name: 'Diagrams',
            description: "<test attribute>",
            children: [],
        },
        {
            id: this.ID_PROCESSOR,
            name: 'Processors',
            children: []
        },
        {
            id: this.ID_INTERFACETYPES,
            name: 'Interface Types',
            children: []
        }

    ];

    updateTree() {
        this.nodes = DiagramComponentHelper.modelService.getTreeModelView();
    }

    printPartOfRelationship(relationshipId: number) {
        let relationship = DiagramComponentHelper.modelService.readRelationship(Number(relationshipId));
        if (relationship instanceof EntityRelationshipPartOf) {
            DiagramComponentHelper.modelService.diagrams.forEach((value, key) => {
                let cellSourceInDiagram = null;
                let cellTargetInDiagram = null;
                let alreadyExist = false;
                let diagramGraph = DiagramComponentHelper.getDiagram(key);
                for (let cell of diagramGraph.getChildCells()) {
                    if (cell.getAttribute("entityId") == relationship.originId) cellSourceInDiagram = cell;
                    if (cell.getAttribute("entityId") == relationship.destinationId) cellTargetInDiagram = cell;
                }
                for (let edge of diagramGraph.getChildEdges()) {
                    if (edge.getAttribute("idRelationship") == relationshipId) alreadyExist = true;
                }
                if (cellSourceInDiagram != null && cellTargetInDiagram != null && !alreadyExist) {
                    diagramGraph.getModel().beginUpdate();
                    let doc = mxUtils.createXmlDocument();
                    let partOfDoc = doc.createElement('partof');
                    partOfDoc.setAttribute("name", "name");
                    partOfDoc.setAttribute("idRelationship", relationshipId);
                    diagramGraph.insertEdge(diagramGraph.getDefaultParent(), null, partOfDoc,
                        cellSourceInDiagram, cellTargetInDiagram, STYLE_PART_OF);
                    diagramGraph.getModel().endUpdate();
                    let encoder = new mxCodec(null);
                    let xml = mxUtils.getXml(encoder.encode(diagramGraph.getModel()));
                    DiagramComponentHelper.modelService.setDiagramGraph(key, xml);
                }
            });
            DiagramComponentHelper.interfaceTypeSubject.next({
                name: "refreshDiagram",
                data: null,
            });
            DiagramComponentHelper.processorSubject.next({
                name: "refreshDiagram",
                data: null,
            });
        }
    }

    printInterfaceTypeScaleRelationship(relationshipId) {
        let relationship = DiagramComponentHelper.modelService.readRelationship(Number(relationshipId));
        if (relationship instanceof InterfaceTypeScaleChange) {
            DiagramComponentHelper.modelService.diagrams.forEach((value, key) => {
                let cellSourceInDiagram = null;
                let cellTargetInDiagram = null;
                let alreadyExist = false;
                let diagramGraph = DiagramComponentHelper.getDiagram(key);
                for (let cell of diagramGraph.getChildCells()) {
                    if (cell.getAttribute("entityId") == relationship.originId) cellSourceInDiagram = cell;
                    if (cell.getAttribute("entityId") == relationship.destinationId) cellTargetInDiagram = cell;
                }
                for (let edge of diagramGraph.getChildEdges()) {
                    if (edge.getAttribute("idRelationship") == relationshipId) alreadyExist = true;
                }
                if (cellSourceInDiagram != null && cellTargetInDiagram != null && !alreadyExist) {
                    diagramGraph.getModel().beginUpdate();
                    const doc = mxUtils.createXmlDocument();
                    const interfaceTypeScale = doc.createElement('interfacetypescale');
                    interfaceTypeScale.setAttribute("name", "name");
                    interfaceTypeScale.setAttribute("idRelationship", relationshipId);
                    diagramGraph.insertEdge(diagramGraph.getDefaultParent(), null, interfaceTypeScale,
                        cellSourceInDiagram, cellTargetInDiagram, STYLE_INTERFACETYPESCALE);
                    diagramGraph.getModel().endUpdate();
                    const encoder = new mxCodec(null);
                    const xml = mxUtils.getXml(encoder.encode(diagramGraph.getModel()));
                    DiagramComponentHelper.modelService.setDiagramGraph(key, xml);
                }
            });
        }
        DiagramComponentHelper.interfaceTypeSubject.next({
            name: "refreshDiagram",
            data: null,
        });
    }

    printInterfaceType(diagramId, entityId, x: number, y: number, width: number, height: number) {
        try {
            if (DiagramComponentHelper.modelService.readEntityAppearanceInDiagram(Number(diagramId),
                Number(entityId))) return;
            let entityModel = DiagramComponentHelper.modelService.readEntity(Number(entityId));
            let graph = DiagramComponentHelper.getDiagram(diagramId);
            let doc = mxUtils.createXmlDocument();
            let interfaceTypeDoc = doc.createElement('interfacetype');
            interfaceTypeDoc.setAttribute('name', entityModel.name);
            interfaceTypeDoc.setAttribute('entityId', entityId);
            graph.insertVertex(graph.getDefaultParent(), null, interfaceTypeDoc, x, y, width, height);
            DiagramComponentHelper.modelService.addEntityToDiagram(Number(diagramId), Number(entityId));
            DiagramComponentHelper.modelService.updateEntityAppearanceInDiagram(Number(diagramId),
                Number(entityId), width, height, x, y);
            let childrensRelationship = DiagramComponentHelper.modelService.getRelationshipChildren(Number(entityId));
            let parentsRelationship = DiagramComponentHelper.modelService.getRelationshipParent(Number(entityId));
            let encoder = new mxCodec(null);
            let xml = mxUtils.getXml(encoder.encode(graph.getModel()));
            DiagramComponentHelper.modelService.setDiagramGraph(Number(diagramId), xml);
            this.addPartOfRelationshipsInterfaceType(childrensRelationship, parentsRelationship);
        } catch (error) {
            console.log(error);
        }
    }

    addPartOfRelationshipsInterfaceType(childrensRelationship: Relationship[], parentsRelationship: Relationship[]) {
        for (let childrenRelationship of childrensRelationship) {
            if (childrenRelationship instanceof EntityRelationshipPartOf) {
                this.printPartOfRelationship(childrenRelationship.id);
            }
            if (childrenRelationship instanceof InterfaceTypeScaleChange) {
                this.printInterfaceTypeScaleRelationship(childrenRelationship.id);
            }
        }
        for (let parentRelationship of parentsRelationship) {
            if (parentRelationship instanceof EntityRelationshipPartOf) {
                this.printPartOfRelationship(parentRelationship.id);
            }
            if (parentRelationship instanceof InterfaceTypeScaleChange) {
                this.printInterfaceTypeScaleRelationship(parentRelationship.id);
            }
        }
    }

    changePostitionInterfaceTypeInDiagram(diagramId, entityId, x, y) {
        let diagramGraph = DiagramComponentHelper.getDiagram(Number(diagramId));
        for (let cell of diagramGraph.getChildCells()) {
            if (cell.getAttribute('entityId') == entityId) {
                diagramGraph.getModel().beginUpdate();
                let geometry = new mxGeometry(x, y, cell.geometry.width, cell.geometry.height);
                diagramGraph.getModel().setGeometry(cell, geometry);
                diagramGraph.getModel().endUpdate();
                DiagramComponentHelper.modelService.updateEntityAppearanceInDiagram(Number(diagramId), Number(cell.getAttribute("entityId", "")),
                    cell.geometry.width, cell.geometry.height, cell.geometry.x, cell.geometry.y);
                DiagramComponentHelper.updateGraphInModel(Number(diagramId), diagramGraph);
            }
        }
        DiagramComponentHelper.interfaceTypeSubject.next({
            name: "refreshDiagram",
            data: null,
        });
    }

    changeSizeInterfaceTypeInDiagram(diagramId, entityId, width, height) {
        let diagramGraph = DiagramComponentHelper.getDiagram(Number(diagramId));
        for (let cell of diagramGraph.getChildCells()) {
            if (cell.getAttribute('entityId') == entityId) {
                diagramGraph.getModel().beginUpdate();
                let geometry = new mxGeometry(cell.geometry.x, cell.geometry.y, width, height);
                diagramGraph.getModel().setGeometry(cell, geometry);
                diagramGraph.getModel().endUpdate();
                DiagramComponentHelper.modelService.updateEntityAppearanceInDiagram(Number(diagramId), Number(cell.getAttribute("entityId", "")),
                    cell.geometry.width, cell.geometry.height, cell.geometry.x, cell.geometry.y);
                DiagramComponentHelper.updateGraphInModel(Number(diagramId), diagramGraph);
            }
        }
        DiagramComponentHelper.interfaceTypeSubject.next({
            name: "refreshDiagram",
            data: null,
        });
    }

    printProcessor(diagramId, entityId, x: number, y: number, width: number, height: number) {
        try {
            if (DiagramComponentHelper.modelService.readEntityAppearanceInDiagram(Number(diagramId),
                Number(entityId))) return;
            let entityModel = <Processor>DiagramComponentHelper.modelService.readEntity(Number(entityId));
            let graph = DiagramComponentHelper.getDiagram(diagramId);
            let doc = mxUtils.createXmlDocument();
            let processorDoc = doc.createElement('processor');
            processorDoc.setAttribute('name', entityModel.name);
            processorDoc.setAttribute('entityId', entityId);
            processorDoc.setAttribute('minHeight', 0);
            processorDoc.setAttribute('minWidth', 0);
            let newCellProcessor = graph.insertVertex(graph.getDefaultParent(), null, processorDoc, x, y,
                width, height);
            DiagramComponentHelper.modelService.addEntityToDiagram(Number(diagramId), Number(entityId));
            DiagramComponentHelper.modelService.updateEntityAppearanceInDiagram(Number(diagramId),
                Number(entityId), width, height, x, y);
            let childrensRelationship = DiagramComponentHelper.modelService.getRelationshipChildren(Number(entityId));
            let parentsRelationship = DiagramComponentHelper.modelService.getRelationshipParent(Number(entityId));
            for (let interfaceModel of entityModel.interfaces) {
                this.newCellInterface(diagramId, interfaceModel.id, newCellProcessor, graph);
            }
            let encoder = new mxCodec(null);
            let xml = mxUtils.getXml(encoder.encode(graph.getModel()));
            DiagramComponentHelper.modelService.setDiagramGraph(Number(diagramId), xml);
            this.addRelationshipsProcessor(childrensRelationship, parentsRelationship);
            for (let interfaceModel of entityModel.interfaces) {
                let childrensRelationship = DiagramComponentHelper.modelService.getRelationshipChildren(Number(interfaceModel.id));
                let parentsRelationship = DiagramComponentHelper.modelService.getRelationshipParent(Number(interfaceModel.id));
                this.addRelationshipsInterface(childrensRelationship, parentsRelationship);
            }
        } catch (error) {
            console.log(error);
        }
    }

    addRelationshipsProcessor(childrensRelationship: Relationship[], parentsRelationship: Relationship[]) {
        for (let childrenRelationship of childrensRelationship) {
            if (childrenRelationship instanceof EntityRelationshipPartOf) {
                this.printPartOfRelationship(childrenRelationship.id);
            }
        }
        for (let parentRelationship of parentsRelationship) {
            if (parentRelationship instanceof EntityRelationshipPartOf) {
                this.printPartOfRelationship(parentRelationship.id);
            }
        }
    }

    newCellInterface(diagramId, entityId, cellTarget, graph: mxGraph) {
        let interfaceModel = <Interface>DiagramComponentHelper.modelService.readInterface(Number(entityId));
        let doc = mxUtils.createXmlDocument();
        let port = doc.createElement('interface');
        port.setAttribute('name', interfaceModel.name);
        port.setAttribute('entityId', interfaceModel.id);
        let style = "";
        if (interfaceModel.orientation == InterfaceOrientation.Input) {
            style = 'fontSize=9;shape=ellipse;resizable=0;fillColor=#FF8E8E;strokeColor=#FF0000;movable=0';
        }
        if (interfaceModel.orientation == InterfaceOrientation.Output) {
            style = 'fontSize=9;shape=ellipse;resizable=0;fillColor=#82FF89;strokeColor=#00FF0E;movable=0';
        }
        let portVertex = graph.insertVertex(cellTarget, null, port, 0, 0.5, 30, 30,
            style, true);
        portVertex.geometry.offset = new mxPoint(-15, -15);
        portVertex.geometry.relative = true;
        this.printCellsInterfacePosition(diagramId, graph, cellTarget);
        return portVertex;
    }

    printCellsInterfacePosition(diagramId, graph, cellProcessor) {
        cellProcessor.setAttribute('minWidth', 0);
        cellProcessor.setAttribute('minHeight', 0);

        let cellsInterfacePositon = this.cellsInterfacePositon(cellProcessor);
        if (cellsInterfacePositon.leftTop.length > 0)
            this.printCellsInterfacePositionX(diagramId, graph, cellProcessor, 30, cellsInterfacePositon.leftTop, 17, false, POSTION_INTERFACE_Y.TOP);
        if (cellsInterfacePositon.leftBottom.length > 0)
            this.printCellsInterfacePositionX(diagramId, graph, cellProcessor, 30, cellsInterfacePositon.leftBottom, 17, false, POSTION_INTERFACE_Y.BOTTOM);
        if (cellsInterfacePositon.rightTop.length > 0)
            this.printCellsInterfacePositionX(diagramId, graph, cellProcessor, 30, cellsInterfacePositon.rightTop, 17, true, POSTION_INTERFACE_Y.TOP);
        if (cellsInterfacePositon.rightBottom.length > 0)
            this.printCellsInterfacePositionX(diagramId, graph, cellProcessor, 30, cellsInterfacePositon.rightBottom, 17, true, POSTION_INTERFACE_Y.BOTTOM);
        if (cellsInterfacePositon.rightCenter.length > 0)
            this.printCellsInterfacePositionY(diagramId, graph, cellProcessor, 30, cellsInterfacePositon.rightCenter, 17, POSTION_INTERFACE_X.RIGHT);

    }

    printCellsInterfacePositionX(diagramId, graph, cellProcessor, widthInterface: number, cellsInterface: Array<any>, space: number, afterCenter: boolean,
        positionY: POSTION_INTERFACE_Y) {
        let minWidth = widthInterface * cellsInterface.length + space * (cellsInterface.length + 1);
        if (Number(cellProcessor.getAttribute('minWidth')) < (minWidth * 2))
            cellProcessor.setAttribute('minWidth', minWidth * 2);
        if (minWidth > (cellProcessor.geometry.width / 2)) {
            let geometry = new mxGeometry(cellProcessor.geometry.x, cellProcessor.geometry.y, minWidth * 2, cellProcessor.geometry.height);
            graph.getModel().setGeometry(cellProcessor, geometry);
            DiagramComponentHelper.modelService.updateEntityAppearanceInDiagram(Number(diagramId), cellProcessor.getAttribute('entityId'),
                minWidth * 2, cellProcessor.geometry.height, cellProcessor.geometry.x, cellProcessor.geometry.y);
        }
        let incInterface = (cellProcessor.geometry.width / 2) / (cellsInterface.length + 1);
        for (let i = 0; i < cellsInterface.length; i++) {
            let centerX = incInterface * (i + 1);
            if (afterCenter) centerX += (cellProcessor.geometry.width / 2);
            centerX = centerX / cellProcessor.geometry.width;
            let centerY = positionY == POSTION_INTERFACE_Y.TOP ? 0 : 1;
            let geometry = new mxGeometry(centerX, centerY, widthInterface, widthInterface);
            geometry.offset = new mxPoint(-15, -15);
            geometry.relative = 1;
            graph.getModel().setGeometry(cellsInterface[i], geometry);
        }
    }

    printCellsInterfacePositionY(diagramId, graph, cellProcessor, widthInterface: number, cellsInterface: Array<any>, space: number,
        positionX: POSTION_INTERFACE_X) {
        let minHeight = widthInterface * cellsInterface.length + space * (cellsInterface.length + 1);
        if (Number(cellProcessor.getAttribute('minHeight')) < minHeight)
            cellProcessor.setAttribute('minHeight', minHeight);
        if (minHeight > cellProcessor.geometry.height) {
            let geometry = new mxGeometry(cellProcessor.geometry.x, cellProcessor.geometry.y, cellProcessor.geometry.width, minHeight);
            graph.getModel().setGeometry(cellProcessor, geometry);
            DiagramComponentHelper.modelService.updateEntityAppearanceInDiagram(Number(diagramId), cellProcessor.getAttribute('entityId'),
                cellProcessor.geometry.width, minHeight, cellProcessor.geometry.x, cellProcessor.geometry.y);
        }
        let incInterface = cellProcessor.geometry.height / (cellsInterface.length + 1);
        for (let i = 0; i < cellsInterface.length; i++) {
            let centerY = incInterface * (i + 1);
            centerY = centerY / cellProcessor.geometry.height;
            let centerX = positionX == POSTION_INTERFACE_X.LEFT ? 0 : 1;
            let geometry = new mxGeometry(centerX, centerY, widthInterface, widthInterface);
            geometry.offset = new mxPoint(-15, -15);
            geometry.relative = 1;
            graph.getModel().setGeometry(cellsInterface[i], geometry);
        }
    }

    cellsInterfacePositon(cellProcessor): CellsInterfacePositions {
        let cellsPostion: CellsInterfacePositions = {
            leftTop: new Array(),
            leftBottom: new Array(),
            rightTop: new Array(),
            rightBottom: new Array(),
            rightCenter: new Array(),
        }
        if (cellProcessor.children)
            for (let cellChildren of cellProcessor.children) {
                let interfaceModel = <Interface>DiagramComponentHelper.modelService.readInterface(Number(cellChildren.getAttribute('entityId')));
                if (interfaceModel.orientation == InterfaceOrientation.Input) {
                    if (interfaceModel.roegenType == RoegenType.Flow && interfaceModel.sphere == Sphere.Technosphere)
                        cellsPostion.leftTop.push(cellChildren);
                    else if (interfaceModel.roegenType == RoegenType.Flow && interfaceModel.sphere == Sphere.Biosphere)
                        cellsPostion.leftBottom.push(cellChildren);
                    else if (interfaceModel.roegenType == RoegenType.Fund)
                        cellsPostion.rightTop.push(cellChildren);
                } else if (interfaceModel.orientation == InterfaceOrientation.Output) {
                    if (interfaceModel.roegenType == RoegenType.Flow && interfaceModel.sphere == Sphere.Biosphere)
                        cellsPostion.rightBottom.push(cellChildren);
                    else if (interfaceModel.roegenType == RoegenType.Flow && interfaceModel.sphere == Sphere.Technosphere)
                        cellsPostion.rightCenter.push(cellChildren);
                    else if (interfaceModel.roegenType == RoegenType.Fund)
                        cellsPostion.rightCenter.push(cellChildren);
                }
            }
        return cellsPostion;
    }

    changeInterfaceInGraph(interfaceId: number) {
        let interfaceModel = DiagramComponentHelper.modelService.readInterface(interfaceId);
        DiagramComponentHelper.modelService.diagrams.forEach((value, key) => {
            let diagramGraph = DiagramComponentHelper.getDiagram(key);
            diagramGraph.getModel().beginUpdate();
            for (let cell of diagramGraph.getChildCells(diagramGraph.getDefaultParent())) {
                if (cell.children)
                    for (let cellChildren of cell.children) {
                        if (cellChildren.getAttribute('entityId') == interfaceModel.id) {
                            cellChildren.setAttribute('name', interfaceModel.name);
                            this.changeInterfaceStyle(key, interfaceModel, cellChildren, diagramGraph);
                        }
                    }
            }
            diagramGraph.getModel().endUpdate();
            let encoder = new mxCodec(null);
            let xml = mxUtils.getXml(encoder.encode(diagramGraph.getModel()));
            DiagramComponentHelper.modelService.setDiagramGraph(key, xml);
        });
    }

    changeInterfaceStyle(diagramId, interfaceModel: Interface, cell, graph: mxGraph): void {
        if (interfaceModel.orientation == InterfaceOrientation.Input) {
            graph.setCellStyles(mxConstants.STYLE_STROKECOLOR, '#FF0000', [cell]);
            graph.setCellStyles(mxConstants.STYLE_FILLCOLOR, '#FF8E8E', [cell]);
        }
        if (interfaceModel.orientation == InterfaceOrientation.Output) {
            graph.setCellStyles(mxConstants.STYLE_STROKECOLOR, '#00FF0E', [cell]);
            graph.setCellStyles(mxConstants.STYLE_FILLCOLOR, '#82FF89', [cell]);
        }
        this.printCellsInterfacePosition(diagramId, graph, cell.parent);
    }

    addRelationshipsInterface(childrensRelationship: Relationship[], parentsRelationship: Relationship[]) {
        for (let childrenRelationship of childrensRelationship) {
            if (childrenRelationship instanceof ExchangeRelationship) {
                this.printExchangeRelationship(childrenRelationship.id);
            }
            else if (childrenRelationship instanceof ScaleRelationship) {
                this.printInterfaceScaleRelationship(childrenRelationship.id);
            }
        }
        for (let parentRelationship of parentsRelationship) {
            if (parentRelationship instanceof ExchangeRelationship) {
                this.printExchangeRelationship(parentRelationship.id);
            }
            else if (parentRelationship instanceof ScaleRelationship) {
                this.printInterfaceScaleRelationship(parentRelationship.id);
            }
        }
    }

    printExchangeRelationship(relationshipId) {
        let relationship = DiagramComponentHelper.modelService.readRelationship(Number(relationshipId));
        if (relationship instanceof ExchangeRelationship) {
            DiagramComponentHelper.modelService.diagrams.forEach((value, key) => {
                let diagramGraph = DiagramComponentHelper.getDiagram(key);
                let cellSourceInDiagram = null;
                let cellTargetInDiagram = null;
                let alreadyExist = false
                for (let edge of diagramGraph.getChildEdges()) {
                    if (edge.getAttribute("idRelationship") == relationship.id) {
                        alreadyExist = true;
                    }
                }
                for (let cell of diagramGraph.getChildCells()) {
                    for (let childrenCell of diagramGraph.getChildCells(cell)) {
                        if (childrenCell.getAttribute("entityId") == relationship.originId) cellSourceInDiagram = childrenCell;
                        if (childrenCell.getAttribute("entityId") == relationship.destinationId) cellTargetInDiagram = childrenCell;
                    }
                }
                if (cellSourceInDiagram && cellTargetInDiagram && !alreadyExist) {
                    diagramGraph.getModel().beginUpdate();
                    let doc = mxUtils.createXmlDocument();
                    let exchangeDoc = doc.createElement('exchange');
                    exchangeDoc.setAttribute("name", "name");
                    exchangeDoc.setAttribute("idRelationship", relationship.id);
                    diagramGraph.insertEdge(diagramGraph.getDefaultParent(), null, exchangeDoc,
                        cellSourceInDiagram, cellTargetInDiagram, STYLE_EXCHANGE);
                    diagramGraph.getModel().endUpdate();
                    let encoder = new mxCodec(null);
                    let xml = mxUtils.getXml(encoder.encode(diagramGraph.getModel()));
                    DiagramComponentHelper.modelService.setDiagramGraph(key, xml);
                }
            });
            DiagramComponentHelper.processorSubject.next({
                name: "refreshDiagram",
                data: null,
            });
        }
    }

    printInterfaceScaleRelationship(relationshipId) {
        let relationship = DiagramComponentHelper.modelService.readRelationship(Number(relationshipId));
        if (relationship instanceof ExchangeRelationship) {
            DiagramComponentHelper.modelService.diagrams.forEach((value, key) => {
                let diagramGraph = DiagramComponentHelper.getDiagram(key);
                let cellSourceInDiagram = null;
                let cellTargetInDiagram = null;
                let alreadyExist = false
                for (let edge of diagramGraph.getChildEdges()) {
                    if (edge.getAttribute("idRelationship") == relationship.id) {
                        alreadyExist = true;
                    }
                }
                for (let cell of diagramGraph.getChildCells()) {
                    for (let childrenCell of diagramGraph.getChildCells(cell)) {
                        if (childrenCell.getAttribute("entityId") == relationship.originId) cellSourceInDiagram = childrenCell;
                        if (childrenCell.getAttribute("entityId") == relationship.destinationId) cellTargetInDiagram = childrenCell;
                    }
                }
                if (cellSourceInDiagram && cellTargetInDiagram && !alreadyExist) {
                    diagramGraph.getModel().beginUpdate();
                    let doc = mxUtils.createXmlDocument();
                    let interfaceScaleDoc = doc.createElement('interfacescale');
                    interfaceScaleDoc.setAttribute("name", "name");
                    interfaceScaleDoc.setAttribute("idRelationship", relationship.id);
                    diagramGraph.insertEdge(diagramGraph.getDefaultParent(), null, interfaceScaleDoc,
                        cellSourceInDiagram, cellTargetInDiagram, STYLE_INTERFACESCALE);
                    diagramGraph.getModel().endUpdate();
                    let encoder = new mxCodec(null);
                    let xml = mxUtils.getXml(encoder.encode(diagramGraph.getModel()));
                    DiagramComponentHelper.modelService.setDiagramGraph(key, xml);
                }
            });
            DiagramComponentHelper.processorSubject.next({
                name: "refreshDiagram",
                data: null,
            });
        }
    }

    printInterface(interfaceId) {
        let interfaceModel = <Interface>DiagramComponentHelper.modelService.readInterface(interfaceId);
        let diagramManager = this;
        DiagramComponentHelper.modelService.diagrams.forEach((value, key) => {
            try {
                let diagramGraph = DiagramComponentHelper.getDiagram(key);
                for (let cell of diagramGraph.getChildCells()) {
                    if (cell.getAttribute("entityId") == interfaceModel.processorId) {
                        diagramGraph.getModel().beginUpdate();
                        diagramManager.newCellInterface(key, interfaceId, cell, diagramGraph);
                        diagramGraph.getModel().endUpdate();
                        DiagramComponentHelper.updateGraphInModel(key, diagramGraph);
                    }
                }
            } catch (err) {
                console.log(err);
            }
        });

        DiagramComponentHelper.processorSubject.next({
            name: "refreshDiagram",
            data: null,
        });
    }

    changeSizeProcessorInDiagram(diagramId, entityId, width, height) {
        let diagramGraph = DiagramComponentHelper.getDiagram(Number(diagramId));
        for (let cell of diagramGraph.getChildCells()) {
            if (cell.getAttribute('entityId') == entityId) {
                let cellWidth = width;
                let cellHeight = height;
                if (cellWidth < Number(cell.getAttribute('minWidth'))) {
                    cellWidth = Number(cell.getAttribute('minWidth'));
                }
                if (cellHeight < Number(cell.getAttribute('minHeight'))) {
                    cellHeight = Number(cell.getAttribute('minHeight'));
                }
                diagramGraph.getModel().beginUpdate();
                let geometry = new mxGeometry(cell.geometry.x, cell.geometry.y, cellWidth, cellHeight);
                diagramGraph.getModel().setGeometry(cell, geometry);
                diagramGraph.getModel().endUpdate();
                DiagramComponentHelper.modelService.updateEntityAppearanceInDiagram(Number(diagramId), Number(cell.getAttribute("entityId", "")),
                    cell.geometry.width, cell.geometry.height, cell.geometry.x, cell.geometry.y);
                DiagramComponentHelper.updateGraphInModel(Number(diagramId), diagramGraph);
            }
        }
        DiagramComponentHelper.processorSubject.next({
            name: "refreshDiagram",
            data: null,
        });
    }

    changePostitionProcessorInDiagram(diagramId, entityId, x, y) {
        let diagramGraph = DiagramComponentHelper.getDiagram(Number(diagramId));
        for (let cell of diagramGraph.getChildCells()) {
            if (cell.getAttribute('entityId') == entityId) {
                diagramGraph.getModel().beginUpdate();
                let geometry = new mxGeometry(x, y, cell.geometry.width, cell.geometry.height);
                diagramGraph.getModel().setGeometry(cell, geometry);
                diagramGraph.getModel().endUpdate();
                DiagramComponentHelper.modelService.updateEntityAppearanceInDiagram(Number(diagramId), Number(cell.getAttribute("entityId", "")),
                    cell.geometry.width, cell.geometry.height, cell.geometry.x, cell.geometry.y);
                DiagramComponentHelper.updateGraphInModel(Number(diagramId), diagramGraph);
            }
        }
        DiagramComponentHelper.processorSubject.next({
            name: "refreshDiagram",
            data: null,
        });
    }

    removeEntityInDiagram(diagramId, entityId) {
        let diagramGraph = DiagramComponentHelper.getDiagram(Number(diagramId));
        diagramGraph.getModel().beginUpdate();
        for (let cell of diagramGraph.getChildCells()) {
            if (cell.getAttribute("entityId") == entityId) {
                diagramGraph.removeCells([cell], true);
            };
        }
        diagramGraph.getModel().endUpdate();
        DiagramComponentHelper.updateGraphInModel(Number(diagramId), diagramGraph);
        DiagramComponentHelper.interfaceTypeSubject.next({
            name: "refreshDiagram",
            data: null,
        });
        DiagramComponentHelper.processorSubject.next({
            name: "refreshDiagram",
            data: null,
        });
    }

    removeRelationship(relationshipId) {
        DiagramComponentHelper.modelService.diagrams.forEach((diagram, id) => {
            let diagramGraph = DiagramComponentHelper.getDiagram(id);
            diagramGraph.getModel().beginUpdate();
            for (let edge of diagramGraph.getChildEdges(diagramGraph.getDefaultParent())) {
                if (edge.getAttribute('idRelationship', '') == relationshipId) {
                    diagramGraph.getModel().remove(edge);
                }
            }
            diagramGraph.getModel().endUpdate();
            let encoder = new mxCodec(null);
            let xml = mxUtils.getXml(encoder.encode(diagramGraph.getModel()));
            DiagramComponentHelper.modelService.setDiagramGraph(id, xml);
        });
        DiagramComponentHelper.interfaceTypeSubject.next({
            name: "refreshDiagram",
            data: null,
        });
        DiagramComponentHelper.processorSubject.next({
            name: "refreshDiagram",
            data: null,
        });
    }

    removeEntity(entityId) {
        DiagramComponentHelper.modelService.diagrams.forEach((value, key) => {
            let diagramGraph = DiagramComponentHelper.getDiagram(key);
            diagramGraph.getModel().beginUpdate();
            for (let cell of diagramGraph.getChildCells(diagramGraph.getDefaultParent())) {
                if (cell.getAttribute('entityId') == entityId) {
                    diagramGraph.removeCells([cell], true);
                }
            }
            diagramGraph.getModel().endUpdate();
            let encoder = new mxCodec(null);
            let xml = mxUtils.getXml(encoder.encode(diagramGraph.getModel()));
            DiagramComponentHelper.modelService.setDiagramGraph(key, xml);
        })
        DiagramComponentHelper.interfaceTypeSubject.next({
            name: "refreshDiagram",
            data: null,
        });
        DiagramComponentHelper.processorSubject.next({
            name: "refreshDiagram",
            data: null,
        });
    }




}