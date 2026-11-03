/** Controlled shared condition rows. The caller retains its draft, scope, suggestions and save owner. */
import type {GraphLensScope} from "../../lens/GraphLens";
import {createGraphLensConditionId, defaultGraphLensSimpleModel, graphLensSimpleConditionNeedsValue, type GraphLensSimpleCondition, type GraphLensSimpleField, type GraphLensSimpleModel, type GraphLensSimpleOperator} from "../../lens/GraphLensSimple";
import type {Translator} from "../../lang";
import {ObsidianIcon} from "../ObsidianIcon";
import {defaultOperator, operatorChoices, type Choice} from "./conditionChoices";
/** Condition state is controlled; this component owns no filter, preset or settings lifetime. */
export function PredicateConditions({model,onChange,scope,fields,translate,propertyListId,valueChoices,datalistForField,maximumConditions}: {model:GraphLensSimpleModel;onChange:(model:GraphLensSimpleModel)=>void;scope:GraphLensScope;fields:readonly {value:GraphLensSimpleField;label:string;title?:string}[];translate:Translator;propertyListId?:string;valueChoices:(condition:GraphLensSimpleCondition)=>readonly Choice[]|null;datalistForField:(field:GraphLensSimpleField)=>string|undefined;maximumConditions?:number}) {
  const updateCondition = (id: string, patch: Partial<GraphLensSimpleCondition>) => {
    const conditions = model.conditions.map((condition) => {
      if (condition.id !== id) return condition;
      const next = { ...condition, ...patch };
      if (patch.field) {
        next.operator = defaultOperator(patch.field);
        next.value = "";
        if (patch.field !== "note.property") next.propertyName = undefined;
      }
      return next;
    });
    onChange({ ...model, conditions });
  };

  const renderConditionValue = (condition: GraphLensSimpleCondition) => {
    if (!graphLensSimpleConditionNeedsValue(condition)) return null;
    const choices = valueChoices(condition);
    if (choices?.length) return <select className="kplex-lens-condition-value" value={condition.value} onChange={(event) => updateCondition(condition.id, { value: event.currentTarget.value })}>
      <option value="">{translate("filter.choose")}</option>
      {choices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
    </select>;
    return <input
      className="kplex-lens-condition-value"
      value={condition.value}
      list={datalistForField(condition.field)}
      placeholder={condition.field === "edge.definition" ? translate("filter.exampleWorkingOn") : translate("filter.valuePlaceholder")}
      onChange={(event) => updateCondition(condition.id, { value: event.currentTarget.value })}
    />;
  };

  return <div className="kplex-lens-simple-builder">
          <div className="kplex-lens-group-heading">
            <span>{translate("filter.matchHeading")}</span>
            <select value={model.combinator} onChange={(event) => onChange({ ...model, combinator: event.currentTarget.value as "all" | "any" })}>
              <option value="all">{translate("filter.allFollowing")}</option>
              <option value="any">{translate("filter.anyFollowing")}</option>
            </select>
          </div>
          <div className="kplex-lens-conditions">
            {model.conditions.map((condition) => <div key={condition.id} className="kplex-lens-condition">
              <span className="kplex-lens-where">{translate("filter.where")}</span>
              <select
                className="kplex-lens-condition-field"
                value={condition.field}
                title={fields.find((option) => option.value === condition.field)?.title}
                onChange={(event) => updateCondition(condition.id, { field: event.currentTarget.value as GraphLensSimpleField })}
              >
                {fields.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              {condition.field === "note.property" && <input
                className="kplex-lens-condition-property"
                list={propertyListId}
                value={condition.propertyName ?? ""}
                placeholder={translate("filter.propertyName")}
                onChange={(event) => updateCondition(condition.id, { propertyName: event.currentTarget.value })}
              />}
              <select className="kplex-lens-condition-operator" value={condition.operator} onChange={(event) => updateCondition(condition.id, { operator: event.currentTarget.value as GraphLensSimpleOperator })}>
                {operatorChoices(condition, translate).map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
              </select>
              {renderConditionValue(condition)}
              <button
                className="kplex-icon-button kplex-lens-condition-remove"
                aria-label={translate("filter.removeCondition")}
                disabled={model.conditions.length <= 1}
                onClick={() => onChange({ ...model, conditions: model.conditions.filter((item) => item.id !== condition.id) })}
              ><ObsidianIcon name="trash-2" size={13} /></button>
            </div>)}
          </div>
          <button className="kplex-lens-add-condition" disabled={maximumConditions !== undefined && model.conditions.length >= maximumConditions} onClick={() => {
            if (maximumConditions !== undefined && model.conditions.length >= maximumConditions) return;
            onChange({ ...model, conditions: [...model.conditions, { ...defaultGraphLensSimpleModel(scope).conditions[0], id: createGraphLensConditionId() }] });
          }}>
            <ObsidianIcon name="plus" size={13} /> {translate("filter.addFilter")}
          </button>
          {scope === "edge" && <div className="kplex-lens-help">{translate("filter.edgeSimpleHelp")}</div>}
        </div>;
}
