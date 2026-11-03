/** Shared localized predicate feedback. Grammar positions and selector values remain literal inputs. */
import type {Translator} from "../../lang";
import type {GraphLensValidationIssue} from "../../lens/GraphLens";
/** Format a parser token kind for user feedback; punctuation and unknown machine tokens retain their literal grammar spelling. */
function graphLensExpectedTokenLabel(token: string, translate: Translator): string {
  switch (token) {
    case "identifier": return translate("filter.validationTokenIdentifier");
    case "string": return translate("filter.validationTokenString");
    case "number": return translate("filter.validationTokenNumber");
    case "operator": return translate("filter.validationTokenOperator");
    case "punct": return translate("filter.validationTokenPunctuation");
    case "eof": return translate("filter.validationTokenEndOfExpression");
    default: return token;
  }
}

/** Format structured parser/semantic issues at the UI boundary, preserving source values and one-based character positions. */
export function graphLensValidationMessage(error: GraphLensValidationIssue, translate: Translator): string {
  if (error.code === "selector-reference-required") return translate("filter.validationSelectorReferenceRequired");
  if (error.code === "unknown-edge-role") return translate("filter.validationUnknownPlexPosition", { value: error.value });
  if (error.code === "unknown-edge-kind") return translate("filter.validationUnknownRelationshipKind", { value: error.value });
  if (error.code === "unknown-edge-direction") return translate("filter.validationUnknownRelationshipDirection", { value: error.value });

  const issue = error.issue;
  switch (issue.code) {
    case "unterminated-string": return translate("filter.validationUnterminatedString", { position: issue.position });
    case "invalid-number": return translate("filter.validationInvalidNumber", { value: issue.value, position: issue.position });
    case "unexpected-token": return translate("filter.validationUnexpectedToken", { value: issue.value, position: issue.position });
    case "empty-expression": return translate("filter.validationEmptyExpression", { position: issue.position });
    case "expected-token": {
      const expected = graphLensExpectedTokenLabel(issue.expected, translate);
      return issue.found === null
        ? translate("filter.validationExpectedTokenAtEnd", { expected, position: issue.position })
        : translate("filter.validationExpectedToken", { expected, found: issue.found, position: issue.position });
    }
    case "comparison-right-value": return translate("filter.validationComparisonRightValue", { position: issue.position });
    case "expected-value": return issue.found === null
      ? translate("filter.validationExpectedValueAtEnd", { position: issue.position })
      : translate("filter.validationExpectedValue", { found: issue.found, position: issue.position });
    case "unknown-namespace": return translate("filter.validationUnknownNamespace", { value: issue.value, position: issue.position });
    case "expected-property": return translate("filter.validationExpectedProperty", { namespace: issue.namespace, position: issue.position });
    case "function-arguments-values": return translate("filter.validationFunctionArgumentsValues", { position: issue.position });
    case "unknown-function": return translate("filter.validationUnknownFunction", { value: issue.value, position: issue.position });
    case "unknown-method": return translate("filter.validationUnknownMethod", { value: issue.value, position: issue.position });
    case "invalid-expression": return translate("filter.validationInvalidExpression");
  }
}


