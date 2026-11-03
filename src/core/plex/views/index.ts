/** Public pure-policy entry point for internal canvas views. No host/UI/native effect crosses
 * this module; downloadable code loading remains outside the API and this implementation. */
export {CANVAS_VIEW_API_VERSION} from "./contracts";
export type {CanvasViewText, PlexNodeBadge, PlexViewStateAction, PlexViewStateResult, PlexViewDefinition, PlexViewInput,
  PlexViewRead, PlexProjection, PlexOccurrence, PlexViewEdge, PlexViewRelation, PlexRelationRead, PlexEvidenceRead,
  PlexMeasurement, PlexArea, PlexAreaDimension, PlexDecoration, PlexDecorationText, PlexDecorationTextSize, PlexViewLayout, PlexViewScopeRead, PhysicalPort, OccurrenceId,
  AreaId, ViewPoint, ViewRect, ViewCoverage, PlexDropMeaning, PlexViewPropertyDependencies, PlexAreaShape} from "./contracts";
export {GraphPredicateEngine, compileGraphPredicate} from "../predicate";
export type {GraphPredicateContext, GraphPredicateResult, GraphPredicateRead, GraphPredicateDependencies} from "../predicate";
export {parseGraphPredicateExpression, tryParseGraphPredicateExpression} from "../predicateParser";
export type {NotePropertyAvailability, NotePropertyRead} from "../noteProperties";
export {evaluatePortablePredicateContexts} from "../lens";
export type {GraphNodeView, NodeId} from "../../graph/model";
export type {ColorValue} from "../../contracts/colorValue";
export type {PlexSectionRef, PlexSectionRow, PlexSectionSnapshot, PlexSectionRead, PlexSectionProvenance} from "./sections";
export {validPlexSectionSnapshot, plexSectionReference, visiblePlexSection, plexSectionAnchor, plexSectionDocument, appendPlexSections} from "./sections";
export {PlexViewRegistry} from "./registry";
export {readViewConfiguration, readViewConfigurationAt, editViewConfiguration, editViewConfigurationAt,
  resetViewConfiguration, migrateViewConfiguration, removeViewConfiguration, VIEW_CONFIGURATION_LIMITS} from "./configuration";
export type {PlexViewConfigurationSchema, PlexViewConfigurationMigration, PlexViewConfiguration,
  ViewConfigurationAddress, ViewConfigurationEdit, ViewConfigurationExpected, ViewConfigurationMigrationResult} from "./configuration";
export {boundedViewState} from "./state";
export {validCanvasViewText, validPlexViewStateAction} from "./presentation";
export {boundedViewColors, validPlexNodeBadge, nodeBadgeBounds, nodeBadgeInsets} from "./decorations";
export type {PlexPropertyAssignment, PropertyFieldValue, PropertyAssignmentPlan} from "./propertyAssignment";
export {validPropertyAssignment, writableAssignmentField, assignmentField, samePropertyField, planPropertyAssignment, applyPropertyField} from "./propertyAssignment";
export {validPlexDropMeaning, plexAreaDropMeaning} from "./dropTargets";
export {measuredAreaGrid, measuredAreaColumns} from "./areaLayout";
export {areaContains, areaShapePath, validAreaShape, transformAreaShape} from "../../contracts/areaGeometry";
export type {MeasuredAreaItem, MeasuredAreaInsets, MeasuredAreaGrid} from "./areaLayout";
