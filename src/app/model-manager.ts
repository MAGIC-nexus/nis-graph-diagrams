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

    constructor() {
    }

    // Utility function to obtain unique IDs to be assigned to the different items (processors, interface types, interfaces and relationships)
    getNewId() {}

    // ----------------------------------------------------------------------------------
    // EXPORTS (and one IMPORT)

    // Obtain a RO perspective for the TreeView component
    getTreeModelView() {}
    // Obtain a list of the diagrams
    listDiagrams() {}
    // Get a RO perspective of a diagram in a mxGraph compatible structure
    getDiagramGraph(diagramName) {}
    // Export to JSON encoding of a list of Pandas DataFrames which can be converted to worksheet
    exportToNISFormat() {}
    // Import JSON encoding a list of Pandas DataFrames coming from a NIS worksheet
    importFromNISFormat(s) {}

    // ----------------------------------------------------------------------------------
    // DIAGRAMS

    // Create an new, empty diagram of certain type
    createDiagram(diagramName, diagramType) {}
    addEntityToDiagram(diagramName, entityId) {}
    removeEntityFromDiagram(diagramName, entityId) {}
    // Set the size and position of the box representing an entity in a diagram
    updateEntityAppearanceInDiagram(diagramName, entityId, size, position) {}
    // Obtain the size and position of the box representing an entity in a diagram
    readEntityAppearanceInDiagram(diagramName, entityId) {}

    // ----------------------------------------------------------------------------------
    // ENTITIES (both Processors and InterfaceTypes)

    createEntity(entityType) {}
    deleteEntity(entityId) {}
    updateEntity(entityId, properties) {}
    readEntity(entityId) {}

    // ----------------------------------------------------------------------------------
    // PROCESSORS (because they are ENTITIES, see previous block of functions)

    createInterface(processorId, interfaceTypeId) {}
    deleteInterface(interfaceId) {}
    updateInterface(interfaceId, properties) {}
    readInterface(interfaceId) {}

    // ----------------------------------------------------------------------------------
    // INTERFACETYPES (because they are ENTITIES, see the ENTITIES block of functions)

    // ----------------------------------------------------------------------------------
    // RELATIONSHIPS
    createRelationship(relationType, originId, destinationId) {}
    deleteRelationship(relationshipId) {}
    updateRelationship(relationshipId, properties) {}
    readRelationship(relationshipId) {}

}

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

export enum RelationshipType {
    PartOf, // Processors and InterfaceTypes
    InterfaceTypeScale, // Between InterfaceTypes
    InterfaceScale, // Between Interfaces
    Exchange// Between Interfaces
}

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
}

export class InterfaceType extends Entity {
    hierarchy: string;
    sphere: Sphere;
    roegenType: RoegenType;
    unit: string;
    oppositeSubsystemType: ProcessorSubsystemType;
}

export class Interface {
    id: bigint;
    name: string;
    processorId: bigint;
    interfaceTypeId: bigint;
    value: string;
    unit: string;
    source: string;
}

// RELATIONSHIPS

export class Relationship {
    id: bigint;
    label: string; // Optional
}

export class EntityRelationship extends Relationship {

}

export class InterfaceRelationship extends Relationship {

}

export class EntityRelationshipPartOf extends EntityRelationship {
    parentEntityId: bigint;
    childEntityId: bigint;
    amount: string; // 0 to 1 membership, regarding accounting. 1 for InterfaceTypes
}

// Only for InterfaceTypes
export class InterfaceTypeScaleChange extends EntityRelationship {
    originInterfaceTypeId: bigint;
    destinationInterfaceTypeId: bigint;
    originContextProcessorId: bigint; // Can be null
    destinationContextProcessorId: bigint; // Can be null
    scale: string;
    originUnit: string;
    destinationUnit: string
}

// Flow between Interfaces
export class ExchangeRelationship extends InterfaceRelationship {
    originInterfaceId: bigint;
    destinationInterfaceId: bigint;
    weight: string;
}

// Scale between Interfaces
export class ScaleRelationship extends InterfaceRelationship {
    originInterfaceId: bigint;
    destinationInterfaceId: bigint;
    scale: string;
}

