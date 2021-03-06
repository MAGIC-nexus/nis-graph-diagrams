// ---------------------------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------------
// MODEL classes, enums and MODEL service management class
// ---------------------------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------------
import * as $ from "jquery";

// ---------------------------------------------------------------------------------------------------------------------
// ENUMS

import {Injectable} from "@angular/core";

export enum ProcessorAccounted {
    Yes,
    No
}

export enum ProcessorSubsystemType {
    Local,
    Environment,
    External,
    ExternalEnvironment
}

export enum ProcessorFunctionalOrStructural {
    Functional,
    Structural,
    Notional
}

export enum Sphere {
    Biosphere,
    Technosphere
}

export enum RoegenType {
    Flow,
    Fund
}

export enum InterfaceOrientation {
    Input,
    Output
}

export enum RelationshipType {
    PartOf, // Processors and InterfaceTypes
    InterfaceTypeScale, // Between InterfaceTypes
    InterfaceScale, // Between Interfaces
    Exchange// Between Interfaces
}

export enum DiagramType {
    Processors,
    InterfaceTypes
}

export enum EntityTypes {
    Diagram,
    Processor,
    InterfaceType,
    Interface,
    Relationship
}

// ---------------------------------------------------------------------------------------------------------------------
// MODEL classes


export class Entity {
    id: number;
    name: string;
    description: string;
}

export class Processor extends Entity {
    hierarchyName: string;
    accounted: ProcessorAccounted;
    subsystemType: ProcessorSubsystemType;
    functionalOrStructural: ProcessorFunctionalOrStructural;
    system: string;
    geolocation: string;
    level: string;
    interfaces: Array<Interface>;
}

export class InterfaceType extends Entity {
    hierarchy: string;
    sphere: Sphere;
    roegenType: RoegenType;
    unit: string;
    oppositeSubsystemType: ProcessorSubsystemType;
    level: string;
}

export class InterfaceValue {
    value: string;
    unit: string;
    relativeTo: string; // Local Interface Name
    time: string;
    source: string;
}

export class Interface extends Entity {
    processorId: number;
    interfaceTypeId: number;
    orientation: InterfaceOrientation;
    sphere: Sphere;
    roegenType: RoegenType;
    oppositeSubsystemType: ProcessorSubsystemType;
    values: Array<InterfaceValue>;
}

export class GraphicalProperties {
    // Box size and position
    width: number;
    height: number;
    left: number;
    top: number;
}

// ---------------------------------------------------------------------------------------------------------------------
// RELATIONSHIPS (MODEL classes forming a hierarchy)

export class Relationship extends Entity {
    originId: number;
    destinationId: number;
}

export class EntityRelationship extends Relationship {

}

export class InterfaceRelationship extends Relationship {

}

// Processors and InterfaceTypes can be joined by them
export class EntityRelationshipPartOf extends EntityRelationship {
    amount: string; // 0 to 1 membership, regarding accounting. 1 for InterfaceTypes
}

// Only for InterfaceTypes
export class InterfaceTypeScaleChange extends EntityRelationship {
    originContextProcessorId: number; // Can be null
    destinationContextProcessorId: number; // Can be null
    scale: string;
    originUnit: string;
    destinationUnit: string
}

// Flow between Interfaces
export class ExchangeRelationship extends InterfaceRelationship {
    weight: string;
    backInterface: string;
}

// Scale between Interfaces
export class ScaleRelationship extends InterfaceRelationship {
    scale: string;
}

export class Diagram extends Entity {
    diagramType: DiagramType;
    entities: Map<number, GraphicalProperties>; // List of Processors or InterfaceTypes (not both) in the diagram, and their sizes and positions
    diagramXML: string;
}

// Utility function, convert from tab separated string to JSON for Spreadsheet
let getTextWidthCanvas;
function getTextWidth(text, font) {
    // re-use canvas object for better performance
    let canvas = getTextWidthCanvas || (getTextWidthCanvas = document.createElement("canvas"));
    let context = canvas.getContext("2d");
    context.font = font;
    let metrics = context.measureText(text);
    return metrics.width;
}

function convertTabSeparatedSheetToJSON(worksheetname: string, input: string, firstRowBold: boolean, firstColBold: boolean, embedded: boolean=true): object
{
  let out: object[] = [];
  let row: number = 0;
  let col: number;

  // Obtain FONT
  let f;
  if (embedded) {
    let spreadsheet = $("[name='spreadsheet_editor']").data("kendoSpreadsheet");
    let sheet = spreadsheet.activeSheet();
    let range = sheet.range("A1:A1");
    range.forEachCell(function (row, column, value) {
      f = "bold " + value.fontSize + " " + value.fontFamily;
    });
  } else {
    f = "bold 12 Sans Serif";
  }

  // Split line by line, composing each row as a list of dictionaries (a dictionary per cell)
  let maxNCols = 0;
  let colWidths = [];
  for (let line of input.split(/\r?\n/)) {
    col = 0;
    let cur = {index: row, cells: []};
    // For each line, split the line (by Tab)
    for (let cellValue of line.split("\t")) {
      let cell = {value: cellValue};
      // First line goes in bold, if activated
      if (col == 0 && firstColBold)
        cell["bold"] = true;
      if (row == 0 && firstRowBold)
        cell["bold"] = true;
      // Column widths
      if (row == 0)
        colWidths.push({width: Math.ceil(getTextWidth(cellValue, f))+40, autoWidth: true});

      cur.cells.push(cell);
      col++;
    }
    col ++;
    if (col > maxNCols)
      maxNCols = col;
    out.push(cur);
    row++;
  }

  return {name: worksheetname, rows: out, columns: colWidths}; // Array(maxNCols).fill({autoWidth: true})
}



