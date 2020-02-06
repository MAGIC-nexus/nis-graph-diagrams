// ---------------------------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------------
// MODEL classes, enums and MODEL service management class
// ---------------------------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------------------------------
// ENUMS

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
    id: bigint;
    name: string;
}

export class Processor extends Entity {
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
}

export class InterfaceValue {
    value: string;
    unit: string;
    time: string;
    source: string;
}

export class Interface extends Entity {
    processorId: bigint;
    interfaceTypeId: bigint;
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
    originId: bigint;
    destinationId: bigint;
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
    originContextProcessorId: bigint; // Can be null
    destinationContextProcessorId: bigint; // Can be null
    scale: string;
    originUnit: string;
    destinationUnit: string
}

// Flow between Interfaces
export class ExchangeRelationship extends InterfaceRelationship {
    weight: string;
}

// Scale between Interfaces
export class ScaleRelationship extends InterfaceRelationship {
    scale: string;
}

export class Diagram extends Entity {
    diagramType: DiagramType;
    entities: Map<bigint, GraphicalProperties>; // List of Processors or InterfaceTypes (not both) in the diagram, and their sizes and positions
    diagramXML: string;
}

// ---------------------------------------------------------------------------------------------------------------------
// MODEL service class, management of the model

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

    nextId: bigint;
    diagrams: Array<Diagram> = [];
    processors: Map<bigint, Processor> = new Map<bigint, Processor>();
    interfaceTypes: Map<bigint, InterfaceType> = new Map<bigint, InterfaceType>();
    interfaces: Map<bigint, Interface> = new Map<bigint, Interface>();
    // Set of Relationships (their IDs) of an Entity (Processor, InterfaceType, Interface)
    // IDs can be from: Processors, InterfaceTypes and Interfaces
    // Logically a Relationship will appear in two of the elements of the Map (we always will have an origin and a destination)
    entitiesRelationships: Map<bigint, Set<bigint>> = new Map<bigint, Set<bigint>>();
    allObjects: Map<bigint, any> = new Map<bigint, any>(); // Diagrams, processors, interface types, interfaces and relationships

    constructor() {
        this.nextId = 1n;
    }

    // Utility function to obtain unique IDs to be assigned to the different items (processors, interface types, interfaces and relationships)
    getNewId() { return ++this.nextId; }

    // ----------------------------------------------------------------------------------
    // EXPORTS (and one IMPORT)

    // Obtain a RO perspective for the TreeView component
    getTreeModelViewDiagrams() {
        let tmp = [];
        for (let diagram of this.diagrams) {
            tmp.push({id: diagram.id, name: diagram.name});
        }
        return tmp;
    }
    getTreeModelViewProcessors(parentId: bigint) {
        let n = [];
        for (let child of this.getEntityPartOfChildren(parentId)) {
            let p = this.allObjects.get(child);
            n.push({id: p.id, name: p.name, children: this.getTreeModelViewProcessors(p.id)});
        }
        return n;
        // let tmp = [];
        // this.processors.forEach( (processor, id) => {
        //     tmp.push({id: id, name: processor.name});
        // })
        // return tmp;
    }
    getTreeModelViewInterfaceTypes(parentId: bigint) {
        // Search for all InterfaceTypes whose parent is "parentId"
        let n = [];
        for (let child of this.getEntityPartOfChildren(parentId)) {
            let it = this.allObjects.get(child);
            n.push({id: it.id, name: it.name, children: this.getTreeModelViewInterfaceTypes(it.id)});
        }
        return n;
    }
    getTreeModelView() {
        return [
            {id: -3, name: "Diagrams", children: this.getTreeModelViewDiagrams() },
            {id: -2, name: "Processors", children: this.getTreeModelViewProcessors(-2n) },
            {id: -1, name: "Interface Types", children: this.getTreeModelViewInterfaceTypes(-1n) }
        ]
    }
    // Obtain a list of the diagrams (for the Tab control)
    listDiagrams() {
        let tmp = [];
        for (let diagram of this.diagrams) {
            tmp.push(diagram.name);
        }
        return tmp;
    }
    // Get a RO perspective of a diagram in a mxGraph compatible structure. Afterwards, the controller would invoke code in example "https://jgraph.github.io/mxgraph/javascript/examples/codec.html"
    getDiagramGraph(diagramName: string) {
        let graph: string = "";
        for (let diagram of this.diagrams) {
            if (diagram.name == diagramName) {
                graph = diagram.diagramXML;
            }
        }
        return graph;
    }
    // Save diagram (normally, before closing). Before the call, the controller would invoke code in "https://jgraph.github.io/mxgraph/docs/js-api/files/io/mxCodec-js.html"
    setDiagramGraph(diagramName: string, xml: string) {
        for (let diagram of this.diagrams) {
            if (diagram.name == diagramName) {
                diagram.diagramXML = xml;
            }
        }
    }
    // Export to JSON encoding of a list of Pandas DataFrames which can be converted to worksheet
    exportToNISFormat(): string  {
        // InterfaceTypes
        this.exportInterfaceTypes();
        // TODO ScaleChangeMap
        // TODO BareProcessors
        // TODO Interfaces
        // TODO Relationships
        return "";
    }
    exportScaleChangeMap(): string {
        let scm = [];
        for (let itypeId of this.interfaceTypes.keys()) {
            for (let relId of this.entitiesRelationships.get(itypeId)) {
                let r = this.allObjects.get(relId);
                if (r instanceof InterfaceTypeScaleChange && r.originId ==itypeId) {
                    scm.push({})
    // originContextProcessorId: bigint; // Can be null
    // destinationContextProcessorId: bigint; // Can be null
    // scale: string;
    // originUnit: string;
    // destinationUnit: string

                }
            }
        }
        return "";
    }
    exportInterfaceTypes(): string {
        let its = [];
        for (let itypeId of this.interfaceTypes.keys()) {
            let it = this.interfaceTypes.get(itypeId);
            its.push({id: it.id, name: it.name, hierarchy: it.hierarchy, sphere: it.sphere, roegenType: it.roegenType, unit: it.unit, oppositeSubsystemType: it.oppositeSubsystemType});
        }
        // TODO Convert dictionary to string
        return "InterfaceTypes"+its.toString();
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
        for (let diagram of this.diagrams) {
            if (diagram.name == diagramName) {
                found = true;
                break;
            }
        }
        if (!found) {
            let diagram = new Diagram();
            diagram.id = this.getNewId();
            diagram.name = diagramName;
            diagram.diagramType = diagramType;
            diagram.entities = new Map<bigint, GraphicalProperties>(); // Empty diagram
            diagram.diagramXML = "";
            this.diagrams.push(diagram);
            this.allObjects.set(diagram.id, diagram);
            return diagram.id;
        } else {
            // Name exists!
            return -1;
        }
    }

    deleteDiagram(diagramName) {
        let deleted = false;
        for (let i=0; i<=this.diagrams.length; i++) {
            if (this.diagrams[i].name == diagramName) {
                deleted = true;
                this.allObjects.delete(this.diagrams[i].id);
                this.diagrams.splice(i, 1);
                break;
            }
        }
        return deleted;
    }

    readDiagram(diagramId: bigint) {
        let e = this.allObjects.get(diagramId);
        if (e) {
            return e;
        } else {
            return null; // Not valid ID
        }
    }

    addEntityToDiagram(diagramName: string, entityId: bigint) {
        for (let diagram of this.diagrams) {
            if (diagram.name == diagramName) {
                let p = new GraphicalProperties();
                p.height = 80;
                p.width = 100;
                p.left = 10;
                p.top = 10;
                diagram.entities.set(entityId, p);
            }
        }
    }

    removeEntityFromDiagram(diagramName: string, entityId: bigint) {
        for (let diagram of this.diagrams) {
            if (diagram.name == diagramName) {
                diagram.entities.delete(entityId);
            }
        }
    }

    // Set the size and position of the box representing an entity in a diagram
    updateEntityAppearanceInDiagram(diagramName: string, entityId: bigint,
                                    width: number, height: number, left: number, top: number) {
        for (let diagram of this.diagrams) {
            if (diagram.name == diagramName) {
                let p = diagram.entities.get(entityId);
                p.height = height;
                p.width = width;
                p.left = left;
                p.top = top;
            }
        }
    }

    // Obtain the size and position of the box representing an entity in a diagram
    readEntityAppearanceInDiagram(diagramName: string, entityId: bigint) {
        for (let diagram of this.diagrams) {
            if (diagram.name == diagramName) {
                return diagram.entities.get(entityId);
            }
        }
        return null;
    }

    // ----------------------------------------------------------------------------------
    // ENTITIES (both Processors and InterfaceTypes)

    createEntity(entityType, name) {
        if (entityType == EntityTypes.Processor) {
            let p = new Processor();
            p.id = this.getNewId();
            p.name = name;
            p.level = "n";
            p.accounted = ProcessorAccounted.Yes;
            p.functionalOrStructural = ProcessorFunctionalOrStructural.Functional;
            p.subsystemType = ProcessorSubsystemType.Local;
            p.system = "default";
            p.geolocation = "";
            this.allObjects.set(p.id, p);
            this.processors.set(p.id, p);
            return p.id;
        } else if (entityType == EntityTypes.InterfaceType) {
            let it = new InterfaceType();
            it.id = this.getNewId();
            it.name = name;
            it.hierarchy = "default";
            it.oppositeSubsystemType = ProcessorSubsystemType.Environment;
            it.roegenType = RoegenType.Flow;
            it.sphere = Sphere.Technosphere;
            it.unit = "";
            this.allObjects.set(it.id, it);
            this.interfaceTypes.set(it.id, it);
            return it.id;
        }
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
            for (let diagram of this.diagrams) {
                if (diagram.entities.get(entityId)) {
                    cont ++;
                    if (complete) {
                        diagram.entities.delete(entityId);
                    }
                }
            }
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
                    return 1; // OK
                } else {
                    return -1; // Wrong properties object
                }
            }
        } else {
            return 0;
        }
    }

    readEntity(entityId: bigint): Processor | InterfaceType {
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
            i.name = properties.name;
            i.sphere = properties.sphere;
            i.roegenType = properties.roegenType;
            i.orientation = properties.orientation;
            i.oppositeSubsystemType = properties.oppositeSubsystemType;
            return 0;
        } else {
            return -1; // Could not find Interface
        }
    }

    updateInterfaceValues(interfaceId, values: Array<InterfaceValue>) {
        let i: Interface = this.allObjects.get(interfaceId);
        if (i) {
            i.values = values;
        } else {
            return -1; // Could not find Interface
        }
    }

    readInterface(interfaceId: bigint) {
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
            }
            case RelationshipType.InterfaceTypeScale: {
                r = new InterfaceTypeScaleChange();
                r.originContextProcessorId = 0;
                r.destinationContextProcessorId = 0;
                r.scale = "";
                r.originUnit = "";
                r.destinationUnit = "";
            }
        }
        r.id = this.getNewId();
        r.destinationId = destinationId;
        r.originId = originId;
        r.name = "";
        let s: Set<bigint> = this.entitiesRelationships.get(originId);
        if (!s) {
            s = new Set<bigint>();
            this.entitiesRelationships.set(originId, s);
        }
        s.add(r.id);
        s = this.entitiesRelationships.get(destinationId);
        if (!s) {
            s = new Set<bigint>();
            this.entitiesRelationships.set(destinationId, s);
        }
        s.add(r.id);
        this.allObjects.set(r.id, r);
        return r.id;
    }

    deleteRelationship(relationshipId) {
        let r: Relationship = this.allObjects.get(relationshipId);
        if (r) {
            // Delete from the origin
            let rels: Set<bigint> = this.entitiesRelationships.get(r.originId);
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

    readRelationship(relationshipId: bigint) {
        return this.allObjects.get(relationshipId);
    }

    // Valid to obtain children of Processors and InterfaceTypes
    getEntityPartOfChildren(parentId: bigint) {
        let children = new Array<bigint>();
        if (parentId == -1n || parentId == -2n) { // -1n -> InterfaceTypes; -2n -> Processors
            // All InterfaceTypes OR all Processors
            let keys = parentId == -1n ? this.interfaceTypes.keys() : this.processors.keys();
            for (let entityId of keys) {
                let addAsRoot: boolean = true;
                for (let relId of this.entitiesRelationships.get(entityId)) {
                    let r = this.allObjects.get(relId);
                    if (r instanceof EntityRelationshipPartOf && r.destinationId == relId) {
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
                    if (r.originId == parentId)
                        children.push(r.destinationId);
                }
            }
        }
        return children;
    }
}