// ---------------------------------------------------------------------------------------------------------------------
// MODEL service class, management of the model

@Injectable()
export class ModelService {
    // ----------------------------------------------------------------------------------

    /* Data structures to keep the model
    - Dictionary of diagrams (name, list of entities)
    - Counter for IDs
    - Dictionary of IDs (ID, object). Objects are InterfaceTypes, Processors, Interfaces and Relationships
    - Set of Processors, Set of InterfaceTypes
    - Dictionary of relationships (type, originId, destinationId) -> Relationship
      type
     */

    nextId: number;
    diagrams: Map<number, Diagram> = new Map<number, Diagram>();
    processors: Map<number, Processor> = new Map<number, Processor>();
    interfaceTypes: Map<number, InterfaceType> = new Map<number, InterfaceType>();
    interfaces: Map<number, Interface> = new Map<number, Interface>();
    // Set of Relationships (their IDs) of an Entity (Processor, InterfaceType, Interface)
    // IDs can be from: Processors, InterfaceTypes and Interfaces
    // Logically a Relationship will appear in two of the elements of the Map (we always will have an origin and a destination)
    entitiesRelationships: Map<number, Set<number>> = new Map<number, Set<number>>();
    allObjects: Map<number, any> = new Map<number, any>(); // Diagrams, processors, interface types, interfaces and relationships

    // If true, the function "exportGraphicalModelToSpreadsheet" executes normally
    embeddedInNISFrontend: boolean = false;

    constructor() {
        this.nextId = 1;
    }

    // Utility function to obtain unique IDs to be assigned to the different items (processors, interface types, interfaces and relationships)
    getNewId() { return ++this.nextId; }

    // ----------------------------------------------------------------------------------
    // EXPORTS (and one IMPORT)

    // Obtain a RO perspective for the TreeView component
    getTreeModelViewDiagrams() {
        let tmp = [];
        this.diagrams.forEach((diagram, id) => {
            tmp.push({modelId: id, name: diagram.name });
        })
        return tmp;
    }

    getTreeModelViewProcessors(parentId: number) {
        let n = [];
        let parent: Processor = parentId >= 0 ? this.allObjects.get(parentId) : null;
        for (let child of this.getEntityPartOfChildren(parentId)) {
            let p: Processor = this.allObjects.get(child);
            if (parentId < 0)
                p.hierarchyName = p.name;
            else
                p.hierarchyName = parent.hierarchyName + "." + p.name;
            let children2 = this.getTreeModelViewInterfaceTypes(p.id);
            if (children2.length > 0)
                n.push({modelId: p.id, name: p.name, children: this.getTreeModelViewProcessors(p.id)});
            else
                n.push({modelId: p.id, name: p.name});
        }
        return n;
    }

    getTreeModelViewInterfaceTypes(parentId: number) {
        // Search for all InterfaceTypes whose parent is "parentId"
        let n = [];
        for (let child of this.getEntityPartOfChildren(parentId)) {
            let it = this.allObjects.get(child);
            let children2 = this.getTreeModelViewInterfaceTypes(it.id);
            if (children2.length > 0)
                n.push({modelId: it.id, name: it.name, children: children2});
            else
                n.push({modelId: it.id, name: it.name});
        }
        return n;
    }

    getTreeModelView() {
        return [
            {id: -3, name: "Diagrams", children: this.getTreeModelViewDiagrams() },
            {id: -2, name: "Processors", children: this.getTreeModelViewProcessors(-2) },
            {id: -1, name: "Interface Types", children: this.getTreeModelViewInterfaceTypes(-1) }
        ];
    }

    // Obtain a list of the diagrams (for the Tab control)
    listDiagrams() {
        let tmp = [];
        this.diagrams.forEach( (diagram, id) => {
            tmp.push(diagram.name);
        });
        return tmp;
    }

    listProcessors() {
        let tmp : Processor[] = [];
        this.processors.forEach( (processors, id) => {
            tmp.push(processors);
        });
        return tmp;
    }

    // Get a RO perspective of a diagram in a mxGraph compatible structure. Afterwards, the controller would invoke code in example "https://jgraph.github.io/mxgraph/javascript/examples/codec.html"
    getDiagramGraph(diagramId: number) {
        let graph: string = "";
        let diagram = this.diagrams.get(diagramId);
        if (diagram) {
            graph = diagram.diagramXML;
        }
        return graph;
    }

    // Save diagram (normally, before closing). Before the call, the controller would invoke code in "https://jgraph.github.io/mxgraph/docs/js-api/files/io/mxCodec-js.html"
    setDiagramGraph(diagramId: number, xml: string) {
        let diagram = this.diagrams.get(diagramId);
        if (diagram) {
            diagram.diagramXML = xml;
        }
    }

    // Do the export from graphical diagrams to NIS spreadsheet
    exportGraphicalModelToSpreadsheet() {
      let tmp = this.exportToNISFormat();
      if (this.embeddedInNISFrontend) {
        let spreadsheet = $("[name='spreadsheet_editor']").data("kendoSpreadsheet");
        spreadsheet.fromJSON(tmp);
        for (let i = 0; i < spreadsheet.sheets().length; i++) {
          let ws = spreadsheet.sheets()[i];
          ws.frozenRows(1);
        }
        spreadsheet.activeSheet(spreadsheet.sheets()[1]);
        spreadsheet.activeSheet(spreadsheet.sheets()[0]);
      } else {
        console.log(tmp);
      }
    }

    // Export to JSON encoding of a list of Pandas DataFrames which can be converted to worksheet
    exportToNISFormat() {
        let json = {
            sheets: [
                this.exportInterfaceTypes(),
                this.exportScaleChangeMap(),
                this.exportBareProcessors(),
                this.exportInterfaces(),
                this.exportRelationships()
            ]
        };
        return json;
    }

    getEntitiesInPreorder(parentId: number) {
        let lst = [];
        if (parentId >= 0)
            lst.push(parentId);
        for (let child of this.getEntityPartOfChildren(parentId)) {
            let p = this.allObjects.get(child);
            lst.push(... this.getEntitiesInPreorder(p.id));
        }
        return lst;
    }

    generateAttributeGd(entityId : number, writtenDiagrams: Array<number>) : string {
        let gd = "";
        this.diagrams.forEach( (diagram, key) => {
            let gp = this.readEntityAppearanceInDiagram(key, entityId);
            if(gp) {
                if(writtenDiagrams.includes(key)) {
                    gd += `((${key}),(${gp.left},${gp.top},${gp.width},${gp.height})),`;
                } else {
                    gd += `((${key}, '${diagram.name}'),(${gp.left},${gp.top},${gp.width},${gp.height})),`;
                    writtenDiagrams.push(key);
                }
            }
        })
        if (gd != "") {
            gd = gd.substring(0, gd.length - 1);
        }
        return gd;
    }

    exportInterfaceTypes() {
      // Header
      // TODO - Diagram attribute: @diagrams="{'<diagram>', w, h, x, y, color}, ..."
      let writtenDiagrams = new Array<number>(); 
      let s = new Array("InterfaceTypeHierarchy", "InterfaceType", "Sphere", "RoegenType", "ParentInterfaceType", "Level", "Formula", "Description", "Unit", "OppositeSubsystemType", "Attributes", "@gd_id", "@gd").join("\t");
      // Each row
      let tmp = this.getEntitiesInPreorder(-1);
      for (let itypeId of this.getEntitiesInPreorder(-1)) {
        let it = this.interfaceTypes.get(itypeId);
        let parents = this.getEntityPartOfParents(itypeId);
        let parent = "";
        let gdAttribute = this.generateAttributeGd(itypeId, writtenDiagrams);
        if (parents.length > 0)
          parent = this.allObjects.get(parents[0]).name;
        s += "\n" + new Array(it.hierarchy, it.name, Sphere[it.sphere], RoegenType[it.roegenType], parent, it.level, "", it.description, it.unit, ProcessorSubsystemType[it.oppositeSubsystemType], "", itypeId.toString(), gdAttribute).join("\t");
      }
      return convertTabSeparatedSheetToJSON("IntefaceTypes", s, true, false, this.embeddedInNISFrontend);
    }

    exportScaleChangeMap() {
      // Header
      let s = new Array("OriginHierarchy", "OriginInterfaceType", "DestinationHierarchy", "DestinationInterfaceType", "OriginContext", "DestinationContext", "Scale", "OriginUnit", "DestinationUnit").join("\t")
      for (let itypeId of this.interfaceTypes.keys()) {
        let oIType: InterfaceType = this.allObjects.get(itypeId);
        for (let relId of this.entitiesRelationships.get(itypeId)) {
          let r = this.allObjects.get(relId);
          if (r instanceof InterfaceTypeScaleChange && r.originId == itypeId) {
            let dIType: InterfaceType = this.allObjects.get(r.destinationId);
            let oCtx: string = r.originContextProcessorId ? this.allObjects.get(r.originContextProcessorId).name : "";
            let dCtx: string = r.destinationContextProcessorId ? this.allObjects.get(r.destinationContextProcessorId).name : "";
            s += "\n" + new Array(oIType.hierarchy, oIType.name, dIType.hierarchy, dIType.name, oCtx, dCtx, r.scale, r.originUnit, r.destinationUnit).join("\t");
          }
        }
      }
      return convertTabSeparatedSheetToJSON("ScaleChangeMap", s, true, false, this.embeddedInNISFrontend);
    }

    exportBareProcessors() {
        let bps = [];
        // Header
        // TODO - Diagram attribute: @diagrams="{'<diagram>', w, h, x, y, color}, ..."
        let writtenDiagrams = new Array<number>();
        let s = new Array("ProcessorGroup", "Processor", "ParentProcessor", "SubsystemType", "System", "FunctionalOrStructural", "Accounted", "Level", "Stock", "Description", "GeolocationRef", "GeolocationCode", "GeolocationLatLong", "Attributes", "@gd_id", "@gd").join("\t");
        for (let pId of this.getEntitiesInPreorder(-2)) {
            let p: Processor = this.allObjects.get(pId);
            p.hierarchyName = p.name;
            let parents = this.getEntityPartOfParents(pId);
            let parent = "";
            let gdAttribute = this.generateAttributeGd(pId, writtenDiagrams);
            if (parents.length > 0)
                parent = this.allObjects.get(parents[0]).hierarchyName;
            s += "\n" + new Array("", p.hierarchyName, parent, ProcessorSubsystemType[p.subsystemType], p.system, ProcessorFunctionalOrStructural[p.functionalOrStructural], ProcessorAccounted[p.accounted], p.level, "", p.description, "", "", p.geolocation, "", pId.toString(), gdAttribute).join("\t");
        }
      return convertTabSeparatedSheetToJSON("BareProcessors", s, true, false, this.embeddedInNISFrontend);
    }

    exportInterfaces() {
      // Header
      let s = new Array("Processor", "InterfaceType", "Interface", "Sphere", "RoegenType", "Orientation",
        "OppositeSubsystemType", "GeolocationRef", "GeolocationCode", "InterfaceAttributes", "Value",
        "Unit", "RelativeTo", "Uncertainty", "Assessment", "PedigreeMatrix", "Pedigree", "Time",
        "Source", "NumberAttributes", "Comments").join("\t");
      for (let ifaceId of this.interfaces.keys()) {
        let iface: Interface = this.allObjects.get(ifaceId);
        let firstValue = true;
        let p: Processor = this.allObjects.get(iface.processorId);
        let it: Processor = this.allObjects.get(iface.interfaceTypeId);
        if (iface.values.length == 0) {
          s += "\n" + new Array(p.name, it.name, iface.name, Sphere[iface.sphere], RoegenType[iface.roegenType],
            InterfaceOrientation[iface.orientation], ProcessorSubsystemType[iface.oppositeSubsystemType], "", "", "",
            "", "", "", "", "", "", "", "", "", "", "").join("\t");
        } else {
          for (let val of iface.values) {
            if (firstValue)
              s += "\n" + new Array(p.name, it.name, iface.name, Sphere[iface.sphere], RoegenType[iface.roegenType],
                InterfaceOrientation[iface.orientation], ProcessorSubsystemType[iface.oppositeSubsystemType], "", "", "",
                val.value, val.unit, val.relativeTo, "", "", "", "", val.time, val.source, "", "").join("\t");
            else
              s += "\n" + new Array(p.name, it.name, iface.name, "", "", "", "", "", "", "", val.value, val.unit, val.relativeTo, "", "", "", "", val.time, val.source, "", "").join("\t");
            firstValue = false;
          }
        }
      }
      return convertTabSeparatedSheetToJSON("Interfaces", s, true, false, this.embeddedInNISFrontend);
    }

    exportRelationships() {
        // Header
        let s = new Array("OriginProcessors", "OriginInterface", "DestinationProcessors", "DestinationInterface", "BackInterface", "RelationType", "Weight", "ChangeOfTypeScale", "OriginCardinality", "DestinationCardinality", "Attributes").join("\t");
        let alreadyProcessed = new Set<number>();
        for (let ifaceId of this.interfaces.keys()) {
            if (!this.entitiesRelationships.has(ifaceId))
              continue;
            for (let relId of this.entitiesRelationships.get(ifaceId)) {
                if (alreadyProcessed.has(relId))
                    continue;
                alreadyProcessed.add(relId);
                let r = this.allObjects.get(relId);
                if (r instanceof ExchangeRelationship || r instanceof ScaleRelationship) {
                    let oIface: Interface = this.allObjects.get(r.originId);
                    let oProc: Processor = this.allObjects.get(oIface.processorId);
                    let dIface: Interface = this.allObjects.get(r.destinationId);
                    let dProc: Processor = this.allObjects.get(dIface.processorId);
                    if (r instanceof ExchangeRelationship)
                      s += "\n" + new Array(oProc.hierarchyName, oIface.name, dProc.hierarchyName, dIface.name, r.backInterface, ">", r.weight, "", "", "", "").join("\t");
                    else
                      s += "\n" + new Array(oProc.hierarchyName, oIface.name, dProc.hierarchyName, dIface.name, "", "Scale", r.scale, "", "", "", "").join("\t");
                }
            }
        }
      return convertTabSeparatedSheetToJSON("Relationships", s, true, false, this.embeddedInNISFrontend);
    }

    // Import JSON encoding a list of Pandas DataFrames coming from a NIS worksheet
    importFromNISFormat(s) {
        // TODO While importing, obtain the highest ID to initialize "this.nextId"
    }

    // ----------------------------------------------------------------------------------
    // DIAGRAMS

    // Create an new, empty diagram of certain type
    createDiagram(diagramName: string, diagramType: DiagramType) {
        let found = false;
        this.diagrams.forEach((value, key) => {
            if(value.name == diagramName) {
                found = true;
            }
        });
        if (!found) {
            let diagram = new Diagram();
            diagram.id = this.getNewId();
            diagram.name = diagramName;
            diagram.diagramType = diagramType;
            diagram.entities = new Map<number, GraphicalProperties>(); // Empty diagram
            diagram.diagramXML = "";
            this.diagrams.set(diagram.id, diagram);
            this.allObjects.set(diagram.id, diagram);
            return diagram.id;
        } else {
            // Name exists!
            return -1;
        }
    }

    deleteDiagram(diagramId: number) {
        let deleted = false;
        let diagram = this.diagrams.get(diagramId);
        if (diagram) {
            deleted = true;
            this.allObjects.delete(diagramId);
            this.diagrams.delete(diagramId);
        }
        return deleted;
    }

    readDiagram(diagramId: number) {
        let e = this.allObjects.get(diagramId);
        if (e) {
            return e;
        } else {
            return null; // Not valid ID
        }
    }

    addEntityToDiagram(diagramId: number, entityId: number) {
        let diagram = this.diagrams.get(diagramId);
        if(diagram) {
            let p = new GraphicalProperties();
            p.height = 80;
            p.width = 100;
            p.left = 10;
            p.top = 10;
            diagram.entities.set(entityId, p);
        }
    }

    removeEntityFromDiagram(diagramId: number, entityId: number) {
        let diagram = this.diagrams.get(diagramId);
        if(diagram) {
            return diagram.entities.delete(entityId);
        }
        return false;
    }

    // Set the size and position of the box representing an entity in a diagram
    updateEntityAppearanceInDiagram(diagramId: number, entityId: number,
                                    width: number, height: number, left: number, top: number) {
        let diagram = this.diagrams.get(diagramId);
        if(diagram) {
            let p = diagram.entities.get(entityId);
            if(p) {
                p.height = height;
                p.width = width;
                p.left = left;
                p.top = top;
            }
        }
    }

    // Obtain the size and position of the box representing an entity in a diagram
    readEntityAppearanceInDiagram(diagramId: number, entityId: number) {
        let diagram = this.diagrams.get(diagramId);
        if(diagram) {
            return diagram.entities.get(entityId);
        }
        return null;
    }

    // ----------------------------------------------------------------------------------
    // ENTITIES (both Processors and InterfaceTypes)

    createEntity(entityType, name) {
        let e_id: number;
        if (entityType == EntityTypes.Processor) {
            let p = new Processor();
            p.id = this.getNewId();
            p.name = name;
            p.level = "n";
            p.accounted = ProcessorAccounted.Yes;
            p.functionalOrStructural = ProcessorFunctionalOrStructural.Functional;
            p.subsystemType = ProcessorSubsystemType.Local;
            p.system = "";
            p.geolocation = "";
            p.interfaces = new Array<Interface>();
            this.allObjects.set(p.id, p);
            this.processors.set(p.id, p);
            e_id = p.id;
        } else if (entityType == EntityTypes.InterfaceType) {
            let it = new InterfaceType();
            it.id = this.getNewId();
            it.name = name;
            it.hierarchy = "";
            it.oppositeSubsystemType = ProcessorSubsystemType.Environment;
            it.roegenType = RoegenType.Flow;
            it.sphere = Sphere.Technosphere;
            it.unit = "";
            this.allObjects.set(it.id, it);
            this.interfaceTypes.set(it.id, it);
            e_id = it.id;
        }
        let s = new Set<number>();
        this.entitiesRelationships.set(e_id, s);
        return e_id;
    }

    /* Behavior when deleting
        - Super delete: delete from all diagrams. NOTE: THE CONTROLLER MUST DELETE DIRECTLY FROM EACH MXGRAPH !!!!
        - Cautious delete: delete if not present in diagrams
     */
    deleteEntity(entityId, complete) {
        // TODO Check that the entity is not in any diagram
        let e = this.allObjects.get(entityId);
        if (e) {
            let cont = 0;
            this.diagrams.forEach( (diagram, id) => {
                if(diagram.entities.get(entityId)) {
                    cont++;
                    if(complete) {
                        diagram.entities.delete(entityId);
                    }
                }
            });
            if (cont == 0 || (cont>0 && complete)) {
                // Delete relationships where the entity appears
                for (let relationshipId of this.entitiesRelationships.get(entityId)) {
                    this.deleteRelationship(relationshipId);
                }
                // And second, delete the set of relationships attached to the entity
                this.entitiesRelationships.delete(entityId);
                // Delete the entity from the registries
                this.allObjects.delete(entityId);
                if (e instanceof Processor) {
                    this.processors.delete(entityId);
                } else {
                    this.interfaceTypes.delete(entityId);
                }
                return 0; // Entity completely deleted
            } else if (cont>0 && !complete) {
                return cont; // Entity is present in "cont" diagrams and "complete" is FALSE
            }
        } else {
            return -1; // Entity does not exist
        }
    }

    updateEntity(entityId, properties: Processor | InterfaceType) {
        let e = this.allObjects.get(entityId);
        if (e) {
            if (e instanceof Processor) {
                if (properties instanceof Processor) {
                    // Update
                    e.name = properties.name;
                    e.level = properties.level;
                    e.geolocation = properties.geolocation;
                    e.system = properties.system;
                    e.functionalOrStructural = properties.functionalOrStructural;
                    e.accounted = properties.accounted;
                    e.subsystemType = properties.subsystemType;
                    e.description = properties.description;
                    // TODO Copy Interfaces?
                    return 1; // OK
                } else {
                    return -1; // Wrong properties object
                }
            } else if (e instanceof InterfaceType) {
                if (properties instanceof InterfaceType) {
                    // Update
                    e.name = properties.name;
                    e.sphere = properties.sphere;
                    e.roegenType = properties.roegenType;
                    e.oppositeSubsystemType = properties.oppositeSubsystemType;
                    e.hierarchy = properties.hierarchy;
                    e.unit = properties.unit;
                    e.description = properties.description;
                    return 1; // OK
                } else {
                    return -1; // Wrong properties object
                }
            }
        } else {
            return 0;
        }
    }

    updateEntityName(entityId : number, name : string) {
        let e = this.allObjects.get(entityId);
        if (e) {
            if (e instanceof Processor || e instanceof InterfaceType) {
                e.name = name;
            }
        } else {
            return 0;
        }
    }

    readEntity(entityId: number): Processor | InterfaceType {
        let e = this.allObjects.get(entityId);
        if (e) {
            if (e instanceof Processor || e instanceof InterfaceType) {
                return this.allObjects.get(entityId);
            } else {
                return null; // Not ID of Processor nor InterfaceType
            }
        } else {
            return null; // Not valid ID
        }
    }

    // ----------------------------------------------------------------------------------
    // PROCESSORS (because they are ENTITIES, see previous block of functions)

    // We only need functions to manage the set of Interfaces of a processor
    createInterface(processorId, interfaceTypeId) {
        let p = this.processors.get(processorId);
        if (p) {
            let it = this.interfaceTypes.get(interfaceTypeId);
            if (it) {
                let i = new Interface();
                i.id = this.getNewId();
                i.name = it.name;
                i.interfaceTypeId = interfaceTypeId;
                i.processorId = processorId;
                i.oppositeSubsystemType = it.oppositeSubsystemType;
                i.orientation = InterfaceOrientation.Input;
                i.roegenType = it.roegenType;
                i.sphere = it.sphere;
                i.values = new Array<InterfaceValue>();
                // Insert Interface into the Processor
                p.interfaces.push(i);
                this.interfaces.set(i.id, i);
                // Register Interface in the full registry
                this.allObjects.set(i.id, i);
                return i.id;
            } else {
                return -1; // InterfaceType does not exist
            }
        } else {
            return -2; // Processor does not exist
        }
    }

    deleteInterface(interfaceId) {
        let i: Interface = this.allObjects.get(interfaceId);
        if (i) {
            let p: Processor = this.processors.get(i.processorId);
            if (p) {
                // Delete from Processor Interfaces list
                for (let j=0; j<p.interfaces.length; j++) {
                    if (p.interfaces[j].id == i.id) {
                        p.interfaces.splice(j, 1);
                        break
                    }
                }
                this.interfaces.delete(interfaceId);
                this.allObjects.delete(interfaceId);
                return 0;
            } else {
                return -2; // Could not find Processor
            }
        } else {
            return -1; // Could not find Interface
        }
    }

    updateInterface(interfaceId, properties: Interface) {
        let i: Interface = this.allObjects.get(interfaceId);
        if (i) {
            if (i.orientation != properties.orientation) {
                if (this.interfaceCanChangeOrientation(i, properties.orientation))
                i.orientation = properties.orientation;
            }
            i.name = properties.name;
            i.sphere = properties.sphere;
            i.roegenType = properties.roegenType;
            i.oppositeSubsystemType = properties.oppositeSubsystemType;
            i.description = properties.description;
            return 0;
        } else {
            return -1; // Could not find Interface
        }
    }

    interfaceCanChangeOrientation(interfaceModel : Interface, orientation) : boolean {
        let canChangeOrientation = true;
        let relationshipsInterface = this.entitiesRelationships.get(interfaceModel.id);
        if(relationshipsInterface)
        for (let relationshipInterfaceId of relationshipsInterface) {
            let relationshipInterface = this.readRelationship(relationshipInterfaceId);
            if (relationshipInterface instanceof ExchangeRelationship) {
                if(relationshipInterface.originId == interfaceModel.id && orientation == InterfaceOrientation.Input) {
                    let existPartOfRelationship = false;
                    let interfaceModelDestination = <Interface> this.readInterface(relationshipInterface.destinationId);
                    for (let relationshipParent of this.getRelationshipChildren(interfaceModel.processorId)) {
                        console.log(relationshipParent);
                        if (relationshipParent instanceof EntityRelationshipPartOf && relationshipParent.originId == interfaceModelDestination.processorId)
                        existPartOfRelationship = true;
                    }
                    canChangeOrientation = existPartOfRelationship;
                }
                if(relationshipInterface.destinationId == interfaceModel.id && orientation == InterfaceOrientation.Output) {
                    let existPartOfRelationship = false;
                    let interfaceModelOrigin = <Interface> this.readInterface(relationshipInterface.originId);
                    for (let relationshipParent of this.getRelationshipChildren(interfaceModel.processorId)) {
                        if (relationshipParent instanceof EntityRelationshipPartOf && relationshipParent.originId == interfaceModelOrigin.processorId)
                        existPartOfRelationship = true;
                    }
                    canChangeOrientation = existPartOfRelationship;
                }
            }
        }
        return canChangeOrientation;
    }

    updateInterfaceValues(interfaceId, values: Array<InterfaceValue>) {
        let i: Interface = this.allObjects.get(interfaceId);
        if (i) {
            i.values = values;
        } else {
            return -1; // Could not find Interface
        }
    }

    readInterface(interfaceId: number) {
        return this.allObjects.get(interfaceId);
    }

    // ----------------------------------------------------------------------------------
    // INTERFACETYPES (because they are ENTITIES, see the ENTITIES block of functions)

    // ----------------------------------------------------------------------------------
    // RELATIONSHIPS
    createRelationship(relationType: RelationshipType, originId, destinationId) {
        let r = null;
        switch (relationType) {
            case RelationshipType.PartOf: {
                r = new EntityRelationshipPartOf();
                r.amount = "";
                break;
            }
            case RelationshipType.Exchange: {
                r = new ExchangeRelationship();
                r.weight = "";
                break;
            }
            case RelationshipType.InterfaceScale: {
                r = new ScaleRelationship();
                r.scale = "";
                break;
            }
            case RelationshipType.InterfaceTypeScale: {
                r = new InterfaceTypeScaleChange();
                r.originContextProcessorId = null;
                r.destinationContextProcessorId = null;
                r.scale = "";
                r.originUnit = "";
                r.destinationUnit = "";
                break;
            }
        }
        r.id = this.getNewId();
        r.destinationId = destinationId;
        r.originId = originId;
        r.name = "";
        let s: Set<number> = this.entitiesRelationships.get(originId);
        if (!s) {
            s = new Set<number>();
            this.entitiesRelationships.set(originId, s);
        }
        s.add(r.id);
        s = this.entitiesRelationships.get(destinationId);
        if (!s) {
            s = new Set<number>();
            this.entitiesRelationships.set(destinationId, s);
        }
        s.add(r.id);
        this.allObjects.set(r.id, r);
        return r.id;
    }

    checkCanCreateRelationship(relationType: RelationshipType, originId, destinationId) {
        switch(relationType) {
            case RelationshipType.PartOf:
                return this.checkCanCreateRelationshipPartOf(originId, destinationId);
            case RelationshipType.Exchange:
                return this.checkCanCreateRelationshipExchange(originId, destinationId);
            case RelationshipType.InterfaceScale:
                return this.checkCanCreateRelationshipInterfaceScale(originId, destinationId);
            case RelationshipType.InterfaceTypeScale:
                return this.checkCanCreateRelationshipInterfaceTypeScale(originId, destinationId);
        }
    }

    private detectCircularHierarchy(parentId, originId, circularHierarchy : {value : boolean}) {
        for (let entityId of this.getEntityPartOfChildren(parentId)) {
            if (entityId == originId) {
                circularHierarchy.value = true;
                return;
            }
            this.detectCircularHierarchy(entityId, originId, circularHierarchy);
        }
    }

    private checkIfExistRelationshipBetweenEntities(entityId1, entityId2) : boolean {
        for(let relId of this.entitiesRelationships.get(entityId1)) {
            let r = this.allObjects.get(relId);
            if (r instanceof EntityRelationship ) {
                if (r.destinationId == entityId2 || r.originId == entityId2) return false;
            }
        }
        return true;
    }

    private checkCanCreateRelationshipPartOf(originId, destinationId) : string {
        let originEntity = this.readEntity(originId);
        let destinationEntity = this.readEntity(destinationId);
        if (originId == destinationId) {
            return "Cannot create a relationship of the same entity"
        }
        if (originEntity instanceof InterfaceType && destinationEntity instanceof InterfaceType) {
            if(!this.checkIfExistRelationshipBetweenEntities(originId, destinationId))
                return "Cannot create a relationship since there is already a relationship between them";
        }
        let circularHierarchy = { value : false };
        this.detectCircularHierarchy(destinationId, originId, circularHierarchy);
        if (circularHierarchy.value) {
            return "Cannot create a relationship because it would become a circular hierarchy"
        }
        return "";
    }

    private checkCanCreateRelationshipExchange(originId, destinationId) : string {
        if (originId == destinationId) {
            return "Cannot make a relationship of the same entity"
        }
        let interfaceOrigin  = this.readInterface(originId);
        let interfaceDestination = this.readInterface(destinationId);
        if (interfaceOrigin instanceof Interface && interfaceDestination instanceof Interface) {
            if (interfaceOrigin.orientation == InterfaceOrientation.Input && interfaceDestination.orientation == InterfaceOrientation.Input) {
                for (let relationship of this.getRelationshipChildren(interfaceOrigin.processorId)) {
                    if (relationship instanceof EntityRelationship && relationship.originId == interfaceDestination.processorId) {
                        return "";
                    }
                }
            }
            if (interfaceOrigin.orientation == InterfaceOrientation.Output && interfaceDestination.orientation == InterfaceOrientation.Output) {
                for (let relationship of this.getRelationshipParent(interfaceOrigin.processorId)) {
                    if (relationship instanceof EntityRelationship && relationship.destinationId == interfaceDestination.processorId) {
                        return "";
                    }
                }
            }
            if (interfaceOrigin.orientation == InterfaceOrientation.Output && interfaceDestination.orientation == InterfaceOrientation.Input) {
                return '';
            }
            return "Cannot create a relationship";
        } else {
            return 'A relationship of type "exchange" should be the union between two entity of type "interface"';
        }
    }

    private checkCanCreateRelationshipInterfaceScale(originId, destinationId) : string {
        if (originId == destinationId) {
            return "Cannot make a relationship of the same entity"
        }
        let interfaceOrigin  = this.readInterface(originId);
        let interfaceDestination = this.readInterface(destinationId);
        if (interfaceOrigin instanceof Interface && interfaceDestination instanceof Interface) {
            
            return "";
        } else {
            return 'A relationship of type "exchange" should be the union between two entity of type "interface"';
        }
    }

    private checkCanCreateRelationshipInterfaceTypeScale(originId, destinationId) : string {
        if (originId == destinationId) {
            return "Cannot make a relationship of the same entity"
        }
        let interfaceOrigin  = this.readEntity(originId);
        let interfaceDestination = this.readEntity(destinationId);
        if (interfaceOrigin instanceof InterfaceType && interfaceDestination instanceof InterfaceType) {
            if(!this.checkIfExistRelationshipBetweenEntities(originId, destinationId))
                return "Cannot make a relation since there is already a relationship between them";
            return "";
        } else {
            return 'A relationship of type "interfaceTypeScale" should be the union between two entity of type "interfaceType"';
        }
    }

    deleteRelationship(relationshipId) {
        let r: Relationship = this.allObjects.get(relationshipId);
        if (r) {
            // Delete from the origin
            let rels: Set<number> = this.entitiesRelationships.get(r.originId);
            rels.delete(relationshipId);
            // Delete from the destination
            rels = this.entitiesRelationships.get(r.destinationId);
            rels.delete(relationshipId);
            // Delete from registry
            this.allObjects.delete(relationshipId);

            return 0;
        } else {
            return -1; // Relationship not found
        }
    }

    checkCanDeleteRelationshipPartof(relationshipId) : boolean {
        let canDelete = true;
        let r: Relationship = this.allObjects.get(relationshipId);
        if (r instanceof EntityRelationshipPartOf) {
            let entityOrigin = this.readEntity(r.originId);
            let entityDestination = this.readEntity(r.destinationId);
            if(entityOrigin instanceof Processor && entityDestination instanceof Processor) {
                for (let interfaceModelOrigin of entityOrigin.interfaces) {
                    for (let interfaceModelDestination of entityDestination.interfaces) {
                        let exchangesRelationships = this.getExchangeRelationshipTwoInterface(interfaceModelOrigin.id, interfaceModelDestination.id);
                        for (let exchange of exchangesRelationships) {
                            if(exchange.intefaceOrigin.orientation == InterfaceOrientation.Input && exchange.interfaceDestination.orientation == InterfaceOrientation.Input) {
                                canDelete = false;
                            }
                            if(exchange.intefaceOrigin.orientation == InterfaceOrientation.Output && exchange.interfaceDestination.orientation == InterfaceOrientation.Output) {
                                canDelete = false;
                            }
                        }
                    }
                }
            }
        } 
        console.log(canDelete);
        return canDelete;
    }

    getExchangeRelationshipTwoInterface(interfaceId1 : number, interfaceId2 : number) {
        let exchangeRelationships = new Array<{intefaceOrigin: Interface, interfaceDestination: Interface}>();
        if(this.entitiesRelationships.get(interfaceId1))
        for(let relationshipId of this.entitiesRelationships.get(interfaceId1)) {
            let relationship = this.readRelationship(relationshipId);
            if (relationship instanceof ExchangeRelationship &&  ( (relationship.originId == interfaceId1 && relationship.destinationId == interfaceId2) ||
            (relationship.originId == interfaceId2 && relationship.destinationId == interfaceId1) ) ) {
                exchangeRelationships.push({
                    intefaceOrigin: this.readInterface(relationship.originId),
                    interfaceDestination: this.readInterface(relationship.destinationId),
                })
            }
        }
        return exchangeRelationships;
    }

    updateRelationship(relationshipId, properties: EntityRelationshipPartOf | ExchangeRelationship | ScaleRelationship | InterfaceTypeScaleChange) {
        let r = this.allObjects.get(relationshipId);
        if (r) {
            r.name = properties.name;
            if (r instanceof EntityRelationshipPartOf) {
                r.amount = (properties as EntityRelationshipPartOf).amount;
            } else if (r instanceof ExchangeRelationship) {
                r.weight = (properties as ExchangeRelationship).weight;
            } else if (r instanceof ScaleRelationship) {
                r.scale = (properties as ScaleRelationship).scale;
            } else if (r instanceof InterfaceTypeScaleChange) {
                let r2: InterfaceTypeScaleChange = properties as InterfaceTypeScaleChange;
                r.destinationContextProcessorId = r2.destinationContextProcessorId;
                r.originContextProcessorId = r2.originContextProcessorId;
                r.destinationUnit = r2.destinationUnit;
                r.originUnit = r2.originUnit;
                r.scale = r2.scale;
            }
        } else {
            return -1; // Relationship not found
        }
    }

    readRelationship(relationshipId: number) {
        return this.allObjects.get(relationshipId);
    }

    // Valid to obtain children of Processors and InterfaceTypes
    getEntityPartOfChildren(parentId: number) {
        let children = new Array<number>();
        if (parentId == -1 || parentId == -2) { // -1n -> InterfaceTypes; -2n -> Processors
            // All InterfaceTypes OR all Processors
            let keys = parentId == -1 ? this.interfaceTypes.keys() : this.processors.keys();
            for (let entityId of keys) {
                let addAsRoot: boolean = true;
                for (let relId of this.entitiesRelationships.get(entityId)) {
                    let r = this.allObjects.get(relId);
                    if (r instanceof EntityRelationshipPartOf && r.originId == entityId) {
                        addAsRoot = false;
                        break;
                    }
                }
                if (addAsRoot)
                    children.push(entityId);
            }
        }
        else {
            for (let relId of this.entitiesRelationships.get(parentId)) { //
                let r = this.allObjects.get(relId);
                if (r instanceof EntityRelationshipPartOf) {
                    if (r.destinationId == parentId)
                        children.push(r.originId);
                }
            }
        }
        return children;
    }

    getRelationshipChildren(parentId: number) {
        let children = new Array<Relationship>();
        if(this.entitiesRelationships.get(parentId))
        for (let relId of this.entitiesRelationships.get(parentId)) { //
            let r = this.allObjects.get(relId);
            if (r.destinationId == parentId) children.push(r);
        }
        return children;
    }

    getRelationshipParent(parentId: number) {
        let parent = new Array<Relationship>();
        if(this.entitiesRelationships.get(parentId))
        for (let relId of this.entitiesRelationships.get(parentId)) { //
            let r = this.allObjects.get(relId);
            if (r.originId == parentId) parent.push(r);
        }
        return parent;
    }

    getEntityPartOfParents(childId: number) {
        let parents = new Array<number>();
        for (let relId of this.entitiesRelationships.get(childId)) { //
            let r = this.allObjects.get(relId);
            if (r instanceof EntityRelationshipPartOf) {
                if (r.originId == childId)
                    parents.push(r.destinationId);
            }
        }
        return parents;
    }

}
